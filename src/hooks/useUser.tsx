/**
 * User Context and Authentication Hook
 * Provides user state management and access control
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import type { User, UserRole, UserPreferences } from '@/types';
import { hasPermission, getPermissions, SESSION_CONFIG, secureStorage, type Permission } from '@/lib/security';

// User context type
interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (githubUser: GitHubUser) => void;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  hasPermission: (permission: Permission) => boolean;
  checkAccess: (requiredPermissions: Permission[]) => boolean;
  sessionTimeRemaining: number;
  extendSession: () => void;
}

// GitHub user type from OAuth
interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'system',
  language: 'en',
  notifications: {
    email: true,
    sms: true,
    push: true,
  },
  defaultView: 'dashboard',
};

// Create context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Provider component
export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [sessionTimeRemaining, setSessionTimeRemaining] = useState(SESSION_CONFIG.TIMEOUT_MS);

  // Initialize user from stored session
  useEffect(() => {
    const storedUser = secureStorage.get<User | null>('user', null);
    if (storedUser) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Track user activity for session timeout
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, []);

  // Session timeout checker
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const remaining = Math.max(0, SESSION_CONFIG.TIMEOUT_MS - elapsed);
      setSessionTimeRemaining(remaining);

      if (remaining === 0 && user) {
        console.log('[Auth] Session timeout - logging out');
        logout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastActivity, user]);

  // Login handler
  const login = useCallback((githubUser: GitHubUser) => {
    // Map GitHub user to app user
    // In production, you would fetch additional user data from your backend
    const appUser: User = {
      id: `user_${githubUser.id}`,
      githubId: githubUser.id.toString(),
      email: githubUser.email,
      name: githubUser.name || githubUser.login,
      avatar: githubUser.avatar_url,
      role: 'doctor', // Default role - should be fetched from backend
      isActive: true,
      preferences: DEFAULT_PREFERENCES,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUser(appUser);
    secureStorage.set('user', appUser);
    setLastActivity(Date.now());
    
    console.log('[Auth] User logged in:', appUser.name);
  }, []);

  // Logout handler
  const logout = useCallback(() => {
    setUser(null);
    secureStorage.clear();
    console.log('[Auth] User logged out');
  }, []);

  // Update user preferences
  const updatePreferences = useCallback((preferences: Partial<UserPreferences>) => {
    if (!user) return;

    const updatedUser = {
      ...user,
      preferences: {
        ...user.preferences,
        ...preferences,
      },
    };

    setUser(updatedUser);
    secureStorage.set('user', updatedUser);
  }, [user]);

  // Permission check
  const checkPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    return hasPermission(user.role, permission);
  }, [user]);

  // Check multiple permissions (all required)
  const checkAccess = useCallback((requiredPermissions: Permission[]): boolean => {
    if (!user) return false;
    return requiredPermissions.every(permission => hasPermission(user.role, permission));
  }, [user]);

  // Extend session
  const extendSession = useCallback(() => {
    setLastActivity(Date.now());
    console.log('[Auth] Session extended');
  }, []);

  const value: UserContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updatePreferences,
    hasPermission: checkPermission,
    checkAccess,
    sessionTimeRemaining,
    extendSession,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use user context
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for role-based access control
export function useRoleAccess(requiredRole: UserRole): boolean {
  const { user } = useUser();
  
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    doctor: 3,
    nurse: 2,
    receptionist: 1,
  };

  if (!user) return false;
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Hook for permission-based access control
export function usePermission(permission: Permission): boolean {
  const { hasPermission } = useUser();
  return hasPermission(permission);
}

// HOC for protected routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermissions?: Permission[]
) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading, checkAccess } = useUser();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-4">Please sign in to continue.</p>
        </div>
      );
    }

    if (requiredPermissions && !checkAccess(requiredPermissions)) {
      return (
        <div className="flex flex-col items-center justify-center h-screen">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to access this page.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

export default UserContext;
