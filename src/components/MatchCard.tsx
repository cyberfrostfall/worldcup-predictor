import Link from "next/link";
import type { Match, Prediction } from "@/lib/types";
import { TeamBadge } from "./TeamBadge";
import { PredictionBar } from "./PredictionBar";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({
  match,
  prediction,
}: {
  match: Match;
  prediction?: Prediction;
}) {
  const finished = match.status === "FINISHED";

  return (
    <Link
      href={`/match/${match.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
        <span>
          {match.stage}
          {match.group ? ` · ${match.group}` : ""}
        </span>
        <span>{formatDate(match.utcDate)}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <TeamBadge name={match.homeTeam} crest={match.homeCrest} />
        </div>

        <div className="px-3 text-center">
          {finished ? (
            <span className="text-xl font-bold tabular-nums">
              {match.homeScore} : {match.awayScore}
            </span>
          ) : (
            <span className="text-sm text-gray-400">vs</span>
          )}
        </div>

        <div className="flex-1">
          <TeamBadge name={match.awayTeam} crest={match.awayCrest} align="right" />
        </div>
      </div>

      {/* 未结束且有预测 → 显示概率条 */}
      {!finished && prediction && (
        <div className="mt-3">
          <PredictionBar p={prediction} />
        </div>
      )}
    </Link>
  );
}
