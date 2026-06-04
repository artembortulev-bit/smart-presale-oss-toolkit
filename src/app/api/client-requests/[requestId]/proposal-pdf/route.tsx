import { renderToBuffer } from "@react-pdf/renderer";

import {
  getCurrentInternalUser,
  getPortalRole,
} from "@/application/auth/portal-access";
import { getClientRequestDetail } from "@/application/client-intake/service";
import { prepareProposalPdfDraft } from "@/application/proposals/prepare-proposal-pdf-assets";
import { ProposalPdfDocument } from "@/application/proposals/proposal-pdf-document";
import { proposalRepository } from "@/infrastructure/db/proposal-repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    requestId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const role = await getPortalRole();

  if (role === "guest") {
    return new Response("Forbidden", { status: 403 });
  }

  const { requestId } = await context.params;
  const detail = await getClientRequestDetail(requestId);

  if (!detail) {
    return new Response("Not found", { status: 404 });
  }

  const internalUser = role === "employee" ? await getCurrentInternalUser() : null;
  const savedProposal = await proposalRepository.saveDraftVersion({
    draft: detail.proposalDraft,
    clientRequestId: detail.request.id,
    createdByUserId: internalUser?.id,
    source: "client-request-pdf-route",
  });
  const pdfDraft = await prepareProposalPdfDraft(detail.proposalDraft);
  const pdfBuffer = await renderToBuffer(<ProposalPdfDocument draft={pdfDraft} />);
  await proposalRepository.markVersionPdfExported(
    savedProposal.proposalVersionId,
    internalUser?.id,
  );

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${detail.request.reference}.pdf"`,
      "X-Smart-Presale-Proposal-Version-Id": savedProposal.proposalVersionId,
    },
  });
}
