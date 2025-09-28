import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Bell, List, MagnifyingGlass, ChatCircle } from '@phosphor-icons/react'

interface HeaderProps {
  onMenuClick: () => void
  showMenuButton: boolean
}

export function Header({ onMenuClick, showMenuButton }: HeaderProps) {
  return (
    <header className="border-b bg-card px-4 py-3 md:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {showMenuButton && (
            <Button variant="ghost" size="sm" onClick={onMenuClick}>
              <List size={20} />
            </Button>
          )}
          
          <div className="relative w-64 md:w-96 hidden sm:block">
            <MagnifyingGlass 
              size={16} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
            />
            <Input
              placeholder="Search patients, appointments..."
              className="pl-10 h-9"
            />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" className="sm:hidden">
            <MagnifyingGlass size={20} />
          </Button>
          
          <Button variant="ghost" size="sm" className="relative">
            <ChatCircle size={20} />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              2
            </Badge>
          </Button>
          
          <Button variant="ghost" size="sm" className="relative">
            <Bell size={20} />
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              5
            </Badge>
          </Button>
          
          <div className="h-6 w-px bg-border" />
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-medium">SA</span>
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium">Dr. Sarah Ahmed</p>
              <p className="text-xs text-muted-foreground">Internal Medicine</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}