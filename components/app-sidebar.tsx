'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Package,
  BarChart3,
  LineChart,
  Users,
  Settings,
  HelpCircle,
  Moon,
  Sun,
  Crown,
  Smartphone,
  Wallet,
  Globe,
  Route,
  FileEdit,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'


import { useUIStore } from '@/lib/stores'
import { cn } from '@/lib/utils'

const mainMenuItems = [
  {
    title: 'Dashboard',
    url: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Transactions',
    url: '/admin/transactions',
    icon: Smartphone,
  },
  {
    title: 'Providers',
    url: '/admin/providers',
    icon: Globe,
  },
  {
    title: 'Routing',
    url: '/admin/routing',
    icon: Route,
  },
  {
    title: 'Products',
    url: '/admin/products',
    icon: Package,
  },
  {
    title: 'Website CMS',
    url: '/admin/cms',
    icon: FileEdit,
  },
  {
    title: 'Customers',
    url: '/admin/customers',
    icon: Users,
  },
  {
    title: 'Analytics',
    url: '/admin/analytics',
    icon: LineChart,
  },
  {
    title: 'Statistics',
    url: '/admin/statistics',
    icon: BarChart3,
  },
]

const helpCenterItems = [
  {
    title: 'Settings',
    url: '/admin/settings',
    icon: Settings,
  },
  {
    title: 'Help Center',
    url: '/admin/help',
    icon: HelpCircle,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useUIStore()

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70 bg-sidebar shadow-elevated-sm">
      <SidebarHeader className="border-b border-sidebar-border/80 p-4">
        <Link href="/admin" className="flex items-center gap-3 rounded-xl px-1 py-0.5 transition-colors hover:bg-sidebar-accent/60">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-elevated-sm ring-2 ring-primary/15">
            <Crown className="size-5" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Console</p>
            <span className="text-lg font-semibold tracking-tight">ITU</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="gap-2 px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => {
                const isActive = pathname === item.url || 
                  (item.url !== '/admin' && pathname.startsWith(item.url))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        'rounded-xl border border-transparent transition-all duration-200',
                        isActive &&
                          'border-primary/15 bg-primary/10 font-semibold text-primary shadow-elevated-sm dark:bg-primary/15',
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Help Center
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {helpCenterItems.map((item) => {
                const isActive = pathname === item.url
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        'rounded-xl border border-transparent transition-all duration-200',
                        isActive &&
                          'border-primary/15 bg-primary/10 font-semibold text-primary shadow-elevated-sm dark:bg-primary/15',
                      )}
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleTheme()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleTheme()
                    }
                  }}
                  className="flex w-full items-center justify-between gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Moon className="size-4" />
                    ) : (
                      <Sun className="size-4" />
                    )}
                    <span className="group-data-[collapsible=icon]:hidden">Dark Mode</span>
                  </div>
                  <div
                    className={cn(
                      'group-data-[collapsible=icon]:hidden relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      theme === 'dark' ? 'bg-primary' : 'bg-muted',
                    )}
                  >
                    <span 
                      className="pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform"
                      style={{
                        transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(0px)'
                      }}
                    />
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      
    </Sidebar>
  )
}
