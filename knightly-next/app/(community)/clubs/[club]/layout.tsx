import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/navigation/sidebar";
import { getUser } from "@/actions/userActions";
import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ club: string }>;
}>) {
  return (
    <Suspense
      fallback={
        <SidebarProvider>
          <Sidebar user={null} loading={true}>
            {children}
          </Sidebar>
        </SidebarProvider>
      }
    >
      <AuthenticatedLayout params={params}>{children}</AuthenticatedLayout>
    </Suspense>
  );
}

async function AuthenticatedLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ club: string }>;
}) {
  const user = await auth.api.getSession({
    headers: await headers(),
  });

  if (!user) {
    redirect("/sign-in");
  }

  const club = await params;
  const allUserInfo = await getUser(user.user.id);

  if (!allUserInfo)
    return (
      <Alert
        variant="destructive"
        className="flex h-screen w-screen justify-center items-center"
      >
        couldn't get user data. Please refresh the and contact support if issue
        persists
      </Alert>
    );

  return (
    <SidebarProvider>
      <Sidebar user={allUserInfo}>{children}</Sidebar>
    </SidebarProvider>
  );
}
