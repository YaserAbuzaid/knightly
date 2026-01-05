"use client";

import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  CreditCard,
  ListRestart,
  LogOut,
  Sparkles,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { User } from "@/lib/user-types";
import { toast } from "sonner";
import IntegrateChess from "../chess/integrate-chess";
import { authClient } from "@/lib/auth-client";
import { useLoggingOutStore, useRefreshUserChessDataStore } from "@/lib/zustand";
import { useRouter } from "next/navigation";

type Props = {
  user: User;
};

export function NavUser({ user }: Props) {
  const { isMobile } = useSidebar();
  const router = useRouter();
  const isLoggingOut = useLoggingOutStore((state) => state.loggingOut);
  const setLoggingOut = useLoggingOutStore((state) => state.setLoggingOut);
  const refreshUserChessData = useRefreshUserChessDataStore(
    (state) => state.refreshUserChessData
  );
  const setRefreshUserChessData = useRefreshUserChessDataStore(
    (state) => state.setRefreshUserChessData
  );

  if (typeof user === "string" || user instanceof String) {
    return toast.error(user);
  }

  if (user.chessUsername == null || user.chessUsername.length === 0) {
    // put two divs asking to integrate here and call function
    return (
      <div className="w-full">
        <SidebarGroupLabel>Connect Your Chess Account</SidebarGroupLabel>
        <IntegrateChess />
      </div>
    );
  }

  if (user.image != null && user.image.length === 0) {
    user.image = null;
  }

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
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
            >
              {user.image && (
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image || ""} alt={user.name} />
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
              )}

              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                {user.image && (
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.image || ""} alt={user.name} />
                    <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                  </Avatar>
                )}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem 
                onClick={() => {
                  setRefreshUserChessData(true);
                  toast.info("Refreshing chess data...");
                }} 
                disabled={refreshUserChessData}
              >
                <ListRestart />
                Refresh Chess Info
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <BadgeCheck />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Billing
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogOut}
              disabled={isLoggingOut}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
