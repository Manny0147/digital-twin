import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
        Your digital identity,<br />owned by you.
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted">
        Memories you can edit. AI that cites its sources. Access you can revoke.
      </p>
      <div className="mt-10 flex gap-4">
        <Link href="/sign-in">
          <Button size="lg">Get started</Button>
        </Link>
      </div>
    </main>
  );
}
