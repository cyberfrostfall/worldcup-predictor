import { NextRequest, NextResponse } from "next/server";
import { getMatch, getMatches, getPrediction, savePrediction } from "@/lib/db";
import { predictMatch } from "@/lib/prediction";
import { isAuthorized } from "@/lib/auth";
import { logInfo, logError } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * 生成预测。
 *   GET /api/predict?matchId=123        对单场生成（已存在则跳过）
 *   GET /api/predict                    对所有「未开赛且无预测」的比赛批量生成
 *   GET /api/predict?force=1            强制重算所有「未开赛」的比赛，覆盖旧预测
 *   GET /api/predict?matchId=123&force=1 强制重算单场，覆盖旧预测
 *
 * 默认约束：每场只在赛前预测一次并落库，不覆盖，保证复盘公正（cron 用此模式）。
 * force 模式：改了评判规则后手动重算用，仅作用于未开赛比赛，已完赛的一律不动。
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const idParam = req.nextUrl.searchParams.get("matchId");
  const force = req.nextUrl.searchParams.get("force") === "1";

  // 仅未开赛可预测（force 也绝不触碰进行中/已完赛的比赛）
  const isUpcoming = (status: string) =>
    status === "SCHEDULED" || status === "TIMED";

  try {
    if (idParam) {
      const match = getMatch(Number(idParam));
      if (!match) {
        return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
      }
      if (!isUpcoming(match.status)) {
        return NextResponse.json({ ok: true, skipped: "比赛已开赛或结束" });
      }
      if (match.homeTeam === "待定" || match.awayTeam === "待定") {
        return NextResponse.json({ ok: true, skipped: "对阵未定" });
      }
      if (!force && getPrediction(match.id)) {
        return NextResponse.json({ ok: true, skipped: "已有预测" });
      }
      const pred = await predictMatch(match);
      savePrediction(pred, force);
      logInfo(
        "predict",
        `${force ? "重算" : "预测"}完成：${match.homeTeam} vs ${match.awayTeam}`
      );
      return NextResponse.json({ ok: true, prediction: pred });
    }

    // 批量：未开赛 + 对阵已确定（排除抽签前的"待定"占位）
    //   默认模式额外要求「无预测」；force 模式则重算全部并覆盖。
    const pending = getMatches().filter(
      (m) =>
        isUpcoming(m.status) &&
        m.homeTeam !== "待定" &&
        m.awayTeam !== "待定" &&
        (force || !getPrediction(m.id))
    );

    const results: number[] = [];
    for (const m of pending) {
      const pred = await predictMatch(m);
      savePrediction(pred, force);
      results.push(m.id);
    }
    logInfo(
      "predict",
      `批量${force ? "重算" : "预测"}完成，共 ${results.length} 场`
    );
    return NextResponse.json({ ok: true, predicted: results, force });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logError("predict", `预测失败：${msg}`);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
