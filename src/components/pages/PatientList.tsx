import { useState, useMemo, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MagnifyingGlass, 
  Plus, 
  Phone, 
  VideoCamera,
  Warning,
  CheckCircle
} from '@phosphor-icons/react'
import { usePatients } from '@/db'
import { PatientListSkeleton } from '@/components/ui/loading-skeletons'
import type { Patient } from '@/types'
import { toast } from 'sonner'

interface PatientListProps {
  onPatientSelect: (patientId: string) => void
}

export function PatientList({ onPatientSelect }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const { t } = useTranslation()
  const parentRef = useRef<HTMLDivElement>(null)
  
  // Use the database hook with search filter
  const { 
    data: patients, 
    isLoading, 
    total,
    getStatistics 
  } = usePatients({
    search: searchTerm,
    orderBy: 'name',
  })
  
  // Setup virtualizer for large lists (only if > 20 items)
  const rowVirtualizer = useVirtualizer({
    count: patients.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
    enabled: patients.length > 20,
  })

  // Get statistics for the summary cards
  const stats = useMemo(() => {
    return {
      total: patients.length,
      critical: patients.filter(p => p.status === 'critical').length,
      stable: patients.filter(p => p.status === 'stable').length,
      monitoring: patients.filter(p => p.status === 'monitoring').length,
      improving: patients.filter(p => p.status === 'improving').length,
    }
  }, [patients])

  // Get primary condition from conditions array
  const getPrimaryCondition = (patient: Patient) => {
    return patient.conditions?.[0] || 'No condition recorded'
  }

  const getStatusIcon = (status: Patient['status']) => {
    switch (status) {
      case 'critical':
        return <Warning size={16} className="text-destructive" />
      case 'stable':
        return <CheckCircle size={16} className="text-success" />
      case 'improving':
        return <CheckCircle size={16} className="text-primary" />
      case 'monitoring':
        return <div className="w-4 h-4 rounded-full bg-accent animate-pulse" />
      case 'discharged':
        return <CheckCircle size={16} className="text-muted-foreground" />
      default:
        return null
    }
  }

  const getStatusColor = (status: Patient['status']): "destructive" | "default" | "secondary" | "outline" => {
    switch (status) {
      case 'critical':
        return 'destructive'
      case 'stable':
        return 'default'
      case 'improving':
        return 'secondary'
      case 'monitoring':
      case 'discharged':
        return 'outline'
      default:
        return 'default'
    }
  }

  const handleComingSoon = (feature: string) => {
    toast.info(`${feature} will be available soon. In the meantime, continue managing patients via the dashboard.`)
  }

  // Show loading skeleton while data loads
  if (isLoading) {
    return <PatientListSkeleton />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Patients</h1>
          <p className="text-muted-foreground">
            Manage and view all registered patients
          </p>
        </div>
        <Button
          aria-label="Add a new patient (coming soon)"
          onClick={() => handleComingSoon('Patient registration')}
        >
          <Plus size={16} className="mr-2" />
          Add Patient
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('patients.directory')}</CardTitle>
            <div className="relative w-64">
              <MagnifyingGlass 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              />
              <Input
                placeholder={t('patients.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {patients.length > 20 ? (
            // Virtualized list for large datasets
            <div
              ref={parentRef}
              className="h-[600px] overflow-auto"
              style={{ contain: 'strict' }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const patient = patients[virtualRow.index]
                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <PatientCard
                        patient={patient}
                        onSelect={onPatientSelect}
                        getStatusIcon={getStatusIcon}
                        getStatusColor={getStatusColor}
                        getPrimaryCondition={getPrimaryCondition}
                        handleComingSoon={handleComingSoon}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            // Regular list for small datasets
            <div className="grid gap-4">
              {patients.map((patient) => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  onSelect={onPatientSelect}
                  getStatusIcon={getStatusIcon}
                  getStatusColor={getStatusColor}
                  getPrimaryCondition={getPrimaryCondition}
                  handleComingSoon={handleComingSoon}
                />
              ))}

              {patients.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchTerm ? t('patients.noResults') : t('patients.noPatients')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Patient Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Total Patients</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Critical Cases</span>
              <span className="font-medium text-destructive">
                {stats.critical}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Stable Patients</span>
              <span className="font-medium text-success">
                {stats.stable}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Under Monitoring</span>
              <span className="font-medium text-amber-500">
                {stats.monitoring}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleComingSoon('Register new patient flow')}
            >
              <Plus size={16} className="mr-2" />
              Register New Patient
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleComingSoon('Emergency contact handoff')}
            >
              <Phone size={16} className="mr-2" />
              Emergency Contact
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => handleComingSoon('Group consultation scheduling')}
            >
              <VideoCamera size={16} className="mr-2" />
              Group Consultation
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">Lab Results</p>
              <p className="text-muted-foreground">3 new results available</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Appointment Changes</p>
              <p className="text-muted-foreground">2 rescheduled for today</p>
            </div>
            <div className="text-sm">
              <p className="font-medium">Critical Alerts</p>
              <p className="text-muted-foreground">1 patient needs attention</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Extracted PatientCard component for reuse in virtualized list
interface PatientCardProps {
  patient: Patient
  onSelect: (id: string) => void
  getStatusIcon: (status: Patient['status']) => React.ReactNode
  getStatusColor: (status: Patient['status']) => "destructive" | "default" | "secondary" | "outline"
  getPrimaryCondition: (patient: Patient) => string
  handleComingSoon: (feature: string) => void
}

function PatientCard({
  patient,
  onSelect,
  getStatusIcon,
  getStatusColor,
  getPrimaryCondition,
  handleComingSoon
}: PatientCardProps) {
  const { t } = useTranslation()
  
  return (
    <Card className="transition-shadow focus-within:ring-2 focus-within:ring-primary/40 hover:shadow-md mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            type="button"
            aria-label={`Open record for ${patient.name}`}
            className="flex flex-1 items-center gap-4 rounded-lg p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            onClick={() => onSelect(patient.id)}
          >
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {patient.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-1">
              <div className="flex items-center flex-wrap gap-2">
                <h3 className="font-medium">{patient.name}</h3>
                {getStatusIcon(patient.status)}
                <Badge variant="outline" className="text-xs capitalize">
                  {patient.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {patient.age} {t('patients.years')} • {patient.gender === 'male' ? t('patients.male') : t('patients.female')}
              </p>
              <p className="text-sm text-muted-foreground">
                {patient.phone}
              </p>
            </div>
          </button>

          <div className="flex flex-col-reverse gap-4 text-right md:flex-col md:items-end">
            <div className="space-y-1">
              <Badge variant={getStatusColor(patient.status)} className="text-xs">
                {getPrimaryCondition(patient)}
              </Badge>
              <p className="text-xs text-muted-foreground">
                MRN: {patient.mrn}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('patients.lastVisit')}: {new Date(patient.lastVisit).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2" role="group" aria-label={`Quick contact actions for ${patient.name}`}>
              <Button 
                variant="outline" 
                size="sm"
                aria-label={`${t('patients.call')} ${patient.name} (coming soon)`}
                onClick={() => handleComingSoon(`Calling ${patient.name}`)}
              >
                <Phone size={14} className="mr-1" />
                {t('patients.call')}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                aria-label={`${t('patients.video')} ${patient.name} (coming soon)`}
                onClick={() => handleComingSoon(`Video consultation for ${patient.name}`)}
              >
                <VideoCamera size={14} className="mr-1" />
                {t('patients.video')}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}