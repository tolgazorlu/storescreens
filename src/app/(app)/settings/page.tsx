import { getSessionUser } from "@/lib/auth";
import { SettingsView } from "@/components/settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await getSessionUser())!;
  const origin = process.env.APP_URL ?? "http://localhost:3000";
  return <SettingsView email={user.email} origin={origin} />;
}
