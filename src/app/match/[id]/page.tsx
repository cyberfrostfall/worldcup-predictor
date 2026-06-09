import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch, getPrediction } from "@/lib/db";
import { TeamBadge } from "@/components/TeamBadge";
import { PredictionBar } from "@/components/PredictionBar";
import type { Winner } from "@/lib/types";

export const dynamic = "force-dynamic";

function winnerLabel(w: Winner): string {
  if (w === "HOME_TEAM") return "主胜";
  if (w === "AWAY_TEAM") return "客胜";
  if (w === "DRAW") return "平局";
  return "—";
}

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const match = getMatch(Number(id));
  if (!match) notFound();

  const prediction = getPrediction(match.id);
  const finished = match.status === "FINISHED";

  // 复盘：预测是否命中
  const hit =
    finished && prediction
      ? prediction.predictedWinner === match.winner
      : null;

  return (
    <div className="space-y-6">
      <Link href="/" className="text-sm text-pitch hover:underline">
        ← 返回赛程
      </Link>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 text-center text-sm text-gray-500">
          {match.stage}
          {match.group ? ` · ${match.group}` : ""} ·{" "}
          {new Date(match.utcDate).toLocaleString("zh-CN")}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <TeamBadge name={match.homeTeam} crest={match.homeCrest} />
          </div>
          <div className="text-center">
            {finished ? (
              <span className="text-3xl font-bold tabular-nums">
                {match.homeScore} : {match.awayScore}
              </span>
            ) : (
              <span className="text-gray-400">即将开始</span>
            )}
          </div>
          <div className="flex-1">
            <TeamBadge
              name={match.awayTeam}
              crest={match.awayCrest}
              align="right"
            />
          </div>
        </div>
      </div>

      {/* 预测区 */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 font-bold">大模型预测</h3>
        {prediction ? (
          <div className="space-y-4">
            <PredictionBar p={prediction} />

            <div className="flex flex-wrap gap-4 text-sm">
              <span>
                预测结果：
                <strong>{winnerLabel(prediction.predictedWinner)}</strong>
              </span>
              {prediction.predictedScore && (
                <span>
                  预测比分：<strong>{prediction.predictedScore}</strong>
                </span>
              )}
              {hit !== null && (
                <span
                  className={
                    hit
                      ? "rounded bg-green-100 px-2 text-green-700"
                      : "rounded bg-red-100 px-2 text-red-700"
                  }
                >
                  {hit ? "✓ 命中" : "✗ 未中"}
                </span>
              )}
            </div>

            <p className="rounded bg-gray-50 p-3 text-sm leading-relaxed text-gray-700">
              {prediction.analysis}
            </p>

            <p className="text-xs text-gray-400">
              模型：{prediction.model} · 生成于{" "}
              {new Date(prediction.createdAt).toLocaleString("zh-CN")}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            暂无预测。访问{" "}
            <code className="rounded bg-gray-100 px-1">
              /api/predict?matchId={match.id}
            </code>{" "}
            生成。
          </p>
        )}
      </div>
    </div>
  );
}
