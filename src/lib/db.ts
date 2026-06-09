import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import type { Match, Prediction } from "./types";

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

export function savePrediction(p: Prediction): void {
  getDb()
    .prepare(`
      INSERT INTO predictions
        (match_id, prob_home, prob_draw, prob_away, predicted_winner, predicted_score, analysis, model, created_at)
      VALUES
        (@matchId, @probHome, @probDraw, @probAway, @predictedWinner, @predictedScore, @analysis, @model, @createdAt)
      ON CONFLICT(match_id) DO NOTHING
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
