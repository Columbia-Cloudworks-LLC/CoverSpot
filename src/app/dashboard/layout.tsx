import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <DashboardNav userEmail={user.email ?? ""} />
      <main className="flex-1 w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
