import { userClub } from "@/lib/user-types";
import { data } from "@/helpers/mockData";

export function extractSlug(rawUrl?: string): string {
  if (!rawUrl) return "#";
  const parts = rawUrl.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "#";
}

export function addUserClubs(clubs: userClub[]) {
  return {
    ...data,
    navMain: data.navMain.map((nav, idx) => {
      if (idx !== 0) return nav;
      return {
        ...nav,
        items: clubs.map((club) => ({
          id: club.id,
          title: club.name,
          url: extractSlug(club.url),
          icon: club.icon,
        })),
      };
    }),
  };
}

/* WTF, THIS SHOULD BE SIMPLE */
// we'll get back to it tomorrow
// problem is i was returning responseJson instead of responseJson.clubs
// it was never difficult, i was just stupid
