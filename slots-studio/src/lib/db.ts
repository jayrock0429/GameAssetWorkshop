/**
 * Slots Studio - 資料庫核心模組 (better-sqlite3)
 */
console.log('[DB] db.ts module loading...');
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(process.cwd(), 'slots_studio.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (db) return db;

    console.log('[DB] Connecting to:', DB_PATH);
    console.log('[DB] Current CWD:', process.cwd());
    
    try {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');

        initSchema(db);
        migrateSchema(db);
        console.log('[DB] Connection successful and schema initialized.');
        return db;
    } catch (err) {
        console.error('[DB] Connection ERROR:', err);
        throw err;
    }
}

function initSchema(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      theme TEXT NOT NULL,
      style_guide TEXT DEFAULT '',
      style_model TEXT DEFAULT 'casino_slots_style',
      style_analysis TEXT DEFAULT '',
      grid_cols INTEGER DEFAULT 5,
      grid_rows INTEGER DEFAULT 3,
      cover_image TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      element_type TEXT NOT NULL,
      symbol_type TEXT DEFAULT 'Custom',
      value_tier TEXT DEFAULT 'Medium',
      prompt TEXT DEFAULT '',
      image_path TEXT DEFAULT '',
      status TEXT DEFAULT 'pending',
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS magic_layers (
      id TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      layer_type TEXT NOT NULL,
      image_path TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reel_config (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      reel_index INTEGER NOT NULL,
      symbol_ids TEXT DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS paytable (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
      pays_1 REAL DEFAULT 0,
      pays_2 REAL DEFAULT 0,
      pays_3 REAL DEFAULT 1,
      pays_4 REAL DEFAULT 3,
      pays_5 REAL DEFAULT 5,
      UNIQUE(project_id, asset_id)
    );

    CREATE TABLE IF NOT EXISTS paylines (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      line_index INTEGER NOT NULL,
      pattern TEXT NOT NULL DEFAULT '[]',
      color TEXT DEFAULT '#ffffff',
      enabled INTEGER DEFAULT 1
    );
  `);
}

function migrateSchema(db: Database.Database) {
    // 為舊版 DB 補充新欄位（SQLite 不支援 IF NOT EXISTS on ALTER TABLE）
    try { db.exec(`ALTER TABLE projects ADD COLUMN style_analysis TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
    // v2: 組合式生成通道欄位
    try { db.exec(`ALTER TABLE assets ADD COLUMN base_prompt TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE assets ADD COLUMN vfx_prompt TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
    // v3: 佈局設定、Overlay、發佈功能
    try { db.exec(`ALTER TABLE projects ADD COLUMN layout_config TEXT DEFAULT '{}'`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE assets ADD COLUMN overlay_text TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE assets ADD COLUMN overlay_style TEXT DEFAULT '{}'`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE projects ADD COLUMN published INTEGER DEFAULT 0`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE projects ADD COLUMN publish_slug TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
    try { db.exec(`ALTER TABLE projects ADD COLUMN publish_at TEXT DEFAULT ''`); } catch { /* 欄位已存在 */ }
}

// ── Magic Layer 類型常數（避免各處字串字面量拼錯）────────────────────────────
export const LayerType = {
    NO_BG:     'no_bg',
    VFX:       'vfx',
    VFX_FRONT: 'vfx_front',
    VFX_BACK:  'vfx_back',
    GLOW:      'glow',
    SHADOW:    'shadow',
} as const;
export type LayerType = typeof LayerType[keyof typeof LayerType];

// ── DB 輔助：upsert magic_layer（先刪再插，確保冪等）────────────────────────
export function upsertMagicLayer(
    db: Database.Database,
    assetId: string,
    layerType: string,
    imagePath: string
): string {
    db.prepare('DELETE FROM magic_layers WHERE asset_id = ? AND layer_type = ?').run(assetId, layerType);
    const id = uuidv4();
    db.prepare('INSERT INTO magic_layers (id, asset_id, layer_type, image_path) VALUES (?, ?, ?, ?)').run(id, assetId, layerType, imagePath);
    return id;
}

// 類型定義
export interface Project {
    id: string;
    name: string;
    theme: string;
    style_guide: string;
    style_model: string;
    style_analysis: string;
    grid_cols: number;
    grid_rows: number;
    cover_image: string;
    layout_config: string;   // JSON string，佈局進階設定
    published: number;       // 0 | 1
    publish_slug: string;
    publish_at: string;
    created_at: string;
    updated_at: string;
}

export interface Asset {
    id: string;
    project_id: string;
    name: string;
    element_type: string;
    symbol_type: string;
    value_tier: string;
    prompt: string;          // legacy: 保留向下相容
    base_prompt: string;     // 主體/底座提示詞（組合式生成）
    vfx_prompt: string;      // 特效提示詞（組合式生成）
    image_path: string;
    status: string;
    sort_order: number;
    overlay_text: string;    // 疊加文字
    overlay_style: string;   // JSON string，文字樣式
    created_at: string;
    updated_at: string;
}

export interface PaytableEntry {
    id: string;
    project_id: string;
    asset_id: string;
    pays_1: number;
    pays_2: number;
    pays_3: number;
    pays_4: number;
    pays_5: number;
}

export interface Payline {
    id: string;
    project_id: string;
    line_index: number;
    pattern: string;   // JSON string of number[]
    color: string;
    enabled: number;   // 0 | 1
}

export interface MagicLayer {
    id: string;
    asset_id: string;
    layer_type: string;
    image_path: string;
    created_at: string;
}
