import { addLog } from "./db";
import type { LogEntry } from "./types";

/**
 * 写应用业务日志到数据库，供 /logs 页面查看。
 * 写日志失败不能影响主流程，故吞掉异常并退化为控制台输出。
 */
function log(level: LogEntry["level"], source: string, message: string): void {
  try {
    addLog(level, source, message);
  } catch (e) {
    console.error("写日志失败：", e instanceof Error ? e.message : e);
  }
}

export const logInfo = (source: string, message: string) =>
  log("info", source, message);

export const logWarn = (source: string, message: string) =>
  log("warn", source, message);

export const logError = (source: string, message: string) =>
  log("error", source, message);
