import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Brain, KeyRound, MessageSquare, ScrollText, Settings, LayoutDashboard } from "lucide-react";
import { ensureUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/memories", label: "Memories", icon: Brain },
  { href: "/chat", label: "Talk to Twin", icon: MessageSquare },
  { href: "/grants", label: "Access Grants", icon: KeyRound },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await ensureUser();
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <header className="md:hidden border-b sticky top-0 z-20 bg-card pt-safe">
        <div className="h-14 px-4 flex items-center justify-between">
          <span className="font-semibold tracking-tight">Digital Twin</span>
          <UserButton afterSignOutUrl="/" />
        </div>
        <nav className="flex overflow-x-auto gap-1 px-2 pb-2">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <item.icon className="h-3.5 w-3.5" />{item.label}
            </Link>
          ))}
        </nav>
      </header>
      <aside className="hidden md:flex w-60 border-r bg-card flex-col shrink-0">
        <div className="h-14 border-b flex items-center px-4 font-semibold tracking-tight">Digital Twin</div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <item.icon className="h-4 w-4" />{item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t"><UserButton afterSignOutUrl="/" /></div>
      </aside>
      <main className="flex-1 overflow-auto pb-safe">
        <div className="container max-w-5xl py-6 md:py-8 px-4 md:px-6">{children}</div>
      </main>
    </div>
  );
}
