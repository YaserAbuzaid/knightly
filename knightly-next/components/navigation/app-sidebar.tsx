"use client";

import * as React from "react";
import {
  BookOpen,
  Bot,
  Command,
  Flame,
  Frame,
  Hash,
  Home,
  Send,
} from "lucide-react";

import { NavMain } from "@/components/navigation/nav-main";
import { NavProjects } from "@/components/navigation/nav-projects";
import { NavSecondary } from "@/components/navigation/nav-secondary";
import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { User } from "@/lib/user-types";
import { Skeleton, SVGSkeleton } from "../ui/skeleton";
import { toast } from "sonner";
import { TeamSwitcher } from "./team-switcher";
import { data } from "@/helpers/mockData";

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
  loading: boolean;
}

const LoadingSkeleton = () => (
  <>
    <div className="flex w-full items-center gap-2 p-2 text-left outline-hidden  h-12">
      <span className="relative flex shrink-0 h-8 w-8">
        <SVGSkeleton className="aspect-square w-full h-full" />
      </span>
      <div className="grid flex-1 text-left leading-tight">
        <span>
          <Skeleton className="w-[80%] max-w-full mb-2 h-5" />
        </span>
        <span>
          <Skeleton className="w-full max-w-full h-5" />
        </span>
      </div>
      <SVGSkeleton className="lucide-chevrons-up-down ml-auto size-4 w-[24px] h-[24px]" />
    </div>
  </>
);

export function AppSidebar({ user, loading, ...props }: AppSidebarProps) {
  if (typeof user == "string" || user instanceof String) {
    return toast.error(user);
  }

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Knightly</span>
                  <span className="truncate text-xs">
                    Where Chess Communities Compete & Connect.
                  </span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* <TeamSwitcher teams={data.navMain[0].items} /> */}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.projects} />
        <NavMain
          items={data.navMain}
          platform={user?.chessPlatform || "Platform"}
          user={user}
        />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {loading ? <LoadingSkeleton /> : <NavUser user={user} />}
      </SidebarFooter>
    </Sidebar>
  );
}
