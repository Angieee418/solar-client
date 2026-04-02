import axios from 'axios'
import type { AxiosInstance } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

export function handleBackendError(data: Record<string, unknown>) {
  if (data && typeof data === 'object' && 'code' in data) {
    if (data.code !== 0 && data.code !== 200) {
      throw new Error((data.message as string) || `Backend returned error, code=${data.code}`)
    }
  }
}

export function handleAxiosError(err: unknown): never {
  if (axios.isAxiosError(err)) {
    if (err.response) {
      const d = err.response.data as Record<string, string> | undefined
      const msg = (d && (d.message || d.error || d.msg)) || `Request failed: ${err.response.status} ${err.response.statusText}`
      throw new Error(msg)
    } else if (err.request) {
      throw new Error('No response from network; please check if network or backend service is running')
    }
  }
  throw new Error((err as Error)?.message || 'Request error, please try again later')
}

export default http
