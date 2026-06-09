import { NextRequest, NextResponse } from "next/server";
import { getMatch, getMatches, getPrediction, savePrediction } from "@/lib/db";
import { predictMatch } from "@/lib/prediction";
import { isAuthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * 生成预测。
 *   GET /api/predict?matchId=123  对单场生成（已存在则跳过）
 *   GET /api/predict              对所有「未开赛且无预测」的比赛批量生成
 *
 * 关键约束：每场只在赛前预测一次并落库，不覆盖，保证复盘公正。
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const idParam = req.nextUrl.searchParams.get("matchId");

  try {
    if (idParam) {
      const match = getMatch(Number(idParam));
      if (!match) {
        return NextResponse.json({ error: "比赛不存在" }, { status: 404 });
      }
      if (getPrediction(match.id)) {
        return NextResponse.json({ ok: true, skipped: "已有预测" });
      }
      const pred = await predictMatch(match);
      savePrediction(pred);
      return NextResponse.json({ ok: true, prediction: pred });
    }

    // 批量：未开赛 + 无预测
    const pending = getMatches().filter(
      (m) =>
        (m.status === "SCHEDULED" || m.status === "TIMED") &&
        !getPrediction(m.id)
    );

    const results: number[] = [];
    for (const m of pending) {
      const pred = await predictMatch(m);
      savePrediction(pred);
      results.push(m.id);
    }
    return NextResponse.json({ ok: true, predicted: results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
