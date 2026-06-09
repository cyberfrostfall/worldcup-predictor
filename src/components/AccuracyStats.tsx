export function AccuracyStats({
  total,
  hits,
}: {
  total: number;
  hits: number;
}) {
  const rate = total > 0 ? Math.round((hits / total) * 100) : 0;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
        <div className="text-2xl font-bold">{total}</div>
        <div className="text-xs text-gray-500">已复盘场次</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
        <div className="text-2xl font-bold text-pitch">{hits}</div>
        <div className="text-xs text-gray-500">命中场次</div>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
        <div className="text-2xl font-bold">{rate}%</div>
        <div className="text-xs text-gray-500">命中率</div>
      </div>
    </div>
  );
}
