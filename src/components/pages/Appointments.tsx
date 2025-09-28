import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Phone, 
  VideoCamera,
  User
} from '@phosphor-icons/react'

interface Appointment {
  id: string
  patientName: string
  patientId: string
  date: string
  time: string
  type: 'consultation' | 'follow-up' | 'telemedicine' | 'emergency'
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  duration: number
  notes?: string
}

interface AppointmentsProps {
  onPatientSelect: (patientId: string) => void
}

export function Appointments({ onPatientSelect }: AppointmentsProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  
  const [appointments] = useKV<Appointment[]>('appointments', [
    {
      id: '1',
      patientName: 'Ahmed Al-Rashid',
      patientId: 'patient-1',
      date: '2024-01-15',
      time: '09:00',
      type: 'consultation',
      status: 'confirmed',
      duration: 30,
      notes: 'Routine checkup for hypertension'
    },
    {
      id: '2',
      patientName: 'Sara Mohammed',
      patientId: 'patient-2',
      date: '2024-01-15',
      time: '10:30',
      type: 'follow-up',
      status: 'scheduled',
      duration: 20,
      notes: 'Diabetes follow-up and medication review'
    },
    {
      id: '3',
      patientName: 'Omar Hassan',
      patientId: 'patient-3',
      date: '2024-01-15',
      time: '14:00',
      type: 'telemedicine',
      status: 'confirmed',
      duration: 25,
      notes: 'Remote consultation for asthma management'
    },
    {
      id: '4',
      patientName: 'Fatima Ali',
      patientId: 'patient-4',
      date: '2024-01-16',
      time: '09:30',
      type: 'consultation',
      status: 'scheduled',
      duration: 45,
      notes: 'Cardiology consultation'
    }
  ])

  const selectedDateString = selectedDate.toISOString().split('T')[0]
  const dayAppointments = appointments?.filter(apt => apt.date === selectedDateString) || []

  const getTypeIcon = (type: Appointment['type']) => {
    switch (type) {
      case 'telemedicine':
        return <VideoCamera size={16} />
      case 'emergency':
        return <Clock size={16} className="text-destructive" />
      default:
        return <User size={16} />
    }
  }

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'confirmed':
        return 'default'
      case 'scheduled':
        return 'secondary'
      case 'completed':
        return 'outline'
      case 'cancelled':
        return 'destructive'
      default:
        return 'default'
    }
  }

  const getTypeColor = (type: Appointment['type']) => {
    switch (type) {
      case 'emergency':
        return 'destructive'
      case 'telemedicine':
        return 'secondary'
      case 'follow-up':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Manage your schedule and patient appointments
          </p>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          New Appointment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CalendarIcon size={20} />
              <span>Calendar</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="w-full"
            />
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''} scheduled
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {dayAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No appointments scheduled for this day</p>
                  <Button className="mt-4">
                    <Plus size={16} className="mr-2" />
                    Schedule Appointment
                  </Button>
                </div>
              ) : (
                dayAppointments.map((appointment) => (
                  <Card key={appointment.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="text-lg font-bold">{appointment.time}</p>
                            <p className="text-xs text-muted-foreground">{appointment.duration}min</p>
                          </div>
                          
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 
                                className="font-medium cursor-pointer hover:text-primary"
                                onClick={() => onPatientSelect(appointment.patientId)}
                              >
                                {appointment.patientName}
                              </h3>
                              {getTypeIcon(appointment.type)}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge variant={getTypeColor(appointment.type)} className="text-xs">
                                {appointment.type}
                              </Badge>
                              <Badge variant={getStatusColor(appointment.status)} className="text-xs">
                                {appointment.status}
                              </Badge>
                            </div>
                            {appointment.notes && (
                              <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {appointment.type === 'telemedicine' ? (
                            <Button size="sm">
                              <VideoCamera size={14} className="mr-1" />
                              Join
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline">
                              <Phone size={14} className="mr-1" />
                              Call
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            Edit
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Today's Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="text-sm">Total Appointments</span>
              <span className="font-medium">
                {appointments?.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Completed</span>
              <span className="font-medium text-success">
                {appointments?.filter(apt => 
                  apt.date === new Date().toISOString().split('T')[0] && apt.status === 'completed'
                ).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Remaining</span>
              <span className="font-medium text-primary">
                {appointments?.filter(apt => 
                  apt.date === new Date().toISOString().split('T')[0] && 
                  ['scheduled', 'confirmed'].includes(apt.status)
                ).length || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Telemedicine</span>
              <span className="font-medium">
                {appointments?.filter(apt => 
                  apt.date === new Date().toISOString().split('T')[0] && apt.type === 'telemedicine'
                ).length || 0}
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
              Schedule Appointment
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <VideoCamera size={16} className="mr-2" />
              Start Telemedicine
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Clock size={16} className="mr-2" />
              Emergency Slot
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Upcoming</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {appointments?.slice(0, 3).map((appointment) => (
              <div key={appointment.id} className="text-sm">
                <p className="font-medium">{appointment.patientName}</p>
                <p className="text-muted-foreground">
                  {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}