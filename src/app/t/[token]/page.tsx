import { PublicTwinChat } from "@/components/share/public-twin-chat";

export default async function PublicTwinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold tracking-tight">Digital Twin</span>
          <span className="text-xs text-muted-foreground">Consent-gated access</span>
        </div>
      </header>
      <main className="flex-1 container max-w-3xl mx-auto px-4 py-8">
        <PublicTwinChat token={token} />
      </main>
      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        You are speaking to a personal digital twin under an explicit, revocable consent grant. The owner can revoke this link at any time.
      </footer>
    </div>
  );
}
