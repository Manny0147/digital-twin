import { ensureUser } from "@/lib/auth";
import { listThreads } from "@/lib/chat";
import { ChatInterface } from "@/components/chat/chat-interface";

export default async function ChatPage() {
  const { id: userId } = await ensureUser();
  const threads = await listThreads(userId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Talk to Your Twin</h1>
        <p className="text-muted-foreground mt-1">
          Streaming responses grounded in your memories and personality. Conversations are saved.
        </p>
      </div>
      <ChatInterface initialThreads={threads} />
    </div>
  );
}
