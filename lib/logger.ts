/**
 * Logger structuré — fichiers JSON rotatifs quotidiens
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');

function ensureLogDir() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch { /* permission issue */ }
}

function getLogFile(): string {
  const date = new Date().toISOString().split('T')[0];
  return path.join(LOG_DIR, `errors_${date}.log`);
}

interface LogEntry {
  timestamp: string;
  level: 'error' | 'warn' | 'info';
  source: string;
  message: string;
  data?: unknown;
}

function writeLog(entry: LogEntry) {
  ensureLogDir();
  try {
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(getLogFile(), line, 'utf8');
  } catch {
    // Fallback console si écriture échoue
    console.error('[Logger fallback]', entry);
  }
}

export function logError(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'error', source, message, data });
}

export function logWarn(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'warn', source, message, data });
}

export function logInfo(source: string, message: string, data?: unknown) {
  writeLog({ timestamp: new Date().toISOString(), level: 'info', source, message, data });
}
