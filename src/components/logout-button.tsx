"use client";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/login");
          }}
          className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">Sign out</TooltipContent>
    </Tooltip>
  );
}
