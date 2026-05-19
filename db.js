const path = require('path');
const { app } = require('electron');
const Database = require('better-sqlite3');

let db = null;

function initDB() {
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'yeyosistema.db');

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS counters (
      name TEXT PRIMARY KEY,
      value INTEGER DEFAULT 0
    );

    INSERT OR IGNORE INTO counters (name, value) VALUES ('cliente', 0);
    INSERT OR IGNORE INTO counters (name, value) VALUES ('cotizacion', 0);

    CREATE TABLE IF NOT EXISTS clientes (
      id          TEXT PRIMARY KEY,
      nombre      TEXT NOT NULL,
      telefono    TEXT NOT NULL,
      moto        TEXT NOT NULL,
      modelo      TEXT NOT NULL,
      color       TEXT NOT NULL,
      placas      TEXT NOT NULL,
      ingreso     TEXT NOT NULL,
      detalles    TEXT,
      status      TEXT DEFAULT 'ingresado',
      servicios   TEXT DEFAULT '[]',
      created_at  TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS fotos (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id  TEXT NOT NULL REFERENCES clientes(id),
      data        TEXT NOT NULL,
      orden       INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cotizaciones (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo           TEXT NOT NULL UNIQUE,
      cliente_id       TEXT,
      cliente_nombre   TEXT DEFAULT 'Sin cliente',
      cliente_telefono TEXT DEFAULT '',
      fecha            TEXT,
      total            REAL DEFAULT 0,
      created_at       TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS cotizacion_rows (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacion_id   INTEGER NOT NULL REFERENCES cotizaciones(id),
      servicio        TEXT,
      mano_obra       REAL DEFAULT 0,
      orden           INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS cotizacion_piezas (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      row_id  INTEGER NOT NULL REFERENCES cotizacion_rows(id),
      nombre  TEXT,
      cant    REAL DEFAULT 1,
      precio  REAL DEFAULT 0,
      orden   INTEGER DEFAULT 0
    );
  `);

  console.log('DB initialized at:', dbPath);
  return db;
}

function getDB() {
  if (!db) throw new Error('DB not initialized');
  return db;
}

module.exports = { initDB, getDB };
