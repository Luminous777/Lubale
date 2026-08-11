import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listUserOrganizations } from "@/lib/authz";
import { MarketingHeader } from "@/components/MarketingHeader";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgs = await listUserOrganizations(session.user.id);
  if (orgs.length > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 py-12">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-heading">Crear empresa</h1>
            <p className="mt-2 text-sm text-muted">
              Este paso crea tu organización y te asigna como administrador.
            </p>
          </div>
          <OnboardingForm />
        </div>
      </main>
    </div>
  );
}
