import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { MarketingHeader } from "@/components/MarketingHeader";
import { listUserOrganizations } from "@/lib/authz";
import { PersonalSignupForm } from "./PersonalSignupForm";

export const metadata = {
  title: "Crear tarjeta personal",
};

export default async function PersonalSignupPage() {
  const session = await auth();
  if (session?.user?.id) {
    const orgs = await listUserOrganizations(session.user.id);
    if (orgs.length > 0) redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-heading">
              Tarjeta digital personal
            </h1>
            <p className="mt-2 text-sm text-muted">
              Tu propia tarjeta con QR. Empezás gratis y mejorás cuando quieras.
            </p>
          </div>
          <PersonalSignupForm />
        </div>
      </main>
    </div>
  );
}
