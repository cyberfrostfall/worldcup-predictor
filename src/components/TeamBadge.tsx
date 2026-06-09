/* eslint-disable @next/next/no-img-element */

export function TeamBadge({
  name,
  crest,
  align = "left",
}: {
  name: string;
  crest: string | null;
  align?: "left" | "right";
}) {
  return (
    <div
      className={`flex items-center gap-2 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {crest ? (
        <img src={crest} alt={name} className="h-6 w-6 object-contain" />
      ) : (
        <div className="h-6 w-6 rounded-full bg-gray-200" />
      )}
      <span className="font-medium">{name}</span>
    </div>
  );
}
