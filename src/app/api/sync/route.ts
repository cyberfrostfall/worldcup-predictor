import { NextRequest, NextResponse } from "next/server";
import { fetchMatches } from "@/lib/football-api";
import { upsertMatches } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 从 football-data.org 拉取赛程与赛果，写入数据库。
 * 供 Cron 定时调用，也可手动触发。
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }
  try {
    const matches = await fetchMatches();
    const count = upsertMatches(matches);
    return NextResponse.json({ ok: true, synced: count });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
