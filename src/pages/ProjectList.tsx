import React, { useEffect, useState, useCallback, useRef } from 'react'
import { Alert, Empty, Spin, message, Popconfirm } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { getProjects, createProject, deleteProject } from '../api'
import AntdIcon from '../components/AntdIcon'
import type { ProjectModel, HealthStatus } from '../models/project'

function getProjectId(project: ProjectModel): string | null {
  return project.id || project.projectId || project._id || null
}

function toNumber(value: unknown): number | null {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : null
}

function readCount(source: Record<string, unknown> | undefined | null, keys: string[]): number | null {
  if (!source || typeof source !== 'object') return null
  for (const key of keys) {
    const numericValue = toNumber(source[key])
    if (numericValue !== null) return numericValue
  }
  return null
}

function normalizeStatus(value: unknown): HealthStatus | null {
  const rawValue = typeof value === 'string'
    ? value
    : (value as Record<string, string>)?.status
      || (value as Record<string, string>)?.health
      || (value as Record<string, string>)?.state
      || (value as Record<string, string>)?.connectionStatus
      || (value as Record<string, string>)?.deviceStatus

  const normalized = String(rawValue || '').trim().toLowerCase()

  if (['ok', 'online', 'healthy', 'good', 'normal'].includes(normalized)) return 'ok'
  if (['warning', 'warn', 'alarm', 'abnormal', 'bad'].includes(normalized)) return 'warning'
  if (['offline', 'disconnected', 'down'].includes(normalized)) return 'offline'
  return null
}

interface StatusCountResult { offline: number; warning: number; ok: number }

function getStatusCounts(project: ProjectModel): StatusCountResult {
  const summarySources = [
    project.statusCounts,
    project.deviceStatusCounts,
    project.deviceHealthCounts,
    project.healthSummary,
    project.summary,
  ]

  for (const source of summarySources) {
    const offline = readCount(source as Record<string, unknown> | undefined, ['offline', 'offlineCount', 'offLineCount'])
    const warning = readCount(source as Record<string, unknown> | undefined, ['warning', 'warningCount', 'warn', 'warnCount'])
    const ok = readCount(source as Record<string, unknown> | undefined, ['ok', 'okCount', 'online', 'onlineCount', 'healthy', 'healthyCount'])

    if ([offline, warning, ok].some((v) => v !== null)) {
      return { offline: offline ?? 0, warning: warning ?? 0, ok: ok ?? 0 }
    }
  }

  const devices = Array.isArray(project.devices) ? project.devices : []
  if (devices.length > 0) {
    return devices.reduce(
      (acc, device) => {
        const s = normalizeStatus(device)
        if (s) acc[s] += 1
        return acc
      },
      { offline: 0, warning: 0, ok: 0 },
    )
  }

  const projectStatus = normalizeStatus(project.health || project.status)
  if (projectStatus) {
    return {
      offline: projectStatus === 'offline' ? 1 : 0,
      warning: projectStatus === 'warning' ? 1 : 0,
      ok: projectStatus === 'ok' ? 1 : 0,
    }
  }

  return { offline: 0, warning: 0, ok: 0 }
}

function getDeviceCount(project: ProjectModel, type: string): number {
  const counts = (project.deviceCounts || {}) as Record<string, number | undefined>
  const devices = Array.isArray(project.devices) ? project.devices : []
  const normalizedType = type.toLowerCase()

  if (normalizedType === 'solar') {
    return counts.solarController
      || counts.solarControllers
      || counts.solar
      || project.solarControllerCount
      || devices.filter((d) => (d.type || d.category || '').toLowerCase().includes('solar')).length
      || 0
  }

  return counts.weatherSensor
    || counts.weatherSensors
    || counts.weather
    || project.weatherSensorCount
    || devices.filter((d) => (d.type || d.category || '').toLowerCase().includes('weather')).length
    || 0
}

function StatusBadge({ variant, count }: { variant: string; count: number }) {
  return (
    <span className={`project-status-badge project-status-badge--${variant}`}>
      {count}
    </span>
  )
}

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectModel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const PAGE_SIZE = 6
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  const hasMore = visibleCount < projects.length
  const visibleProjects = projects.slice(0, visibleCount)

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    setTimeout(() => {
      setVisibleCount(prev => Math.min(prev + PAGE_SIZE, projects.length))
      setLoadingMore(false)
    }, 300)
  }, [loadingMore, hasMore, projects.length])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [projName, setProjName] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleCreateProject() {
    if (!projName.trim()) { message.warning('Please enter a project name'); return }
    try {
      setSubmitting(true)
      await createProject({ name: projName.trim(), description: projDesc.trim() })
      message.success('Project created')
      setDrawerOpen(false)
      setProjName('')
      setProjDesc('')
      // reload projects
      const data = await getProjects()
      const list = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>)?.data || (data as Record<string, unknown>)?.projects || []) as ProjectModel[]
      setProjects(list)
      setVisibleCount(PAGE_SIZE)
    } catch (err: unknown) {
      message.error((err as Error).message || 'Failed to create project')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteProjectConfirm(project: ProjectModel) {
    const id = getProjectId(project)
    if (!id) { message.error('Invalid project ID'); return }
    try {
      setLoading(true)
      await deleteProject(id)
      message.success('Project deleted')
      setProjects((prev) => prev.filter(p => getProjectId(p) !== id))
    } catch (err: unknown) {
      message.error((err as Error).message || 'Delete failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    async function loadProjects() {
      setLoading(true)
      setError(null)
      try {
        const data = await getProjects()
        const list = Array.isArray(data)
          ? data
          : ((data as Record<string, unknown>)?.data || (data as Record<string, unknown>)?.projects || []) as ProjectModel[]
        if (mounted) setProjects(list)
      } catch (err: unknown) {
        if (mounted) setError((err as Error).message || 'Failed to load projects')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadProjects()
    return () => { mounted = false }
  }, [])

  function handleClick(project: ProjectModel) {
    const id = getProjectId(project)
    if (!id) {
      setError('Current project is missing an ID; cannot view details')
      return
    }
    setError(null)
    sessionStorage.setItem('currentProject', JSON.stringify(project))
    navigate(`/projects/${id}`)
  }

  return (
    <div className="pd-page">
      <div className="pd-panel">
        <div className="pd-header">
          <div className="pd-header__title">My Project</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="breadcrumb"><span className="breadcrumb__current">Home</span></div>
            <button className="dd-add-data-btn" onClick={() => setDrawerOpen(true)}>+ Add Project</button>
          </div>
        </div>

        {loading ? (
          <div className="pd-loading"><Spin size="large" /></div>
        ) : (
          <>
            {error ? (
              <Alert message="Failed to load project list" description={error} type="error" showIcon style={{ marginBottom: 16 }} />
            ) : null}

            {projects.length === 0 ? (
              <Empty description="No projects" />
            ) : (
              <div className="project-list">
                {visibleProjects.map((project, index) => {
                  const name = project.name || project.projectName || project.title || 'Unnamed project'
                  const solarController = getDeviceCount(project, 'solar')
                  const weatherSensor = getDeviceCount(project, 'weather')
                  const statusCounts = getStatusCounts(project)
                  const key = getProjectId(project) || `${name}-${index}`

                  const totalDevices = Array.isArray(project.devices) ? project.devices.length : (solarController + weatherSensor)
                  return (
                    <div key={key} className="project-list-card" onClick={() => handleClick(project)} style={{ cursor: 'pointer' }}>
                      <div className="project-list-card__name">{name}</div>
                      <div className="project-list-card__meta">
                        <span>Solar:{solarController}</span>
                        <span>Weather:{weatherSensor}</span>
                      </div>
                      <div className="project-list-card__footer">
                        <div className="project-status-list" aria-label={`${name} status summary`}>
                          <StatusBadge variant="offline" count={statusCounts.offline} />
                          <StatusBadge variant="warning" count={statusCounts.warning} />
                          <StatusBadge variant="ok" count={statusCounts.ok} />
                        </div>
                        {totalDevices === 0 ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Popconfirm
                              title="Confirm delete this project?"
                              onConfirm={() => handleDeleteProjectConfirm(project)}
                              okText="Delete"
                              cancelText="Cancel"
                            >
                              <AntdIcon component={DeleteOutlined} className="project-list-card__delete" />
                            </Popconfirm>
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
                <div ref={sentinelRef} style={{ height: 1 }} />
                {loadingMore && <div className="pd-loading" style={{ padding: '12px 0' }}><Spin /></div>}
                {hasMore ? (
                  <div className="pd-count">Swipe up to show more</div>
                ) : (
                  <div className="pd-count" style={{ color: '#bbb' }}>No more projects</div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Project Drawer */}
      {drawerOpen && (
        <div className="dd-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="dd-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dd-drawer__header">
              <div className="dd-drawer__device-name">New Project</div>
            </div>
            <h2 className="dd-drawer__title">Add Project</h2>
            <div className="dd-drawer__form">
              <label className="dd-drawer__label">Name :</label>
              <input className="dd-drawer__input" type="text" value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="Project name" />

              <label className="dd-drawer__label">Description :</label>
              <input className="dd-drawer__input" type="text" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} placeholder="Project description" />

              <button className="dd-drawer__submit" disabled={submitting} onClick={handleCreateProject}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
