'use strict';

/**
 * Simple JSON-file database for Scribbit.
 * Uses Node's built-in `fs` module — no external dependencies, no ESM issues.
 *
 * Data is stored at: <userData>/scribbit-db.json
 * Schema:
 * {
 *   settings: { theme: 'light' | 'dark', ... },
 *   documents: [ { id, title, content, createdAt, updatedAt }, ... ]
 * }
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DB_FILE = path.join(app.getPath('userData'), 'scribbit-db.json');
const OLD_DB_FILE = path.join(app.getPath('userData'), 'inkwell-db.json');
const LEGACY_APP_DB = path.join(path.dirname(app.getPath('userData')), 'Inkwell', 'inkwell-db.json');

// File migration: if old db exists but new one doesn't, rename it
try {
    if (!fs.existsSync(DB_FILE)) {
        if (fs.existsSync(OLD_DB_FILE)) {
            console.log('[DB] Migrating from same-dir old profile');
            fs.renameSync(OLD_DB_FILE, DB_FILE);
        } else if (fs.existsSync(LEGACY_APP_DB)) {
            console.log('[DB] Migrating from legacy Inkwell profile');
            fs.copyFileSync(LEGACY_APP_DB, DB_FILE);
        }
    }
} catch (err) {
    console.error('Database file migration error:', err);
}

const DEFAULT_DATA = {
    settings: {
        theme: 'light',
        font: 'Inter',
        fontSize: 18,
    },
    documents: [],
};

// ── Internal helpers ─────────────────────────────────────────────────────────

function read() {
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch {
        return structuredClone(DEFAULT_DATA);
    }
}

function write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Get a top-level key from the database (e.g. 'settings', 'documents').
 */
function get(key) {
    const data = read();
    return key ? data[key] : data;
}

/**
 * Set a top-level key in the database.
 */
function set(key, value) {
    const data = read();
    data[key] = value;
    write(data);
    return value;
}

/**
 * Delete a top-level key from the database.
 */
function del(key) {
    const data = read();
    delete data[key];
    write(data);
}

/**
 * Return the entire database object.
 */
function getAll() {
    return read();
}

module.exports = { get, set, delete: del, getAll };
