"use client";

import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function DashboardNav({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initials = userEmail.split("@")[0].slice(0, 2).toUpperCase();

  return (
    <header className="border-b border-border">
      <div className="w-full px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="text-subheading inline-flex min-h-11 items-center rounded-md px-2 -mx-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          CoverSpot
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex min-h-11 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:bg-accent">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-meta text-muted-foreground hidden md:inline">
              {userEmail}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={theme ?? "system"}
              onValueChange={(value) => setTheme(value)}
            >
              <DropdownMenuRadioItem value="system">
                Theme: System
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="light">Theme: Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">Theme: Dark</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer"
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
