"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Moon, Plug, Sun } from "lucide-react";
import { useTheme } from "next-themes";
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
                aria-label="Toggle theme"
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
      <ThemeToggle />
    </aside>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme !== "light";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => setTheme(dark ? "light" : "dark")}
          aria-label="Toggle theme"
          className="mt-auto flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
        >
          {/* Both icons render; CSS picks one so SSR and client agree. */}
          <Sun className="hidden size-4 dark:block" />
          <Moon className="size-4 dark:hidden" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Toggle theme</TooltipContent>
    </Tooltip>
  );
}
