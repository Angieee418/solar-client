import React, { useEffect, useState, useContext } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Spin, Tag, message } from 'antd'
import ReactECharts from 'echarts-for-react'
import { getDeviceData, getDeviceInfo, ingestTelemetry } from '../api'
import { ProjectContext } from '../context/ProjectContext'
import type { DeviceMeta, TelemetryPoint, IngestPayload } from '../models/device'
import '../styles/index.css'

export default function DeviceDetail() {
  const { id } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(false)
  const [deviceMeta, setDeviceMeta] = useState<Partial<DeviceMeta>>({})
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>([])
  const [rawTelemetry, setRawTelemetry] = useState<TelemetryPoint[]>([])
  const [error, setError] = useState<string | null>(null)
  const { projectId: ctxProjectId } = useContext(ProjectContext)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      // Fetch last 24 hours of data (includes device info + telemetry)
      const to = Date.now()
      const from = to - 60 * 60 * 1000 * 24
      const mydata = await getDeviceData(id, new Date(from).toISOString(), new Date(to).toISOString())

      const data = (mydata as any)?.data || {}
      const deviceInfoBlock = data.device_info || {}

      // 解析 trend_data 和 telemetries
      const trendRaw: any[] = Array.isArray(data.trend_data) ? data.trend_data : []
      const telemetriesRaw: any[] = Array.isArray(data.telemetries) ? data.telemetries : []

      // 将嵌套的 metrics 展平，方便图表和展示使用
      function flattenPoint(p: any) {
        const metrics = (p.metrics && typeof p.metrics === 'object') ? p.metrics : {}
        return { ...metrics, ...p, timestamp: p.ts || p.timestamp }
      }

      const points = trendRaw.map(flattenPoint)
      const rawList = telemetriesRaw.map(flattenPoint)

      points.sort((a: any, b: any) => {
        const ta = new Date(a.timestamp || a.time || a.ts || '0').getTime()
        const tb = new Date(b.timestamp || b.time || b.ts || '0').getTime()
        return ta - tb
      })

      setTelemetry(points)
      setRawTelemetry(rawList.length ? rawList : points)

      setDeviceMeta({
        deviceId: deviceInfoBlock.deviceId || id,
        name: deviceInfoBlock.name || id,
        projectId: ctxProjectId || deviceInfoBlock.projectId || '',
        lastSeen: deviceInfoBlock.lastSeen || (points.length ? points[points.length - 1].timestamp : null),
        health: deviceInfoBlock.health || 'offline',
        deviceType: deviceInfoBlock.type,
        metrics: deviceInfoBlock.metrics,
      })
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to load device data')
    } finally {
      setLoading(false)
    }
  }

  function formatDate(val: string | number | null | undefined): string {
    if (!val) return '-'
    const d = new Date(val)
    if (isNaN(d.getTime())) return String(val)
    return d.toLocaleString()
  }

  function healthTag(h: string | undefined) {
    const s = (h || '').toString().toLowerCase()
    if (s === 'ok') return <Tag className="health-tag-ok">OK</Tag>
    if (s === 'warning') return <Tag className="health-tag-warning">Warning</Tag>
    return <Tag className="health-tag-offline">Offline</Tag>
  }

  function buildChartOption(points: TelemetryPoint[]) {
    if (!points || points.length === 0) {
      return { title: { text: 'No data' }, tooltip: {}, xAxis: { type: 'time' as const }, yAxis: { type: 'value' as const }, series: [] }
    }

    function getNested(obj: Record<string, any>, path: string[]): unknown {
      let cur: any = obj
      for (const k of path) {
        if (cur == null) return undefined
        cur = cur[k]
      }
      return cur
    }

    const isWeather = (deviceMeta?.deviceType || '').toString().toLowerCase().includes('weather')
    const forcedPath = isWeather ? ['metrics', 'temperature'] : ['metrics', 'batterySoc']
    const hasForced = points.some(p => {
      const v = getNested(p as Record<string, any>, forcedPath)
      return v != null && !isNaN(Number(v))
    })

    const tsKeys = ['timestamp', 'time', 'ts', 'createdAt', '_ts']
    const prefer = ['batterySoc', 'loadPower', 'temperature', 'irradiance', 'value', 'val', 'v']

    const sampleSize = Math.min(points.length, 50)
    const keyCounts: Record<string, number> = {}
    for (let i = 0; i < sampleSize; i++) {
      const p = points[points.length - 1 - i] || {}
      Object.keys(p).forEach(k => {
        if (tsKeys.includes(k)) return
        const v = (p as Record<string, any>)[k]
        if (v != null && !isNaN(Number(v))) {
          keyCounts[k] = (keyCounts[k] || 0) + 1
        }
      })
    }

    let key: string | null = null
    for (const pref of prefer) {
      if (keyCounts[pref]) { key = pref; break }
    }
    if (!key) {
      const entries = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])
      if (entries.length) key = entries[0][0]
    }
    if (!key) {
      const last = points[points.length - 1] || {}
      const candidate = Object.keys(last).find(k => !tsKeys.includes(k))
      key = candidate || 'value'
    }

    const seriesData = points.map(p => {
      const t = new Date(p.timestamp || p.time || p.ts || p.createdAt || p._ts || Date.now()).getTime()
      let v: unknown = null
      if (hasForced) v = getNested(p as Record<string, any>, forcedPath)
      else v = (p as Record<string, any>)[key!]
      return [t, v != null ? Number(v) : null] as [number, number | null]
    }).filter(item => item[1] !== null)

    return {
      title: { text: key || 'metric' },
      tooltip: { trigger: 'axis' as const },
      xAxis: { type: 'time' as const, name: 'Time' },
      yAxis: { type: 'value' as const, name: key },
      legend: { data: [key] },
      series: [{ name: key, type: 'line' as const, showSymbol: true, data: seriesData, connectNulls: true }],
    }
  }

  async function handleSimulate() {
    const sendDeviceId = deviceMeta?.deviceId || id
    if (!sendDeviceId) return
    const payload: IngestPayload = {
      deviceId: sendDeviceId,
      projectId: Number(deviceMeta?.projectId || ctxProjectId) || 0,
      type: (deviceMeta?.deviceType || 'solar').toLowerCase(),
      ts: new Date().toISOString(),
      metrics: {
        batterySoc: Math.round(Math.random() * 100),
        loadPower: Math.round(Math.random() * 200),
        temperature: (Math.random() * 30 + 5).toFixed(1),
        humidity: (Math.random() * 40 + 30).toFixed(1),
        status: 'ok',
      },
    }
    try {
      setLoading(true)
      await ingestTelemetry(payload)
      message.success('Simulated telemetry sent, refreshing data')
      await loadData()
    } catch (err: unknown) {
      message.error((err as Error).message || 'Failed to send data')
    } finally {
      setLoading(false)
    }
  }

  const chartOption = buildChartOption(telemetry)

  const now = Date.now()
  const nowHourFloor = new Date(now)
  nowHourFloor.setMinutes(0, 0, 0)
  const maxTime = nowHourFloor.getTime() + 3 * 60 * 60 * 1000
  const minTime = maxTime - 24 * 60 * 60 * 1000
  const themedChartOption = {
    ...chartOption,
    title: { ...chartOption.title, textStyle: { color: '#4f5a70', fontSize: 14, fontWeight: 600 } },
    tooltip: { ...chartOption.tooltip, trigger: 'axis' as const, formatter: (params: any) => {
      const list = Array.isArray(params) ? params : [params]
      if (!list.length) return ''
      const t = new Date(list[0].value[0])
      const time = `${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`
      return list.map((p: any) => `${time}<br/>${p.marker} ${p.seriesName}: ${p.value[1]}`).join('<br/>')
    }},
    xAxis: {
      type: 'value' as const,
      name: 'Time',
      min: minTime,
      max: maxTime,
      interval: 3 * 60 * 60 * 1000,
      axisLine: { lineStyle: { color: '#c4b5fd' } },
      axisLabel: {
        color: '#7c6dab',
        formatter: (val: number) => {
          const d = new Date(val)
          return `${String(d.getHours()).padStart(2, '0')}:00`
        },
      },
    },
    yAxis: { ...chartOption.yAxis, axisLine: { lineStyle: { color: '#c4b5fd' } }, splitLine: { lineStyle: { color: '#ede9fe' } }, axisLabel: { color: '#7c6dab' } },
    series: (chartOption.series || []).map(s => ({
      ...s,
      lineStyle: { color: '#7c3aed', width: 2 },
      itemStyle: { color: '#7c3aed' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(124,58,237,0.18)' }, { offset: 1, color: 'rgba(124,58,237,0.02)' }] } },
    })),
  }

  const [activeTab, setActiveTab] = useState<'trend' | 'raw'>('trend')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const isWeatherDevice = (deviceMeta?.deviceType || '').toString().toLowerCase().includes('weather')
  const [solarForm, setSolarForm] = useState({ pvVoltage: '', pvCurrent: '', batterySoc: '', loadPower: '' })
  const [weatherForm, setWeatherForm] = useState({ temperature: '', humidity: '', windSpeed: '', rainfall: '', irradiance: '' })
  const [formStatus, setFormStatus] = useState<'ok' | 'offline' | 'warning'>('ok')
  const [submitting, setSubmitting] = useState(false)

  function handleSolarChange(field: string, value: string) {
    setSolarForm(prev => ({ ...prev, [field]: value }))
  }
  function handleWeatherChange(field: string, value: string) {
    setWeatherForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit() {
    const sendDeviceId = deviceMeta?.deviceId || id
    if (!sendDeviceId) return
    const metrics: Record<string, number | string | undefined> = { status: formStatus }
    if (isWeatherDevice) {
      if (weatherForm.temperature) metrics.temperature = parseFloat(weatherForm.temperature)
      if (weatherForm.humidity) metrics.humidity = parseFloat(weatherForm.humidity)
      if (weatherForm.windSpeed) metrics.windSpeed = parseFloat(weatherForm.windSpeed)
      if (weatherForm.rainfall) metrics.rainfall = parseFloat(weatherForm.rainfall)
      if (weatherForm.irradiance) metrics.irradiance = parseFloat(weatherForm.irradiance)
    } else {
      if (solarForm.pvVoltage) metrics.pvVoltage = parseFloat(solarForm.pvVoltage)
      if (solarForm.pvCurrent) metrics.pvCurrent = parseFloat(solarForm.pvCurrent)
      if (solarForm.batterySoc) metrics.batterySoc = parseFloat(solarForm.batterySoc)
      if (solarForm.loadPower) metrics.loadPower = parseFloat(solarForm.loadPower)
    }
    const payload: IngestPayload = {
      deviceId: sendDeviceId,
      projectId: Number(deviceMeta?.projectId || ctxProjectId) || 0,
      type: (deviceMeta?.deviceType || 'solar').toLowerCase(),
      ts: new Date().toISOString(),
      metrics,
    }
    try {
      setSubmitting(true)
      await ingestTelemetry(payload)
      message.success('Data submitted successfully')
      setDrawerOpen(false)
      setSolarForm({ pvVoltage: '', pvCurrent: '', batterySoc: '', loadPower: '' })
      setWeatherForm({ temperature: '', humidity: '', windSpeed: '', rainfall: '', irradiance: '' })
      await loadData()
    } catch (err: unknown) {
      message.error((err as Error).message || 'Failed to send data')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dd-page">
      <div className="dd-panel">
        {loading ? (
          <div className="dd-loading"><Spin size="large" /></div>
        ) : (
          <>
            {/* Device header */}
            <div className="dd-header">
              <div className="dd-header__name">{deviceMeta.name || id}</div>
              {/* Breadcrumb */}
              <div className="breadcrumb">
                <Link className="breadcrumb__link" to="/">Home</Link>
                {deviceMeta.projectId ? (
                  <>
                    <span className="breadcrumb__sep">/</span>
                    <Link className="breadcrumb__link" to={`/projects/${encodeURIComponent(deviceMeta.projectId)}`}>Project</Link>
                  </>
                ) : null}
                <span className="breadcrumb__sep">/</span>
                <span className="breadcrumb__current">{deviceMeta.name || id}</span>
              </div>
            </div>

            {/* Info card */}
            <div className="dd-info-card">
              <div className="dd-info-row">
                <span className="dd-info-label">Code :</span>
                <span className="dd-info-value">{deviceMeta.deviceId || id}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">ProjectID :</span>
                <span className="dd-info-value">{deviceMeta.projectId || '-'}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">Type :</span>
                <span className="dd-info-value">{deviceMeta.deviceType || '-'}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">LastSeen :</span>
                <span className="dd-info-value">{formatDate(deviceMeta.lastSeen)}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-label">Health :</span>
                <span className="dd-info-value">{healthTag(deviceMeta.health)}</span>
              </div>
            </div>

            {error && <div className="dd-error">{error}</div>}

            {/* Tabs */}
            <div className="dd-tabs">
              <button
                className={`dd-tabs__btn ${activeTab === 'trend' ? 'dd-tabs__btn--active' : ''}`}
                onClick={() => setActiveTab('trend')}
              >
                Trend <span className="dd-tabs__btn-sub">(last 24h)</span>
              </button>
              <button
                className={`dd-tabs__btn ${activeTab === 'raw' ? 'dd-tabs__btn--active' : ''}`}
                onClick={() => setActiveTab('raw')}
              >
                Raw Data
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'trend' ? (
              <div className="dd-chart-card">
                {telemetry.length === 0 ? (
                  <div className="dd-empty">No trend data</div>
                ) : (
                  <ReactECharts option={themedChartOption} style={{ height: 320 }} />
                )}
              </div>
            ) : (
              <div className="dd-raw-card">
                <pre className="dd-raw-pre">{JSON.stringify((rawTelemetry || []).slice().reverse().slice(0, 20), null, 2)}</pre>
              </div>
            )}

            {/* Add data button */}
            <div className="dd-add-data-row">
              <button className="dd-add-data-btn" onClick={() => setDrawerOpen(true)}>+ Add data</button>
            </div>
          </>
        )}
      </div>

      {/* Add Data Drawer */}
      {drawerOpen && (
        <div className="dd-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="dd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dd-drawer__header">
              <div className="dd-drawer__device-name">{deviceMeta.name || id}</div>
              <div className="dd-drawer__device-code">Code : {deviceMeta.deviceId || id}</div>
            </div>
            <h2 className="dd-drawer__title">Add Data</h2>
            <div className="dd-drawer__form">
              {isWeatherDevice ? (
                <>
                  <label className="dd-drawer__label">temperature :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={weatherForm.temperature} onChange={(e) => handleWeatherChange('temperature', e.target.value)} />

                  <label className="dd-drawer__label">humidity :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={weatherForm.humidity} onChange={(e) => handleWeatherChange('humidity', e.target.value)} />

                  <label className="dd-drawer__label">windSpeed :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={weatherForm.windSpeed} onChange={(e) => handleWeatherChange('windSpeed', e.target.value)} />

                  <label className="dd-drawer__label">rainfall :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={weatherForm.rainfall} onChange={(e) => handleWeatherChange('rainfall', e.target.value)} />

                  <label className="dd-drawer__label">irradiance :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={weatherForm.irradiance} onChange={(e) => handleWeatherChange('irradiance', e.target.value)} />
                </>
              ) : (
                <>
                  <label className="dd-drawer__label">pvVoltage :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={solarForm.pvVoltage} onChange={(e) => handleSolarChange('pvVoltage', e.target.value)} />

                  <label className="dd-drawer__label">pvCurrent :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={solarForm.pvCurrent} onChange={(e) => handleSolarChange('pvCurrent', e.target.value)} />

                  <label className="dd-drawer__label">batterySoc :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={solarForm.batterySoc} onChange={(e) => handleSolarChange('batterySoc', e.target.value)} />

                  <label className="dd-drawer__label">loadPower :</label>
                  <input className="dd-drawer__input" type="number" step="any" value={solarForm.loadPower} onChange={(e) => handleSolarChange('loadPower', e.target.value)} />
                </>
              )}

              <label className="dd-drawer__label">status :</label>
              <div className="dd-drawer__status-group">
                {(['ok', 'offline', 'warning'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`dd-drawer__status-btn ${formStatus === s ? 'dd-drawer__status-btn--active' : ''}`}
                    onClick={() => setFormStatus(s)}
                  >
                    {s === 'ok' ? 'Online' : s === 'offline' ? 'Offline' : 'Warning'}
                  </button>
                ))}
              </div>

              <button className="dd-drawer__submit" disabled={submitting} onClick={handleSubmit}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
