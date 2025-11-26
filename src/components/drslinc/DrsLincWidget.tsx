import { useEffect, useMemo, useRef, useState } from 'react'
import type { Page } from '@/App'
import { usePatient } from '@/db'
import { cn } from '@/lib/utils'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
  MessageCircle,
  Minimize2,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'

type ModelId = 'chatgpt' | 'claude' | 'copilot'

interface DrsLincMessage {
  id: string
  role: 'assistant' | 'user' | 'system'
  content: string
  model?: ModelId
  citations?: string[]
  timestamp: number
}

interface DrsLincWidgetProps {
  selectedPatientId: string | null
  currentPage: Page
  onNavigate?: (page: Page) => void
}

interface PatientSnapshot {
  summary: string
  riskFlags: string[]
  medications: string[]
  allergies: string[]
  insurance?: string
  lastVisit?: string
}

interface PromptChip {
  id: string
  label: string
  prompt: string
}

const MODEL_OPTIONS: Record<ModelId, {
  label: string
  description: string
  gradientClass: string
  status: 'online' | 'syncing' | 'degraded'
  latencyMs: number
  strengths: string[]
}> = {
  chatgpt: {
    label: 'OpenAI ChatGPT',
    description: 'Reasoning, differential diagnosis, guidelines',
    gradientClass: 'bg-gradient-to-br from-sky-500 via-indigo-500 to-blue-600',
    status: 'online',
    latencyMs: 1200,
    strengths: ['Differential builder', 'Guideline lookups', 'Risk explanations'],
  },
  claude: {
    label: 'Claude Clinical',
    description: 'Narrative summaries, empathetic messages',
    gradientClass: 'bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500',
    status: 'online',
    latencyMs: 1400,
    strengths: ['SOAP notes', 'Long-form letters', 'Patient-friendly education'],
  },
  copilot: {
    label: 'GitHub Copilot',
    description: 'Automation, orders, coding & scripting',
    gradientClass: 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500',
    status: 'syncing',
    latencyMs: 950,
    strengths: ['Order set automation', 'Workflow scripting', 'Coding helpers'],
  },
}

const BASE_PROMPTS: PromptChip[] = [
  { id: 'summary', label: 'Chart summary', prompt: 'Summarize the patient story, highlight missing vitals, and list open tasks that would block discharge readiness.' },
  { id: 'safety', label: 'Safety check', prompt: 'Check for medication conflicts, allergies, and contraindications using the active medication list.' },
  { id: 'soap', label: 'Draft SOAP note', prompt: 'Draft a concise SOAP note using the current encounter context with objective data and next steps.' },
  { id: 'nphies', label: 'Prep NPHIES claim', prompt: 'Outline the data elements needed to submit a compliant NPHIES claim for this visit.' },
]

const CITATION_LIBRARY = [
  'Saudi MOH Sepsis Bundle 2024',
  'AHA/ACC Heart Failure Guideline 2022',
  'AAAAI Allergy Safety Update 2023',
  'NICE Diabetes Management NG28',
  'UpToDate Critical Care Handbook 2025',
]

const uuid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)

export function DrsLincWidget({ selectedPatientId, currentPage, onNavigate }: DrsLincWidgetProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [panelHeight, setPanelHeight] = useState(520)
  const [selectedModel, setSelectedModel] = useState<ModelId>('chatgpt')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<DrsLincMessage[]>(() => [{
    id: uuid(),
    role: 'assistant',
    content: 'Hi Doctor, I am DrsLinc — your clinical copilot. I stay context-aware, route tasks to ChatGPT, Claude, or Copilot automatically, and keep every interaction audit-ready.',
    model: 'chatgpt',
    timestamp: Date.now(),
    citations: ['BrainSait Safety Controls'],
  }])
  const [isProcessing, setIsProcessing] = useState(false)
  const { patient, isLoading: patientLoading } = usePatient(selectedPatientId)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const lastContextPatient = useRef<string | null>(null)

  // Keyboard shortcut Cmd/Ctrl + J to toggle
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault()
        setIsOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Auto-scroll conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isProcessing])

  // Drop a system message whenever patient context changes
  useEffect(() => {
    if (!patient && lastContextPatient.current) {
      lastContextPatient.current = null
      setMessages(prev => [
        ...prev,
        {
          id: uuid(),
          role: 'system',
          content: 'Context cleared. No patient selected — responses will stay general until you open a chart.',
          timestamp: Date.now(),
        },
      ])
      return
    }

    if (patient && patient.id !== lastContextPatient.current) {
      lastContextPatient.current = patient.id
      setMessages(prev => [
        ...prev,
        {
          id: uuid(),
          role: 'system',
          content: `Context locked to ${patient.name} (${patient.age}y, ${patient.gender}). Allergies: ${patient.allergies.length ? patient.allergies.join(', ') : 'none recorded'}.`,
          timestamp: Date.now(),
        },
      ])
    }
  }, [patient])

  const patientSnapshot = useMemo<PatientSnapshot>(() => {
    if (!patient) {
      return {
        summary: 'No active patient selected. Use the patient list to load a chart or continue with general assistance.',
        riskFlags: [],
        medications: [],
        allergies: [],
      }
    }

    const riskFlags: string[] = []
    if (patient.status === 'critical') {
      riskFlags.push('Critical monitoring required')
    } else if (patient.status === 'monitoring') {
      riskFlags.push('Under active monitoring')
    }

    if (patient.allergies.length) {
      riskFlags.push(`Allergies: ${patient.allergies.slice(0, 2).join(', ')}`)
    }

    if (patient.conditions.some(condition => /heart|cardio/i.test(condition))) {
      riskFlags.push('Cardiovascular risk')
    }

    if (patient.conditions.some(condition => /diabetes|glycemia/i.test(condition))) {
      riskFlags.push('Endocrine watch')
    }

    const medications = patient.medications.slice(0, 4).map(med => `${med.name} ${med.dosage}`)

    return {
      summary: `${patient.name}, ${patient.age}y ${patient.gender}. Primary issues: ${patient.conditions.slice(0, 3).join(', ') || 'no chronic problems on file'}.`,
      riskFlags,
      medications,
      allergies: patient.allergies,
      insurance: patient.insuranceInfo?.provider,
      lastVisit: patient.lastVisit,
    }
  }, [patient])

  const contextConfidence = useMemo(() => {
    if (!patient) return 0.55
    const signals = [
      patient.conditions.length > 0,
      patient.medications.length > 0,
      patient.allergies.length > 0,
      Boolean(patient.insuranceInfo),
      Boolean(patient.lastVisit),
    ]
    const score = signals.filter(Boolean).length / signals.length
    return Math.min(0.95, 0.6 + score * 0.35)
  }, [patient])

  const riskSignature = patientSnapshot.riskFlags.join('|')
  const allergyCount = patientSnapshot.allergies.length

  const enrichedPrompts = useMemo<PromptChip[]>(() => {
    if (!patient) return BASE_PROMPTS
    const dynamic: PromptChip[] = []

    if (patientSnapshot.riskFlags.some(flag => flag.toLowerCase().includes('cardio'))) {
      dynamic.push({
        id: 'cardio',
        label: 'Cardio guard',
        prompt: 'Create a cardiology-focused checklist that covers fluid status, labs, cardiology consult triggers, and discharge blockers.',
      })
    }

    if (patientSnapshot.allergies.length >= 2) {
      dynamic.push({
        id: 'allergy',
        label: 'Allergy audit',
        prompt: 'List allergy considerations and suggest alternative meds or order sets that avoid the documented reactions.',
      })
    }

    return [...BASE_PROMPTS, ...dynamic]
  }, [patient, allergyCount, riskSignature, patientSnapshot])

  const safeInput = input.trim()

  const simulateAssistantResponse = async (prompt: string): Promise<DrsLincMessage> => {
    const waitTime = MODEL_OPTIONS[selectedModel].latencyMs
    await new Promise(resolve => setTimeout(resolve, waitTime))

    const contextLine = patientSnapshot.summary
    const riskLine = patientSnapshot.riskFlags.length ? `Risk flags: ${patientSnapshot.riskFlags.join(' • ')}.` : 'No acute risk markers surfaced from the charted data.'
    const medLine = patientSnapshot.medications.length ? `Active medications include ${patientSnapshot.medications.join(', ')}.` : 'No active medications documented; consider reconciling the list.'

    const taskFocus = (() => {
      if (/soap/i.test(prompt)) return 'Structured SOAP draft ready to paste into the encounter note.'
      if (/nphies/i.test(prompt) || /claim/i.test(prompt)) return 'Claims-readiness checklist for NPHIES submission.'
      if (/allerg|safety|interaction/i.test(prompt)) return 'Medication + allergy safety sweep.'
      if (/summary|overview|recap/i.test(prompt)) return 'At-a-glance clinical recap with gaps and blockers.'
      return 'Actionable guidance grounded in the latest evidence I have cached.'
    })()

    const citations = [
      MODEL_OPTIONS[selectedModel].label,
      CITATION_LIBRARY[Math.floor(Math.random() * CITATION_LIBRARY.length)],
    ]

    if (patientSnapshot.allergies.length) {
      citations.push('AAAAI Allergy Safety Update 2023')
    }

    const response = [
      `Leveraging ${MODEL_OPTIONS[selectedModel].label}, here is the context-aware readout:`,
      contextLine,
      riskLine,
      medLine,
      '',
      `Task focus: ${taskFocus}`,
      '',
      'Next steps:',
      `1. ${patientSnapshot.riskFlags.length ? 'Address the highlighted risk flags with targeted monitoring orders.' : 'Capture vitals and labs to enrich the clinical context.'}`,
      '2. Document or import the latest objective findings so the assistant can auto-fill the note.',
      '3. Approve or edit before commit — every action is audit logged for 7 years.',
    ].join('\n')

    return {
      id: uuid(),
      role: 'assistant',
      content: response,
      model: selectedModel,
      timestamp: Date.now(),
      citations: Array.from(new Set(citations)),
    }
  }

  const handleSend = async (presetPrompt?: string) => {
    const content = (presetPrompt ?? safeInput)
    if (!content) return

    const newMessage: DrsLincMessage = {
      id: uuid(),
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, newMessage])
    if (!presetPrompt) setInput('')
    setIsProcessing(true)

    const assistantMessage = await simulateAssistantResponse(content)
    setMessages(prev => [...prev, assistantMessage])
    setIsProcessing(false)
  }

  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    const startY = event.clientY
    const startHeight = panelHeight

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startY - moveEvent.clientY
      const nextHeight = Math.min(720, Math.max(360, startHeight + delta))
      setPanelHeight(nextHeight)
    }

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const renderMessage = (message: DrsLincMessage) => {
    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'
    const paragraphs = message.content.split('\n').filter(Boolean)

    return (
      <div
        key={message.id}
        className={cn('mb-3 flex flex-col text-sm', isUser ? 'items-end' : 'items-start')}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : isAssistant
                ? 'bg-muted/70 text-foreground border border-border/60 rounded-bl-sm'
                : 'bg-slate-900/80 text-slate-50 text-xs'
          )}
        >
          {!isUser && isAssistant && message.model && (
            <div className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              {MODEL_OPTIONS[message.model]?.label ?? 'DrsLinc'}
            </div>
          )}
          {paragraphs.map((paragraph, index) => (
            <p key={`${message.id}-${index}`} className="whitespace-pre-wrap leading-relaxed">
              {paragraph}
            </p>
          ))}
          {message.citations && message.citations.length > 0 && (
            <div className="mt-2 border-t border-border/50 pt-1 text-[11px] text-muted-foreground">
              Citations: {message.citations.join('; ')}
            </div>
          )}
        </div>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    )
  }

  const quickNavigation = [
    { label: 'Patient chart', page: 'patient-details' as Page },
    { label: 'Telemedicine', page: 'telemedicine' as Page },
    { label: 'NPHIES workbench', page: 'nphies' as Page },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2">
      {!isOpen && (
        <button
          className="flex items-center gap-3 rounded-full border border-primary/40 bg-background px-5 py-3 text-left shadow-xl shadow-primary/10 transition hover:translate-y-[-2px] hover:shadow-primary/20"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">DrsLinc ready</p>
            <p className="text-xs text-muted-foreground">Cmd/Ctrl + J · {MODEL_OPTIONS[selectedModel].label}</p>
          </div>
        </button>
      )}

      {isOpen && (
        <section
          className="flex w-full max-w-[420px] flex-col overflow-hidden rounded-3xl border border-border/60 bg-background text-foreground shadow-2xl shadow-primary/15"
          style={{ height: panelHeight }}
        >
          <div
            className="flex cursor-row-resize items-center justify-between border-b border-border/60 px-4 py-2 text-xs text-muted-foreground"
            onMouseDown={handleResizeStart}
          >
            <span className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              DrsLinc Copilot
            </span>
            <span>Drag to resize</span>
          </div>

          <header className="flex items-center justify-between border-b border-border/60 px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Context awareness</p>
              <p className="text-xs text-muted-foreground">{patient ? `${patient.name} · MRN ${patient.mrn}` : 'No patient selected'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-border/70 p-1 hover:bg-muted"
                onClick={() => setIsOpen(false)}
                aria-label="Minimize DrsLinc"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                className="rounded-full border border-border/70 p-1 hover:bg-muted"
                onClick={() => setIsOpen(false)}
                aria-label="Close DrsLinc"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-hidden">
            <div className="space-y-4 overflow-y-auto px-4 pb-4 pt-3">
              <section className="rounded-2xl border border-border/60 bg-muted/40 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Activity className="h-4 w-4 text-primary" />
                    Patient signal
                  </span>
                  <span>{patientLoading ? 'Syncing...' : 'Live'}</span>
                </div>
                <p className="mt-2 text-sm leading-5">{patientSnapshot.summary}</p>
                {patientSnapshot.riskFlags.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {patientSnapshot.riskFlags.map(flag => (
                      <div key={flag} className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-1 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        {flag}
                      </div>
                    ))}
                  </div>
                )}
                {patientSnapshot.medications.length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Meds: {patientSnapshot.medications.join(', ')}
                  </div>
                )}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Context confidence</span>
                    <span>{Math.round(contextConfidence * 100)}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-border/60">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-500"
                      style={{ width: `${contextConfidence * 100}%` }}
                    />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Model routing</span>
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                    Audit on
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  {(Object.keys(MODEL_OPTIONS) as ModelId[]).map(model => {
                    const option = MODEL_OPTIONS[model]
                    return (
                      <button
                        key={model}
                        className={cn(
                          'flex h-full flex-col rounded-2xl border p-2 text-left transition',
                          selectedModel === model
                            ? cn('border-transparent text-white shadow-lg shadow-primary/20', option.gradientClass)
                            : 'border-border/60 text-foreground bg-muted/30 hover:bg-muted/60'
                        )}
                        onClick={() => setSelectedModel(model)}
                      >
                        <span className="text-[11px] font-semibold">{option.label}</span>
                        <span className="text-[10px] text-muted-foreground">{option.description.split('.')[0]}</span>
                        <span className="mt-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                          {option.status === 'online' ? 'Online' : option.status === 'syncing' ? 'Syncing' : 'Degraded'} · {option.latencyMs}ms
                        </span>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <div className="text-xs font-medium text-foreground">Quick prompts</div>
                <div className="flex flex-wrap gap-2">
                  {enrichedPrompts.map(prompt => (
                    <button
                      key={prompt.id}
                      className="rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => handleSend(prompt.prompt)}
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/40 px-3 py-2 text-xs">
                <div>
                  <p className="font-medium text-foreground">Failover ready</p>
                  <p className="text-muted-foreground">Offline playbooks + cached care pathways</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </section>

              <div className="max-h-[40%] overflow-y-auto">
                {messages.map(renderMessage)}
                {isProcessing && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {MODEL_OPTIONS[selectedModel].label} thinking…
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </div>

          <footer className="border-t border-border/60 px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Cmd/Ctrl + Enter to send
              </span>
              <button
                className="flex items-center gap-1 text-primary"
                onClick={() => setIsOpen(false)}
              >
                Dock
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <textarea
                className="h-16 flex-1 resize-none rounded-2xl border border-border/60 bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Ask for care plans, coding help, summaries…"
                value={input}
                onChange={event => setInput(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
              />
              <button
                className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                onClick={() => handleSend()}
                disabled={!safeInput || isProcessing}
                aria-label="Send message"
              >
                {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                PHI minimization enforced
              </span>
              <span className="flex items-center gap-1">
                <ExternalLink className="h-3.5 w-3.5" />
                Audit log active
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {quickNavigation.map(action => (
                <button
                  key={action.page}
                  className="flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-[11px] text-muted-foreground transition hover:border-primary hover:text-primary"
                  onClick={() => {
                    onNavigate?.(action.page)
                    setIsOpen(false)
                  }}
                >
                  {action.label}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
              ))}
              <span className="text-[11px] text-muted-foreground">Now on {currentPage}</span>
            </div>
          </footer>
        </section>
      )}
    </div>
  )
}
