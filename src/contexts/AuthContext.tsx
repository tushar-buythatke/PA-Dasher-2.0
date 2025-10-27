import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { authAPI } from '@/lib/api'

interface User {
  userId: number
  userName?: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (userName: string, password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      const response = await authAPI.isLoggedIn()
      
      if (response.status === 1 && response.data?.userId) {
        setUser({
          userId: response.data.userId,
          userName: response.data.userName
        })
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setUser(null)
      // Don't throw error, just set user to null
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (userName: string, password: string) => {
    try {
      setIsLoading(true)
      const response = await authAPI.login(userName, password)
      
      if (response.status === 1 && response.data?.userId) {
        const userData = {
          userId: response.data.userId,
          userName: userName
        }
        setUser(userData)
        setIsLoading(false) // Set loading to false immediately on success
        return { success: true }
      } else {
        setIsLoading(false) // Set loading to false on failure too
        return { 
          success: false, 
          error: response.err || 'Login failed' 
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setIsLoading(false) // Set loading to false on error
      return { 
        success: false, 
        error: 'Network error. Please check your connection.' 
      }
    }
  }

  const logout = async () => {
    try {
      setIsLoading(true)
      await authAPI.logout()
    } catch (error) {
      console.error('Logout error:', error)
      // Continue with logout even if API call fails
    } finally {
      setUser(null)
      setIsLoading(false)
    }
  }

  // Check authentication status on mount
  useEffect(() => {
    // Only check auth if we don't already have a user
    if (!user) {
      // Wrap in timeout to avoid potential router issues
      const timer = setTimeout(() => {
        checkAuth()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, []) // Remove user dependency to avoid re-running after login

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    checkAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}