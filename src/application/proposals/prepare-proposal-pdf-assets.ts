import { readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { ProposalDraft } from "@/application/proposals/build-proposal";

type ProposalPdfDraft = ProposalDraft & {
  headerBannerSrc: string;
  qrTileSrc: string;
  fixedCollageSrc?: string;
};

function decodeDataUri(dataUri: string) {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  const encodedPayload = match?.[2];

  if (!encodedPayload) {
    return undefined;
  }

  return Buffer.from(encodedPayload, "base64");
}

async function toPdfImageSrc(urlOrPath?: string) {
  if (!urlOrPath) {
    return undefined;
  }

  try {
    const sourceBuffer = urlOrPath.startsWith("data:image/")
      ? decodeDataUri(urlOrPath)
      : urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")
        ? Buffer.from(await (await fetch(urlOrPath)).arrayBuffer())
        : await readFile(
            urlOrPath.startsWith("/")
              ? path.join(process.cwd(), "public", urlOrPath.replace(/^\//, ""))
              : urlOrPath,
          );

    if (!sourceBuffer) {
      return undefined;
    }

    const pngBuffer = await sharp(Buffer.from(sourceBuffer)).png().toBuffer();
    return `data:image/png;base64,${pngBuffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function prepareProposalPdfDraft(
  draft: ProposalDraft,
): Promise<ProposalPdfDraft> {
  const [
    headerBannerSrc,
    qrTileSrc,
    fixedCollageSrc,
    sceneLayoutDiagramSrc,
    lines,
    showcaseImages,
  ] = await Promise.all([
    toPdfImageSrc(draft.headerBannerUrl),
    toPdfImageSrc(draft.qrTileUrl),
    toPdfImageSrc(draft.fixedCollageUrl),
    toPdfImageSrc(draft.sceneLayout?.diagramUrl),
    Promise.all(
      draft.lines.map(async (line) => ({
        ...line,
        imageUrl: await toPdfImageSrc(line.imageUrl),
      })),
    ),
    Promise.all(draft.showcaseImages.map((imageUrl) => toPdfImageSrc(imageUrl))).then(
      (items) => items.filter((item): item is string => Boolean(item)),
    ),
  ]);

  return {
    ...draft,
    sceneLayout: draft.sceneLayout
      ? {
          ...draft.sceneLayout,
          diagramUrl: sceneLayoutDiagramSrc ?? draft.sceneLayout.diagramUrl,
        }
      : undefined,
    lines,
    showcaseImages,
    fixedCollageSrc,
    headerBannerSrc: headerBannerSrc ?? draft.headerBannerUrl,
    qrTileSrc: qrTileSrc ?? draft.qrTileUrl,
  };
}
