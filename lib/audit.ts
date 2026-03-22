/**
 * Audit trail helper — logs CRUD operations on business entities.
 * Call after each successful API mutation (create/update/delete).
 */

import { logAudit } from '@/lib/db';
import { NextRequest } from 'next/server';

function extractIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export function auditCreate(
  request: NextRequest,
  entityType: string,
  entityId: string,
  payload: Record<string, unknown>,
): void {
  logAudit({
    action: 'create',
    entityType,
    entityId,
    changesJson: JSON.stringify(payload),
    ip: extractIp(request),
  });
}

export function auditUpdate(
  request: NextRequest,
  entityType: string,
  entityId: string,
  changes: Record<string, unknown>,
): void {
  logAudit({
    action: 'update',
    entityType,
    entityId,
    changesJson: JSON.stringify(changes),
    ip: extractIp(request),
  });
}

export function auditDelete(
  request: NextRequest,
  entityType: string,
  entityId: string,
): void {
  logAudit({
    action: 'delete',
    entityType,
    entityId,
    ip: extractIp(request),
  });
}
