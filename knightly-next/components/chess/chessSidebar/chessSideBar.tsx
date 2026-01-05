"use client"

import * as React from "react"
import {
  BookOpen,
  Bot,
  Command,
  Flame,
  Frame,
  Hash,
  Home,
  Send,
} from "lucide-react"

import { NavMain } from "@/components/navigation/nav-main"
import { NavProjects } from "@/components/navigation/nav-projects"
import { NavSecondary } from "@/components/navigation/nav-secondary"
import { NavUser } from "@/components/navigation/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/chess/chessSidebar/sideBar"
import { User } from "@/lib/user-types"
import { ChessTabs } from "./tabs"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Clubs",
      url: "#",
      icon: Hash,
      isActive: false,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Home",
      url: "/home",
      icon: Home,
    },
    {
      name: "Leaderboards",
      url: "/leaderboards",
      icon: BookOpen,
    },
    {
      name: "Puzzle Rush",
      url: "/puzzle-rush",
      icon: Flame,
    },
  ],
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
}

export function ChessSidebar({ ...props }: AppSidebarProps) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarContent>
        <ChessTabs />
      </SidebarContent>
      <SidebarFooter>
        {/* something here... maybe */}
      </SidebarFooter>
    </Sidebar>
  )
}
