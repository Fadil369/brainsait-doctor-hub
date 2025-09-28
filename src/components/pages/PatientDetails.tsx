import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  Phone, 
  VideoCamera, 
  FilePdf, 
  Calendar,
  Warning,
  Plus,
  Share
} from '@phosphor-icons/react'

interface PatientDetailsProps {
  patientId: string | null
  onBack: () => void
}

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  phone: string
  email: string
  address: string
  emergencyContact: string
  bloodType: string
  allergies: string[]
  conditions: string[]
  medications: string[]
  lastVisit: string
  status: 'stable' | 'critical' | 'improving' | 'monitoring'
}

interface MedicalRecord {
  id: string
  date: string
  type: string
  diagnosis: string
  treatment: string
  notes: string
  doctor: string
}

interface LabResult {
  id: string
  date: string
  test: string
  result: string
  range: string
  status: 'normal' | 'abnormal' | 'critical'
}

export function PatientDetails({ patientId, onBack }: PatientDetailsProps) {
  const [patient] = useKV<Patient>(`patient-${patientId}`, {
    id: patientId || '1',
    name: 'Ahmed Al-Rashid',
    age: 45,
    gender: 'Male',
    phone: '+966 50 123 4567',
    email: 'ahmed.rashid@email.com',
    address: 'Riyadh, Saudi Arabia',
    emergencyContact: '+966 50 987 6543',
    bloodType: 'O+',
    allergies: ['Penicillin', 'Peanuts'],
    conditions: ['Hypertension', 'Type 2 Diabetes'],
    medications: ['Lisinopril 10mg', 'Metformin 500mg'],
    lastVisit: '2024-01-15',
    status: 'stable'
  })

  const [medicalHistory] = useKV<MedicalRecord[]>(`medical-history-${patientId}`, [
    {
      id: '1',
      date: '2024-01-15',
      type: 'Follow-up',
      diagnosis: 'Hypertension - Controlled',
      treatment: 'Continue current medication',
      notes: 'Blood pressure stable at 120/80. Patient compliant with medication.',
      doctor: 'Dr. Sarah Ahmed'
    },
    {
      id: '2',
      date: '2024-01-01',
      type: 'Consultation',
      diagnosis: 'Type 2 Diabetes',
      treatment: 'Metformin prescribed',
      notes: 'HbA1c elevated at 7.2%. Lifestyle modifications recommended.',
      doctor: 'Dr. Sarah Ahmed'
    }
  ])

  const [labResults] = useKV<LabResult[]>(`lab-results-${patientId}`, [
    {
      id: '1',
      date: '2024-01-15',
      test: 'HbA1c',
      result: '6.8%',
      range: '< 7.0%',
      status: 'normal'
    },
    {
      id: '2',
      date: '2024-01-15',
      test: 'Blood Pressure',
      result: '120/80 mmHg',
      range: '< 130/80',
      status: 'normal'
    },
    {
      id: '3',
      date: '2024-01-10',
      test: 'Cholesterol',
      result: '210 mg/dL',
      range: '< 200 mg/dL',
      status: 'abnormal'
    }
  ])

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading patient details...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Back to Patients
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{patient.name}</h1>
            <p className="text-muted-foreground">
              Patient ID: {patient.id} • Last visit: {new Date(patient.lastVisit).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Share size={16} className="mr-2" />
            Share
          </Button>
          <Button variant="outline">
            <FilePdf size={16} className="mr-2" />
            Export
          </Button>
          <Button>
            <Calendar size={16} className="mr-2" />
            Schedule
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {patient.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold">{patient.name}</h3>
                <Badge variant="outline">{patient.status}</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Age</p>
                <p className="font-medium">{patient.age} years</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gender</p>
                <p className="font-medium">{patient.gender}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blood Type</p>
                <p className="font-medium">{patient.bloodType}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">{patient.status}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Contact Information</p>
              <p className="text-sm">{patient.phone}</p>
              <p className="text-sm">{patient.email}</p>
              <p className="text-sm">{patient.address}</p>
            </div>

            <div className="flex space-x-2">
              <Button size="sm" className="flex-1">
                <Phone size={14} className="mr-1" />
                Call
              </Button>
              <Button size="sm" variant="outline" className="flex-1">
                <VideoCamera size={14} className="mr-1" />
                Video
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="labs">Lab Results</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Conditions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patient.conditions?.map((condition, index) => (
                      <Badge key={index} variant="secondary" className="mr-2 mb-2">
                        {condition}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Current Medications</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patient.medications?.map((medication, index) => (
                      <div key={index} className="p-2 bg-muted/30 rounded text-sm">
                        {medication}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Allergies</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {patient.allergies?.map((allergy, index) => (
                      <Badge key={index} variant="destructive" className="mr-2 mb-2">
                        <Warning size={12} className="mr-1" />
                        {allergy}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contact</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{patient.emergencyContact}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Medical History</h3>
                <Button size="sm">
                  <Plus size={14} className="mr-1" />
                  Add Record
                </Button>
              </div>
              
              <div className="space-y-4">
                {medicalHistory?.map((record) => (
                  <Card key={record.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{record.diagnosis}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()} • {record.type}
                          </p>
                        </div>
                        <Badge variant="outline">{record.doctor}</Badge>
                      </div>
                      <p className="text-sm mb-2"><strong>Treatment:</strong> {record.treatment}</p>
                      <p className="text-sm text-muted-foreground">{record.notes}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="labs" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Laboratory Results</h3>
                <Button size="sm">
                  <Plus size={14} className="mr-1" />
                  Add Result
                </Button>
              </div>
              
              <div className="space-y-4">
                {labResults?.map((result) => (
                  <Card key={result.id}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-medium">{result.test}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(result.date).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{result.result}</p>
                          <p className="text-xs text-muted-foreground">Range: {result.range}</p>
                        </div>
                        <Badge 
                          variant={
                            result.status === 'critical' ? 'destructive' :
                            result.status === 'abnormal' ? 'secondary' : 'default'
                          }
                        >
                          {result.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Patient Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <FilePdf size={48} className="mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                    <Button className="mt-4">
                      <Plus size={16} className="mr-2" />
                      Upload Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}