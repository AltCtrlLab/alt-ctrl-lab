'use client';
import { PortalHeader } from './PortalHeader';
import { PortalProjectStatus } from './PortalProjectStatus';
import { PortalInvoices } from './PortalInvoices';
import { PortalDeliverables } from './PortalDeliverables';
import { PortalReports } from './PortalReports';
import type { Invoice } from '@/lib/db/schema_finances';
import type { Deliverable, ClientReport } from '@/lib/db/schema_portal';

interface Project {
  id: string;
  clientName: string;
  projectType: string;
  phase: string;
  status: string;
  budget: number | null;
  deadline: number | null;
  hoursEstimated: number | null;
  hoursActual: number | null;
}

interface Props {
  project: Project;
  invoices: Invoice[];
  deliverables: Deliverable[];
  reports: ClientReport[];
  token: string;
}

export function PortalClient({ project, invoices, deliverables, reports, token }: Props) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <PortalHeader clientName={project.clientName} projectType={project.projectType} />

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        <PortalProjectStatus
          phase={project.phase}
          status={project.status}
          deadline={project.deadline}
          hoursEstimated={project.hoursEstimated ?? 0}
          hoursActual={project.hoursActual ?? 0}
          budget={project.budget}
        />

        {invoices.length > 0 && (
          <PortalInvoices invoices={invoices} />
        )}

        {deliverables.length > 0 && (
          <PortalDeliverables deliverables={deliverables} token={token} />
        )}

        {reports.length > 0 && (
          <PortalReports reports={reports} token={token} />
        )}
      </main>

      <footer className="text-center py-8 text-zinc-400 text-xs">
        AltCtrl.Lab — Agence digitale premium
      </footer>
    </div>
  );
}
