/**
 * Doctor Profile Builder Component
 * 
 * A comprehensive profile builder for doctors to manage their credentials,
 * certifications, specializations, and practice privileges.
 * 
 * Features:
 * - Personal information management
 * - Credential upload and verification tracking
 * - Certification management with expiry alerts
 * - Specialization display
 * - Compliance score dashboard
 * - Audit trail viewer
 */

import React, { useState, useCallback } from 'react';
import {
  User,
  Certificate,
  GraduationCap,
  Briefcase,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Plus,
  Pencil,
  Trash,
  Upload,
  Eye,
  CaretDown,
  Hospital,
  Phone,
  Envelope,
  MapPin,
  Calendar,
  FileText,
} from '@phosphor-icons/react';
import { useProfileBuilder, useAuditLog } from '@/db/profile-hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type {
  Credential,
  Certification,
  Specialization,
  PracticePrivilege,
  CredentialType,
  CredentialStatus,
} from '@/types/profile';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ProfileBuilderProps {
  className?: string;
}

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({ status }: { status: CredentialStatus }) {
  const statusConfig = {
    pending: { icon: Clock, className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
    verified: { icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
    expired: { icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    rejected: { icon: XCircle, className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    suspended: { icon: Warning, className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge className={cn('flex items-center gap-1', config.className)}>
      <Icon size={12} weight="bold" />
      <span className="capitalize">{status}</span>
    </Badge>
  );
}

// ============================================================================
// Compliance Score Card
// ============================================================================

function ComplianceScoreCard({
  score,
  recommendations,
}: {
  score: number;
  recommendations: string[];
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield size={20} className="text-primary" />
          Compliance Score
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className={cn('text-4xl font-bold', getScoreColor(score))}>
            {score}%
          </div>
          <div className="flex-1">
            <Progress value={score} className={cn('h-3', getProgressColor(score))} />
          </div>
        </div>
        
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Recommendations:</p>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <Warning size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Personal Info Section
// ============================================================================

function PersonalInfoSection({
  profile,
  onEdit,
}: {
  profile: any;
  onEdit: () => void;
}) {
  const personalInfo = profile?.personalInfo;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User size={20} className="text-primary" />
            Personal Information
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil size={16} className="mr-1" />
            Edit
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex gap-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={personalInfo?.profilePhoto} alt={personalInfo?.fullName} />
            <AvatarFallback className="text-2xl">
              {personalInfo?.fullName?.split(' ').map((n: string) => n[0]).join('') || 'DR'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{personalInfo?.fullName || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Title</p>
              <p className="font-medium">{personalInfo?.title || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {personalInfo?.dateOfBirth 
                  ? new Date(personalInfo.dateOfBirth).toLocaleDateString() 
                  : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium capitalize">{personalInfo?.gender || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nationality</p>
              <p className="font-medium">{personalInfo?.nationality || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Languages</p>
              <p className="font-medium">
                {personalInfo?.languages?.join(', ') || '—'}
              </p>
            </div>
          </div>
        </div>

        {profile?.contactInfo && (
          <>
            <Separator className="my-4" />
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-muted-foreground" />
                <span className="text-sm">{profile.contactInfo.phone || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Envelope size={16} className="text-muted-foreground" />
                <span className="text-sm">{profile.contactInfo.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <MapPin size={16} className="text-muted-foreground" />
                <span className="text-sm">
                  {profile.contactInfo.address 
                    ? `${profile.contactInfo.address.city}, ${profile.contactInfo.address.country}`
                    : '—'}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Credentials Section
// ============================================================================

function CredentialsSection({
  credentials,
  expiringCredentials,
  expiredCredentials,
  onAddCredential,
}: {
  credentials: Credential[];
  expiringCredentials: Array<{ credential: Credential; daysLeft: number }>;
  expiredCredentials: Credential[];
  onAddCredential: () => void;
}) {
  const getCredentialIcon = (type: CredentialType) => {
    switch (type) {
      case 'medical_license':
        return Certificate;
      case 'board_certification':
        return GraduationCap;
      case 'dea_registration':
      case 'npi_number':
        return FileText;
      default:
        return Certificate;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Certificate size={20} className="text-primary" />
            Credentials & Licenses
          </CardTitle>
          <Button size="sm" onClick={onAddCredential}>
            <Plus size={16} className="mr-1" />
            Add Credential
          </Button>
        </div>
        <CardDescription>
          Manage your medical licenses, certifications, and registrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Expiration Alerts */}
        {(expiringCredentials.length > 0 || expiredCredentials.length > 0) && (
          <div className="space-y-2">
            {expiredCredentials.length > 0 && (
              <Alert variant="destructive">
                <XCircle size={16} />
                <AlertTitle>Expired Credentials</AlertTitle>
                <AlertDescription>
                  {expiredCredentials.length} credential(s) have expired and need renewal.
                </AlertDescription>
              </Alert>
            )}
            {expiringCredentials.length > 0 && (
              <Alert>
                <Warning size={16} />
                <AlertTitle>Expiring Soon</AlertTitle>
                <AlertDescription>
                  {expiringCredentials.map((e, i) => (
                    <span key={i}>
                      {e.credential.name} expires in {e.daysLeft} days
                      {i < expiringCredentials.length - 1 ? '; ' : ''}
                    </span>
                  ))}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Credentials List */}
        <Accordion type="single" collapsible className="w-full">
          {credentials.map((credential) => {
            const Icon = getCredentialIcon(credential.type);
            return (
              <AccordionItem key={credential.id} value={credential.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon size={20} className="text-primary" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{credential.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {credential.issuingAuthority}
                      </p>
                    </div>
                    <StatusBadge status={credential.status} />
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Credential Number</p>
                      <p className="font-mono">{credential.number}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Issue Date</p>
                      <p>{new Date(credential.issueDate).toLocaleDateString()}</p>
                    </div>
                    {credential.expiryDate && (
                      <div>
                        <p className="text-sm text-muted-foreground">Expiry Date</p>
                        <p>{new Date(credential.expiryDate).toLocaleDateString()}</p>
                      </div>
                    )}
                    {credential.verifiedAt && (
                      <div>
                        <p className="text-sm text-muted-foreground">Verified</p>
                        <p>{new Date(credential.verifiedAt).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <Eye size={14} className="mr-1" />
                      View Document
                    </Button>
                    <Button variant="outline" size="sm">
                      <Pencil size={14} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {credentials.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Certificate size={48} className="mx-auto mb-2 opacity-50" />
            <p>No credentials added yet</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onAddCredential}>
              <Plus size={14} className="mr-1" />
              Add Your First Credential
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Specializations Section
// ============================================================================

function SpecializationsSection({
  specializations,
  primarySpecialization,
  onAddSpecialization,
}: {
  specializations: Specialization[];
  primarySpecialization?: Specialization;
  onAddSpecialization: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap size={20} className="text-primary" />
            Specializations
          </CardTitle>
          <Button size="sm" onClick={onAddSpecialization}>
            <Plus size={16} className="mr-1" />
            Add Specialization
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {primarySpecialization && (
            <div className="p-4 rounded-lg border bg-primary/5 border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">Primary</Badge>
                <span className="font-semibold">{primarySpecialization.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Board: </span>
                  {primarySpecialization.boardName}
                </div>
                <div>
                  <span className="text-muted-foreground">Since: </span>
                  {new Date(primarySpecialization.certifiedDate).getFullYear()}
                </div>
              </div>
            </div>
          )}

          {specializations.filter(s => !s.isPrimary).map((spec) => (
            <div key={spec.id} className="p-4 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">Subspecialty</Badge>
                <span className="font-medium">{spec.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Board: </span>
                  {spec.boardName}
                </div>
                <div>
                  <span className="text-muted-foreground">Since: </span>
                  {new Date(spec.certifiedDate).getFullYear()}
                </div>
              </div>
            </div>
          ))}

          {specializations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap size={48} className="mx-auto mb-2 opacity-50" />
              <p>No specializations added yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Practice Privileges Section
// ============================================================================

function PracticePrivilegesSection({
  privileges,
  activePrivileges,
  onAddPrivilege,
}: {
  privileges: PracticePrivilege[];
  activePrivileges: PracticePrivilege[];
  onAddPrivilege: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hospital size={20} className="text-primary" />
            Practice Privileges
          </CardTitle>
          <Button size="sm" onClick={onAddPrivilege}>
            <Plus size={16} className="mr-1" />
            Add Privilege
          </Button>
        </div>
        <CardDescription>
          Institutions where you have practicing privileges
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {privileges.map((privilege) => (
            <div
              key={privilege.id}
              className={cn(
                'p-4 rounded-lg border',
                privilege.status === 'active' && 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10',
                privilege.status === 'suspended' && 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-900/10'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Hospital size={18} className="text-primary" />
                    <span className="font-semibold">{privilege.institution}</span>
                    <Badge
                      variant={privilege.status === 'active' ? 'default' : 'destructive'}
                      className="capitalize"
                    >
                      {privilege.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {privilege.department}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <CaretDown size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Pencil size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600">
                      <Trash size={14} className="mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Scope: </span>
                  {privilege.scope}
                </div>
                <div>
                  <span className="text-muted-foreground">Granted: </span>
                  {new Date(privilege.grantedAt).toLocaleDateString()}
                </div>
                {privilege.expiresAt && (
                  <div>
                    <span className="text-muted-foreground">Expires: </span>
                    {new Date(privilege.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          ))}

          {privileges.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Hospital size={48} className="mx-auto mb-2 opacity-50" />
              <p>No practice privileges added yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Audit Trail Section
// ============================================================================

function AuditTrailSection() {
  const { auditLog, isLoading } = useAuditLog();

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'text-green-600 dark:text-green-400';
      case 'update':
        return 'text-blue-600 dark:text-blue-400';
      case 'delete':
      case 'revoke':
        return 'text-red-600 dark:text-red-400';
      case 'verify':
      case 'approve':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock size={20} className="text-primary" />
          Audit Trail
        </CardTitle>
        <CardDescription>
          Recent changes to your profile and credentials
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : auditLog.length > 0 ? (
            <div className="space-y-3">
              {auditLog.slice(0, 20).map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 py-2 border-b last:border-0">
                  <div className={cn('font-medium capitalize text-sm', getActionColor(entry.action))}>
                    {entry.action}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm capitalize">
                      {entry.entityType.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.performedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock size={48} className="mx-auto mb-2 opacity-50" />
              <p>No audit entries yet</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Add Credential Dialog
// ============================================================================

function AddCredentialDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Credential, 'id' | 'addedAt' | 'verificationHistory'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    type: 'medical_license' as CredentialType,
    name: '',
    number: '',
    issuingAuthority: '',
    issueDate: '',
    expiryDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        issueDate: new Date(formData.issueDate),
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate) : undefined,
        status: 'pending',
      });
      onOpenChange(false);
      setFormData({
        type: 'medical_license',
        name: '',
        number: '',
        issuingAuthority: '',
        issueDate: '',
        expiryDate: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Credential</DialogTitle>
          <DialogDescription>
            Add a new credential, license, or registration to your profile
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Credential Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as CredentialType })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_license">Medical License</SelectItem>
                  <SelectItem value="board_certification">Board Certification</SelectItem>
                  <SelectItem value="dea_registration">DEA Registration</SelectItem>
                  <SelectItem value="npi_number">NPI Number</SelectItem>
                  <SelectItem value="state_license">State License</SelectItem>
                  <SelectItem value="hospital_privilege">Hospital Privilege</SelectItem>
                  <SelectItem value="malpractice_insurance">Malpractice Insurance</SelectItem>
                  <SelectItem value="specialty_certification">Specialty Certification</SelectItem>
                  <SelectItem value="cme_certificate">CME Certificate</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">Credential Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., California Medical License"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="number">Credential Number</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                placeholder="License/Certificate number"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="authority">Issuing Authority</Label>
              <Input
                id="authority"
                value={formData.issuingAuthority}
                onChange={(e) => setFormData({ ...formData, issuingAuthority: e.target.value })}
                placeholder="e.g., Medical Board of California"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={formData.expiryDate}
                  onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Upload Document</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop or click to upload
                </p>
                <Input type="file" className="hidden" />
                <Button type="button" variant="outline" size="sm" className="mt-2">
                  Choose File
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Credential'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Main Profile Builder Component
// ============================================================================

export function ProfileBuilder({ className }: ProfileBuilderProps) {
  const {
    profile,
    isLoading,
    credentials,
    expiringCredentials,
    expiredCredentials,
    addCredential,
    specializations,
    primarySpecialization,
    privileges,
    activePrivileges,
    complianceScore,
    complianceRecommendations,
  } = useProfileBuilder();

  const [activeTab, setActiveTab] = useState('overview');
  const [isAddCredentialOpen, setIsAddCredentialOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  const handleAddCredential = useCallback(
    async (data: Omit<Credential, 'id' | 'addedAt' | 'verificationHistory'>) => {
      await addCredential(data);
    },
    [addCredential]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
            <div className="h-64 bg-muted animate-pulse rounded-lg" />
          </div>
          <div className="space-y-6">
            <div className="h-32 bg-muted animate-pulse rounded-lg" />
            <div className="h-48 bg-muted animate-pulse rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile Builder</h1>
          <p className="text-muted-foreground">
            Manage your professional credentials and practice information
          </p>
        </div>
        <Button>
          <Upload size={16} className="mr-2" />
          Export Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="privileges">Privileges</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <PersonalInfoSection
                profile={profile}
                onEdit={() => setIsEditProfileOpen(true)}
              />
              <SpecializationsSection
                specializations={specializations}
                primarySpecialization={primarySpecialization}
                onAddSpecialization={() => {}}
              />
            </div>
            <div className="space-y-6">
              <ComplianceScoreCard
                score={complianceScore}
                recommendations={complianceRecommendations}
              />
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Quick Stats</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{credentials.length}</p>
                      <p className="text-xs text-muted-foreground">Credentials</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{activePrivileges.length}</p>
                      <p className="text-xs text-muted-foreground">Privileges</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold">{specializations.length}</p>
                      <p className="text-xs text-muted-foreground">Specializations</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-yellow-600">
                        {expiringCredentials.length}
                      </p>
                      <p className="text-xs text-muted-foreground">Expiring Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="credentials" className="space-y-6">
          <CredentialsSection
            credentials={credentials}
            expiringCredentials={expiringCredentials}
            expiredCredentials={expiredCredentials}
            onAddCredential={() => setIsAddCredentialOpen(true)}
          />
        </TabsContent>

        <TabsContent value="privileges" className="space-y-6">
          <PracticePrivilegesSection
            privileges={privileges}
            activePrivileges={activePrivileges}
            onAddPrivilege={() => {}}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <AuditTrailSection />
        </TabsContent>
      </Tabs>

      <AddCredentialDialog
        open={isAddCredentialOpen}
        onOpenChange={setIsAddCredentialOpen}
        onSubmit={handleAddCredential}
      />
    </div>
  );
}

export default ProfileBuilder;
