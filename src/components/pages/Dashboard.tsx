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
import { useDashboardStats, useAppointments, useNotifications } from '@/db'
import { DashboardStatsSkeleton } from '@/components/ui/loading-skeletons'
import type { Page } from '../../App'

interface DashboardProps {
  onNavigate: (page: Page) => void
  onPatientSelect: (patientId: string) => void
}

// Helper function to get relative time
function getRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

export function Dashboard({ onNavigate, onPatientSelect }: DashboardProps) {
  // Use database hooks for real-time data
  const { stats, isLoading: statsLoading } = useDashboardStats()
  const { data: appointments, getUpcoming } = useAppointments({
    date: new Date().toISOString().split('T')[0],
  })
  const { data: notifications, unreadCount } = useNotifications({
    unreadOnly: true,
    limit: 5,
  })

  // Get upcoming appointments for display
  const upcomingAppointments = getUpcoming(4)

  // Map notifications to activities format
  const recentActivities = notifications.slice(0, 4).map(n => ({
    id: n.id,
    type: n.type,
    message: n.title,
    time: getRelativeTime(n.createdAt),
    urgent: n.priority === 'urgent' || n.priority === 'high',
  }))

  // Show skeleton while loading
  if (statsLoading) {
    return <DashboardStatsSkeleton />
  }

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
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">{stats.criticalPatients} critical</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.completedAppointments} completed, {stats.todayAppointments - stats.completedAppointments} remaining
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
            <Clock size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingClaims}</div>
            <p className="text-xs text-muted-foreground">
              SAR {stats.totalClaimAmount.toLocaleString()} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notifications</CardTitle>
            <Warning size={16} className="text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.unreadNotifications}</div>
            <p className="text-xs text-muted-foreground">
              Unread alerts
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
            {upcomingAppointments.length > 0 ? upcomingAppointments.map((appointment) => (
              <div 
                key={appointment.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onPatientSelect(appointment.patientId)}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-2 h-2 rounded-full ${
                    appointment.status === 'in-progress' ? 'bg-success animate-pulse' :
                    appointment.status === 'confirmed' ? 'bg-primary' : 'bg-muted-foreground'
                  }`} />
                  <div>
                    <p className="font-medium">{appointment.time}</p>
                    <p className="text-sm text-muted-foreground">{appointment.patientName}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      appointment.type === 'emergency' ? 'destructive' :
                      appointment.status === 'confirmed' ? 'default' : 'secondary'
                    }
                  >
                    {appointment.type}
                  </Badge>
                  {appointment.type === 'telemedicine' && (
                    <Phone size={16} className="text-primary" />
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No appointments scheduled for today
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activity) => (
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
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No recent activity
              </p>
            )}
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