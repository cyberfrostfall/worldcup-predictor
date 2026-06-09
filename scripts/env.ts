/**
 * 极简 .env.local 加载器，供 tsx 脚本使用（tsx 不会自动加载 .env.local）。
 * 仅解析 KEY=VALUE，忽略注释与空行，已存在的环境变量不覆盖。
 */
import fs from "node:fs";
import path from "node:path";

export function loadEnv(file = ".env.local"): void {
  const p = path.join(process.cwd(), file);
  if (!fs.existsSync(p)) return;

  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // 去掉两端引号
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
