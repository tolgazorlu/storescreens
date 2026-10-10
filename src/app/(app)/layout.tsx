import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppNav />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
