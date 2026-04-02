import axios from 'axios'

const AUTH_STORAGE_KEY = 'authUser'

const authHttp = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

/**
 * Payload used when creating a new user account.
 */
export interface RegisterParams {
  email: string
  password: string
}

/**
 * Payload used when signing an existing user into the application.
 */
export interface LoginParams {
  email: string
  password: string
}

/**
 * Represents the authentication data persisted locally after login.
 */
export interface AuthSession {
  id?: string
  userId?: string
  userid?: string
  _id?: string
  nickName?: string
  nickname?: string
  phone?: string
  email?: string
  token?: string
  accessToken?: string
  refreshToken?: string
  [key: string]: unknown
}

/**
 * Sends a registration request to create a new account.
 */
export async function register(params: RegisterParams) {
  try {
    const res = await authHttp.post('/users/register', params)
    return res.data
  } catch (err) {
    throw normalizeAuthError(err, 'register')
  }
}

/**
 * Sends a login request and returns the backend session payload.
 */
export async function login(params: LoginParams) {
  try {
    const res = await authHttp.post('/users/login', params)
    return res.data
  } catch (err) {
    throw normalizeAuthError(err, 'login')
  }
}

/**
 * Persists the current login session in local storage after normalizing key fields.
 */
export function saveAuthSession(session: AuthSession) {
  const normalizedSession = normalizeAuthSession(session)
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalizedSession))
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function pickString(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) return undefined

  for (const key of keys) {
    const value = source[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value)
    }
  }

  return undefined
}

function normalizeAuthError(err: unknown, action: 'register' | 'login') {
  if (axios.isAxiosError(err)) {
    const responseData = asRecord(err.response?.data)
    const responseMessage = pickString(responseData, ['message', 'error', 'msg', 'detail'])
    const normalizedMessage = String(responseMessage || err.message || '').toLowerCase()

    if (action === 'register' && (
      err.response?.status === 409
      || normalizedMessage.includes('email already exists')
      || normalizedMessage.includes('email exists')
      || normalizedMessage.includes('already registered')
      || normalizedMessage.includes('duplicate')
    )) {
      return new Error('Email already exists')
    }

    if (responseMessage) {
      return new Error(responseMessage)
    }

    if (err.request) {
      return new Error('No response from network; please check if network or backend service is running')
    }
  }

  return new Error((err as Error)?.message || 'Request error, please try again later')
}

function findNestedRecord(source: Record<string, unknown> | null, key: string) {
  if (!source) return null

  const value = source[key]
  return asRecord(value)
}

function findAuthUserIdInRecord(source: Record<string, unknown> | null, visited = new Set<Record<string, unknown>>(), depth = 0): string | null {
  if (!source || visited.has(source) || depth > 4) return null

  visited.add(source)

  const directId = pickString(source, ['id', 'userId', 'userid', '_id'])
  if (directId) return directId

  const nestedKeys = ['user', 'data', 'result', 'profile', 'account']
  for (const key of nestedKeys) {
    const nestedRecord = findNestedRecord(source, key)
    const nestedId = findAuthUserIdInRecord(nestedRecord, visited, depth + 1)
    if (nestedId) return nestedId
  }

  for (const value of Object.values(source)) {
    const nestedRecord = asRecord(value)
    const nestedId = findAuthUserIdInRecord(nestedRecord, visited, depth + 1)
    if (nestedId) return nestedId
  }

  return null
}

function normalizeAuthSession(session: AuthSession): AuthSession {
  const userId = findAuthUserIdInRecord(session)
  if (!userId) return session

  return {
    ...session,
    userId: session.userId || userId,
  }
}

/**
 * Reads the persisted login session from local storage.
 */
export function getAuthSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

/**
 * Resolves the current logged-in user's id from the stored session structure.
 */
export function getAuthUserId() {
  const session = getAuthSession()
  if (!session) return null

  return findAuthUserIdInRecord(session)
}

/**
 * Extracts the profile fields needed by the profile page from the stored session.
 */
export function getAuthProfile() {
  const session = getAuthSession()
  if (!session) return null

  const nestedUser = asRecord(session.user)
  const nestedData = asRecord(session.data)

  return {
    userId: getAuthUserId(),
    email:
      pickString(session, ['email'])
      || pickString(nestedUser, ['email'])
      || pickString(nestedData, ['email'])
      || '',
    nickName:
      pickString(session, ['nickName', 'nickname'])
      || pickString(nestedUser, ['nickName', 'nickname'])
      || pickString(nestedData, ['nickName', 'nickname'])
      || '',
    phone:
      pickString(session, ['phone'])
      || pickString(nestedUser, ['phone'])
      || pickString(nestedData, ['phone'])
      || '',
  }
}

/**
 * Updates locally cached profile fields after the profile form is submitted.
 */
export function updateAuthProfile(profile: { email?: string; nickName?: string; phone?: string }) {
  const session = getAuthSession()
  if (!session) return

  const nextSession: AuthSession = {
    ...session,
    email: profile.email ?? session.email,
    nickName: profile.nickName ?? session.nickName,
    phone: profile.phone ?? session.phone,
  }

  const nestedUser = asRecord(session.user)
  if (nestedUser) {
    nextSession.user = {
      ...nestedUser,
      email: profile.email ?? nestedUser.email,
      nickName: profile.nickName ?? nestedUser.nickName ?? nestedUser.nickname,
      nickname: profile.nickName ?? nestedUser.nickname ?? nestedUser.nickName,
      phone: profile.phone ?? nestedUser.phone,
    }
  }

  const nestedData = asRecord(session.data)
  if (nestedData) {
    nextSession.data = {
      ...nestedData,
      email: profile.email ?? nestedData.email,
      nickName: profile.nickName ?? nestedData.nickName ?? nestedData.nickname,
      nickname: profile.nickName ?? nestedData.nickname ?? nestedData.nickName,
      phone: profile.phone ?? nestedData.phone,
    }
  }

  saveAuthSession(nextSession)
}

/**
 * Indicates whether the app currently has enough session data to treat the user as logged in.
 */
export function isAuthenticated() {
  const session = getAuthSession()
  if (!session) return false

  return Boolean(session.token || session.accessToken || session.email)
}

/**
 * Clears the locally stored login session during logout.
 */
export function clearAuthSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
