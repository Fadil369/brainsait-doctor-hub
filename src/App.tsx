import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Toaster } from 'sonner'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Dashboard } from './components/pages/Dashboard'
import { PatientList } from './components/pages/PatientList'
import { PatientDetails } from './components/pages/PatientDetails'
import { Appointments } from './components/pages/Appointments'
import { NPHIESPortal } from './components/pages/NPHIESPortal'
import { Telemedicine } from './components/pages/Telemedicine'
import { useIsMobile } from './hooks/use-mobile'

export type Page = 'dashboard' | 'patients' | 'patient-details' | 'appointments' | 'nphies' | 'telemedicine'

function App() {
  const [currentPage, setCurrentPage] = useKV<Page>('current-page', 'dashboard')
  const [selectedPatientId, setSelectedPatientId] = useKV<string | null>('selected-patient', null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId)
    setCurrentPage('patient-details')
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} onPatientSelect={handlePatientSelect} />
      case 'patients':
        return <PatientList onPatientSelect={handlePatientSelect} />
      case 'patient-details':
        return <PatientDetails patientId={selectedPatientId || null} onBack={() => setCurrentPage('patients')} />
      case 'appointments':
        return <Appointments onPatientSelect={handlePatientSelect} />
      case 'nphies':
        return <NPHIESPortal />
      case 'telemedicine':
        return <Telemedicine />
      default:
        return <Dashboard onNavigate={setCurrentPage} onPatientSelect={handlePatientSelect} />
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar 
        currentPage={currentPage || 'dashboard'} 
        onNavigate={setCurrentPage}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarOpen(true)}
          showMenuButton={isMobile}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {currentPage ? renderPage() : <Dashboard onNavigate={setCurrentPage} onPatientSelect={handlePatientSelect} />}
        </main>
      </div>
      <Toaster />
    </div>
  )
}

export default App