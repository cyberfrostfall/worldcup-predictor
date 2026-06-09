import Link from "next/link";
import { getMatches, getAllPredictions } from "@/lib/db";
import { AccuracyStats } from "@/components/AccuracyStats";
import type { Winner } from "@/lib/types";

export const dynamic = "force-dynamic";

function winnerLabel(w: Winner): string {
  if (w === "HOME_TEAM") return "主胜";
  if (w === "AWAY_TEAM") return "客胜";
  if (w === "DRAW") return "平局";
  return "—";
}

export default function ReviewPage() {
  const matches = getMatches();
  const predictions = getAllPredictions();
  const predByMatch = new Map(predictions.map((p) => [p.matchId, p]));

  // 只复盘「已结束且有预测」的比赛
  const rows = matches
    .filter((m) => m.status === "FINISHED" && predByMatch.has(m.id))
    .map((m) => {
      const p = predByMatch.get(m.id)!;
      return { match: m, pred: p, hit: p.predictedWinner === m.winner };
    });

  const hits = rows.filter((r) => r.hit).length;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">预测复盘</h2>

      <AccuracyStats total={rows.length} hits={hits} />

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          还没有可复盘的比赛（需既有预测、又已结束）。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2">比赛</th>
                <th className="px-4 py-2">比分</th>
                <th className="px-4 py-2">实际</th>
                <th className="px-4 py-2">预测</th>
                <th className="px-4 py-2">结果</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ match: m, pred: p, hit }) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <Link
                      href={`/match/${m.id}`}
                      className="text-pitch hover:underline"
                    >
                      {m.homeTeam} vs {m.awayTeam}
                    </Link>
                  </td>
                  <td className="px-4 py-2 tabular-nums">
                    {m.homeScore}:{m.awayScore}
                  </td>
                  <td className="px-4 py-2">{winnerLabel(m.winner)}</td>
                  <td className="px-4 py-2">
                    {winnerLabel(p.predictedWinner)}
                  </td>
                  <td className="px-4 py-2">
                    {hit ? (
                      <span className="text-green-600">✓</span>
                    ) : (
                      <span className="text-red-500">✗</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
