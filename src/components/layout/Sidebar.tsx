import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  SquaresFour, 
  Users, 
  Calendar, 
  Buildings, 
  Phone, 
  X,
  Bell
} from '@phosphor-icons/react'
import type { Page } from '../../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  isOpen: boolean
  onClose: () => void
}

const navigation = [
  { id: 'dashboard' as const, name: 'Dashboard', icon: SquaresFour },
  { id: 'patients' as const, name: 'Patients', icon: Users },
  { id: 'appointments' as const, name: 'Appointments', icon: Calendar, badge: '3' },
  { id: 'nphies' as const, name: 'NPHIES Portal', icon: Buildings },
  { id: 'telemedicine' as const, name: 'Telemedicine', icon: Phone, badge: '1' },
]

export function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={onClose}
        />
      )}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full w-72 bg-card border-r transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">BS</span>
            </div>
            <span className="font-semibold text-lg">BrainSait</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="md:hidden"
          >
            <X size={20} />
          </Button>
        </div>

        <nav className="p-4 space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start h-12",
                  isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                )}
                onClick={() => {
                  onNavigate(item.id)
                  onClose()
                }}
              >
                <Icon size={20} className="mr-3" />
                <span className="flex-1 text-left">{item.name}</span>
                {item.badge && (
                  <Badge variant="secondary" className="ml-2 bg-accent text-accent-foreground">
                    {item.badge}
                  </Badge>
                )}
              </Button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-muted/30">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-medium text-sm">DR</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">Dr. Sarah Ahmed</p>
              <p className="text-xs text-muted-foreground truncate">Internal Medicine</p>
            </div>
            <Button variant="ghost" size="sm">
              <Bell size={16} />
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}