import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) redirect("/");
  if (!session?.user?.email || session.user.email.toLowerCase() !== adminEmail.toLowerCase()) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-black/[0.06] bg-surface px-6 py-4">
        <p className="text-xs font-mono text-muted">admin · {session.user.email}</p>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
