import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { LoginPage } from './components/auth/LoginPage'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { useIsMobile } from './hooks/use-mobile'
import { PageLoader } from './components/ui/loading-skeletons'
import { DrsLincWidget } from './components/drslinc/DrsLincWidget'
import { configValidator } from './lib/config-validator'
import { integrationManager } from './lib/integration-manager'
import './i18n'

// Initialize and validate configuration on app start
try {
  const config = configValidator.getConfig();
  
  if (config.environment === 'production') {
    console.info('🚀 Running in PRODUCTION mode');
    console.info('✅ Configuration validated');
  } else {
    console.info('🔧 Running in DEVELOPMENT mode');
    console.warn('⚠️  Some security features are mocked for development');
  }

  // Initialize integrations asynchronously
  integrationManager.initialize().catch(error => {
    console.error('Failed to initialize integrations:', error);
  });
} catch (error) {
  console.error('❌ Configuration validation failed:', error);
  if (configValidator.isProduction()) {
    throw error; // Block production deployment if configuration is invalid
  }
}

// Lazy load pages for better performance
const Dashboard = lazy(() => import('./components/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const PatientList = lazy(() => import('./components/pages/PatientList').then(m => ({ default: m.PatientList })))
const PatientDetails = lazy(() => import('./components/pages/PatientDetails').then(m => ({ default: m.PatientDetails })))
const Appointments = lazy(() => import('./components/pages/Appointments').then(m => ({ default: m.Appointments })))
const NPHIESPortal = lazy(() => import('./components/pages/NPHIESPortal').then(m => ({ default: m.NPHIESPortal })))
const Telemedicine = lazy(() => import('./components/pages/Telemedicine').then(m => ({ default: m.Telemedicine })))
const Messages = lazy(() => import('./components/pages/Messages').then(m => ({ default: m.Messages })))
const ProfileBuilder = lazy(() => import('./components/profile/ProfileBuilder').then(m => ({ default: m.ProfileBuilder })))
const TeamManagement = lazy(() => import('./components/profile/TeamManagement').then(m => ({ default: m.TeamManagement })))

export type Page = 'dashboard' | 'patients' | 'patient-details' | 'appointments' | 'nphies' | 'telemedicine' | 'messages' | 'profile' | 'team'

// Page titles for accessibility
const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  patients: 'Patient Management',
  'patient-details': 'Patient Details',
  appointments: 'Appointments',
  nphies: 'NPHIES Portal',
  telemedicine: 'Telemedicine',
  messages: 'Messages',
  profile: 'Profile Builder',
  team: 'Team Management',
}

function AppContent() {
  const { isLoading, isAuthenticated } = useAuth()
  const { i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoginSuccessful, setIsLoginSuccessful] = useState(false)
  const isMobile = useIsMobile()
  
  // Determine current page from route
  const getCurrentPage = (): Page => {
    const path = location.pathname
    if (path.startsWith('/patients/')) return 'patient-details'
    if (path.startsWith('/patients')) return 'patients'
    if (path.startsWith('/messages')) return 'messages'
    if (path.startsWith('/appointments')) return 'appointments'
    if (path.startsWith('/telemedicine')) return 'telemedicine'
    if (path.startsWith('/nphies')) return 'nphies'
    if (path.startsWith('/profile')) return 'profile'
    if (path.startsWith('/team')) return 'team'
    return 'dashboard'
  }
  
  const currentPage = getCurrentPage()
  
  // Set HTML dir attribute based on language
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  // Update document title based on current page
  useEffect(() => {
    if (isAuthenticated) {
      const pageTitle = PAGE_TITLES[currentPage || 'dashboard']
      document.title = `${pageTitle} | BrainSait Doctor Portal`
    }
  }, [currentPage, isAuthenticated])

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [sidebarOpen])

  // Handle patient selection with navigation
  const handlePatientSelect = useCallback((patientId: string) => {
    navigate(`/patients/${patientId}`)
  }, [navigate])

  // Handle navigation with sidebar close on mobile
  const handleNavigate = useCallback((page: Page) => {
    const routes: Record<Page, string> = {
      dashboard: '/',
      patients: '/patients',
      'patient-details': '/patients',
      appointments: '/appointments',
      nphies: '/nphies',
      telemedicine: '/telemedicine',
      messages: '/messages',
      profile: '/profile',
      team: '/team',
    }
    navigate(routes[page])
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [navigate, isMobile])

  // Show loading screen during auth initialization only
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing healthcare portal...</p>
        </div>
      </div>
    )
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => setIsLoginSuccessful(true)} />
  }

  // Patient Details wrapper to extract ID from route
  const PatientDetailsRoute = () => {
    const { patientId } = useParams<{ patientId: string }>()
    return (
      <PatientDetails
        patientId={patientId || null}
        onBack={() => navigate('/patients')}
      />
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={isMobile}
        />

        <main
          id="main-content"
          className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 scroll-smooth"
          role="main"
          aria-label={PAGE_TITLES[currentPage]}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard onNavigate={handleNavigate} onPatientSelect={handlePatientSelect} />} />
              <Route path="/patients" element={<PatientList onPatientSelect={handlePatientSelect} />} />
              <Route path="/patients/:patientId" element={<PatientDetailsRoute />} />
              <Route path="/appointments" element={<Appointments onPatientSelect={handlePatientSelect} />} />
              <Route path="/nphies" element={<NPHIESPortal />} />
              <Route path="/telemedicine" element={<Telemedicine />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/profile" element={<ProfileBuilder />} />
              <Route path="/team" element={<TeamManagement />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 4000,
          className: 'shadow-lg',
        }}
      />

      <DrsLincWidget
        selectedPatientId={location.pathname.startsWith('/patients/') ? location.pathname.split('/')[2] : null}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
