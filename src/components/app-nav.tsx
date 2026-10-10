"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Plug } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const ITEMS = [
  {
    href: "/projects",
    label: "Projects",
    icon: LayoutGrid,
    match: ["/projects", "/p/"],
  },
  {
    href: "/connect",
    label: "Connect an agent",
    icon: Plug,
    match: ["/connect"],
  },
] as const;

/** Narrow icon-only rail with tooltips and one active state. */
export function AppNav() {
  const path = usePathname();
  return (
    <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-sidebar py-3">
      <Link
        href="/projects"
        aria-label="Screeny"
        className="mb-3 flex size-8 items-center justify-center rounded-lg bg-foreground text-[13px] font-bold tracking-tight text-background"
      >
        S
      </Link>
      {ITEMS.map(({ href, label, icon: Icon, match }) => {
        const active = match.some((m) => path.startsWith(m));
        return (
          <Tooltip key={href}>
            <TooltipTrigger asChild>
              <Link
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex size-8 items-center justify-center rounded-md transition-colors ${
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </aside>
  );
}
