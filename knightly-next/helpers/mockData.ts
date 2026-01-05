import {
  Bot,
  BookOpen,
  Flame,
  Frame,
  Hash,
  Home,
  Send,
  LogOut,
} from "lucide-react";

export const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Servers",
      url: "#",
      icon: Hash,
      isActive: true,
      items: [
        // {
        //   title: "History",
        //   url: "#",
        // },
        // {
        //   title: "Starred",
        //   url: "#",
        // },
        // {
        //   title: "Settings",
        //   url: "#",
        // },
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
      name: "Play",
      url: "/play/matchmaking",
      icon: Bot,
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
};
