import { ensureUser } from "@/lib/auth";
import { listMemories } from "@/lib/memories";
import { CreateMemoryForm } from "@/components/memory/create-memory-form";
import { MemoryList } from "@/components/memory/memory-list";

export default async function MemoriesPage() {
  const { id: userId } = await ensureUser();
  const { memories } = await listMemories(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Memories</h1>
        <p className="text-muted-foreground mt-1">What your twin knows about you. You own every word.</p>
      </div>
      <CreateMemoryForm />
      <MemoryList memories={memories} />
    </div>
  );
}
