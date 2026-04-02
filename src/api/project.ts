import http, { handleBackendError, handleAxiosError } from './http'
import type { ProjectModel, ProjectDevicesResponse } from '../models/project'

/**
 * Fetches the full project list for the dashboard and project pages.
 */
export async function getProjects(): Promise<ProjectModel[] | Record<string, unknown>> {
  try {
    const resp = await http.get('/projects')
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Fetches the detail payload for a single project.
 */
export async function getProjectDetail(projectId: string | number): Promise<ProjectModel> {
  if (projectId === undefined || projectId === null) throw new Error('projectId is required')
  const id = typeof projectId === 'object' ? String((projectId as Record<string, unknown>).id || (projectId as Record<string, unknown>)._id || '') : String(projectId)
  if (!id) throw new Error('Invalid projectId')
  try {
    const resp = await http.get(`/projects/${encodeURIComponent(id)}`)
    const data = resp.data
    handleBackendError(data)
    return ((data as Record<string, unknown>)?.data || data) as ProjectModel
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Fetches the devices belonging to a project with optional filter conditions.
 */
export async function getProjectDevices(
  projectId: string | number,
  health?: string,
  keyword?: string
): Promise<ProjectDevicesResponse> {
  if (projectId === undefined || projectId === null) throw new Error('projectId is required')
  const id = typeof projectId === 'object' ? String((projectId as Record<string, unknown>).id || (projectId as Record<string, unknown>)._id || '') : String(projectId)
  if (!id) throw new Error('Invalid projectId')
  try {
    const params: Record<string, string> = {}
    if (health !== undefined && health !== null && String(health) !== '') params.health = health
    if (keyword !== undefined && keyword !== null && String(keyword).trim() !== '') params.keyword = keyword
    const resp = await http.get(`/projects/${encodeURIComponent(id)}/devices`, { params })
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Creates a new project from the add-project form payload.
 */
export async function createProject(payload: { name: string; description: string }): Promise<unknown> {
  if (!payload?.name) throw new Error('name is required')
  try {
    const resp = await http.post('/projects', payload, { baseURL: '' })
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Deletes a project by its identifier.
 */
export async function deleteProject(projectId: string): Promise<unknown> {
  if (!projectId) throw new Error('projectId is required')
  try {
    const resp = await http.delete(`/projects/${encodeURIComponent(projectId)}`)
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}
