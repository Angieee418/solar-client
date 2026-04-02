import axios from 'axios'
import http, { handleBackendError, handleAxiosError } from './http'
import type { DeviceDataResponse, IngestPayload } from '../models/device'

/**
 * Fetches historical telemetry for a single device within an optional time range.
 */
export async function getDeviceData(
  deviceId: string | number,
  from?: string,
  to?: string
): Promise<DeviceDataResponse> {
  if (deviceId === undefined || deviceId === null) throw new Error('deviceId is required')
  const id = typeof deviceId === 'object' ? String((deviceId as Record<string, unknown>).id || (deviceId as Record<string, unknown>).deviceId || (deviceId as Record<string, unknown>)._id || '') : String(deviceId)
  if (!id) throw new Error('Invalid deviceId')
  try {
    const params: Record<string, string> = {}
    if (from !== undefined && from !== null && String(from) !== '') params.from = from
    if (to !== undefined && to !== null && String(to) !== '') params.to = to
    const resp = await axios.get(`http://localhost:8000/api/devices/${encodeURIComponent(id)}`, {
      params,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })
    const data = resp.data
    handleBackendError(data)
    return data
  
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Fetches the latest detail payload for a single device.
 */
export async function getDeviceInfo(deviceId: string): Promise<Record<string, unknown>> {
  const resp = await axios.get(`http://localhost:8000/api/devices/${encodeURIComponent(deviceId)}`, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  })
  return resp.data
}

/**
 * Fetches the device list used by the devices overview page.
 */
export async function getDevices(): Promise<Record<string, unknown>[]> {
  try {
    const resp = await http.get('/devices')
    const data = resp.data
    handleBackendError(data)
    return Array.isArray(data) ? data : (data?.data || data?.devices || [])
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Sends telemetry data to the ingest endpoint for simulation or manual testing.
 */
export async function ingestTelemetry(payload: IngestPayload): Promise<unknown> {
  if (!payload || typeof payload !== 'object') throw new Error('payload must be an object')
  try {
    const resp = await axios.post('http://localhost:8000/api/ingest', payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Creates a new device and associates it with a project.
 */
export async function createDevice(payload: { name: string; type: string; projectId: string | number; deviceId: string }): Promise<unknown> {
  if (!payload?.name) throw new Error('name is required')
  try {
    const resp = await http.post('/devices', payload)
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}

/**
 * Deletes a device by its identifier.
 */
export async function deleteDevice(deviceId: string): Promise<unknown> {
  if (!deviceId) throw new Error('deviceId is required')
  try {
    const resp = await http.delete(`/devices/${encodeURIComponent(deviceId)}`)
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}
