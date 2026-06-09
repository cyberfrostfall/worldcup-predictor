"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * 手动触发大模型预测。
 *   不传 matchId → 对所有「未开赛」比赛批量处理（顶栏全局按钮）
 *   传 matchId   → 仅对当前这场处理（子赛事页面按钮）
 *
 *   force=false（默认）：只补「无预测」的比赛，不覆盖已有预测。
 *   force=true：强制重算并覆盖旧预测（改了评判规则后用），仅作用于未开赛比赛，
 *               已完赛的一律不动。属破坏性操作，点击前会二次确认。
 *
 * 直接调用 GET /api/predict。若部署配置了 CRON_SECRET，浏览器无法携带令牌，
 * 接口会返回 401，此处会提示「未授权」。
 */
export function PredictButton({
  matchId,
  className,
  label,
  force = false,
  confirmText,
}: {
  matchId?: number;
  className?: string;
  label?: string;
  force?: boolean;
  confirmText?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const busy = loading || isPending;

  async function run() {
    // 覆盖是破坏性操作，先二次确认
    if (force && confirmText && !window.confirm(confirmText)) {
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const params = new URLSearchParams();
      if (matchId) params.set("matchId", String(matchId));
      if (force) params.set("force", "1");
      const qs = params.toString();
      const res = await fetch(`/api/predict${qs ? `?${qs}` : ""}`);
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        setMsg("未授权");
      } else if (!res.ok) {
        setMsg(data?.error ? `失败：${data.error}` : "预测失败");
      } else if (data?.skipped) {
        setMsg(data.skipped);
      } else if (Array.isArray(data?.predicted)) {
        setMsg(`已${force ? "重算" : "预测"} ${data.predicted.length} 场`);
      } else {
        setMsg(force ? "重算完成" : "预测完成");
      }

      if (res.ok) {
        // 刷新服务端组件数据，展示新预测
        startTransition(() => router.refresh());
      }
    } catch {
      setMsg("请求出错");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={
          className ??
          "rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100 disabled:opacity-50"
        }
      >
        {busy ? "预测中…" : label ?? "🔮 手动预测"}
      </button>
      {msg && <span className="text-xs opacity-80">{msg}</span>}
    </span>
  );
}
