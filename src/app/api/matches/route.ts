import { NextResponse } from "next/server";
import { getMatches, getAllPredictions } from "@/lib/db";

export const dynamic = "force-dynamic";

/** 给前端的数据接口：返回全部比赛 + 预测 */
export async function GET() {
  const matches = getMatches();
  const predictions = getAllPredictions();
  const predByMatch = Object.fromEntries(predictions.map((p) => [p.matchId, p]));
  return NextResponse.json({ matches, predictions: predByMatch });
}
