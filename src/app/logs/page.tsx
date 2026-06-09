import Link from "next/link";
import { getLogs } from "@/lib/db";
import type { LogEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_STYLE: Record<LogEntry["level"], string> = {
  info: "bg-gray-100 text-gray-600",
  warn: "bg-amber-100 text-amber-700",
  error: "bg-red-100 text-red-700",
};

const LEVEL_LABEL: Record<LogEntry["level"], string> = {
  info: "信息",
  warn: "警告",
  error: "错误",
};

export default function LogsPage() {
  const logs = getLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">运行日志</h2>
        {/* 手动刷新：重新加载本页 */}
        <Link
          href="/logs"
          className="rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
        >
          ↻ 刷新
        </Link>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">暂无日志</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="whitespace-nowrap px-4 py-2">时间</th>
                <th className="px-4 py-2">级别</th>
                <th className="px-4 py-2">来源</th>
                <th className="px-4 py-2">消息</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className="border-t border-gray-100">
                  <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                    {new Date(l.ts).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${LEVEL_STYLE[l.level]}`}
                    >
                      {LEVEL_LABEL[l.level]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{l.source}</td>
                  <td className="px-4 py-2">{l.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
