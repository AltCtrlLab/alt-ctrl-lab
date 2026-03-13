'use client';
import { INVOICE_STATUS_META, type InvoiceStatus } from '@/lib/db/schema_finances';

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const meta = INVOICE_STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color} ${meta.bg}`}>
      {status}
    </span>
  );
}
