// TODO: fix showing clubs issue, it's annoying
// Store clubs data in redis?
// TODO: Store lichess teams for lichess user in db like chess.com
// cache invalidation is bull, seriously

"use client";

import { ChevronRight, Hash, type LucideIcon } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { useEffect, useState } from "react";
import { getChessComUserClubs } from "@/actions/getChessComUserData";
import {
  User,
  userClub,
  ChessComUserClubsResponse,
  LichessUserClubsResponse,
} from "@/lib/user-types";
import { Skeleton } from "../ui/skeleton";
import { data } from "@/helpers/mockData";
import { addUserClubs } from "@/helpers/getUserClubs";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { getCookie, setCookie } from "@/helpers/cookies";
import { getUserClubs } from "@/actions/userActions";
import { useRefreshUserChessDataStore } from "@/lib/zustand";
import invalidateCache from "@/helpers/cacheInvalidation";
import { getLichessUserClubs } from "@/actions/getLichessUserData";
import { toast } from "sonner";

const LoadingSkeleton = () => (
  <>
    <ul className=" mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 px-2.5 py-0.5">
      <li className="relative">
        <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden">
          <span>
            <Skeleton className="w-[56px] max-w-full h-5" />
          </span>
        </a>
      </li>
      <li className="relative">
        <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden">
          <span>
            <Skeleton className="w-[56px] max-w-full h-5" />
          </span>
        </a>
      </li>
      <li className="relative">
        <a className="flex h-7 min-w-0 -translate-x-px items-center gap-2 px-2 outline-hidden">
          <span>
            <Skeleton className="w-[64px] max-w-full h-5" />
          </span>
        </a>
      </li>
    </ul>
  </>
);

function getLetters(val: string) {
  const valArray = val.split(" ");
  return valArray.map((v) => (v.charAt(0) !== "-" ? v.charAt(0) : "")).join("");
}

export function NavMain({
  items: initialItems,
  platform = "Platform",
  user,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: {
      id: string;
      title: string;
      url: string;
      icon: string;
    }[];
  }[];
  platform?: string;
  user?: User;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<typeof initialItems>(data.navMain);
  const refreshUserChessData = useRefreshUserChessDataStore(
    (state) => state.refreshUserChessData
  );
  const setRefreshUserChessData = useRefreshUserChessDataStore(
    (state) => state.setRefreshUserChessData
  );

  async function fetchData(fresh = false) {
    if (typeof user == "string" || user instanceof String) {
      setLoading(false);
      return;
    }

    if (platform === "chess.com") {
      /* there's a bug where it validates the cache but then reloads again but gets data from the databaase first which hasnt had the club removed...
       * i dont know, it's weird and kinda hard to explain, contact kamohelokoali201@gmail.com (me) if you really wanna understand and try to fix it
       * but it works i guess, which is good
       * user experience not too good because of it though
       * tried dealing with it, been at it for almost 2 hours, it's not critical, sooo, ill deal with it some other time, too hungry right now
       */

      // If refreshing is requested, invalidate cache first and skip cache check
      if (refreshUserChessData || fresh) {
        console.log("Forcing fresh data fetch from Chess.com API");
        await invalidateCache("chess.com-user-clubs");

        // Fetch fresh data directly without checking cache
        const response = await getChessComUserClubs(
          user.chessUsername,
          user.id,
          true
        );
        await invalidateCache("club-data");
        await invalidateCache("user-data");

        if (typeof response === "string" || response instanceof String) {
          console.error(response);
          setLoading(false);
          return;
        }

        const { clubs: freshClubs, expiryDate } =
          response as ChessComUserClubsResponse;
        setCookie("chessUserDataExpiryDate", expiryDate);
        const updatedData = addUserClubs(freshClubs);
        setItems(updatedData.navMain);
        setLoading(false);
        return;
      }

      // Normal flow for non-refresh case
      const chessUserDataExpiryDate = getCookie("chessUserDataExpiryDate");
      let clubs: userClub[] | string;

      if (chessUserDataExpiryDate) {
        const expiryTime = new Date(chessUserDataExpiryDate);

        // If the cache is still valid (not expired), fetch from database
        if (expiryTime > new Date()) {
          console.log("Using cached clubs data from database");
          clubs = await getUserClubs(user.id);

          // If we got valid clubs data from the database
          if (Array.isArray(clubs)) {
            const updatedData = addUserClubs(clubs as userClub[]);
            setItems(updatedData.navMain);
            setLoading(false);
            return;
          }
        }
      }

      // If we get here, either the cache is expired or we couldn't get valid data from the database
      // Fetch fresh data from the Chess.com API
      // console.log("Fetching fresh clubs data from Chess.com API");
      const response = await getChessComUserClubs(user.chessUsername, user.id);

      // Handle error response
      if (typeof response === "string" || response instanceof String) {
        console.error(response);
        setLoading(false);
        return;
      }

      // Extract clubs and expiry date from the response
      const { clubs: freshClubs, expiryDate } =
        response as ChessComUserClubsResponse;

      // Store the new expiry date in a cookie
      setCookie("chessUserDataExpiryDate", expiryDate);

      // Update the UI with the fresh clubs data
      const updatedData = addUserClubs(freshClubs);
      setItems(updatedData.navMain);
      setLoading(false);
    } else if (platform === "lichess") {
      // TODO: Get lichess teams

      if (refreshUserChessData || fresh) {
        console.log("Forcing fresh data fetch from Lichess API");
        await invalidateCache("lichess-user-clubs");
        // await invalidateCache("lichess-user-stats");
        // await invalidateCache("lichess-user-data");

        // Fetch fresh data directly without checking cache
        const response = await getLichessUserClubs(
          user.chessUsername,
          user.id,
          true
        );
        await invalidateCache("user-data");
        await invalidateCache("club-data");

        console.log("response: ", response);

        if (typeof response === "string" || response instanceof String) {
          console.error(response);
          setLoading(false);
          return;
        }

        const { clubs: freshClubs, expiryDate } =
          response as LichessUserClubsResponse;
        setCookie("chessUserDataExpiryDate", expiryDate);
        const updatedData = addUserClubs(freshClubs);
        setItems(updatedData.navMain);
        setLoading(false);
        return;
      }

      // Normal flow for non-refresh case
      const chessUserDataExpiryDate = getCookie("chessUserDataExpiryDate");
      let clubs: userClub[] | string;

      if (chessUserDataExpiryDate) {
        const expiryTime = new Date(chessUserDataExpiryDate);

        // If the cache is still valid (not expired), fetch from database
        if (expiryTime > new Date()) {
          console.log("Using cached clubs data from database");
          clubs = await getUserClubs(user.id);

          // If we got valid clubs data from the database
          if (Array.isArray(clubs)) {
            const updatedData = addUserClubs(clubs as userClub[]);
            setItems(updatedData.navMain);
            setLoading(false);
            return;
          }
        }
      }

      // If we get here, either the cache is expired or we couldn't get valid data from the database
      // Fetch fresh data from the Chess.com API
      console.log("Fetching fresh clubs data from Lichess API");
      const response = await getLichessUserClubs(user.chessUsername, user.id);

      // Handle error response
      if (typeof response === "string" || response instanceof String) {
        console.error(response);
        setLoading(false);
        return;
      }

      // Extract clubs and expiry date from the response
      const { clubs: freshClubs, expiryDate } =
        response as LichessUserClubsResponse;

      // Store the new expiry date in a cookie
      setCookie("chessUserDataExpiryDate", expiryDate);

      // Update the UI with the fresh clubs data
      const updatedData = addUserClubs(freshClubs);
      setItems(updatedData.navMain);
      setLoading(false);
    } else if (user && user.chessPlatform === null) {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (typeof user === "string" || user instanceof String) {
      console.error(user);
      toast.error(user);
      setLoading(false);
      return;
    }

    if (!loading) {
      setLoading(true);
    }
    if (refreshUserChessData) {
      fetchData(true);
      setRefreshUserChessData(false);
      return;
    }
    fetchData();
    // if (user && Array.isArray(user.clubs)) {
    //   const updatedData = addUserClubs(user.clubs as userClub[]);
    //   setItems(updatedData.navMain);
    //   setLoading(false);
    //   return;
    // } else if (user && user.chessPlatform === null) {
    //   setLoading(false);
    // }
  }, [user, refreshUserChessData]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{platform}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>Servers</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {loading ? (
                    <LoadingSkeleton />
                  ) : item.items?.length > 0 ? (
                    item.items?.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <Link
                            href={`/clubs/${subItem.id}`}
                            className="flex gap-2"
                            key={subItem.title}
                          >
                            <Avatar>
                              <AvatarImage
                                src={
                                  platform === "chess.com"
                                    ? subItem.icon
                                    : "/Lichess_logo_2019.png"
                                }
                                alt={subItem.title}
                              />
                              <AvatarFallback>
                                {getLetters(subItem.title)}
                              </AvatarFallback>
                            </Avatar>

                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      No clubs found
                    </div>
                  )}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
