/**
 * Team Management Component
 * 
 * Comprehensive team management for doctors to assign staff members,
 * delegate responsibilities, and manage permissions.
 * 
 * Features:
 * - Assign nurses, receptionists, claims officers, NPHIES specialists
 * - Delegate procurement jobs (pharmacies, labs, equipment)
 * - Manage permissions and access levels
 * - Time-based delegation with expiry
 * - Approval workflows for sensitive delegations
 * - Real-time team status monitoring
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserMinus,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Warning,
  Plus,
  Pencil,
  Trash,
  Eye,
  CaretDown,
  CaretRight,
  Stethoscope,
  FirstAidKit,
  Pill,
  Flask,
  Wrench,
  CurrencyDollar,
  FileText,
  Buildings,
  Timer,
  MagnifyingGlass,
  Funnel,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import {
  useTeamMembers,
  useDelegations,
  useProcurementDelegation,
} from '@/db/profile-hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {
  TeamMember,
  TeamMemberRole,
  Delegation,
  DelegationType,
  DelegationStatus,
} from '@/types/profile';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface TeamManagementProps {
  className?: string;
}

interface RoleConfig {
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  defaultPermissions: string[];
}

// ============================================================================
// Constants
// ============================================================================

const ROLE_CONFIG: Record<TeamMemberRole, RoleConfig> = {
  nurse: {
    label: 'Nurse',
    icon: FirstAidKit,
    color: 'text-pink-600 bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400',
    description: 'Patient care and clinical support',
    defaultPermissions: ['view_patients', 'update_vitals', 'schedule_appointments'],
  },
  receptionist: {
    label: 'Receptionist',
    icon: Users,
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',
    description: 'Front desk and patient scheduling',
    defaultPermissions: ['view_schedule', 'manage_appointments', 'patient_registration'],
  },
  claims_officer: {
    label: 'Claims Officer',
    icon: FileText,
    color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    description: 'Insurance claims processing',
    defaultPermissions: ['view_claims', 'submit_claims', 'track_claims'],
  },
  nphies_specialist: {
    label: 'NPHIES Specialist',
    icon: ShieldCheck,
    color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    description: 'NPHIES platform management',
    defaultPermissions: ['nphies_access', 'eligibility_check', 'prior_auth'],
  },
  pharmacy_liaison: {
    label: 'Pharmacy Liaison',
    icon: Pill,
    color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400',
    description: 'Pharmacy coordination and prescriptions',
    defaultPermissions: ['view_prescriptions', 'pharmacy_orders', 'inventory_check'],
  },
  lab_technician: {
    label: 'Lab Technician',
    icon: Flask,
    color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30 dark:text-cyan-400',
    description: 'Laboratory tests and results',
    defaultPermissions: ['view_lab_orders', 'enter_results', 'sample_collection'],
  },
  medical_assistant: {
    label: 'Medical Assistant',
    icon: Stethoscope,
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    description: 'Clinical and administrative support',
    defaultPermissions: ['view_patients', 'update_records', 'assist_procedures'],
  },
  administrative: {
    label: 'Administrative',
    icon: Buildings,
    color: 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400',
    description: 'General administrative tasks',
    defaultPermissions: ['view_reports', 'manage_documents', 'scheduling'],
  },
  billing_specialist: {
    label: 'Billing Specialist',
    icon: CurrencyDollar,
    color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    description: 'Billing and payment processing',
    defaultPermissions: ['view_billing', 'process_payments', 'generate_invoices'],
  },
  surgery_assistant: {
    label: 'Surgery Assistant',
    icon: FirstAidKit,
    color: 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400',
    description: 'Surgical procedure assistance',
    defaultPermissions: ['view_surgery_schedule', 'prep_assistance', 'post_op_care'],
  },
  other: {
    label: 'Other',
    icon: Users,
    color: 'text-slate-600 bg-slate-100 dark:bg-slate-900/30 dark:text-slate-400',
    description: 'Other support roles',
    defaultPermissions: ['view_basic'],
  },
};

const DELEGATION_TYPES: Array<{
  type: DelegationType;
  label: string;
  icon: React.ElementType;
  description: string;
  eligibleRoles: TeamMemberRole[];
}> = [
  {
    type: 'nurse-assignment',
    label: 'Nursing Care',
    icon: FirstAidKit,
    description: 'Patient care and clinical tasks',
    eligibleRoles: ['nurse', 'medical_assistant'],
  },
  {
    type: 'receptionist-assignment',
    label: 'Reception Duties',
    icon: Users,
    description: 'Scheduling and patient management',
    eligibleRoles: ['receptionist', 'administrative'],
  },
  {
    type: 'claims-processing',
    label: 'Claims Processing',
    icon: FileText,
    description: 'Insurance claim submission and tracking',
    eligibleRoles: ['claims_officer', 'billing_specialist'],
  },
  {
    type: 'nphies-specialist',
    label: 'NPHIES Operations',
    icon: ShieldCheck,
    description: 'NPHIES portal management',
    eligibleRoles: ['nphies_specialist', 'claims_officer'],
  },
  {
    type: 'pharmacy-credential',
    label: 'Pharmacy Coordination',
    icon: Pill,
    description: 'Pharmacy orders and prescriptions',
    eligibleRoles: ['pharmacy_liaison', 'nurse'],
  },
  {
    type: 'lab-registration',
    label: 'Lab Operations',
    icon: Flask,
    description: 'Laboratory test management',
    eligibleRoles: ['lab_technician', 'medical_assistant'],
  },
  {
    type: 'equipment-procurement',
    label: 'Equipment Procurement',
    icon: Wrench,
    description: 'Medical equipment orders',
    eligibleRoles: ['administrative', 'billing_specialist'],
  },
];

// ============================================================================
// Team Member Card Component
// ============================================================================

function TeamMemberCard({
  member,
  onEdit,
  onRemove,
  onManageDelegations,
}: {
  member: TeamMember;
  onEdit: () => void;
  onRemove: () => void;
  onManageDelegations: () => void;
}) {
  const config = ROLE_CONFIG[member.role];
  const Icon = config.icon;

  return (
    <Card className={cn('transition-all hover:shadow-md', !member.isActive && 'opacity-60')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={member.profilePhoto} alt={member.name} />
            <AvatarFallback className={config.color}>
              {member.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{member.name}</h3>
              {!member.isActive && (
                <Badge variant="secondary" className="text-xs">Inactive</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={cn('text-xs', config.color)}>
                <Icon size={12} className="mr-1" />
                {config.label}
              </Badge>
              {member.department && (
                <span className="text-xs text-muted-foreground">{member.department}</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{member.email}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <CaretDown size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onManageDelegations}>
                <ShieldCheck size={14} className="mr-2" />
                Manage Delegations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Pencil size={14} className="mr-2" />
                Edit Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onRemove} className="text-red-600">
                <UserMinus size={14} className="mr-2" />
                Remove Member
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Permissions Preview */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Active Permissions</span>
            <span className="text-xs text-muted-foreground">
              {member.permissions?.length || 0} granted
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(member.permissions || []).slice(0, 4).map((perm, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {perm.replace(/_/g, ' ')}
              </Badge>
            ))}
            {(member.permissions?.length || 0) > 4 && (
              <Badge variant="outline" className="text-xs">
                +{(member.permissions?.length || 0) - 4} more
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Delegation Card Component
// ============================================================================

function DelegationCard({
  delegation,
  onRevoke,
}: {
  delegation: Delegation;
  onRevoke: () => void;
}) {
  const delegationConfig = DELEGATION_TYPES.find(d => d.type === delegation.type);
  const Icon = delegationConfig?.icon || ShieldCheck;
  
  const getStatusColor = (status: DelegationStatus) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'expired':
      case 'revoked':
        return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const isExpiringSoon = delegation.endDate && 
    new Date(delegation.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', getStatusColor(delegation.status))}>
            <Icon size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{delegationConfig?.label || delegation.type}</h4>
              <Badge className={cn('text-xs', getStatusColor(delegation.status))}>
                {delegation.status}
              </Badge>
              {isExpiringSoon && delegation.status === 'active' && (
                <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                  <Timer size={10} className="mr-1" />
                  Expiring Soon
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Delegated to: <span className="font-medium">{delegation.delegateeName}</span>
            </p>
          </div>
        </div>

        {delegation.status === 'active' && delegation.isRevocable && (
          <Button variant="ghost" size="sm" onClick={onRevoke} className="text-red-600">
            <XCircle size={14} className="mr-1" />
            Revoke
          </Button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Scope: </span>
          <span className="capitalize">{delegation.scope}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Start: </span>
          {new Date(delegation.startDate).toLocaleDateString()}
        </div>
        {delegation.endDate && (
          <div>
            <span className="text-muted-foreground">End: </span>
            {new Date(delegation.endDate).toLocaleDateString()}
          </div>
        )}
      </div>

      {delegation.permissions && delegation.permissions.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <span className="text-xs text-muted-foreground">Permissions:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {delegation.permissions.slice(0, 5).map((perm, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {perm.replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Add Team Member Dialog
// ============================================================================

function AddTeamMemberDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<TeamMember, 'id' | 'assignedAt'>) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    userId: '',
    name: '',
    email: '',
    phone: '',
    role: 'nurse' as TeamMemberRole,
    department: '',
    permissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedRoleConfig = ROLE_CONFIG[formData.role];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        doctorId: '', // Will be set by the hook
        isActive: true,
        permissions: formData.permissions.length > 0 
          ? formData.permissions 
          : selectedRoleConfig.defaultPermissions,
      });
      onOpenChange(false);
      setFormData({
        userId: '',
        name: '',
        email: '',
        phone: '',
        role: 'nurse',
        department: '',
        permissions: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={20} />
            Add Team Member
          </DialogTitle>
          <DialogDescription>
            Assign a new staff member to your team with specific roles and permissions
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+966 5X XXX XXXX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Cardiology"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as TeamMemberRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_CONFIG).map(([role, config]) => {
                    const Icon = config.icon;
                    return (
                      <SelectItem key={role} value={role}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRoleConfig.description}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Default Permissions</Label>
              <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">
                  These permissions will be granted based on the selected role:
                </p>
                <div className="flex flex-wrap gap-1">
                  {selectedRoleConfig.defaultPermissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      <CheckCircle size={10} className="mr-1 text-green-500" />
                      {perm.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Create Delegation Dialog
// ============================================================================

function CreateDelegationDialog({
  open,
  onOpenChange,
  teamMembers,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  onSubmit: (data: {
    delegateeId: string;
    delegateeName: string;
    type: DelegationType;
    scope: 'all' | 'department' | 'specific';
    permissions: string[];
    endDate: Date;
  }) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    delegateeId: '',
    type: '' as DelegationType,
    scope: 'all' as 'all' | 'department' | 'specific',
    endDate: '',
    customPermissions: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedDelegation = DELEGATION_TYPES.find(d => d.type === formData.type);
  const eligibleMembers = teamMembers.filter(m => 
    m.isActive && selectedDelegation?.eligibleRoles.includes(m.role)
  );
  const selectedMember = teamMembers.find(m => m.userId === formData.delegateeId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit({
        delegateeId: formData.delegateeId,
        delegateeName: selectedMember.name,
        type: formData.type,
        scope: formData.scope,
        permissions: formData.customPermissions.length > 0 
          ? formData.customPermissions 
          : ROLE_CONFIG[selectedMember.role].defaultPermissions,
        endDate: new Date(formData.endDate),
      });
      onOpenChange(false);
      setFormData({
        delegateeId: '',
        type: '' as DelegationType,
        scope: 'all',
        endDate: '',
        customPermissions: [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={20} />
            Create Delegation
          </DialogTitle>
          <DialogDescription>
            Delegate specific responsibilities to a team member with defined scope and expiry
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Delegation Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value as DelegationType, delegateeId: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select delegation type" />
                </SelectTrigger>
                <SelectContent>
                  {DELEGATION_TYPES.map((delegation) => {
                    const Icon = delegation.icon;
                    return (
                      <SelectItem key={delegation.type} value={delegation.type}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} />
                          <span>{delegation.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedDelegation && (
                <p className="text-xs text-muted-foreground">
                  {selectedDelegation.description}
                </p>
              )}
            </div>

            {formData.type && (
              <div className="grid gap-2">
                <Label>Assign To *</Label>
                {eligibleMembers.length > 0 ? (
                  <Select
                    value={formData.delegateeId}
                    onValueChange={(value) => setFormData({ ...formData, delegateeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleMembers.map((member) => {
                        const config = ROLE_CONFIG[member.role];
                        const Icon = config.icon;
                        return (
                          <SelectItem key={member.userId} value={member.userId}>
                            <div className="flex items-center gap-2">
                              <Icon size={14} />
                              <span>{member.name}</span>
                              <span className="text-muted-foreground">({config.label})</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 text-center">
                    <p className="text-sm text-muted-foreground">
                      No eligible team members for this delegation type.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Eligible roles: {selectedDelegation?.eligibleRoles.map(r => ROLE_CONFIG[r].label).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Scope *</Label>
                <Select
                  value={formData.scope}
                  onValueChange={(value) => setFormData({ ...formData, scope: value as 'all' | 'department' | 'specific' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Areas</SelectItem>
                    <SelectItem value="department">Department Only</SelectItem>
                    <SelectItem value="specific">Specific Tasks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Valid Until *</Label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {selectedMember && (
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={14} className="text-green-500" />
                  <span className="text-sm font-medium">Permissions to be delegated:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {ROLE_CONFIG[selectedMember.role].defaultPermissions.map((perm) => (
                    <Badge key={perm} variant="outline" className="text-xs">
                      {perm.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.delegateeId || !formData.endDate}
            >
              {isSubmitting ? 'Creating...' : 'Create Delegation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Quick Stats Component
// ============================================================================

function QuickStats({
  teamMembers,
  delegations,
}: {
  teamMembers: TeamMember[];
  delegations: Delegation[];
}) {
  const activeMembers = teamMembers.filter(m => m.isActive).length;
  const activeDelegations = delegations.filter(d => d.status === 'active').length;
  const pendingApprovals = delegations.filter(d => d.status === 'pending').length;
  const expiringDelegations = delegations.filter(d => {
    if (d.status !== 'active' || !d.endDate) return false;
    return new Date(d.endDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Users size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeMembers}</p>
              <p className="text-xs text-muted-foreground">Active Members</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <ShieldCheck size={20} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeDelegations}</p>
              <p className="text-xs text-muted-foreground">Active Delegations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock size={20} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingApprovals}</p>
              <p className="text-xs text-muted-foreground">Pending Approvals</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Timer size={20} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringDelegations}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Team Management Component
// ============================================================================

export function TeamManagement({ className }: TeamManagementProps) {
  const { teamMembers, isLoading: teamLoading, assignMember, updateMember, removeMember, getMembersByRole } = useTeamMembers();
  const { delegations, isLoading: delegationsLoading, createDelegation, revokeDelegation, pendingRequests } = useDelegations();
  const { pharmacyDelegations, labDelegations, equipmentDelegations } = useProcurementDelegation();

  const [activeTab, setActiveTab] = useState('team');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isCreateDelegationOpen, setIsCreateDelegationOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);
  const [delegationToRevoke, setDelegationToRevoke] = useState<Delegation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<TeamMemberRole | 'all'>('all');

  const isLoading = teamLoading || delegationsLoading;

  const filteredMembers = useMemo(() => {
    let result = teamMembers;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(m => 
        m.name.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query) ||
        m.department?.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== 'all') {
      result = result.filter(m => m.role === roleFilter);
    }
    
    return result;
  }, [teamMembers, searchQuery, roleFilter]);

  const handleAddMember = useCallback(
    async (data: Omit<TeamMember, 'id' | 'assignedAt'>) => {
      await assignMember(data);
    },
    [assignMember]
  );

  const handleRemoveMember = useCallback(
    async () => {
      if (memberToRemove) {
        await removeMember(memberToRemove.id);
        setMemberToRemove(null);
      }
    },
    [memberToRemove, removeMember]
  );

  const handleCreateDelegation = useCallback(
    async (data: {
      delegateeId: string;
      delegateeName: string;
      type: DelegationType;
      scope: 'all' | 'department' | 'specific';
      permissions: string[];
      endDate: Date;
    }) => {
      await createDelegation({
        delegatorId: '', // Will be set by the hook
        ...data,
        startDate: new Date(),
        status: 'pending',
        requiresApproval: false,
      });
    },
    [createDelegation]
  );

  const handleRevokeDelegation = useCallback(
    async () => {
      if (delegationToRevoke) {
        await revokeDelegation(delegationToRevoke.id, 'Revoked by doctor');
        setDelegationToRevoke(null);
      }
    },
    [delegationToRevoke, revokeDelegation]
  );

  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
          <p className="text-muted-foreground">
            Manage your team members and delegate responsibilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsCreateDelegationOpen(true)}>
            <ShieldCheck size={16} className="mr-2" />
            Create Delegation
          </Button>
          <Button onClick={() => setIsAddMemberOpen(true)}>
            <UserPlus size={16} className="mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <QuickStats teamMembers={teamMembers} delegations={delegations} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="team">
            <Users size={14} className="mr-2" />
            Team Members
          </TabsTrigger>
          <TabsTrigger value="delegations">
            <ShieldCheck size={14} className="mr-2" />
            Delegations
          </TabsTrigger>
          <TabsTrigger value="procurement">
            <Wrench size={14} className="mr-2" />
            Procurement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as TeamMemberRole | 'all')}>
              <SelectTrigger className="w-[180px]">
                <Funnel size={14} className="mr-2" />
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {Object.entries(ROLE_CONFIG).map(([role, config]) => (
                  <SelectItem key={role} value={role}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Team Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredMembers.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                onEdit={() => {}}
                onRemove={() => setMemberToRemove(member)}
                onManageDelegations={() => setIsCreateDelegationOpen(true)}
              />
            ))}
          </div>

          {filteredMembers.length === 0 && (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No team members found</p>
              <Button variant="outline" className="mt-4" onClick={() => setIsAddMemberOpen(true)}>
                <UserPlus size={16} className="mr-2" />
                Add Your First Team Member
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="delegations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Delegations</CardTitle>
              <CardDescription>
                Manage and monitor delegated responsibilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {delegations.filter(d => d.status === 'active').map((delegation) => (
                <DelegationCard
                  key={delegation.id}
                  delegation={delegation}
                  onRevoke={() => setDelegationToRevoke(delegation)}
                />
              ))}

              {delegations.filter(d => d.status === 'active').length === 0 && (
                <div className="text-center py-8">
                  <ShieldCheck size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No active delegations</p>
                  <Button variant="outline" className="mt-4" onClick={() => setIsCreateDelegationOpen(true)}>
                    Create Your First Delegation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {delegations.filter(d => d.status === 'revoked' || d.status === 'expired').length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Expired & Revoked</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {delegations.filter(d => d.status === 'revoked' || d.status === 'expired').map((delegation) => (
                  <DelegationCard
                    key={delegation.id}
                    delegation={delegation}
                    onRevoke={() => {}}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6">
          <div className="grid md:grid-cols-3 gap-4">
            {/* Pharmacy Delegations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Pill size={20} className="text-orange-500" />
                  Pharmacy
                </CardTitle>
                <CardDescription>Pharmacy coordination delegations</CardDescription>
              </CardHeader>
              <CardContent>
                {pharmacyDelegations.length > 0 ? (
                  <div className="space-y-2">
                    {pharmacyDelegations.map((d) => (
                      <div key={d.id} className="p-2 rounded border text-sm">
                        <p className="font-medium">{d.delegateeName}</p>
                        <p className="text-xs text-muted-foreground">
                          Until {new Date(d.endDate!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No pharmacy delegations
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Lab Delegations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Flask size={20} className="text-cyan-500" />
                  Laboratory
                </CardTitle>
                <CardDescription>Lab operations delegations</CardDescription>
              </CardHeader>
              <CardContent>
                {labDelegations.length > 0 ? (
                  <div className="space-y-2">
                    {labDelegations.map((d) => (
                      <div key={d.id} className="p-2 rounded border text-sm">
                        <p className="font-medium">{d.delegateeName}</p>
                        <p className="text-xs text-muted-foreground">
                          Until {new Date(d.endDate!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No lab delegations
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Equipment Delegations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wrench size={20} className="text-gray-500" />
                  Equipment
                </CardTitle>
                <CardDescription>Equipment procurement delegations</CardDescription>
              </CardHeader>
              <CardContent>
                {equipmentDelegations.length > 0 ? (
                  <div className="space-y-2">
                    {equipmentDelegations.map((d) => (
                      <div key={d.id} className="p-2 rounded border text-sm">
                        <p className="font-medium">{d.delegateeName}</p>
                        <p className="text-xs text-muted-foreground">
                          Until {new Date(d.endDate!).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No equipment delegations
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTeamMemberDialog
        open={isAddMemberOpen}
        onOpenChange={setIsAddMemberOpen}
        onSubmit={handleAddMember}
      />

      <CreateDelegationDialog
        open={isCreateDelegationOpen}
        onOpenChange={setIsCreateDelegationOpen}
        teamMembers={teamMembers}
        onSubmit={handleCreateDelegation}
      />

      {/* Remove Member Confirmation */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from your team?
              This will also revoke all their active delegations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-red-600 hover:bg-red-700">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Delegation Confirmation */}
      <AlertDialog open={!!delegationToRevoke} onOpenChange={() => setDelegationToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Delegation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this delegation for{' '}
              <strong>{delegationToRevoke?.delegateeName}</strong>?
              They will immediately lose access to the delegated permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevokeDelegation} className="bg-red-600 hover:bg-red-700">
              Revoke Delegation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TeamManagement;
