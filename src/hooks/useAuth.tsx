import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { toast } from 'sonner'
import { authService, type AuthResponse } from '@/services/auth-secure'
import { isBackendEnabled } from '@/lib/api-client'

// Types for authentication
export interface User {
  id: string
  username: string
  email?: string
  name: string
  role: 'doctor' | 'nurse' | 'admin' | 'specialist'
  licenseNumber?: string
  specialty?: string
  avatar?: string
  permissions?: string[]
  lastLogin?: Date
  mfaEnabled?: boolean
}

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  mfaRequired: boolean
  verifyMFA: (code: string) => Promise<void>
  refreshToken: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Healthcare-specific mock users for development
const MOCK_USERS: Record<string, Omit<User, 'lastLogin'> & { password: string; mfaRequired: boolean }> = {
  'dr.ahmed': {
    id: '1',
    username: 'dr.ahmed',
    email: 'dr.ahmed@hospital.sa',
    name: 'د. أحمد محمد',
    role: 'doctor',
    licenseNumber: 'SMC-12345',
    specialty: 'Cardiology',
    password: 'SecurePass2024!',
    permissions: ['read:patients', 'write:patients', 'telemedicine', 'nphies:submit'],
    mfaEnabled: true,
    mfaRequired: false
  },
  'dr.sarah': {
    id: '2',
    username: 'dr.sarah',
    email: 'dr.sarah@hospital.sa',
    name: 'د. سارة علي',
    role: 'specialist',
    licenseNumber: 'SMC-23456',
    specialty: 'Neurology',
    password: 'SecurePass2024!',
    permissions: ['read:patients', 'telemedicine', 'admin:reports'],
    mfaEnabled: false,
    mfaRequired: false
  },
  'nurse.maryam': {
    id: '3',
    username: 'nurse.maryam',
    email: 'nurse.maryam@hospital.sa',
    name: 'ماريام أحمد',
    role: 'nurse',
    licenseNumber: 'SNF-34567',
    specialty: 'Emergency Medicine',
    password: 'SecurePass2024!',
    permissions: ['read:patients', 'write:vitals'],
    mfaEnabled: false,
    mfaRequired: false
  },
  'admin.hassan': {
    id: '4',
    username: 'admin.hassan',
    email: 'admin.hassan@hospital.sa',
    name: 'حسان محمد',
    role: 'admin',
    licenseNumber: 'ADM-45678',
    specialty: 'Healthcare Administration',
    password: 'SecurePass2024!',
    permissions: ['admin:*'],
    mfaEnabled: false,
    mfaRequired: false
  },
  // Super Admin - Full access to all features (DEVELOPMENT ONLY - use environment variables in production)
  'super.admin': {
    id: 'super-admin-001',
    username: 'super.admin',
    email: 'superadmin@brainsait.sa',
    name: 'Super Administrator',
    role: 'admin',
    licenseNumber: 'SA-ADMIN-001',
    specialty: 'System Administration',
    password: 'SuperAdmin2024!', // TODO: Move to environment variables for production
    permissions: ['admin:*'], // Full admin access
    mfaEnabled: false,
    mfaRequired: false
  },
  // Dr. Fadil - Doctor with super admin privileges (DEVELOPMENT ONLY)
  'dr.fadil': {
    id: 'dr-fadil-001',
    username: 'dr.fadil',
    email: 'dr.fadil@brainsait.sa',
    name: 'Dr. Fadil',
    role: 'doctor',
    licenseNumber: 'SCFHS-DOC-001',
    specialty: 'General Practice',
    password: 'DrFadil2024!', // TODO: Move to environment variables for production
    permissions: ['admin:*', 'patients:*', 'appointments:*', 'claims:*'], // Full access
    mfaEnabled: false,
    mfaRequired: false
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const backendEnabled = isBackendEnabled()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [pendingUsername, setPendingUsername] = useState<string>('')

  const mapBackendUser = (authUser: NonNullable<AuthResponse['user']>): User => ({
    id: authUser.id,
    username: authUser.username,
    email: authUser.email,
    name: authUser.name,
    role: authUser.role,
    permissions: authUser.permissions,
    lastLogin: new Date(),
  })

  const mapStoredUser = () => {
    const stored = authService.getCurrentUser()
    if (!stored) return null
    return {
      id: stored.id,
      username: stored.username,
      email: stored.email,
      name: stored.name || stored.username,
      role: (stored.role as User['role']) || 'doctor',
      permissions: stored.permissions,
      lastLogin: new Date(),
    } satisfies User
  }

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (backendEnabled) {
          const stored = mapStoredUser()
          if (stored) {
            setUser(stored)
            return
          }

          const valid = await authService.validateSession()
          if (valid) {
            const refreshed = mapStoredUser()
            if (refreshed) {
              setUser(refreshed)
            }
          }
          return
        }

        const savedUser = localStorage.getItem('brainsait_user')
        const token = localStorage.getItem('brainsait_token')
        const tokenExpiry = localStorage.getItem('brainsait_token_expiry')

        if (savedUser && token && tokenExpiry) {
          const expiry = new Date(tokenExpiry)
          if (expiry > new Date()) {
            const userData = JSON.parse(savedUser)
            setUser({ ...userData, lastLogin: new Date(userData.lastLogin) })
          } else {
            await logout()
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        toast.error('Authentication initialization failed')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [backendEnabled])

  const handleBackendLogin = async (username: string, password: string) => {
    const response = await authService.login({ username, password })

    if (response.requiresMFA) {
      setPendingUsername(username)
      setMfaRequired(true)
      toast.info('Additional verification required. Enter your MFA code to continue.')
      return
    }

    if (response.success && response.user) {
      const mappedUser = mapBackendUser(response.user)
      setUser(mappedUser)
      setMfaRequired(false)
      setPendingUsername('')
      toast.success(`Welcome back, ${mappedUser.name}!`)
      return
    }

    throw new Error(response.error || 'Authentication failed')
  }

  const login = async (username: string, password: string, rememberMe = false) => {
    setIsLoading(true)

    try {
      if (backendEnabled) {
        await handleBackendLogin(username, password)
        return
      }

      await new Promise(resolve => setTimeout(resolve, 1000))

      const mockUser = MOCK_USERS[username]

      if (!mockUser || mockUser.password !== password) {
        throw new Error('Invalid username or password')
      }

      if (mockUser.mfaEnabled) {
        setPendingUsername(username)
        setMfaRequired(true)
        return
      }

      await completeMockLogin(mockUser, rememberMe)

    } catch (error) {
      console.error('Login error:', error)
      toast.error(error instanceof Error ? error.message : 'Login failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const completeMockLogin = async (userData: Omit<User, 'lastLogin'>, rememberMe = false) => {
    const now = new Date()
    const tokenExpiry = rememberMe
      ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
      : new Date(now.getTime() + 24 * 60 * 60 * 1000)    // 24 hours

    const user: User = {
      ...userData,
      lastLogin: now
    }

    setUser(user)
    setMfaRequired(false)
    setPendingUsername('')

    // Store authentication data
    localStorage.setItem('brainsait_user', JSON.stringify(user))
    localStorage.setItem('brainsait_token', 'mock-jwt-token-' + Date.now())
    localStorage.setItem('brainsait_token_expiry', tokenExpiry.toISOString())

    toast.success(`Welcome back, ${user.name}!`)
  }

  const verifyMFA = async (code: string) => {
    setIsLoading(true)

    try {
      if (backendEnabled) {
        if (!pendingUsername) {
          throw new Error('No MFA session in progress')
        }
        const response = await authService.verifyMFA({ username: pendingUsername, code })
        if (response.success && response.user) {
          const mappedUser = mapBackendUser(response.user)
          setUser(mappedUser)
          setMfaRequired(false)
          setPendingUsername('')
          toast.success('Verification successful')
          return
        }
        throw new Error(response.error || 'Invalid MFA code')
      }

      await new Promise(resolve => setTimeout(resolve, 800))

      if (code === '123456') {
        const mockUser = MOCK_USERS[pendingUsername]
        if (mockUser) {
          await completeMockLogin(mockUser)
        } else {
          throw new Error('User not found')
        }
      } else {
        throw new Error('Invalid MFA code')
      }

    } catch (error) {
      console.error('MFA verification error:', error)
      toast.error(error instanceof Error ? error.message : 'MFA verification failed')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)
    try {
      if (backendEnabled) {
        await authService.logout()
      } else {
        localStorage.removeItem('brainsait_user')
        localStorage.removeItem('brainsait_token')
        localStorage.removeItem('brainsait_token_expiry')
      }

      setUser(null)
      setMfaRequired(false)
      setPendingUsername('')
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Logout failed')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshToken = async () => {
    if (backendEnabled) {
      const valid = await authService.validateSession()
      if (valid) {
        const refreshed = mapStoredUser()
        if (refreshed) {
          setUser(refreshed)
        }
        toast.success('Session refreshed successfully')
      }
      return
    }

    if (user) {
      const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
      localStorage.setItem('brainsait_token_expiry', newExpiry.toISOString())
      toast.success('Session refreshed successfully')
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('Not authenticated')

    const updatedUser = { ...user, ...updates }
    setUser(updatedUser)

    if (!backendEnabled) {
      localStorage.setItem('brainsait_user', JSON.stringify(updatedUser))
    }

    toast.success('Profile updated successfully')
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    mfaRequired,
    verifyMFA,
    refreshToken,
    updateProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Utility functions for role-based access control
export const hasPermission = (user: User | null, permission: string): boolean => {
  if (!user || !user.permissions) return false
  return user.permissions.includes(permission) || user.permissions.includes('admin:*')
}

export const hasRole = (user: User | null, role: string): boolean => {
  if (!user) return false
  return user.role === role || user.role === 'admin'
}

export const isHealthcareProfessional = (user: User | null): boolean => {
  if (!user) return false
  return ['doctor', 'nurse', 'specialist'].includes(user.role)
}
