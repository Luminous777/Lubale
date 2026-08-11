import { NextResponse } from "next/server";
import { getBearerUser } from "@/lib/httpAuth";

export async function GET(req: Request) {
  const user = await getBearerUser(req);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
