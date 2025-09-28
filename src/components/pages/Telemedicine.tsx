import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  VideoCamera, 
  Phone, 
  Microphone, 
  MicrophoneSlash,
  Eye,
  EyeSlash,
  ChatCircle,
  Record,
  Share,
  Users,
  Plus,
  Warning
} from '@phosphor-icons/react'

interface TelemedicineSession {
  id: string
  patientName: string
  patientId: string
  scheduledTime: string
  duration: number
  status: 'scheduled' | 'active' | 'completed' | 'missed'
  type: 'video' | 'audio' | 'chat'
  notes?: string
}

interface CallControl {
  video: boolean
  audio: boolean
  recording: boolean
  sharing: boolean
}

export function Telemedicine() {
  const [activeCall, setActiveCall] = useState<string | null>(null)
  const [callControls, setCallControls] = useState<CallControl>({
    video: true,
    audio: true,
    recording: false,
    sharing: false
  })

  const [sessions] = useKV<TelemedicineSession[]>('telemedicine-sessions', [
    {
      id: '1',
      patientName: 'Omar Hassan',
      patientId: 'patient-3',
      scheduledTime: '2024-01-15T14:00:00',
      duration: 25,
      status: 'scheduled',
      type: 'video',
      notes: 'Follow-up for asthma management'
    },
    {
      id: '2',
      patientName: 'Noura Abdullah',
      patientId: 'patient-6',
      scheduledTime: '2024-01-15T15:30:00',
      duration: 20,
      status: 'scheduled',
      type: 'video',
      notes: 'Migraine consultation'
    },
    {
      id: '3',
      patientName: 'Ahmed Al-Rashid',
      patientId: 'patient-1',
      scheduledTime: '2024-01-14T16:00:00',
      duration: 30,
      status: 'completed',
      type: 'video',
      notes: 'Hypertension check-up completed successfully'
    }
  ])

  const upcomingSessions = sessions?.filter(s => s.status === 'scheduled') || []
  const completedSessions = sessions?.filter(s => s.status === 'completed') || []

  const toggleControl = (control: keyof CallControl) => {
    setCallControls(prev => ({
      ...prev,
      [control]: !prev[control]
    }))
  }

  const startCall = (sessionId: string) => {
    setActiveCall(sessionId)
  }

  const endCall = () => {
    setActiveCall(null)
    setCallControls({
      video: true,
      audio: true,
      recording: false,
      sharing: false
    })
  }

  const getStatusColor = (status: TelemedicineSession['status']) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'scheduled':
        return 'secondary'
      case 'completed':
        return 'outline'
      case 'missed':
        return 'destructive'
      default:
        return 'default'
    }
  }

  if (activeCall) {
    const session = sessions?.find(s => s.id === activeCall)
    if (!session) return null

    return (
      <div className="h-full flex flex-col bg-black text-white">
        <div className="flex-1 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <div className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarFallback className="bg-primary text-primary-foreground text-4xl">
                  {session.patientName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold mb-2">{session.patientName}</h2>
              <p className="text-white/70">Video consultation in progress</p>
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm">Recording: {callControls.recording ? 'On' : 'Off'}</span>
              </div>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex space-x-2">
            <Button variant="outline" size="sm" className="bg-black/50 border-white/20 text-white">
              <ChatCircle size={16} className="mr-1" />
              Chat
            </Button>
            <Button variant="outline" size="sm" className="bg-black/50 border-white/20 text-white">
              <Users size={16} className="mr-1" />
              Invite
            </Button>
          </div>
        </div>

        <div className="p-6 bg-black/80 border-t border-white/10">
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant={callControls.audio ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={() => toggleControl('audio')}
            >
              {callControls.audio ? <Microphone size={20} /> : <MicrophoneSlash size={20} />}
            </Button>

            <Button
              variant={callControls.video ? "default" : "destructive"}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={() => toggleControl('video')}
            >
              {callControls.video ? <VideoCamera size={20} /> : <EyeSlash size={20} />}
            </Button>

            <Button
              variant={callControls.recording ? "destructive" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={() => toggleControl('recording')}
            >
              <Record size={20} />
            </Button>

            <Button
              variant={callControls.sharing ? "default" : "outline"}
              size="lg"
              className="rounded-full w-12 h-12"
              onClick={() => toggleControl('sharing')}
            >
              <Share size={20} />
            </Button>

            <Button
              variant="destructive"
              size="lg"
              className="rounded-full w-16 h-12 ml-8"
              onClick={endCall}
            >
              End Call
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <VideoCamera size={32} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Telemedicine</h1>
            <p className="text-muted-foreground">
              Virtual consultations and remote patient care
            </p>
          </div>
        </div>
        <Button>
          <Plus size={16} className="mr-2" />
          Schedule Session
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Today's Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions?.filter(s => 
                new Date(s.scheduledTime).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {sessions?.filter(s => s.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {completedSessions.length}
            </div>
            <p className="text-xs text-muted-foreground">This week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Missed Calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {sessions?.filter(s => s.status === 'missed').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requires follow-up</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Sessions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Scheduled telemedicine appointments
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingSessions.length === 0 ? (
              <div className="text-center py-8">
                <VideoCamera size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming sessions</p>
                <Button className="mt-4">
                  <Plus size={16} className="mr-2" />
                  Schedule Session
                </Button>
              </div>
            ) : (
              upcomingSessions.map((session) => (
                <Card key={session.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {session.patientName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <h3 className="font-medium">{session.patientName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.scheduledTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {session.duration} min
                          </p>
                          <Badge variant={getStatusColor(session.status)} className="text-xs">
                            {session.type} • {session.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          onClick={() => startCall(session.id)}
                        >
                          <VideoCamera size={14} className="mr-1" />
                          Join
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone size={14} className="mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                    
                    {session.notes && (
                      <p className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                        {session.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Previously completed consultations
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {completedSessions.map((session) => (
              <Card key={session.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Avatar>
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {session.patientName.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <h3 className="font-medium">{session.patientName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.scheduledTime).toLocaleDateString()} • {session.duration} min
                        </p>
                        <Badge variant="outline" className="text-xs">
                          Completed
                        </Badge>
                      </div>
                    </div>

                    <Button size="sm" variant="outline">
                      View Notes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <VideoCamera size={16} className="mr-2" />
              Start Instant Meeting
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Phone size={16} className="mr-2" />
              Emergency Consultation
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Users size={16} className="mr-2" />
              Group Session
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Video Quality</span>
              <Badge variant="default">HD</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Connection</span>
              <Badge variant="default">Stable</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Recording Storage</span>
              <Badge variant="secondary">85% Free</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              Audio/Video Test
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Recording Settings
            </Button>
            <Button variant="outline" className="w-full justify-start">
              Notification Preferences
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}