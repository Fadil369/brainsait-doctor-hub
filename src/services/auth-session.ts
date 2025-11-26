const TOKEN_KEY = 'brainsait_token'
const REFRESH_TOKEN_KEY = 'brainsait_refresh_token'
const USER_KEY = 'brainsait_user'
const DEVICE_ID_KEY = 'brainsait_device_id'

export interface StoredUser {
  id: string
  username: string
  role?: string
  email?: string
  name?: string
  permissions?: string[]
}

export function storeAuthToken(token?: string) {
  if (!token) {
    sessionStorage.removeItem(TOKEN_KEY)
    return
  }
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function storeRefreshToken(token?: string) {
  if (!token) {
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
    return
  }
  sessionStorage.setItem(REFRESH_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearAuthSession() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(USER_KEY)
}

export function storeUserProfile(user: StoredUser | null) {
  if (!user) {
    sessionStorage.removeItem(USER_KEY)
    return
  }
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getStoredUserProfile(): StoredUser | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredUser
  } catch (error) {
    console.warn('Failed to parse stored user profile', error)
    sessionStorage.removeItem(USER_KEY)
    return null
  }
}

export function getOrCreateDeviceId(): string {
  let deviceId = sessionStorage.getItem(DEVICE_ID_KEY)
  if (!deviceId) {
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|')
    deviceId = btoa(fingerprint).substring(0, 48)
    sessionStorage.setItem(DEVICE_ID_KEY, deviceId)
  }
  return deviceId
}
