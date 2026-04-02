import axios from 'axios'
import { getAuthSession } from './auth'
import { handleBackendError, handleAxiosError } from './http'

export interface UpdateUserProfilePayload {
  email: string
  nickName: string
  phone: string
}

export async function updateUserProfile(userId: string, payload: UpdateUserProfilePayload) {
  if (!userId) throw new Error('userId is required')

  const session = getAuthSession()
  const token = String(session?.accessToken || session?.token || '')

  try {
    const resp = await axios.put(`http://localhost:8000/users/${encodeURIComponent(userId)}`, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 15000,
    })
    const data = resp.data
    handleBackendError(data)
    return data
  } catch (err) {
    handleAxiosError(err)
  }
}