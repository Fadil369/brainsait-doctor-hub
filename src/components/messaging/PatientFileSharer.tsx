import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  FileText, 
  Share, 
  User, 
  Calendar,
  Stethoscope,
  TestTube,
  Pill,
  Heart,
  Eye,
  Shield
} from "@phosphor-icons/react"
import { toast } from 'sonner'

interface PatientData {
  id: string
  name: string
  age: number
  gender: string
  medicalRecord: string
  lastVisit: string
  conditions: string[]
  medications: string[]
  labResults: LabResult[]
  vitals: VitalSigns
  allergies: string[]
  consultationHistory: ConsultationRecord[]
}

interface LabResult {
  id: string
  test: string
  value: string
  normalRange: string
  date: string
  status: 'normal' | 'abnormal' | 'critical'
}

interface VitalSigns {
  bloodPressure: string
  heartRate: string
  temperature: string
  weight: string
  height: string
  bmi: string
  lastUpdated: string
}

interface ConsultationRecord {
  id: string
  date: string
  diagnosis: string
  treatment: string
  followUp: string
  doctorName: string
}

interface ShareableSection {
  id: string
  name: string
  icon: any
  description: string
  sensitive: boolean
}

const shareableSections: ShareableSection[] = [
  { id: 'basic', name: 'Basic Information', icon: User, description: 'Name, age, gender, contact info', sensitive: false },
  { id: 'medical-history', name: 'Medical History', icon: FileText, description: 'Previous conditions, surgeries, family history', sensitive: true },
  { id: 'current-conditions', name: 'Current Conditions', icon: Stethoscope, description: 'Active diagnoses and ongoing treatments', sensitive: true },
  { id: 'medications', name: 'Current Medications', icon: Pill, description: 'Active prescriptions and dosages', sensitive: true },
  { id: 'lab-results', name: 'Laboratory Results', icon: TestTube, description: 'Recent test results and values', sensitive: true },
  { id: 'vitals', name: 'Vital Signs', icon: Heart, description: 'Blood pressure, heart rate, temperature', sensitive: false },
  { id: 'allergies', name: 'Allergies & Reactions', icon: Shield, description: 'Known allergies and adverse reactions', sensitive: true },
  { id: 'imaging', name: 'Imaging Studies', icon: Eye, description: 'X-rays, MRI, CT scans, ultrasounds', sensitive: true },
]

// Mock patient data
const mockPatient: PatientData = {
  id: 'patient-1',
  name: 'Ahmed Al-Mansouri',
  age: 45,
  gender: 'Male',
  medicalRecord: 'MR-2024-001',
  lastVisit: '2024-01-15',
  conditions: ['Hypertension', 'Type 2 Diabetes', 'Mild Sleep Apnea'],
  medications: ['Metformin 500mg', 'Lisinopril 10mg', 'Atorvastatin 20mg'],
  labResults: [
    { id: '1', test: 'HbA1c', value: '7.2%', normalRange: '<7%', date: '2024-01-15', status: 'abnormal' },
    { id: '2', test: 'Total Cholesterol', value: '180 mg/dL', normalRange: '<200 mg/dL', date: '2024-01-15', status: 'normal' },
    { id: '3', test: 'Blood Pressure', value: '145/90 mmHg', normalRange: '<120/80 mmHg', date: '2024-01-15', status: 'abnormal' },
  ],
  vitals: {
    bloodPressure: '145/90 mmHg',
    heartRate: '78 bpm',
    temperature: '36.8°C',
    weight: '85 kg',
    height: '175 cm',
    bmi: '27.8',
    lastUpdated: '2024-01-15'
  },
  allergies: ['Penicillin', 'Shellfish'],
  consultationHistory: [
    {
      id: '1',
      date: '2024-01-15',
      diagnosis: 'Uncontrolled Diabetes Type 2',
      treatment: 'Adjusted Metformin dosage, dietary counseling',
      followUp: '3 months',
      doctorName: 'Dr. Sarah Ahmed'
    }
  ]
}

interface PatientFileSharerProps {
  patientId?: string
  onShare: (sections: string[], message: string, doctorId: string, priority: string) => void
}

export function PatientFileSharer({ patientId = 'patient-1', onShare }: PatientFileSharerProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [shareMessage, setShareMessage] = useState('')
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [priority, setPriority] = useState('normal')
  const [purpose, setPurpose] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const patient = mockPatient // In real app, would fetch by patientId

  const handleSectionToggle = (sectionId: string) => {
    setSelectedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const handleShare = () => {
    if (selectedSections.length === 0) {
      toast.error('Please select at least one section to share')
      return
    }

    if (!selectedDoctor) {
      toast.error('Please select a doctor to share with')
      return
    }

    if (!purpose) {
      toast.error('Please specify the purpose of sharing')
      return
    }

    onShare(selectedSections, shareMessage, selectedDoctor, priority)
    
    // Reset form
    setSelectedSections([])
    setShareMessage('')
    setSelectedDoctor('')
    setPriority('normal')
    setPurpose('')
    setIsOpen(false)
    
    toast.success('Patient file shared successfully')
  }

  const sensitiveCount = selectedSections.filter(id => 
    shareableSections.find(s => s.id === id)?.sensitive
  ).length

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share className="h-4 w-4 mr-2" />
          Share Patient File
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Share Patient File - {patient.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Patient Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Patient Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {patient.name}
                </div>
                <div>
                  <span className="font-medium">Age:</span> {patient.age}
                </div>
                <div>
                  <span className="font-medium">MRN:</span> {patient.medicalRecord}
                </div>
                <div>
                  <span className="font-medium">Last Visit:</span> {patient.lastVisit}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purpose of Sharing */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Purpose of Sharing <span className="text-destructive">*</span>
            </label>
            <Select value={purpose} onValueChange={setPurpose}>
              <SelectTrigger>
                <SelectValue placeholder="Select purpose" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="second-opinion">Second Opinion Request</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="collaboration">Treatment Collaboration</SelectItem>
                <SelectItem value="emergency">Emergency Consultation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Doctor Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Share With <span className="text-destructive">*</span>
            </label>
            <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
              <SelectTrigger>
                <SelectValue placeholder="Select colleague" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="doctor-1">Dr. Mohammed Al-Rashid - Neurology</SelectItem>
                <SelectItem value="doctor-2">Dr. Fatima Hassan - Dermatology</SelectItem>
                <SelectItem value="doctor-3">Dr. Ali Al-Mansouri - Orthopedics</SelectItem>
                <SelectItem value="doctor-4">Dr. Nour Abdullah - Pediatrics</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority Level */}
          <div>
            <label className="text-sm font-medium mb-2 block">Priority Level</label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - Routine consultation</SelectItem>
                <SelectItem value="normal">Normal - Standard consultation</SelectItem>
                <SelectItem value="high">High - Urgent consultation</SelectItem>
                <SelectItem value="urgent">Urgent - Immediate attention needed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sections to Share */}
          <div>
            <label className="text-sm font-medium mb-3 block">
              Select Information to Share <span className="text-destructive">*</span>
            </label>
            
            <ScrollArea className="h-64 border rounded-lg p-3">
              <div className="space-y-3">
                {shareableSections.map((section) => {
                  const Icon = section.icon
                  const isSelected = selectedSections.includes(section.id)
                  
                  return (
                    <div
                      key={section.id}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => handleSectionToggle(section.id)}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onChange={() => handleSectionToggle(section.id)}
                      />
                      <Icon className={`h-5 w-5 mt-0.5 ${section.sensitive ? 'text-orange-500' : 'text-primary'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{section.name}</span>
                          {section.sensitive && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                              Sensitive
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {section.description}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {/* Privacy Warning */}
            {sensitiveCount > 0 && (
              <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800">Privacy Notice</p>
                    <p className="text-orange-700 mt-1">
                      You are sharing {sensitiveCount} sensitive medical section{sensitiveCount > 1 ? 's' : ''}. 
                      Ensure this sharing complies with privacy regulations and patient consent.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Additional Message */}
          <div>
            <label className="text-sm font-medium mb-2 block">Additional Message</label>
            <Textarea
              placeholder="Provide context about why you're sharing this information..."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
              rows={3}
            />
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleShare}>
              <Share className="h-4 w-4 mr-2" />
              Share Patient File
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}