import { User } from "@/lib/user-types";
import { AppSidebar } from "./app-sidebar";
import { Separator } from "../ui/separator";
import { SidebarInset, SidebarTrigger } from "../ui/sidebar";

type Props = {
  children: React.ReactNode;
  user: User;
  loading?: boolean;
};

export function Sidebar({ children, user, loading = false }: Props) {
  return (
    <>
      <AppSidebar user={user} loading={loading}/>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <div className="text-muted-foreground">Knightly</div>
          </div>
        </header>
        <main className="w-full h-full">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
