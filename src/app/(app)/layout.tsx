import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, KeyRound } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LogoutButton } from "@/components/logout-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
        <Link
          href="/projects"
          className="mb-3 flex size-8 items-center justify-center rounded-md bg-foreground text-background text-xs font-bold"
        >
          S
        </Link>
        <NavIcon href="/projects" label="Projects">
          <LayoutGrid className="size-4" />
        </NavIcon>
        <NavIcon href="/settings" label="API keys">
          <KeyRound className="size-4" />
        </NavIcon>
        <div className="mt-auto">
          <LogoutButton />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

function NavIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {children}
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
