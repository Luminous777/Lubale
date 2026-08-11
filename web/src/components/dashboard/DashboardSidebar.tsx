"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { BillingPlan, OrganizationKind } from "@prisma/client";
import { SignOutButton } from "@/components/SignOutButton";
import { PlanBadge } from "@/components/dashboard/PlanBadge";

type Tab = { href: string; label: string };

export function DashboardSidebar({
  orgSlug,
  orgName,
  logoUrl,
  userEmail,
  tabs,
  plan,
  kind,
  inTrial,
  currentPeriodEndIso,
  planExpired,
  planExpiresSoon,
}: {
  orgSlug: string;
  orgName: string;
  logoUrl?: string | null;
  userEmail: string;
  tabs: Tab[];
  plan: BillingPlan;
  kind: OrganizationKind;
  inTrial: boolean;
  /** ISO string para evitar pasar `Date` por la frontera cliente. */
  currentPeriodEndIso: string | null;
  planExpired: boolean;
  planExpiresSoon: boolean;
}) {
  const currentPeriodEnd = currentPeriodEndIso ? new Date(currentPeriodEndIso) : null;
  const pathname = usePathname();

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-black/[0.06] bg-surface px-4 py-8">
      <Link href={`/dashboard/${orgSlug}`} className="mb-10 flex items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-black/[0.03]">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL externa o /uploads dinámica
          <img
            src={logoUrl}
            alt=""
            className="h-[3.25rem] w-[3.25rem] shrink-0 rounded-xl border border-black/[0.06] bg-white object-contain p-1 shadow-[var(--shadow-card)] sm:h-14 sm:w-14"
          />
        ) : (
          <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-bold text-accent sm:h-14 sm:w-14">
            {orgName.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 text-left">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">Organización</p>
          <p className="truncate text-sm font-semibold text-heading">{orgName}</p>
          <p className="truncate font-mono text-[11px] text-muted">/{orgSlug}</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {tabs.map((t) => {
          const base = `/dashboard/${orgSlug}`;
          const active =
            t.href === base
              ? pathname === t.href
              : pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={[
                "relative block rounded-r-lg border-l-4 py-2.5 pl-4 pr-3 text-sm transition-colors",
                active
                  ? "border-l-accent bg-accent-soft font-semibold text-accent"
                  : "border-l-transparent font-medium text-muted hover:bg-black/[0.03] hover:text-heading",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6">
        <PlanBadge
          plan={plan}
          kind={kind}
          inTrial={inTrial}
          currentPeriodEnd={currentPeriodEnd}
          expired={planExpired}
          expiresSoon={planExpiresSoon}
          showUpgradeLink
        />
      </div>

      <div className="mt-6 border-t border-black/[0.06] pt-6">
        <p className="truncate text-xs text-muted">{userEmail}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Link
            href="/"
            className="text-xs font-medium text-muted transition hover:text-heading"
          >
            Inicio
          </Link>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-muted transition hover:text-heading"
          >
            Cambiar empresa
          </Link>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}
