import { ensureUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AuditPage() {
  const { id: userId } = await ensureUser();
  const events = await prisma.permissionAudit.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
        <p className="mt-1 text-muted-foreground">
          Recent consent and memory events for your twin.
        </p>
      </div>
      {events.length === 0 ? (
        <p className="text-sm text-muted">No events yet.</p>
      ) : (
        <ul className="space-y-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{event.action}</span>
                <time className="text-xs text-muted" dateTime={event.timestamp.toISOString()}>
                  {event.timestamp.toLocaleString()}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted">
                {event.actorType}
                {event.resource ? ` · ${event.resource}` : ""}
                {event.ipAddress ? ` · ${event.ipAddress}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
