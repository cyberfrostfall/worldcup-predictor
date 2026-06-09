import type { Match, MatchStatus, Winner, StandingRow } from "./types";

const BASE = "https://api.football-data.org/v4";

// football-data.org 原始返回结构（仅取用到的字段）
interface ApiMatch {
  id: number;
  competition?: { code?: string; name?: string };
  stage: string;
  group: string | null;
  utcDate: string;
  status: MatchStatus;
  // 对阵未定时(如世界杯抽签前)，name 可能为 null
  homeTeam: { name: string | null; crest?: string | null };
  awayTeam: { name: string | null; crest?: string | null };
  score: {
    winner: Winner;
    fullTime: { home: number | null; away: number | null };
  };
}

interface ApiResponse {
  matches: ApiMatch[];
}

// 把 football-data.org 的阶段代号转中文，便于展示
const STAGE_ZH: Record<string, string> = {
  GROUP_STAGE: "小组赛",
  LAST_16: "1/8 决赛",
  QUARTER_FINALS: "1/4 决赛",
  SEMI_FINALS: "半决赛",
  THIRD_PLACE: "三四名决赛",
  FINAL: "决赛",
};

function mapMatch(m: ApiMatch, competitionCode: string): Match {
  return {
    id: m.id,
    competition: m.competition?.code ?? competitionCode,
    stage: STAGE_ZH[m.stage] ?? m.stage,
    group: m.group,
    // 对阵未定(抽签前)时用占位名，保证可入库与展示
    homeTeam: m.homeTeam.name ?? "待定",
    awayTeam: m.awayTeam.name ?? "待定",
    homeCrest: m.homeTeam.crest ?? null,
    awayCrest: m.awayTeam.crest ?? null,
    utcDate: m.utcDate,
    status: m.status,
    homeScore: m.score.fullTime.home,
    awayScore: m.score.fullTime.away,
    winner: m.score.winner,
  };
}

/** 拉取某项赛事的全部比赛（默认世界杯 WC） */
export async function fetchMatches(
  competitionCode = process.env.COMPETITION_CODE ?? "WC"
): Promise<Match[]> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) throw new Error("缺少环境变量 FOOTBALL_DATA_API_KEY");

  const res = await fetch(`${BASE}/competitions/${competitionCode}/matches`, {
    headers: { "X-Auth-Token": token },
    // 避免 Next.js 缓存陈旧赛果
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`football-data.org 请求失败 ${res.status}: ${body}`);
  }

  const data = (await res.json()) as ApiResponse;
  return data.matches.map((m) => mapMatch(m, competitionCode));
}

// ── 积分榜 ───────────────────────────────────────────

interface ApiStandingRow {
  position: number;
  team: { name: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string | null;
}

interface ApiStanding {
  stage: string;
  type: "TOTAL" | "HOME" | "AWAY";
  group: string | null;
  table: ApiStandingRow[];
}

interface ApiStandingsResponse {
  standings: ApiStanding[];
}

/** 拉取赛事积分榜（每个小组一组，只取 TOTAL 且分组非空，避免重复） */
export async function fetchStandings(
  competitionCode = process.env.COMPETITION_CODE ?? "WC"
): Promise<StandingRow[]> {
  const token = process.env.FOOTBALL_DATA_API_KEY;
  if (!token) throw new Error("缺少环境变量 FOOTBALL_DATA_API_KEY");

  const res = await fetch(`${BASE}/competitions/${competitionCode}/standings`, {
    headers: { "X-Auth-Token": token },
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`积分榜请求失败 ${res.status}: ${body}`);
  }

  const data = (await res.json()) as ApiStandingsResponse;
  const rows: StandingRow[] = [];
  for (const s of data.standings) {
    if (s.type !== "TOTAL" || !s.group) continue;
    for (const r of s.table) {
      rows.push({
        group: s.group,
        position: r.position,
        teamName: r.team.name,
        playedGames: r.playedGames,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: r.form,
      });
    }
  }
  return rows;
}
