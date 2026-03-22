/**
 * Structured logger — daily JSON log files + console output.
 *
 * Choix architectural : logger fichier plutôt que Sentry.
 * Raison : volume faible (cockpit interne), zéro dépendance externe,
 * logs JSON parsables pour monitoring futur. Si le volume augmente → migrer.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_DIR = process.env.LOG_DIR || path.join(os.homedir(), '.openclaw/logs');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — rotate

let dirReady = false;

function ensureLogDir() {
  if (dirReady) return;
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    dirReady = true;
  } catch { /* permission issue — console fallback */ }
}

function getLogFile(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `cockpit_${date}.jsonl`);
}

function rotateIfNeeded(file: string) {
  try {
    const stats = fs.statSync(file);
    if (stats.size > MAX_FILE_SIZE) {
      fs.renameSync(file, `${file}.${Date.now()}.bak`);
    }
  } catch { /* file doesn't exist yet */ }
}

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info' | 'debug';
  module: string;
  message: string;
  data?: Record<string, unknown>;
  error?: { message: string; stack?: string };
}

function writeLog(entry: LogEntry) {
  ensureLogDir();
  const file = getLogFile();
  rotateIfNeeded(file);

  // Console output
  const prefix = `[${entry.level.toUpperCase()}][${entry.module}]`;
  if (entry.level === 'error') {
    console.error(prefix, entry.message, entry.data ?? '', entry.error?.message ?? '');
  } else if (entry.level === 'warn') {
    console.warn(prefix, entry.message, entry.data ?? '');
  } else if (entry.level === 'debug') {
    if (process.env.NODE_ENV === 'development') {
      console.log(prefix, entry.message, entry.data ?? '');
    }
    return; // Don't write debug to file
  } else {
    console.log(prefix, entry.message, entry.data ?? '');
  }

  // File output
  try {
    fs.appendFileSync(file, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Swallow — don't crash the app over logging
  }
}

// ── Legacy exports (backwards compatible) ────────────────────────────────────

export function logError(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'error', module: source, message, data: data as Record<string, unknown> });
}

export function logWarn(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'warn', module: source, message, data: data as Record<string, unknown> });
}

export function logInfo(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'info', module: source, message, data: data as Record<string, unknown> });
}

// ── Structured logger object (Sprint 3) ──────────────────────────────────────

export const logger = {
  info: (module: string, message: string, data?: Record<string, unknown>) =>
    writeLog({ timestamp: new Date().toISOString(), level: 'info', module, message, data }),
  warn: (module: string, message: string, data?: Record<string, unknown>) =>
    writeLog({ timestamp: new Date().toISOString(), level: 'warn', module, message, data }),
  error: (module: string, message: string, data?: Record<string, unknown>, err?: Error) =>
    writeLog({
      timestamp: new Date().toISOString(), level: 'error', module, message, data,
      error: err ? { message: err.message, stack: err.stack } : undefined,
    }),
  debug: (module: string, message: string, data?: Record<string, unknown>) =>
    writeLog({ timestamp: new Date().toISOString(), level: 'debug', module, message, data }),
};
