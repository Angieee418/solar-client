import React, { useEffect, useState, useContext } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Select, Input, Tag, Spin, message, Popconfirm } from 'antd'
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons'
import { getProjectDetail, createDevice, deleteDevice } from '../api'
import AntdIcon from '../components/AntdIcon'
import { ProjectContext } from '../context/ProjectContext'
import type { ProjectModel } from '../models/project'
import type { DeviceModel } from '../models/device'
import { formatTimestamp } from '../utils/datetime'
import '../styles/index.css'

const { Option } = Select

function normalizeProjectDevices(project: Partial<ProjectModel>): DeviceModel[] {
  const devices = Array.isArray(project.devices) ? project.devices : []

  return devices.map((device) => {
    const rawDevice = device as Record<string, unknown>
    const metrics = (rawDevice.metrics as Record<string, unknown> | undefined) || {}

    return {
      ...rawDevice,
      id: String(rawDevice.id || rawDevice.deviceId || rawDevice._id || ''),
      deviceId: String(rawDevice.deviceId || rawDevice.id || rawDevice._id || ''),
      pvVoltage: rawDevice.pvVoltage ?? metrics.pvVoltage,
      batterySoc: rawDevice.batterySoc ?? metrics.batterySoc,
      temperature: rawDevice.temperature ?? metrics.temperature,
      humidity: rawDevice.humidity ?? metrics.humidity,
      loadPower: rawDevice.loadPower ?? metrics.loadPower,
      irradiance: rawDevice.irradiance ?? metrics.irradiance,
      health: String(rawDevice.health || rawDevice.status || metrics.status || 'offline'),
    } as DeviceModel
  })
}

function splitDevices(devices: DeviceModel[], health: string, keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase()
  const filteredDevices = devices.filter((device) => {
    const matchesHealth = health === 'all' || (device.health || '').toLowerCase() === health
    const matchesKeyword = !normalizedKeyword
      || String(device.name || device.deviceName || device.deviceId || '').toLowerCase().includes(normalizedKeyword)

    return matchesHealth && matchesKeyword
  })

  return filteredDevices.reduce(
    (acc, device) => {
      const type = String(device.type || device.category || '').toLowerCase()
      if (type.includes('solar')) acc.solar.push(device)
      if (type.includes('weather')) acc.weather.push(device)
      return acc
    },
    { solar: [] as DeviceModel[], weather: [] as DeviceModel[] },
  )
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const storedProject = sessionStorage.getItem('currentProject')
  let projectId = id!
  let initialProject: Partial<ProjectModel> = {}

  if (storedProject) {
    try {
      initialProject = JSON.parse(storedProject)
      projectId = initialProject.id || id!
      sessionStorage.removeItem('currentProject')
    } catch (err) {
      console.error('Failed to parse stored project:', err)
    }
  }

  const navigate = useNavigate()
  const { setProject: setProjectInContext } = useContext(ProjectContext)
  const [project, setProject] = useState<Partial<ProjectModel>>(initialProject)
  const [allDevices, setAllDevices] = useState<DeviceModel[]>(() => normalizeProjectDevices(initialProject))
  const [solarDevices, setSolarDevices] = useState<DeviceModel[]>([])
  const [weatherDevices, setWeatherDevices] = useState<DeviceModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [health, setHealth] = useState('all')
  const [keyword, setKeyword] = useState('')

  useEffect(() => {
    fetchProjectDetails()
    if (initialProject && Object.keys(initialProject).length && setProjectInContext) {
      setProjectInContext(initialProject as ProjectModel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    const nextDevices = splitDevices(allDevices, health, keyword)
    setSolarDevices(nextDevices.solar)
    setWeatherDevices(nextDevices.weather)
  }, [allDevices, health, keyword])

  async function fetchProjectDetails() {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const projectDetail = await getProjectDetail(projectId)
      setProject(projectDetail || {})
      setAllDevices(normalizeProjectDevices(projectDetail || {}))
      if (projectDetail && setProjectInContext) setProjectInContext(projectDetail)
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load project details')
    } finally {
      setLoading(false)
    }
  }

  function onHealthChange(val: string) {
    setHealth(val)
  }

  function onSearch(val: string) {
    setKeyword(val)
  }

  function formatDate(ts: string | number | undefined | null): string {
    return formatTimestamp(ts)
  }

  function healthTag(h: string | undefined) {
    const s = (h || '').toLowerCase()
    if (s === 'ok') return <Tag className="health-tag-ok">Online</Tag>
    if (s === 'warning') return <Tag className="health-tag-warning">Warning</Tag>
    return <Tag className="health-tag-offline">Offline</Tag>
  }

  const [activeTab, setActiveTab] = useState<'solar' | 'weather'>('solar')
  const activeDevices = activeTab === 'solar' ? solarDevices : weatherDevices

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState<'solar' | 'weather'>('solar')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreateDevice() {
    if (!deviceName.trim()) { message.warning('Please enter a device name'); return }
    const letters = Array.from({ length: 3 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')
    const digits = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('')
    const deviceId = `${letters}-${digits}`
    try {
      setSubmitting(true)
      await createDevice({ name: deviceName.trim(), type: deviceType, projectId: projectId, deviceId })
      message.success('Device created')
      setDrawerOpen(false)
      setDeviceName('')
      setDeviceType('solar')
      await fetchProjectDetails()
    } catch (err: unknown) {
      message.error((err as Error).message || 'Failed to create device')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteDeviceConfirm(device: DeviceModel) {
    const devId = String(device.deviceId || device.id || device._id || '')
    if (!devId) { message.error('Invalid device ID'); return }
    if (((device.health || '') as string).toLowerCase() !== 'offline') {
      message.warning('Only devices with status offline can be deleted')
      return
    }
    try {
      setLoading(true)
      await deleteDevice(devId)
      message.success('Device deleted')
      setAllDevices((prev) => prev.filter((d) => String(d.deviceId || d.id || d._id) !== devId))
    } catch (err: unknown) {
      message.error((err as Error).message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  function renderDeviceCard(device: DeviceModel) {
    const deviceId = device.id || device.deviceId || device._id
    const isSolar = activeTab === 'solar'
    return (
      <div
        className="pd-device-card"
        key={deviceId}
        onClick={() => deviceId && navigate(`/devices/${deviceId}`)}
      >
        <div className="pd-device-card__body">
          <div className="pd-device-card__info">
            <div className="pd-device-card__name">
              {device.name || device.deviceName || device.deviceId}
            </div>
            <div className="pd-device-card__metrics">
              {isSolar ? (
                <>
                  <div>PV Voltage : {device.pvVoltage ?? '-'}</div>
                  <div>Battery SOC : {device.batterySoc ?? '-'}%</div>
                </>
              ) : (
                <>
                  <div>Temperature : {device.temperature ?? '-'}°C</div>
                  <div>Humidity : {device.humidity ?? '-'}%</div>
                </>
              )}
            </div>
            
            <div className="pd-device-card__time">{formatDate(device.lastSeen)}</div>
          </div>
          <div className="pd-device-card__controls">
            {((device.health || '') as string).toLowerCase() === 'offline' && (
              <span onClick={(e) => e.stopPropagation()}>
                <Popconfirm
                  title="Confirm delete this device? Related telemetry data will also be removed."
                  onConfirm={() => handleDeleteDeviceConfirm(device)}
                  okText="Delete"
                  cancelText="Cancel"
                >
                  <AntdIcon component={DeleteOutlined} className="pd-device-card__delete" />
                </Popconfirm>
              </span>
            )}
          </div>
          <div className="pd-device-card__health">
            {healthTag(device.health)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pd-page">
      <div className="pd-panel">
        {/* Project header */}
        <div className="pd-header">
          <div className="pd-header__title">{project.name || `Project ${projectId}`}</div>
          {/* Breadcrumb */}
          <div className="breadcrumb">
            <Link className="breadcrumb__link" to="/">Home</Link>
            <span className="breadcrumb__sep">/</span>
            <span className="breadcrumb__current">{project.name || `Project ${projectId}`}</span>
          </div>
        </div>

        {/* Add Controller button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="dd-add-data-btn" onClick={() => setDrawerOpen(true)}>+ Add Controller</button>
        </div>

        {/* Filters */}
        <div className="pd-filters">
          <Select
            value={health}
            onChange={onHealthChange}
            className="pd-filters__select"
            suffixIcon={<span style={{ fontSize: 12 }}>▼</span>}
          >
            <Option value="all">All</Option>
            <Option value="ok">Online</Option>
            <Option value="warning">Warning</Option>
            <Option value="offline">Offline</Option>
          </Select>
          <Input
            placeholder="Device Name"
            suffix={<AntdIcon component={SearchOutlined} style={{ color: '#bbb' }} />}
            className="pd-filters__search"
            allowClear
            onPressEnter={(e) => onSearch((e.target as HTMLInputElement).value)}
            onChange={(e) => { if (!e.target.value) onSearch('') }}
          />
        </div>

        {/* Category tabs */}
        <div className="pd-tabs">
          <button
            className={`pd-tabs__btn ${activeTab === 'solar' ? 'pd-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('solar')}
          >
            Solar Controllers
          </button>
          <button
            className={`pd-tabs__btn ${activeTab === 'weather' ? 'pd-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab('weather')}
          >
            Weather Sensors
          </button>
        </div>

        {/* Device list */}
        {loading ? (
          <div className="pd-loading"><Spin size="large" /></div>
        ) : error ? (
          <div className="pd-error">{error}</div>
        ) : (
          <>
            <div className="pd-device-list">
              {activeDevices.length === 0 ? (
                <div className="pd-empty">No devices found</div>
              ) : (
                activeDevices.map(d => renderDeviceCard(d))
              )}
            </div>
            <div className="pd-count">{activeDevices.length} items listed</div>
          </>
        )}
      </div>

      {/* Add Controller Drawer */}
      {drawerOpen && (
        <div className="dd-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="dd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dd-drawer__header">
              <div className="dd-drawer__device-name">{project.name || `Project ${projectId}`}</div>
              <div className="dd-drawer__device-code">ProjectID : {projectId}</div>
            </div>
            <h2 className="dd-drawer__title">Add Controller</h2>
            <div className="dd-drawer__form">
              <label className="dd-drawer__label">Name :</label>
              <input className="dd-drawer__input" type="text" value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Device name" />

              <label className="dd-drawer__label">Type :</label>
              <div className="dd-drawer__status-group">
                {(['solar', 'weather'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`dd-drawer__status-btn ${deviceType === t ? 'dd-drawer__status-btn--active' : ''}`}
                    onClick={() => setDeviceType(t)}
                  >
                    {t === 'solar' ? 'Solar' : 'Weather'}
                  </button>
                ))}
              </div>

              <label className="dd-drawer__label">ProjectID :</label>
              <input className="dd-drawer__input" type="text" value={projectId} disabled />

              <button className="dd-drawer__submit" disabled={submitting} onClick={handleCreateDevice}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
