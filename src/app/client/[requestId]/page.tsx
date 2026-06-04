import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";

import { requirePortalRole } from "@/application/auth/portal-access";
import { getClientRequestDetail } from "@/application/client-intake/service";
import { ClientRequestOverview } from "@/ui/components/client-portal/client-request-overview";

export const dynamic = "force-dynamic";

type ClientRequestDetailPageProps = {
  params: Promise<{
    requestId: string;
  }>;
};

export default async function ClientRequestDetailPage({
  params,
}: ClientRequestDetailPageProps) {
  noStore();
  const { requestId } = await params;
  await requirePortalRole(["client", "employee"], `/client/${requestId}`);
  const detail = await getClientRequestDetail(requestId);

  if (!detail) {
    notFound();
  }

  return (
    <ClientRequestOverview
      request={detail.request}
      pipeline={detail.pipeline}
      proposalDraft={detail.proposalDraft}
      similarProducts={detail.similarProducts}
    />
  );
}
