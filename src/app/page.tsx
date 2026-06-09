import { getMatches, getAllPredictions } from "@/lib/db";
import { MatchCard } from "@/components/MatchCard";
import type { Prediction } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const matches = getMatches();
  const predictions = getAllPredictions();
  const predByMatch = new Map<number, Prediction>(
    predictions.map((p) => [p.matchId, p])
  );

  const upcoming = matches.filter(
    (m) => m.status === "SCHEDULED" || m.status === "TIMED"
  );
  const finished = matches.filter((m) => m.status === "FINISHED");

  if (matches.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
        <p className="mb-2 text-lg">还没有赛事数据</p>
        <p className="text-sm">
          配置好 <code className="rounded bg-gray-100 px-1">.env.local</code>{" "}
          后，运行{" "}
          <code className="rounded bg-gray-100 px-1">npm run seed</code> 或访问{" "}
          <code className="rounded bg-gray-100 px-1">/api/sync</code> 拉取赛程。
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-xl font-bold">即将开始</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-500">暂无即将开始的比赛</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predByMatch.get(m.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">已结束</h2>
        {finished.length === 0 ? (
          <p className="text-sm text-gray-500">暂无已结束的比赛</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {finished.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                prediction={predByMatch.get(m.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
