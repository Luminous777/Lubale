import { NextResponse } from "next/server";
import { getPublicProfile } from "@/lib/publicProfile";
import { ProfileStatus } from "@prisma/client";
import { absoluteUrl, publicCardPath } from "@/lib/urls";
import { buildVCard } from "@/lib/vcard";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orgSlug: string; cardSlug: string }> },
) {
  const { orgSlug, cardSlug } = await ctx.params;
  const profile = await getPublicProfile(orgSlug, cardSlug);
  if (!profile) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (profile.status === ProfileStatus.disabled) {
    return new NextResponse("Gone", { status: 410 });
  }

  const cardUrl = absoluteUrl(publicCardPath(orgSlug, cardSlug));
  const vcf = buildVCard({
    fullName: profile.displayName,
    organization: profile.organization.name,
    title: profile.title,
    phone: profile.phone,
    email: profile.emailPublic,
    url: cardUrl,
    note: profile.bio,
  });

  const filename = `${profile.cardSlug}.vcf`;
  return new NextResponse(vcf, {
    status: 200,
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=60",
    },
  });
}
