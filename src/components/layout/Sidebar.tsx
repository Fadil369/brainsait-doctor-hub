import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  SquaresFour, 
  Users, 
  Calendar, 
  Buildings, 
  Phone, 
  X,
  Bell,
  ChatCircle,
  Gear,
  SignOut,
  Sun,
  CaretRight,
  UserCircle,
  UsersThree,
} from '@phosphor-icons/react'
import type { Page } from '../../App'

interface SidebarProps {
  currentPage: Page
  onNavigate: (page: Page) => void
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  id: Page
  name: string
  icon: typeof SquaresFour
  badge?: string
  badgeVariant?: 'default' | 'destructive' | 'secondary'
}

const navigation: NavItem[] = [
  { id: 'dashboard' as const, name: 'Dashboard', icon: SquaresFour },
  { id: 'patients' as const, name: 'Patients', icon: Users },
  { id: 'appointments' as const, name: 'Appointments', icon: Calendar, badge: '3', badgeVariant: 'default' },
  { id: 'messages' as const, name: 'Messages', icon: ChatCircle, badge: '5', badgeVariant: 'destructive' },
  { id: 'nphies' as const, name: 'NPHIES Portal', icon: Buildings },
  { id: 'telemedicine' as const, name: 'Telemedicine', icon: Phone, badge: '1', badgeVariant: 'secondary' },
]

const profileNavigation: NavItem[] = [
  { id: 'profile' as const, name: 'Profile Builder', icon: UserCircle },
  { id: 'team' as const, name: 'Team Management', icon: UsersThree },
]

export function Sidebar({ currentPage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300" 
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar container */}
      <aside 
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-card border-r shadow-lg",
          "transform transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0 md:shadow-none",
          "flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-md">
              <span className="text-primary-foreground font-bold text-base">BS</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight">BrainSait</span>
              <span className="text-xs text-muted-foreground">Doctor Portal</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="md:hidden hover:bg-muted/50"
            aria-label="Close navigation"
          >
            <X size={20} />
          </Button>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="space-y-1.5">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-12 px-3 font-medium transition-all duration-200",
                    "hover:bg-primary/10 hover:text-primary",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive && "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  )}
                  onClick={() => {
                    onNavigate(item.id)
                    onClose()
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    size={20} 
                    weight={isActive ? 'fill' : 'regular'}
                    className="mr-3 flex-shrink-0" 
                  />
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  {item.badge && (
                    <Badge 
                      variant={item.badgeVariant || 'secondary'} 
                      className={cn(
                        "ml-2 h-5 min-w-5 px-1.5 text-xs font-semibold",
                        item.badgeVariant === 'destructive' && "animate-pulse"
                      )}
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {isActive && (
                    <CaretRight size={16} className="ml-1 text-primary/60" />
                  )}
                </Button>
              )
            })}
          </nav>
          
          <Separator className="my-4" />
          
          {/* Profile & Team Management */}
          <div className="space-y-1.5">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Profile & Team
            </p>
            {profileNavigation.map((item) => {
              const Icon = item.icon
              const isActive = currentPage === item.id
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3 text-sm font-medium transition-all duration-200",
                    "hover:bg-primary/10 hover:text-primary",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    isActive && "bg-primary/10 text-primary shadow-sm border border-primary/20"
                  )}
                  onClick={() => {
                    onNavigate(item.id)
                    onClose()
                  }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon 
                    size={18} 
                    weight={isActive ? 'fill' : 'regular'}
                    className="mr-3 flex-shrink-0" 
                  />
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  {isActive && (
                    <CaretRight size={14} className="ml-1 text-primary/60" />
                  )}
                </Button>
              )
            })}
          </div>
          
          <Separator className="my-4" />
          
          {/* Quick Actions */}
          <div className="space-y-1.5">
            <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Quick Actions
            </p>
            <Button variant="ghost" className="w-full justify-start h-10 px-3 text-sm">
              <Gear size={18} className="mr-3" />
              Settings
            </Button>
          </div>
        </ScrollArea>

        {/* User Profile Section */}
        <div className="mt-auto border-t bg-muted/30">
          <div className="p-4">
            <div className="flex items-center space-x-3 p-3 rounded-xl bg-card shadow-sm border">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                <span className="text-primary-foreground font-semibold text-sm">SA</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">Dr. Sarah Ahmed</p>
                <p className="text-xs text-muted-foreground truncate">Internal Medicine</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="flex-shrink-0 hover:bg-primary/10"
                aria-label="Notifications"
              >
                <Bell size={18} />
              </Button>
            </div>
            
            {/* Theme toggle and Sign out */}
            <div className="flex items-center gap-2 mt-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 h-9"
                aria-label="Toggle theme"
              >
                <Sun size={16} className="mr-2" />
                Light
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-muted-foreground hover:text-destructive h-9"
                aria-label="Sign out"
              >
                <SignOut size={16} className="mr-1" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}