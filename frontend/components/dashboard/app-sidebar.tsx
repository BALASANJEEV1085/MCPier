'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Activity,
  Box,
  Code2,
  Cpu,
  FileText,
  LayoutDashboard,
  ListTodo,
  LogOut,
  MessageSquare,
  Network,
  Plus,
  Settings,
} from 'lucide-react'
import { Logo } from '@/components/logo'
import { useAuth } from '@/components/auth-provider'
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
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Chat', href: '/dashboard/chat', icon: MessageSquare },
  { label: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
  { label: 'MCP Servers', href: '/dashboard/mcp-servers', icon: Network },
  { label: 'Models', href: '/dashboard/models', icon: Cpu },
  { label: 'Sandbox', href: '/dashboard/sandbox', icon: Box },
  { label: 'Codewrite', href: '/dashboard/codewrite', icon: Code2, comingSoon: true },
  { label: 'Activity', href: '/dashboard/activity', icon: Activity },
  { label: 'Logs', href: '/dashboard/logs', icon: FileText },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  function handleSignOut() {
    signOut()
    router.push('/')
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <Logo iconOnly className="group-data-[collapsible=icon]:justify-center" />
          <span className="text-[15px] font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            MCPier
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton render={<Link href="/dashboard/tasks/new" />} tooltip="New Task">
                  <Plus />
                  <span>New Task</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(item.href)

                if (item.comingSoon) {
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        render={<div />}
                        className="cursor-not-allowed opacity-60 hover:bg-transparent"
                        tooltip={`${item.label} (Coming Soon)`}
                      >
                        <item.icon />
                        <span className="flex flex-1 items-center justify-between">
                          <span>{item.label}</span>
                          <span className="rounded border border-border bg-muted/60 px-1.5 py-0.2 text-[10px] font-medium tracking-tight text-muted-foreground group-data-[collapsible=icon]:hidden">
                            Coming soon
                          </span>
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger className="w-full">
                <SidebarMenuButton size="lg" render={<div />}>
                  <Avatar className="size-6">
                    <AvatarFallback className="text-[10px]">{user.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="truncate text-[12.5px] font-medium">{user.name}</span>
                    <span className="truncate text-[11px] text-sidebar-foreground/60">{user.plan}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuLabel className="text-[12px] text-muted-foreground">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
