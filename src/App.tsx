import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster } from 'sonner'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { useIsMobile } from './hooks/use-mobile'
import { PageLoader } from './components/ui/loading-skeletons'

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

function App() {
  const [currentPage, setCurrentPage] = useKV<Page>('current-page', 'dashboard')
  const [selectedPatientId, setSelectedPatientId] = useKV<string | null>('selected-patient', null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  // Update document title based on current page
  useEffect(() => {
    const pageTitle = PAGE_TITLES[currentPage || 'dashboard']
    document.title = `${pageTitle} | BrainSait Doctor Portal`
  }, [currentPage])

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
    setSelectedPatientId(patientId)
    setCurrentPage('patient-details')
  }, [setSelectedPatientId, setCurrentPage])

  // Handle navigation with sidebar close on mobile
  const handleNavigate = useCallback((page: Page) => {
    setCurrentPage(page)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [setCurrentPage, isMobile])

  // Render current page with Suspense for lazy loading
  const renderPage = () => {
    const page = currentPage || 'dashboard'
    
    switch (page) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} onPatientSelect={handlePatientSelect} />
      case 'patients':
        return <PatientList onPatientSelect={handlePatientSelect} />
      case 'patient-details':
        return (
          <PatientDetails 
            patientId={selectedPatientId || null} 
            onBack={() => handleNavigate('patients')} 
          />
        )
      case 'appointments':
        return <Appointments onPatientSelect={handlePatientSelect} />
      case 'nphies':
        return <NPHIESPortal />
      case 'telemedicine':
        return <Telemedicine />
      case 'messages':
        return <Messages />
      case 'profile':
        return <ProfileBuilder />
      case 'team':
        return <TeamManagement />
      default:
        return <Dashboard onNavigate={handleNavigate} onPatientSelect={handlePatientSelect} />
    }
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
        currentPage={currentPage || 'dashboard'} 
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
          aria-label={PAGE_TITLES[currentPage || 'dashboard']}
        >
          <Suspense fallback={<PageLoader />}>
            {renderPage()}
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
    </div>
  )
}

export default App