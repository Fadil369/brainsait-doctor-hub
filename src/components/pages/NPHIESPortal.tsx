import { useState } from 'react'
import { useKV } from '@github/spark/hooks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Buildings, 
  FileText, 
  CheckCircle, 
  Clock, 
  Warning,
  Upload,
  Download,
  MagnifyingGlass,
  Plus
} from '@phosphor-icons/react'

interface NPHIESClaim {
  id: string
  patientName: string
  patientId: string
  claimNumber: string
  serviceDate: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'processing'
  description: string
  submittedDate: string
}

interface NPHIESApproval {
  id: string
  patientName: string
  approvalNumber: string
  serviceType: string
  approvedAmount: number
  validUntil: string
  status: 'active' | 'expired' | 'used'
}

export function NPHIESPortal() {
  const [searchTerm, setSearchTerm] = useState('')
  
  const [claims] = useKV<NPHIESClaim[]>('nphies-claims', [
    {
      id: '1',
      patientName: 'Ahmed Al-Rashid',
      patientId: 'patient-1',
      claimNumber: 'CLM-2024-001',
      serviceDate: '2024-01-15',
      amount: 850,
      status: 'approved',
      description: 'Consultation and medication',
      submittedDate: '2024-01-15'
    },
    {
      id: '2',
      patientName: 'Sara Mohammed',
      patientId: 'patient-2',
      claimNumber: 'CLM-2024-002',
      serviceDate: '2024-01-14',
      amount: 1200,
      status: 'processing',
      description: 'Laboratory tests and consultation',
      submittedDate: '2024-01-14'
    },
    {
      id: '3',
      patientName: 'Omar Hassan',
      patientId: 'patient-3',
      claimNumber: 'CLM-2024-003',
      serviceDate: '2024-01-13',
      amount: 300,
      status: 'rejected',
      description: 'Telemedicine consultation',
      submittedDate: '2024-01-13'
    }
  ])

  const [approvals] = useKV<NPHIESApproval[]>('nphies-approvals', [
    {
      id: '1',
      patientName: 'Fatima Ali',
      approvalNumber: 'APR-2024-001',
      serviceType: 'Specialized Treatment',
      approvedAmount: 5000,
      validUntil: '2024-02-15',
      status: 'active'
    },
    {
      id: '2',
      patientName: 'Khalid Bin Salman',
      approvalNumber: 'APR-2024-002',
      serviceType: 'Surgical Procedure',
      approvedAmount: 12000,
      validUntil: '2024-01-30',
      status: 'active'
    }
  ])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return <CheckCircle size={16} className="text-success" />
      case 'processing':
        return <Clock size={16} className="text-accent animate-pulse" />
      case 'rejected':
      case 'expired':
        return <Warning size={16} className="text-destructive" />
      default:
        return <Clock size={16} className="text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return 'default'
      case 'processing':
        return 'secondary'
      case 'rejected':
      case 'expired':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  const filteredClaims = claims?.filter(claim =>
    claim.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    claim.claimNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredApprovals = approvals?.filter(approval =>
    approval.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    approval.approvalNumber.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Buildings size={32} className="text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">NPHIES Portal</h1>
            <p className="text-muted-foreground">
              National Platform for Health Information Exchange
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Download size={16} className="mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus size={16} className="mr-2" />
            New Submission
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{claims?.length || 0}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {claims?.filter(c => c.status === 'approved').reduce((sum, c) => sum + c.amount, 0).toLocaleString()} SAR
            </div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              {claims?.filter(c => c.status === 'processing').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {approvals?.filter(a => a.status === 'active').length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Currently valid</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="claims" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="claims">Claims Management</TabsTrigger>
            <TabsTrigger value="approvals">Prior Approvals</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <div className="relative w-64">
            <MagnifyingGlass 
              size={16} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            />
            <Input
              placeholder="Search claims or approvals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value="claims" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Claims Management</CardTitle>
              <p className="text-sm text-muted-foreground">
                Submit and track insurance claims through NPHIES
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredClaims.map((claim) => (
                <Card key={claim.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{claim.patientName}</h3>
                          {getStatusIcon(claim.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Claim: {claim.claimNumber}
                        </p>
                        <p className="text-sm">{claim.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span>Service: {new Date(claim.serviceDate).toLocaleDateString()}</span>
                          <span>Submitted: {new Date(claim.submittedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold">{claim.amount.toLocaleString()} SAR</p>
                        <Badge variant={getStatusColor(claim.status)}>
                          {claim.status}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <FileText size={12} className="mr-1" />
                            View
                          </Button>
                          {claim.status === 'processing' && (
                            <Button size="sm" variant="outline">
                              <Upload size={12} className="mr-1" />
                              Update
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredClaims.length === 0 && (
                <div className="text-center py-8">
                  <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No claims found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prior Approvals</CardTitle>
              <p className="text-sm text-muted-foreground">
                Manage pre-authorization requests and approvals
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {filteredApprovals.map((approval) => (
                <Card key={approval.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-3">
                          <h3 className="font-medium">{approval.patientName}</h3>
                          {getStatusIcon(approval.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Approval: {approval.approvalNumber}
                        </p>
                        <p className="text-sm">{approval.serviceType}</p>
                        <p className="text-xs text-muted-foreground">
                          Valid until: {new Date(approval.validUntil).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="text-right space-y-2">
                        <p className="text-lg font-bold">{approval.approvedAmount.toLocaleString()} SAR</p>
                        <Badge variant={getStatusColor(approval.status)}>
                          {approval.status}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button size="sm" variant="outline">
                            <FileText size={12} className="mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <Upload size={12} className="mr-1" />
                            Use
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {filteredApprovals.length === 0 && (
                <div className="text-center py-8">
                  <Buildings size={48} className="mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No approvals found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Reports & Analytics</CardTitle>
              <p className="text-sm text-muted-foreground">
                Generate reports and view analytics for NPHIES submissions
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileText size={24} className="text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Monthly Claims Report</h3>
                        <p className="text-sm text-muted-foreground">January 2024</p>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                        <CheckCircle size={24} className="text-success" />
                      </div>
                      <div>
                        <h3 className="font-medium">Approval Analytics</h3>
                        <p className="text-sm text-muted-foreground">Success rates & trends</p>
                      </div>
                    </div>
                    <Button className="w-full mt-4" variant="outline">
                      <Download size={16} className="mr-2" />
                      Download PDF
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}