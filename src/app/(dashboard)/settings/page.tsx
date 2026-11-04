import { ensureUser } from "@/lib/auth";
import { getPersonality } from "@/lib/personality";
import { PersonalityForm } from "@/components/settings/personality-form";
import { ExportVault } from "@/components/settings/export-vault";
import { ImportVault } from "@/components/settings/import-vault";

export default async function SettingsPage() {
  const user = await ensureUser();
  const profile = await getPersonality(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Account, personality, and ownership controls.
        </p>
      </div>

      <div className="border rounded-lg p-6 space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Internal User ID</p>
          <p className="font-mono text-sm">{user.id}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Clerk ID</p>
          <p className="font-mono text-sm">{user.clerkId}</p>
        </div>
      </div>

      <ExportVault />
      <ImportVault />
      <PersonalityForm initial={profile} />
    </div>
  );
}
