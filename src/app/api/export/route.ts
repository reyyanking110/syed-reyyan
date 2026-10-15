import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { exportWorkspaceAction } from "@/lib/actions/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await exportWorkspaceAction();
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return new NextResponse(result.data.json, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${result.data.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
