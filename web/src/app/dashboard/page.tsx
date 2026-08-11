import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUserOrganizations } from "@/lib/authz";
import { MarketingHeader } from "@/components/MarketingHeader";

export default async function DashboardIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard");

  const orgs = await listUserOrganizations(session.user.id);
  if (orgs.length === 0) redirect("/onboarding");

  if (orgs.length === 1) {
    redirect(`/dashboard/${orgs[0].slug}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1 px-6 py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-heading">Tus empresas</h1>
            <p className="mt-2 text-sm text-muted">Selecciona una organización para administrarla.</p>
          </div>
          <div className="grid gap-4">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/dashboard/${org.slug}`}
                className="app-card flex items-center justify-between px-6 py-5 transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)]"
              >
                <span className="font-semibold text-heading">{org.name}</span>
                <span className="font-mono text-xs text-muted">/{org.slug}</span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
