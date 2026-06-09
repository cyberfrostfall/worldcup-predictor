// 比赛状态（对齐 football-data.org）
export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED";

export type Winner = "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;

export interface Match {
  id: number;
  competition: string;
  stage: string;          // 小组赛 / 1/8 决赛 等
  group: string | null;   // GROUP_A ... 淘汰赛为 null
  homeTeam: string;
  awayTeam: string;
  homeCrest: string | null;
  awayCrest: string | null;
  utcDate: string;        // ISO 时间
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  winner: Winner;
}

export interface Prediction {
  matchId: number;
  probHome: number;       // 0~1
  probDraw: number;
  probAway: number;
  predictedWinner: Winner;
  predictedScore: string | null; // 如 "2-1"
  analysis: string;       // LLM 解读文案
  model: string;          // 使用的模型名（便于复盘区分）
  createdAt: string;
}

// 组装给 LLM 的赛前数据
export interface PreMatchContext {
  homeTeam: string;
  awayTeam: string;
  stage: string;
  group: string | null;
  utcDate: string;
  homeRecent: string[];   // 近期战绩描述，如 ["W 2-0 vs X", ...]
  awayRecent: string[];
  headToHead: string[];   // 历史交锋描述
}

// 应用业务日志（同步、预测等关键操作）
export interface LogEntry {
  id: number;
  ts: string;             // ISO 时间
  level: "info" | "warn" | "error";
  source: string;         // sync | predict
  message: string;
}
