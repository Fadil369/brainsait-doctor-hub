import { useState, useMemo } from 'react'
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

interface PatientListProps {
  onPatientSelect: (patientId: string) => void
}

export function PatientList({ onPatientSelect }: PatientListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  
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
        <Button>
          <Plus size={16} className="mr-2" />
          Add Patient
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Patient Directory</CardTitle>
            <div className="relative w-64">
              <MagnifyingGlass 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
              />
              <Input
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {patients.map((patient) => (
              <Card 
                key={patient.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onPatientSelect(patient.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium">{patient.name}</h3>
                          {getStatusIcon(patient.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {patient.age} years • {patient.gender === 'male' ? 'Male' : 'Female'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {patient.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right space-y-1">
                        <Badge variant={getStatusColor(patient.status)} className="text-xs">
                          {getPrimaryCondition(patient)}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          MRN: {patient.mrn}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
                        </p>
                        <div className="flex items-center space-x-1">
                          <Badge variant="outline" className="text-xs">
                            {patient.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-2">
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                          <Phone size={14} className="mr-1" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); }}>
                          <VideoCamera size={14} className="mr-1" />
                          Video
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {patients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  {searchTerm ? 'No patients found matching your search.' : 'No patients registered yet.'}
                </p>
              </div>
            )}
          </div>
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
            <Button variant="outline" className="w-full justify-start">
              <Plus size={16} className="mr-2" />
              Register New Patient
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone size={16} className="mr-2" />
              Emergency Contact
            </Button>
            <Button variant="outline" className="w-full justify-start">
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