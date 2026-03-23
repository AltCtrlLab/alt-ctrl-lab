import { headers } from 'next/headers';
import { getProjectByPortalToken, getProjectById, getInvoicesByProjectId, getDeliverablesForProject, getClientReportsForProject } from '@/lib/db';
import { checkRateLimit } from '@/lib/rate-limiter';
import { PortalExpired } from '@/components/portal/PortalExpired';
import { PortalClient } from '@/components/portal/PortalClient';

interface Props {
  params: { token: string };
}

export default async function ClientPortalPage({ params }: Props) {
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  const rl = checkRateLimit(`portal:${ip}`, 'portal');
  if (!rl.allowed) return <PortalExpired reason="not_found" />;

  const tokenData = getProjectByPortalToken(params.token);

  if (!tokenData) {
    return <PortalExpired reason="not_found" />;
  }

  if (tokenData.expired) {
    return <PortalExpired reason="expired" />;
  }

  const project = await getProjectById(tokenData.projectId);
  if (!project) {
    return <PortalExpired reason="not_found" />;
  }

  const invoices = getInvoicesByProjectId(tokenData.projectId);
  const deliverables = getDeliverablesForProject(tokenData.projectId);
  const reports = getClientReportsForProject(tokenData.projectId);

  return (
    <PortalClient
      project={project}
      invoices={invoices}
      deliverables={deliverables}
      reports={reports}
      token={params.token}
    />
  );
}
