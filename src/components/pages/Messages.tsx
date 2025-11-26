import { useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ChatCircle as MessageCircle, 
  Plus, 
  MagnifyingGlass as Search, 
  PaperPlaneTilt as Send, 
  User, 
  Users, 
  Clock, 
  Star,
  Paperclip,
  VideoCamera as Video,
  Phone,
  UserPlus,
  FileText,
  Stethoscope,
  Brain
} from "@phosphor-icons/react"
import { PatientFileSharer } from '../messaging/PatientFileSharer'
import { ConsultationRequest } from '../messaging/ConsultationRequest'
import { toast } from 'sonner'
import { useDoctorDirectory } from "@/hooks/useDoctorDirectory"

export interface Doctor {
  id: string
  name: string
  specialty: string
  avatar?: string
  isOnline: boolean
  lastSeen?: string
}

export interface Message {
  id: string
  senderId: string
  content: string
  timestamp: string
  type: 'text' | 'patient-file' | 'consultation-request'
  attachments?: string[]
  patientId?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  isRead: boolean
}

export interface Conversation {
  id: string
  participants: string[]
  lastMessage?: Message
  lastActivity: string
  type: 'direct' | 'consultation' | 'group'
  title?: string
  patientContext?: {
    patientId: string
    patientName: string
    consultationType: 'second-opinion' | 'referral' | 'general'
  }
  unreadCount: number
  isStarred: boolean
}

// Mock data for demonstration
const mockDoctors: Doctor[] = [
  { id: '1', name: 'Dr. Sarah Ahmed', specialty: 'Cardiology', isOnline: true },
  { id: '2', name: 'Dr. Mohammed Al-Rashid', specialty: 'Neurology', isOnline: false, lastSeen: '2 hours ago' },
  { id: '3', name: 'Dr. Fatima Hassan', specialty: 'Dermatology', isOnline: true },
  { id: '4', name: 'Dr. Ali Al-Mansouri', specialty: 'Orthopedics', isOnline: false, lastSeen: '30 minutes ago' },
  { id: '5', name: 'Dr. Nour Abdullah', specialty: 'Pediatrics', isOnline: true },
]

const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    participants: ['current-user', '2'],
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    type: 'consultation',
    title: 'Second Opinion - Dr. Mohammed Al-Rashid',
    patientContext: {
      patientId: 'patient-1',
      patientName: 'Ahmed Al-Mansouri',
      consultationType: 'second-opinion'
    },
    unreadCount: 2,
    isStarred: true,
    lastMessage: {
      id: 'msg-1',
      senderId: '2',
      content: 'Based on the MRI results, I agree with your assessment. The lesion appears benign but we should monitor closely.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: false
    }
  },
  {
    id: 'conv-2',
    participants: ['current-user', '1'],
    lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    type: 'direct',
    unreadCount: 0,
    isStarred: false,
    lastMessage: {
      id: 'msg-2',
      senderId: 'current-user',
      content: 'Thanks for the quick consultation on the cardiac case.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    }
  },
  {
    id: 'conv-3',
    participants: ['current-user', '3'],
    lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    type: 'consultation',
    title: 'Referral - Dr. Fatima Hassan',
    patientContext: {
      patientId: 'patient-2',
      patientName: 'Layla Hassan',
      consultationType: 'referral'
    },
    unreadCount: 1,
    isStarred: false,
    lastMessage: {
      id: 'msg-3',
      senderId: '3',
      content: 'I can see the patient next week. Please send the complete medical history.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: false
    }
  }
]

const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1-1',
      senderId: 'current-user',
      content: 'Hi Dr. Al-Rashid, I need a second opinion on a 45-year-old patient with neurological symptoms. I\'ve attached the MRI results and clinical notes.',
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      type: 'consultation-request',
      priority: 'normal',
      isRead: true
    },
    {
      id: 'msg-1-2',
      senderId: '2',
      content: 'I\'ve reviewed the case. The MRI shows some interesting findings. Can you share more details about the patient\'s symptoms onset?',
      timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: 'msg-1-3',
      senderId: 'current-user',
      content: 'Symptoms started 3 weeks ago with intermittent headaches, followed by mild confusion episodes. No focal neurological deficits.',
      timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: 'msg-1-4',
      senderId: '2',
      content: 'Based on the MRI results, I agree with your assessment. The lesion appears benign but we should monitor closely.',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: false
    }
  ],
  'conv-2': [
    {
      id: 'msg-2-1',
      senderId: 'current-user',
      content: 'Quick question about EKG interpretation for a 60-year-old with chest pain.',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: 'msg-2-2',
      senderId: '1',
      content: 'I see ST-T wave changes. Recommend serial troponins and stress test if negative.',
      timestamp: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: 'msg-2-3',
      senderId: 'current-user',
      content: 'Thanks for the quick consultation on the cardiac case.',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    }
  ],
  'conv-3': [
    {
      id: 'msg-3-1',
      senderId: 'current-user',
      content: 'I have a patient with persistent skin lesions that need dermatology evaluation. Would you be able to see her?',
      timestamp: new Date(Date.now() - 1.2 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: true
    },
    {
      id: 'msg-3-2',
      senderId: '3',
      content: 'I can see the patient next week. Please send the complete medical history.',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'text',
      isRead: false
    }
  ]
}

export function Messages() {
  const [conversations, setConversations] = useKV<Conversation[]>('doctor-conversations', initialConversations)
  const [messages, setMessages] = useKV<Record<string, Message[]>>('conversation-messages', initialMessages)
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConsultation, setShowNewConsultation] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const conversationRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const {
    doctors: directoryDoctors,
    loading: doctorDirectoryLoading,
    error: doctorDirectoryError
  } = useDoctorDirectory({ limit: 200 })

  const availableDoctors = useMemo<Doctor[]>(() => {
    if (!directoryDoctors.length) {
      return mockDoctors
    }

    const existingIds = new Set(mockDoctors.map((doctor) => doctor.id))
    const normalized = directoryDoctors.map((doctor) => ({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty || 'General Practice',
      isOnline: false,
      lastSeen: 'Directory import'
    }))
    const deduplicated = normalized.filter((doctor) => !existingIds.has(doctor.id))
    return [...mockDoctors, ...deduplicated]
  }, [directoryDoctors])

  const selectedConversation = conversations?.find(c => c.id === selectedConversationId)
  const conversationMessages = selectedConversationId ? (messages?.[selectedConversationId] || []) : []

  const filteredConversations = (conversations || []).filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.participants.some(id => {
        const doctor = availableDoctors.find(d => d.id === id)
        return doctor?.name.toLowerCase().includes(searchQuery.toLowerCase())
      })

    const matchesTab = activeTab === 'all' || 
      (activeTab === 'consultations' && conv.type === 'consultation') ||
      (activeTab === 'starred' && conv.isStarred) ||
      (activeTab === 'unread' && conv.unreadCount > 0)

    return matchesSearch && matchesTab
  })

  const focusConversationAtIndex = (index: number) => {
    const target = filteredConversations[index]
    if (!target) return
    conversationRefs.current[target.id]?.focus()
  }

  const handleConversationKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number,
    conversationId: string
  ) => {
    if (filteredConversations.length === 0) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = (index + delta + filteredConversations.length) % filteredConversations.length
      focusConversationAtIndex(nextIndex)
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusConversationAtIndex(0)
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusConversationAtIndex(filteredConversations.length - 1)
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setSelectedConversationId(conversationId)
    }
  }

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversationId) return

    const message: Message = {
      id: Date.now().toString(),
      senderId: 'current-user',
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
      isRead: false
    }

    setMessages(prev => ({
      ...(prev || {}),
      [selectedConversationId]: [...((prev || {})[selectedConversationId] || []), message]
    }))

    // Update conversation last activity
    setConversations(prev => (prev || []).map(conv => 
      conv.id === selectedConversationId 
        ? { ...conv, lastMessage: message, lastActivity: message.timestamp }
        : conv
    ))

    setNewMessage('')
    toast.success('Message sent')
  }

  const handleComposerKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSendMessage()
    }
  }

  const handleAttachmentClick = () => {
    toast.info('Secure file attachments will be available soon.')
  }

  const handleStartConsultation = (consultationType: 'second-opinion' | 'referral' | 'general', doctorId: string, patientId?: string) => {
    const doctor = availableDoctors.find(d => d.id === doctorId)
    if (!doctor) return

    const conversation: Conversation = {
      id: Date.now().toString(),
      participants: ['current-user', doctorId],
      lastActivity: new Date().toISOString(),
      type: 'consultation',
      title: `${consultationType === 'second-opinion' ? 'Second Opinion' : consultationType === 'referral' ? 'Referral' : 'Consultation'} - ${doctor.name}`,
      patientContext: patientId ? {
        patientId,
        patientName: 'Patient Name', // Would be fetched from patient data
        consultationType
      } : undefined,
      unreadCount: 0,
      isStarred: false
    }

    setConversations(prev => [conversation, ...(prev || [])])
    setSelectedConversationId(conversation.id)
    setShowNewConsultation(false)
    toast.success('Consultation started')
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) return 'Now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const getDoctorName = (doctorId: string) => {
    return availableDoctors.find(d => d.id === doctorId)?.name || 'Unknown Doctor'
  }

  return (
    <div className="flex h-full gap-6">
      {/* Conversations Sidebar */}
      <div className="w-80 flex flex-col">
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-accent" />
                Messages
              </CardTitle>
              <Dialog open={showNewConsultation} onOpenChange={setShowNewConsultation}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start New Consultation</DialogTitle>
                  </DialogHeader>
                  <NewConsultationForm
                    onStart={handleStartConsultation}
                    doctors={availableDoctors}
                    loading={doctorDirectoryLoading}
                    error={doctorDirectoryError}
                  />
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="consultations" className="text-xs">Consults</TabsTrigger>
                <TabsTrigger value="starred" className="text-xs">Starred</TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">Unread</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="space-y-1 p-3" role="listbox" aria-label="Conversations">
                {filteredConversations.map((conversation, index) => (
                  <button
                    key={conversation.id}
                    type="button"
                    ref={(node) => { conversationRefs.current[conversation.id] = node }}
                    role="option"
                    aria-selected={selectedConversationId === conversation.id ? 'true' : undefined}
                    aria-label={`Conversation with ${conversation.title || getDoctorName(conversation.participants.find(p => p !== 'current-user') || '')}`}
                    className={`w-full rounded-lg p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      selectedConversationId === conversation.id ? 'bg-primary/10' : 'bg-transparent'
                    } hover:bg-muted/50`}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    onKeyDown={(event) => handleConversationKeyDown(event, index, conversation.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {conversation.type === 'group' ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                          </AvatarFallback>
                        </Avatar>
                        {conversation.participants.length === 2 && availableDoctors.find(d => d.id === conversation.participants.find(p => p !== 'current-user'))?.isOnline && (
                          <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium truncate">
                            {conversation.title || getDoctorName(conversation.participants.find(p => p !== 'current-user') || '')}
                          </p>
                          <div className="flex items-center gap-1">
                            {conversation.isStarred && <Star className="h-3 w-3 text-yellow-500 fill-current" aria-hidden="true" />}
                            <span className="text-xs text-muted-foreground">
                              {formatTime(conversation.lastActivity)}
                            </span>
                          </div>
                        </div>
                        
                        {conversation.patientContext && (
                          <div className="mt-1 flex items-center gap-1">
                            <Stethoscope className="h-3 w-3 text-accent" aria-hidden="true" />
                            <span className="text-xs font-medium text-accent">
                              {conversation.patientContext.consultationType.replace('-', ' ')}
                            </span>
                          </div>
                        )}
                        
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          {conversation.lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      
                      {conversation.unreadCount > 0 && (
                        <Badge variant="default" className="flex h-5 min-w-5 items-center justify-center px-1 text-xs">
                          {conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {selectedConversation.type === 'group' ? <Users className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">
                      {selectedConversation.title || getDoctorName(selectedConversation.participants.find(p => p !== 'current-user') || '')}
                    </h3>
                    {selectedConversation.patientContext && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Stethoscope className="h-3 w-3" />
                        Patient: {selectedConversation.patientContext.patientName}
                        <Badge variant="outline" className="text-xs">
                          {selectedConversation.patientContext.consultationType.replace('-', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" aria-label="Start audio call">
                    <Phone className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button variant="outline" size="sm" aria-label="Start video call">
                    <Video className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label={`${selectedConversation.isStarred ? 'Unstar' : 'Star'} this conversation`}
                    onClick={() => {
                      setConversations(prev => (prev || []).map(conv => 
                        conv.id === selectedConversationId 
                          ? { ...conv, isStarred: !conv.isStarred }
                          : conv
                      ))
                    }}
                    aria-pressed={selectedConversation.isStarred}
                  >
                    <Star className={`h-4 w-4 ${selectedConversation.isStarred ? 'text-yellow-500 fill-current' : ''}`} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <Separator />

            <CardContent className="flex-1 flex flex-col p-0">
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.senderId === 'current-user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.senderId !== 'current-user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {getDoctorName(message.senderId).split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      
                      <div className={`max-w-xs lg:max-w-md ${
                        message.senderId === 'current-user' ? 'order-first' : ''
                      }`}>
                        <div className={`px-3 py-2 rounded-lg ${
                          message.senderId === 'current-user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {message.type === 'patient-file' && (
                            <div className="flex items-center gap-2 mb-2">
                              <FileText className="h-4 w-4" />
                              <span className="text-sm font-medium">Patient File Shared</span>
                            </div>
                          )}
                          
                          {message.type === 'consultation-request' && (
                            <div className="flex items-center gap-2 mb-2">
                              <Brain className="h-4 w-4" />
                              <span className="text-sm font-medium">Consultation Request</span>
                            </div>
                          )}
                          
                          <p className="text-sm">{message.content}</p>
                          
                          {message.priority && message.priority !== 'normal' && (
                            <Badge 
                              variant={message.priority === 'urgent' ? 'destructive' : 'secondary'}
                              className="mt-2 text-xs"
                            >
                              {message.priority}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-1 px-1">
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                      
                      {message.senderId === 'current-user' && (
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">You</AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="flex items-center gap-3 mb-3">
                  <PatientFileSharer 
                    onShare={(sections, message, doctorId, priority) => {
                      if (!selectedConversationId) return
                      
                      // Handle patient file sharing
                      const shareMessage = {
                        id: Date.now().toString(),
                        senderId: 'current-user',
                        content: `Shared patient file sections: ${sections.join(', ')}. ${message}`,
                        timestamp: new Date().toISOString(),
                        type: 'patient-file' as const,
                        priority: priority as any,
                        isRead: false
                      }
                      
                      setMessages(prev => ({
                        ...(prev || {}),
                        [selectedConversationId]: [...((prev || {})[selectedConversationId] || []), shareMessage]
                      }))
                      
                      toast.success('Patient file shared')
                    }}
                  />
                  
                  <ConsultationRequest
                    onSubmit={(request) => {
                      if (!selectedConversationId) return
                      
                      // Handle consultation request
                      const consultMessage = {
                        id: Date.now().toString(),
                        senderId: 'current-user',
                        content: request.clinicalQuestion,
                        timestamp: new Date().toISOString(),
                        type: 'consultation-request' as const,
                        priority: request.urgency as any,
                        isRead: false
                      }
                      
                      setMessages(prev => ({
                        ...(prev || {}),
                        [selectedConversationId]: [...((prev || {})[selectedConversationId] || []), consultMessage]
                      }))
                      
                      toast.success('Consultation request sent')
                    }}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Brain className="h-4 w-4 mr-2" />
                        Consult
                      </Button>
                    }
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label="Attach files (coming soon)"
                    onClick={handleAttachmentClick}
                  >
                    <Paperclip className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <div className="flex-1 flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleComposerKeyDown}
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <CardContent className="text-center">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p className="text-muted-foreground mb-4">
                Choose a conversation from the sidebar to start messaging
              </p>
              <Dialog open={showNewConsultation} onOpenChange={setShowNewConsultation}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Consultation
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Start New Consultation</DialogTitle>
                  </DialogHeader>
                  <NewConsultationForm
                    onStart={handleStartConsultation}
                    doctors={availableDoctors}
                    loading={doctorDirectoryLoading}
                    error={doctorDirectoryError}
                  />
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

interface NewConsultationFormProps {
  onStart: (type: 'second-opinion' | 'referral' | 'general', doctorId: string, patientId?: string) => void
  doctors: Doctor[]
  loading: boolean
  error: string | null
}

function NewConsultationForm({ onStart, doctors, loading, error }: NewConsultationFormProps) {
  const [consultationType, setConsultationType] = useState<'second-opinion' | 'referral' | 'general'>('general')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [selectedPatient, setSelectedPatient] = useState('')
  const [message, setMessage] = useState('')

  const doctorOptions = useMemo(
    () => doctors.map((doctor) => ({
      id: doctor.id,
      label: doctor.name,
      specialty: doctor.specialty,
      isOnline: doctor.isOnline,
    })),
    [doctors]
  )

  const canStart = Boolean(selectedDoctor)

  const handleSubmit = () => {
    if (!selectedDoctor) {
      toast.error('Please select a doctor')
      return
    }

    onStart(consultationType, selectedDoctor, selectedPatient || undefined)
    setSelectedDoctor('')
    setSelectedPatient('')
    setMessage('')
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Consultation Type</label>
        <Select value={consultationType} onValueChange={(value: any) => setConsultationType(value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Consultation</SelectItem>
            <SelectItem value="second-opinion">Second Opinion</SelectItem>
            <SelectItem value="referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium">Select Doctor</label>
          {loading && <span className="text-xs text-muted-foreground">Loading directory…</span>}
        </div>
        {error && <p className="text-xs text-destructive mb-2">{error}</p>}
        <Select
          value={selectedDoctor}
          onValueChange={setSelectedDoctor}
          disabled={loading || doctorOptions.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a colleague" />
          </SelectTrigger>
          <SelectContent>
            {doctorOptions.map((doctor) => (
              <SelectItem key={doctor.id} value={doctor.id}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${doctor.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span>{doctor.label}</span>
                  <span className="text-muted-foreground text-sm">- {doctor.specialty}</span>
                </div>
              </SelectItem>
            ))}
            {doctorOptions.length === 0 && !loading && (
              <SelectItem value="no-doctors" disabled>
                No directory entries available yet
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {consultationType !== 'general' && (
        <div>
          <label className="text-sm font-medium mb-2 block">Patient (Optional)</label>
          <Select value={selectedPatient} onValueChange={setSelectedPatient}>
            <SelectTrigger>
              <SelectValue placeholder="Select patient" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patient-1">Ahmed Al-Mansouri</SelectItem>
              <SelectItem value="patient-2">Fatima Hassan</SelectItem>
              <SelectItem value="patient-3">Mohammed Abdullah</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <label className="text-sm font-medium mb-2 block">Initial Message</label>
        <Textarea
          placeholder="Describe the consultation request..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setMessage('')}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canStart}>
          Start Consultation
        </Button>
      </div>
    </div>
  )
}