import { NextRequest, NextResponse } from "next/server";
import { fetchMatches, fetchStandings } from "@/lib/football-api";
import { upsertMatches, replaceStandings } from "@/lib/db";
import { isAuthorized } from "@/lib/auth";
import { logInfo, logError } from "@/lib/logger";

const COMPETITION = process.env.COMPETITION_CODE ?? "WC";

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
    logInfo("sync", `同步成功，共 ${count} 场`);

    // 积分榜独立容错：失败不应让主数据同步失败
    let standingsCount = 0;
    try {
      const standings = await fetchStandings();
      standingsCount = replaceStandings(COMPETITION, standings);
      logInfo("sync", `积分榜同步成功，共 ${standingsCount} 行`);
    } catch (se) {
      const smsg = se instanceof Error ? se.message : String(se);
      logError("sync", `积分榜同步失败：${smsg}`);
    }

    return NextResponse.json({ ok: true, synced: count, standings: standingsCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("sync", `同步失败：${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
