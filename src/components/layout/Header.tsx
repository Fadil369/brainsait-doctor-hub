import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Bell, 
  List, 
  MagnifyingGlass, 
  ChatCircle,
  Gear,
  SignOut,
  User,
  Question,
  Moon,
  Sun,
  Command,
  Globe
} from '@phosphor-icons/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface HeaderProps {
  onMenuClick: () => void
  showMenuButton: boolean
}

export function Header({ onMenuClick, showMenuButton }: HeaderProps) {
  const [searchFocused, setSearchFocused] = useState(false)
  const { i18n } = useTranslation()
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en'
    i18n.changeLanguage(newLang)
  }
  
  return (
    <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 px-4 py-3 md:px-6 safe-area-top">
      <div className="flex items-center justify-between gap-4">
        {/* Left section - Menu & Search */}
        <div className="flex items-center gap-3 flex-1">
          {showMenuButton && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onMenuClick}
              className="flex-shrink-0 hover:bg-primary/10"
              aria-label="Open navigation menu"
            >
              <List size={22} weight="bold" />
            </Button>
          )}
          
          {/* Search Bar - Desktop */}
          <div 
            className={`relative hidden sm:block transition-all duration-300 ${
              searchFocused ? 'w-96' : 'w-72'
            }`}
          >
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
              <MagnifyingGlass size={16} />
            </div>
            <Input
              placeholder="Search patients, appointments..."
              className="pl-10 pr-16 h-10 bg-muted/50 border-transparent focus:border-primary focus:bg-background transition-all"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              aria-label="Search"
            />
            <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted rounded border">
              <Command size={10} />K
            </kbd>
          </div>
        </div>

        {/* Right section - Actions & Profile */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Mobile search button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="sm:hidden hover:bg-primary/10"
            aria-label="Search"
          >
            <MagnifyingGlass size={20} />
          </Button>
          
          {/* Messages */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-primary/10"
                aria-label="Messages"
              >
                <ChatCircle size={20} />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold animate-pulse"
                >
                  2
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-semibold">Messages</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="font-medium text-sm">Dr. Mohammed Al-Rashid</span>
                </div>
                <p className="text-xs text-muted-foreground pl-4 line-clamp-1">
                  Based on the MRI results, I agree with your assessment...
                </p>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-3 cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                  <span className="font-medium text-sm">Dr. Fatima Hassan</span>
                </div>
                <p className="text-xs text-muted-foreground pl-4 line-clamp-1">
                  I can see the patient next week...
                </p>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary cursor-pointer">
                View all messages
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="relative hover:bg-primary/10"
                aria-label="Notifications"
              >
                <Bell size={20} />
                <Badge 
                  variant="destructive" 
                  className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full text-[10px] font-bold"
                >
                  5
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-pointer">
                <div className="w-2 h-2 bg-destructive rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Urgent: Patient vital alert</p>
                  <p className="text-xs text-muted-foreground">Ahmed Al-Rashid - 32 min ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-pointer">
                <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">New appointment scheduled</p>
                  <p className="text-xs text-muted-foreground">15 min ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex items-start gap-3 py-3 cursor-pointer">
                <div className="w-2 h-2 bg-success rounded-full mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Lab results available</p>
                  <p className="text-xs text-muted-foreground">Sara Mohammed - 1 hour ago</p>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-primary cursor-pointer">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <div className="hidden md:block h-6 w-px bg-border mx-1" />
          
          {/* Language Switcher */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="hover:bg-primary/10"
            onClick={toggleLanguage}
            aria-label={`Switch to ${i18n.language === 'en' ? 'Arabic' : 'English'}`}
          >
            <Globe size={20} />
          </Button>
          
          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex items-center gap-2 pl-2 pr-3 h-10 hover:bg-primary/10"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground text-xs font-semibold">SA</span>
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="text-sm font-medium leading-tight">Dr. Sarah Ahmed</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">Internal Medicine</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-semibold">Dr. Sarah Ahmed</span>
                  <span className="text-xs text-muted-foreground font-normal">sarah.ahmed@brainsait.com</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <User size={16} className="mr-2" />
                My Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Gear size={16} className="mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Question size={16} className="mr-2" />
                Help & Support
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <Sun size={16} className="mr-2" />
                Light Mode
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                <SignOut size={16} className="mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}