import { useMemo, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Brain,
  User,
  Stethoscope,
  Question,
  Star,
  Warning as AlertTriangle,
  CheckCircle
} from "@phosphor-icons/react"
import { toast } from 'sonner'
import { useDoctorDirectory } from "@/hooks/useDoctorDirectory"

interface ConsultationRequestProps {
  onSubmit: (request: ConsultationRequestData) => void
  trigger?: React.ReactNode
}

interface ConsultationRequestData {
  type: 'second-opinion' | 'referral' | 'urgent-consult' | 'case-discussion'
  specialtyNeeded: string
  doctorId?: string
  patientId: string
  patientName: string
  urgency: 'routine' | 'urgent' | 'emergent'
  preferredTimeframe: string
  clinicalQuestion: string
  currentDiagnosis: string
  currentTreatment: string
  specificConcerns: string[]
  attachments: string[]
  expectedOutcome: string
}

const specialties = [
  'Cardiology',
  'Dermatology', 
  'Endocrinology',
  'Gastroenterology',
  'Hematology',
  'Infectious Disease',
  'Nephrology',
  'Neurology',
  'Oncology',
  'Orthopedics',
  'Pediatrics',
  'Psychiatry',
  'Pulmonology',
  'Radiology',
  'Rheumatology',
  'Urology'
]

interface DoctorOption {
  id: string
  name: string
  specialty: string
  rating?: number
  available?: boolean
  registrationNumbers?: string[]
  contacts?: string[]
}

const fallbackDoctors: DoctorOption[] = [
  { id: '1', name: 'Dr. Ahmed Al-Rashid', specialty: 'Cardiology', rating: 4.9, available: true },
  { id: '2', name: 'Dr. Fatima Hassan', specialty: 'Dermatology', rating: 4.8, available: true },
  { id: '3', name: 'Dr. Mohammed Al-Mansouri', specialty: 'Neurology', rating: 4.9, available: false },
  { id: '4', name: 'Dr. Sarah Abdullah', specialty: 'Oncology', rating: 4.7, available: true },
  { id: '5', name: 'Dr. Omar Al-Zahra', specialty: 'Orthopedics', rating: 4.8, available: true },
]

const commonConcerns = [
  'Differential diagnosis uncertainty',
  'Treatment response concerns',
  'Medication interactions',
  'Surgical intervention needed',
  'Complex comorbidities',
  'Patient compliance issues',
  'Unusual presentation',
  'Second opinion on diagnosis',
  'Treatment escalation needed',
  'Rare condition suspected'
]

export function ConsultationRequest({ onSubmit, trigger }: ConsultationRequestProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<Partial<ConsultationRequestData>>({
    type: 'second-opinion',
    urgency: 'routine',
    specificConcerns: [],
    attachments: []
  })

  const {
    doctors: directoryDoctors,
    loading: doctorsLoading,
    error: doctorDirectoryError
  } = useDoctorDirectory({
    specialty: formData.specialtyNeeded,
    limit: 120
  })

  const directoryDoctorOptions = useMemo<DoctorOption[]>(() => {
    return directoryDoctors.map((doctor, index) => {
      const rating = Number((4 + (index % 10) / 10).toFixed(1))
      return {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty || 'General Practice',
        rating,
        available: true,
        registrationNumbers: doctor.registrationNumbers,
        contacts: doctor.contacts,
      }
    })
  }, [directoryDoctors])

  const doctorOptions = directoryDoctorOptions.length ? directoryDoctorOptions : fallbackDoctors

  const filteredDoctors = useMemo(() => {
    if (!formData.specialtyNeeded) {
      return doctorOptions
    }

    const normalizedSpecialty = formData.specialtyNeeded.toLowerCase()
    return doctorOptions.filter((doctor) =>
      doctor.specialty.toLowerCase().includes(normalizedSpecialty)
    )
  }, [doctorOptions, formData.specialtyNeeded])

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleConcernToggle = (concern: string) => {
    const concerns = formData.specificConcerns || []
    const updated = concerns.includes(concern)
      ? concerns.filter(c => c !== concern)
      : [...concerns, concern]
    
    setFormData({ ...formData, specificConcerns: updated })
  }

  const handleSubmit = () => {
    if (!formData.specialtyNeeded || !formData.patientId || !formData.clinicalQuestion) {
      toast.error('Please fill in all required fields')
      return
    }

    onSubmit(formData as ConsultationRequestData)
    setIsOpen(false)
    setCurrentStep(1)
    setFormData({
      type: 'second-opinion',
      urgency: 'routine', 
      specificConcerns: [],
      attachments: []
    })
    toast.success('Consultation request submitted')
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'routine': return 'text-green-600 bg-green-50 border-green-200'
      case 'urgent': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'emergent': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Brain className="h-4 w-4 mr-2" />
            Request Consultation
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Request Consultation - Step {currentStep} of 3
          </DialogTitle>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {step < currentStep ? <CheckCircle className="h-4 w-4" /> : step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${
                  step < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Consultation Type & Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium mb-4 block">Consultation Type</Label>
              <RadioGroup
                value={formData.type}
                onValueChange={(value: string) => setFormData({ ...formData, type: value })}
              >
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="second-opinion" id="second-opinion" />
                    <Label htmlFor="second-opinion" className="flex items-center gap-2 cursor-pointer">
                      <Question className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Second Opinion</div>
                        <div className="text-sm text-muted-foreground">Get another expert's perspective on diagnosis or treatment</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="referral" id="referral" />
                    <Label htmlFor="referral" className="flex items-center gap-2 cursor-pointer">
                      <User className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Referral</div>
                        <div className="text-sm text-muted-foreground">Transfer patient care to specialist</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="urgent-consult" id="urgent-consult" />
                    <Label htmlFor="urgent-consult" className="flex items-center gap-2 cursor-pointer">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Urgent Consultation</div>
                        <div className="text-sm text-muted-foreground">Immediate expert input needed</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="case-discussion" id="case-discussion" />
                    <Label htmlFor="case-discussion" className="flex items-center gap-2 cursor-pointer">
                      <Stethoscope className="h-4 w-4 text-purple-500" />
                      <div>
                        <div className="font-medium">Case Discussion</div>
                        <div className="text-sm text-muted-foreground">Collaborative discussion about complex case</div>
                      </div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Specialty Needed *</Label>
                <Select value={formData.specialtyNeeded} onValueChange={(value) => setFormData({ ...formData, specialtyNeeded: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialties.map((specialty) => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Urgency Level</Label>
                <Select value={formData.urgency} onValueChange={(value: any) => setFormData({ ...formData, urgency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine - Within 1-2 weeks</SelectItem>
                    <SelectItem value="urgent">Urgent - Within 24-48 hours</SelectItem>
                    <SelectItem value="emergent">Emergent - Immediate attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient ID *</Label>
                <Input 
                  placeholder="Patient medical record number"
                  value={formData.patientId || ''}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Patient Name *</Label>
                <Input 
                  placeholder="Patient full name"
                  value={formData.patientName || ''}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Clinical Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <Label>Clinical Question *</Label>
              <Textarea
                placeholder="What specific question would you like answered?"
                value={formData.clinicalQuestion || ''}
                onChange={(e) => setFormData({ ...formData, clinicalQuestion: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label>Current Working Diagnosis</Label>
              <Input
                placeholder="Your current diagnosis or differential"
                value={formData.currentDiagnosis || ''}
                onChange={(e) => setFormData({ ...formData, currentDiagnosis: e.target.value })}
              />
            </div>

            <div>
              <Label>Current Treatment Plan</Label>
              <Textarea
                placeholder="Current medications, interventions, or treatments"
                value={formData.currentTreatment || ''}
                onChange={(e) => setFormData({ ...formData, currentTreatment: e.target.value })}
                rows={3}
              />
            </div>

            <div>
              <Label className="mb-3 block">Specific Concerns (Select all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {commonConcerns.map((concern) => (
                  <div
                    key={concern}
                    className={`p-2 text-sm border rounded cursor-pointer transition-colors ${
                      formData.specificConcerns?.includes(concern)
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border hover:bg-muted'
                    }`}
                    onClick={() => handleConcernToggle(concern)}
                  >
                    {concern}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Expected Outcome</Label>
              <Textarea
                placeholder="What outcome are you hoping for from this consultation?"
                value={formData.expectedOutcome || ''}
                onChange={(e) => setFormData({ ...formData, expectedOutcome: e.target.value })}
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Step 3: Doctor Selection & Timing */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="block">Select Consulting Doctor (Optional)</Label>
                {doctorsLoading && (
                  <span className="text-xs text-muted-foreground">Loading directory…</span>
                )}
              </div>
              {doctorDirectoryError && (
                <p className="text-xs text-destructive mb-2">{doctorDirectoryError}</p>
              )}
              <div className="space-y-3">
                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    !formData.doctorId ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'
                  }`}
                  onClick={() => setFormData({ ...formData, doctorId: undefined })}
                >
                  <div className="font-medium">Any Available Doctor</div>
                  <div className="text-sm text-muted-foreground">System will assign based on specialty and availability</div>
                </div>
                
                {filteredDoctors.length === 0 && !doctorsLoading && (
                  <p className="text-sm text-muted-foreground">
                    No doctors match the selected specialty yet. Try another filter or fallback to the on-call pool.
                  </p>
                )}

                {filteredDoctors.map((doctor) => (
                  <div
                    key={doctor.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.doctorId === doctor.id 
                        ? 'bg-primary/10 border-primary' 
                        : 'border-border hover:bg-muted'
                    } ${doctor.available === false ? 'opacity-50' : ''}`}
                    onClick={() => doctor.available !== false && setFormData({ ...formData, doctorId: doctor.id })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {doctor.name}
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            <span className="text-xs">{doctor.rating?.toFixed(1) ?? 'N/A'}</span>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{doctor.specialty}</div>
                        {doctor.registrationNumbers && doctor.registrationNumbers.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1 truncate">
                            {doctor.registrationNumbers[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {doctor.available !== false ? (
                          <Badge className="bg-green-100 text-green-800">Available</Badge>
                        ) : (
                          <Badge variant="secondary">Busy</Badge>  
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Preferred Timeframe</Label>
              <Select value={formData.preferredTimeframe} onValueChange={(value) => setFormData({ ...formData, preferredTimeframe: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="When do you need this consultation?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediately">Immediately (STAT)</SelectItem>
                  <SelectItem value="within-hour">Within 1 hour</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="this-week">This week</SelectItem>
                  <SelectItem value="next-week">Next week</SelectItem>
                  <SelectItem value="flexible">Flexible timing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Request Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <Badge variant="outline">{formData.type?.replace('-', ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Specialty:</span>
                  <span>{formData.specialtyNeeded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Urgency:</span>
                  <Badge className={getUrgencyColor(formData.urgency || 'routine')}>
                    {formData.urgency}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Patient:</span>
                  <span>{formData.patientName} ({formData.patientId})</span>
                </div>
                {formData.specificConcerns && formData.specificConcerns.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Concerns:</span>
                    <div className="mt-1 space-y-1">
                      {formData.specificConcerns.map((concern) => (
                        <Badge key={concern} variant="outline" className="text-xs mr-1 mb-1">
                          {concern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <Separator className="my-6" />

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button onClick={handleSubmit}>
                <Brain className="h-4 w-4 mr-2" />
                Submit Request
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}