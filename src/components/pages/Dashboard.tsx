import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Users, 
  Calendar, 
  Clock, 
  TrendUp, 
  Phone, 
  Warning,
  CheckCircle,
  Plus
} from '@phosphor-icons/react'
import type { Page } from '../../App'

interface DashboardProps {
  onNavigate: (page: Page) => void
  onPatientSelect: (patientId: string) => void
}

interface Appointment {
  id: string
  time: string
  patient: string
  type: string
  status: string
}

interface Stats {
  totalPatients: number
  todayAppointments: number
  pendingReports: number
  urgentCases: number
}

interface Activity {
  id: string
  type: string
  message: string
  time: string
  urgent: boolean
}

export function Dashboard({ onNavigate, onPatientSelect }: DashboardProps) {
  const [todayAppointments] = useKV<Appointment[]>('today-appointments', [
    { id: '1', time: '09:00', patient: 'Ahmed Al-Rashid', type: 'Consultation', status: 'confirmed' },
    { id: '2', time: '10:30', patient: 'Sara Mohammed', type: 'Follow-up', status: 'pending' },
    { id: '3', time: '14:00', patient: 'Omar Hassan', type: 'Telemedicine', status: 'confirmed' },
    { id: '4', time: '15:30', patient: 'Fatima Ali', type: 'Consultation', status: 'urgent' }
  ])

  const [quickStats] = useKV<Stats>('dashboard-stats', {
    totalPatients: 342,
    todayAppointments: 8,
    pendingReports: 5,
    urgentCases: 2
  })

  const [recentActivities] = useKV<Activity[]>('recent-activities', [
    { id: '1', type: 'report', message: 'Lab results for Ahmed Al-Rashid', time: '2 min ago', urgent: false },
    { id: '2', type: 'appointment', message: 'New appointment scheduled', time: '15 min ago', urgent: false },
    { id: '3', type: 'urgent', message: 'Urgent: Patient vital signs alert', time: '32 min ago', urgent: true },
    { id: '4', type: 'message', message: 'Colleague consultation request', time: '1 hour ago', urgent: false }
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, Dr. Ahmed. Here's what's happening today.
          </p>
        </div>
        <Button onClick={() => onNavigate('appointments')}>
          <Plus size={16} className="mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Users size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats?.totalPatients || 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-success">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats?.todayAppointments || 0}</div>
            <p className="text-xs text-muted-foreground">
              4 completed, 4 remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <Clock size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{quickStats?.pendingReports || 0}</div>
            <p className="text-xs text-muted-foreground">
              2 due today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Urgent Cases</CardTitle>
            <Warning size={16} className="text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{quickStats?.urgentCases || 0}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Today's Schedule
              <Button variant="outline" size="sm" onClick={() => onNavigate('appointments')}>
                View All
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayAppointments?.map((appointment) => (
              <div 
                key={appointment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onPatientSelect('patient-' + appointment.id)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <div>
                    <p className="font-medium">{appointment.time}</p>
                    <p className="text-sm text-muted-foreground">{appointment.patient}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      appointment.status === 'urgent' ? 'destructive' :
                      appointment.status === 'confirmed' ? 'default' : 'secondary'
                    }
                  >
                    {appointment.type}
                  </Badge>
                  {appointment.type === 'Telemedicine' && (
                    <Phone size={16} className="text-primary" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.urgent ? 'bg-accent animate-pulse' : 'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${activity.urgent ? 'text-accent font-medium' : ''}`}>
                    {activity.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                {activity.urgent && <Warning size={16} className="text-accent" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="outline" className="justify-start h-12" onClick={() => onNavigate('patients')}>
              <Users size={16} className="mr-3" />
              View All Patients
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => onNavigate('telemedicine')}>
              <Phone size={16} className="mr-3" />
              Start Telemedicine
            </Button>
            <Button variant="outline" className="justify-start h-12" onClick={() => onNavigate('nphies')}>
              <TrendUp size={16} className="mr-3" />
              NPHIES Portal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm font-medium text-primary">High Priority</p>
              <p className="text-xs text-muted-foreground mt-1">
                3 patients may benefit from preventive care screening
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-sm font-medium">Trend Analysis</p>
              <p className="text-xs text-muted-foreground mt-1">
                15% increase in respiratory consultations this week
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">NPHIES Connection</span>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-success" />
                <span className="text-xs text-success">Connected</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">System Performance</span>
              <div className="flex items-center space-x-2">
                <Progress value={95} className="w-16 h-2" />
                <span className="text-xs text-muted-foreground">95%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Data Sync</span>
              <div className="flex items-center space-x-2">
                <CheckCircle size={16} className="text-success" />
                <span className="text-xs text-success">Up to date</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}