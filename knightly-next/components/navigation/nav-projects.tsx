"use client";

import { type LucideIcon } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "../ui/button";
import { useLoggingOutStore } from "@/lib/zustand";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
    logOutButton?: boolean;
  }[];
}) {
  const { isMobile } = useSidebar();
  const isLoggingOut = useLoggingOutStore((state) => state.loggingOut);
  const setLoggingOut = useLoggingOutStore((state) => state.setLoggingOut);
  const router = useRouter();

  const handleLogOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onRequest: () => {
          setLoggingOut(true);
        },
        onError: (ctx) => {
          setLoggingOut(false);
          toast.error(
            `Something went wrong : ${ctx.error.message}. Please try again.`
          );
        },
        onSuccess: () => {
          router.push("/sign-in"); // redirect to landing page once it's there
        },
      },
    });
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              {item.logOutButton ? (
                <Button variant="ghost" className="flex justify-start" onClick={handleLogOut} disabled={isLoggingOut}>
                  <item.icon />
                  <span>{item.name}</span>
                </Button>
              ) : (
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.name}</span>
                </Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
