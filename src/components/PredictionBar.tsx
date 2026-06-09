import type { Prediction } from "@/lib/types";

/** 胜/平/负概率可视化条 */
export function PredictionBar({ p }: { p: Prediction }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        <div
          className="bg-pitch"
          style={{ width: pct(p.probHome) }}
          title={`主胜 ${pct(p.probHome)}`}
        />
        <div
          className="bg-gray-400"
          style={{ width: pct(p.probDraw) }}
          title={`平局 ${pct(p.probDraw)}`}
        />
        <div
          className="bg-amber-500"
          style={{ width: pct(p.probAway) }}
          title={`客胜 ${pct(p.probAway)}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-gray-500">
        <span>主胜 {pct(p.probHome)}</span>
        <span>平 {pct(p.probDraw)}</span>
        <span>客胜 {pct(p.probAway)}</span>
      </div>
    </div>
  );
}
