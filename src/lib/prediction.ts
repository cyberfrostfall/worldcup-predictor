import { getLLMClient, getLLMConfig } from "./llm";
import { getMatches } from "./db";
import type { Match, PreMatchContext, Prediction, Winner } from "./types";

// LLM 期望返回的 JSON 结构
interface RawPrediction {
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  predicted_score?: string;
  analysis: string;
}

/**
 * 组装赛前数据：从已落库的历史比赛中提取两队近期战绩与历史交锋。
 * 不依赖额外 API，纯用我们已同步的数据，避免额度浪费。
 */
export function buildContext(match: Match): PreMatchContext {
  const all = getMatches().filter(
    (m) => m.status === "FINISHED" && m.utcDate < match.utcDate
  );

  const describe = (team: string, m: Match): string => {
    const isHome = m.homeTeam === team;
    const opp = isHome ? m.awayTeam : m.homeTeam;
    const gf = isHome ? m.homeScore : m.awayScore;
    const ga = isHome ? m.awayScore : m.homeScore;
    const res =
      m.winner === "DRAW"
        ? "D"
        : (m.winner === "HOME_TEAM") === isHome
          ? "W"
          : "L";
    return `${res} ${gf}-${ga} vs ${opp}`;
  };

  const recentFor = (team: string) =>
    all
      .filter((m) => m.homeTeam === team || m.awayTeam === team)
      .slice(-5)
      .map((m) => describe(team, m));

  const headToHead = all
    .filter(
      (m) =>
        (m.homeTeam === match.homeTeam && m.awayTeam === match.awayTeam) ||
        (m.homeTeam === match.awayTeam && m.awayTeam === match.homeTeam)
    )
    .slice(-5)
    .map((m) => `${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}`);

  return {
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    stage: match.stage,
    group: match.group,
    utcDate: match.utcDate,
    homeRecent: recentFor(match.homeTeam),
    awayRecent: recentFor(match.awayTeam),
    headToHead,
  };
}

function buildPrompt(ctx: PreMatchContext): string {
  const fmt = (arr: string[]) => (arr.length ? arr.join("; ") : "暂无数据");
  return `你是一名足球赛事分析师。请基于以下赛前数据，预测本场比赛结果。

比赛：${ctx.homeTeam}（主）vs ${ctx.awayTeam}（客）
阶段：${ctx.stage}${ctx.group ? `（${ctx.group}）` : ""}
开赛时间(UTC)：${ctx.utcDate}

${ctx.homeTeam} 近期：${fmt(ctx.homeRecent)}
${ctx.awayTeam} 近期：${fmt(ctx.awayRecent)}
历史交锋：${fmt(ctx.headToHead)}

要求：
1. 给出主胜/平局/客胜三者概率（小数，三者之和必须等于 1）。
2. 给出一个最可能的比分。
3. 用中文写一段简洁解读（不超过 120 字），说明判断依据。
4. 严格只输出 JSON，不要任何额外文字，格式如下：
{"prob_home": 0.45, "prob_draw": 0.28, "prob_away": 0.27, "predicted_score": "2-1", "analysis": "……"}`;
}

function winnerFromProbs(home: number, draw: number, away: number): Winner {
  const max = Math.max(home, draw, away);
  if (max === home) return "HOME_TEAM";
  if (max === away) return "AWAY_TEAM";
  return "DRAW";
}

/** 从可能含杂质的文本里抽出 JSON 对象 */
function extractJson(text: string): RawPrediction {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error(`模型未返回有效 JSON：${text.slice(0, 200)}`);
  }
  return JSON.parse(text.slice(start, end + 1)) as RawPrediction;
}

/** 调用大模型为单场比赛生成预测 */
export async function predictMatch(match: Match): Promise<Prediction> {
  const { model } = getLLMConfig();
  const client = getLLMClient();
  const ctx = buildContext(match);

  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "user", content: buildPrompt(ctx) }],
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content ?? "";
  const raw = extractJson(text);

  // 归一化概率，防止模型给的三者之和不为 1
  const sum = raw.prob_home + raw.prob_draw + raw.prob_away || 1;
  const probHome = raw.prob_home / sum;
  const probDraw = raw.prob_draw / sum;
  const probAway = raw.prob_away / sum;

  return {
    matchId: match.id,
    probHome,
    probDraw,
    probAway,
    predictedWinner: winnerFromProbs(probHome, probDraw, probAway),
    predictedScore: raw.predicted_score ?? null,
    analysis: raw.analysis ?? "",
    model,
    createdAt: new Date().toISOString(),
  };
}
