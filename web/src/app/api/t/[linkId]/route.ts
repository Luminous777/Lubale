import { after } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;

  const link = await prisma.profileLink.findUnique({
    where: { id: linkId },
    select: { url: true },
  });

  if (!link) {
    return new Response(null, { status: 404 });
  }

  after(async () => {
    await prisma.linkClick.create({ data: { linkId } });
  });

  return Response.redirect(link.url, 302);
}
