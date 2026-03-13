'use client';
import { CONTENT_STATUS_META, type ContentStatus } from '@/lib/db/schema_content';

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const meta = CONTENT_STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {status}
    </span>
  );
}
