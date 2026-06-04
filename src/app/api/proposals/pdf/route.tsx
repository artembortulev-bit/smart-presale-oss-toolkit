import { renderToBuffer } from "@react-pdf/renderer";
import { NextRequest } from "next/server";

import { prepareProposalPdfDraft } from "@/application/proposals/prepare-proposal-pdf-assets";
import { ProposalPdfDocument } from "@/application/proposals/proposal-pdf-document";
import { proposalRepository } from "@/infrastructure/db/proposal-repository";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const proposalVersionId = searchParams.get("proposalVersionId");

  if (!proposalVersionId) {
    return new Response("proposalVersionId is required", { status: 400 });
  }

  const savedVersion = await proposalRepository.findVersion(proposalVersionId);

  if (!savedVersion) {
    return new Response("Proposal version not found", { status: 404 });
  }

  const pdfDraft = await prepareProposalPdfDraft(savedVersion.draft);
  const pdfBuffer = await renderToBuffer(<ProposalPdfDocument draft={pdfDraft} />);

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="smart-presale-proposal.pdf"',
      "X-Smart-Presale-Proposal-Version-Id": savedVersion.proposalVersionId,
    },
  });
}
