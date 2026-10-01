import Link from "next/link";
import { LayoutGrid, Plug } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
        <Link
          href="/projects"
          className="mb-3 flex size-8 items-center justify-center rounded-md bg-foreground text-xs font-bold text-background"
        >
          S
        </Link>
        <NavIcon href="/projects" label="Projects">
          <LayoutGrid className="size-4" />
        </NavIcon>
        <NavIcon href="/connect" label="Connect an agent">
          <Plug className="size-4" />
        </NavIcon>
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
