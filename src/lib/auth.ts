import { NextRequest } from "next/server";

/**
 * 校验写操作接口（sync / predict）的访问令牌。
 * Cron 或手动调用时需带：Authorization: Bearer <CRON_SECRET>
 * 若未设置 CRON_SECRET，则视为开发环境，放行。
 */
export function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // 未配置则不校验（本地开发方便）
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
