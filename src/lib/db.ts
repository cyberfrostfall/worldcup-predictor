import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Match, Prediction, LogEntry, StandingRow } from "./types";

const DB_DIR = path.join(process.cwd(), "src", "data");
const DB_PATH = path.join(DB_DIR, "worldcup.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (_db) return _db;
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id          INTEGER PRIMARY KEY,
      competition TEXT NOT NULL,
      stage       TEXT NOT NULL,
      "group"     TEXT,
      home_team   TEXT NOT NULL,
      away_team   TEXT NOT NULL,
      home_crest  TEXT,
      away_crest  TEXT,
      utc_date    TEXT NOT NULL,
      status      TEXT NOT NULL,
      home_score  INTEGER,
      away_score  INTEGER,
      winner      TEXT
    );

    CREATE TABLE IF NOT EXISTS predictions (
      match_id         INTEGER PRIMARY KEY REFERENCES matches(id),
      prob_home        REAL NOT NULL,
      prob_draw        REAL NOT NULL,
      prob_away        REAL NOT NULL,
      predicted_winner TEXT,
      predicted_score  TEXT,
      analysis         TEXT NOT NULL,
      model            TEXT NOT NULL,
      created_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      ts      TEXT NOT NULL,
      level   TEXT NOT NULL,
      source  TEXT NOT NULL,
      message TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_logs_id ON logs(id DESC);

    CREATE TABLE IF NOT EXISTS standings (
      competition     TEXT NOT NULL,
      "group"         TEXT NOT NULL,
      position        INTEGER NOT NULL,
      team_name       TEXT NOT NULL,
      played_games    INTEGER,
      won             INTEGER,
      draw            INTEGER,
      lost            INTEGER,
      goals_for       INTEGER,
      goals_against   INTEGER,
      goal_difference INTEGER,
      points          INTEGER,
      form            TEXT,
      PRIMARY KEY (competition, "group", team_name)
    );
  `);

  _db = db;
  return db;
}

// ── matches ──────────────────────────────────────────

const upsertMatchStmt = () =>
  getDb().prepare(`
    INSERT INTO matches
      (id, competition, stage, "group", home_team, away_team, home_crest, away_crest, utc_date, status, home_score, away_score, winner)
    VALUES
      (@id, @competition, @stage, @group, @homeTeam, @awayTeam, @homeCrest, @awayCrest, @utcDate, @status, @homeScore, @awayScore, @winner)
    ON CONFLICT(id) DO UPDATE SET
      stage      = excluded.stage,
      "group"    = excluded."group",
      utc_date   = excluded.utc_date,
      status     = excluded.status,
      home_score = excluded.home_score,
      away_score = excluded.away_score,
      winner     = excluded.winner
  `);

export function upsertMatches(matches: Match[]): number {
  const stmt = upsertMatchStmt();
  const tx = getDb().transaction((rows: Match[]) => {
    for (const m of rows) stmt.run(m);
  });
  tx(matches);
  return matches.length;
}

interface MatchRow {
  id: number;
  competition: string;
  stage: string;
  group: string | null;
  home_team: string;
  away_team: string;
  home_crest: string | null;
  away_crest: string | null;
  utc_date: string;
  status: Match["status"];
  home_score: number | null;
  away_score: number | null;
  winner: Match["winner"];
}

function rowToMatch(r: MatchRow): Match {
  return {
    id: r.id,
    competition: r.competition,
    stage: r.stage,
    group: r.group,
    homeTeam: r.home_team,
    awayTeam: r.away_team,
    homeCrest: r.home_crest,
    awayCrest: r.away_crest,
    utcDate: r.utc_date,
    status: r.status,
    homeScore: r.home_score,
    awayScore: r.away_score,
    winner: r.winner,
  };
}

export function getMatches(): Match[] {
  const rows = getDb()
    .prepare(`SELECT * FROM matches ORDER BY utc_date ASC`)
    .all() as MatchRow[];
  return rows.map(rowToMatch);
}

export function getMatch(id: number): Match | null {
  const row = getDb()
    .prepare(`SELECT * FROM matches WHERE id = ?`)
    .get(id) as MatchRow | undefined;
  return row ? rowToMatch(row) : null;
}

// ── predictions ──────────────────────────────────────

/**
 * 落库预测。
 *   默认（overwrite=false）：已存在则不覆盖，保证「每场只赛前预测一次」。
 *   overwrite=true：用于改了评判规则后的强制重算，覆盖旧预测。
 */
export function savePrediction(p: Prediction, overwrite = false): void {
  const conflict = overwrite
    ? `ON CONFLICT(match_id) DO UPDATE SET
         prob_home        = excluded.prob_home,
         prob_draw        = excluded.prob_draw,
         prob_away        = excluded.prob_away,
         predicted_winner = excluded.predicted_winner,
         predicted_score  = excluded.predicted_score,
         analysis         = excluded.analysis,
         model            = excluded.model,
         created_at       = excluded.created_at`
    : `ON CONFLICT(match_id) DO NOTHING`;

  getDb()
    .prepare(`
      INSERT INTO predictions
        (match_id, prob_home, prob_draw, prob_away, predicted_winner, predicted_score, analysis, model, created_at)
      VALUES
        (@matchId, @probHome, @probDraw, @probAway, @predictedWinner, @predictedScore, @analysis, @model, @createdAt)
      ${conflict}
    `)
    .run(p);
}

interface PredictionRow {
  match_id: number;
  prob_home: number;
  prob_draw: number;
  prob_away: number;
  predicted_winner: Prediction["predictedWinner"];
  predicted_score: string | null;
  analysis: string;
  model: string;
  created_at: string;
}

function rowToPrediction(r: PredictionRow): Prediction {
  return {
    matchId: r.match_id,
    probHome: r.prob_home,
    probDraw: r.prob_draw,
    probAway: r.prob_away,
    predictedWinner: r.predicted_winner,
    predictedScore: r.predicted_score,
    analysis: r.analysis,
    model: r.model,
    createdAt: r.created_at,
  };
}

export function getPrediction(matchId: number): Prediction | null {
  const row = getDb()
    .prepare(`SELECT * FROM predictions WHERE match_id = ?`)
    .get(matchId) as PredictionRow | undefined;
  return row ? rowToPrediction(row) : null;
}

export function getAllPredictions(): Prediction[] {
  const rows = getDb()
    .prepare(`SELECT * FROM predictions`)
    .all() as PredictionRow[];
  return rows.map(rowToPrediction);
}

// ── logs ─────────────────────────────────────────────

export function addLog(
  level: LogEntry["level"],
  source: string,
  message: string
): void {
  getDb()
    .prepare(
      `INSERT INTO logs (ts, level, source, message) VALUES (?, ?, ?, ?)`
    )
    .run(new Date().toISOString(), level, source, message);
}

export function getLogs(limit = 200): LogEntry[] {
  return getDb()
    .prepare(`SELECT * FROM logs ORDER BY id DESC LIMIT ?`)
    .all(limit) as LogEntry[];
}

// ── standings ────────────────────────────────────────

/** 全量替换某项赛事的积分榜（先删后插，避免残留旧行） */
export function replaceStandings(
  competition: string,
  rows: StandingRow[]
): number {
  const db = getDb();
  const insert = db.prepare(`
    INSERT INTO standings
      (competition, "group", position, team_name, played_games, won, draw, lost,
       goals_for, goals_against, goal_difference, points, form)
    VALUES
      (@competition, @group, @position, @teamName, @playedGames, @won, @draw, @lost,
       @goalsFor, @goalsAgainst, @goalDifference, @points, @form)
  `);
  const tx = db.transaction((list: StandingRow[]) => {
    db.prepare(`DELETE FROM standings WHERE competition = ?`).run(competition);
    for (const r of list) insert.run({ ...r, competition });
  });
  tx(rows);
  return rows.length;
}

interface StandingDbRow {
  competition: string;
  group: string;
  position: number;
  team_name: string;
  played_games: number;
  won: number;
  draw: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form: string | null;
}

function rowToStanding(r: StandingDbRow): StandingRow {
  return {
    group: r.group,
    position: r.position,
    teamName: r.team_name,
    playedGames: r.played_games,
    won: r.won,
    draw: r.draw,
    lost: r.lost,
    goalsFor: r.goals_for,
    goalsAgainst: r.goals_against,
    goalDifference: r.goal_difference,
    points: r.points,
    form: r.form,
  };
}

export function getStandingForTeam(
  teamName: string,
  competition = "WC"
): StandingRow | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM standings WHERE competition = ? AND team_name = ?`
    )
    .get(competition, teamName) as StandingDbRow | undefined;
  return row ? rowToStanding(row) : null;
}
