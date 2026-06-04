import { PlacementSceneBounds } from "@/application/placement-scene/types";

function colorByToken(token: "accent" | "graphite" | "sand" | "sage" | "copper") {
  switch (token) {
    case "accent":
      return { fill: "#ef641d", stroke: "#bf4a14", safety: "rgba(239,100,29,0.14)" };
    case "graphite":
      return { fill: "#2b2826", stroke: "#181512", safety: "rgba(43,40,38,0.12)" };
    case "sand":
      return { fill: "#caa874", stroke: "#a3804d", safety: "rgba(202,168,116,0.16)" };
    case "sage":
      return { fill: "#8aab60", stroke: "#658241", safety: "rgba(138,171,96,0.16)" };
    default:
      return { fill: "#ae7658", stroke: "#88563b", safety: "rgba(174,118,88,0.16)" };
  }
}

export function buildSceneDiagramDataUri(
  bounds: PlacementSceneBounds,
  items: Array<{
    article: string;
    colorToken: "accent" | "graphite" | "sand" | "sage" | "copper";
    positionXM: number;
    positionYM: number;
    widthM: number;
    lengthM: number;
    safetyWidthM: number;
    safetyLengthM: number;
    rotationDeg: number;
  }>,
) {
  const scale = 40;
  const width = Math.max(bounds.widthM * scale, 420);
  const height = Math.max(bounds.lengthM * scale, 320);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" rx="28" fill="#f6f1ea"/>
      <defs>
        <pattern id="grid" width="${scale}" height="${scale}" patternUnits="userSpaceOnUse">
          <path d="M ${scale} 0 L 0 0 0 ${scale}" fill="none" stroke="rgba(20,18,16,0.08)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="url(#grid)"/>
      <rect x="3" y="3" width="${width - 6}" height="${height - 6}" rx="26" fill="none" stroke="rgba(20,18,16,0.18)" stroke-width="2"/>
      ${items
        .map((item) => {
          const swap = item.rotationDeg === 90 || item.rotationDeg === 270;
          const footprintWidth = (swap ? item.lengthM : item.widthM) * scale;
          const footprintHeight = (swap ? item.widthM : item.lengthM) * scale;
          const safetyWidth = (swap ? item.safetyLengthM : item.safetyWidthM) * scale;
          const safetyHeight = (swap ? item.safetyWidthM : item.safetyLengthM) * scale;
          const centerX = item.positionXM * scale;
          const centerY = item.positionYM * scale;
          const safetyLeft = centerX - safetyWidth / 2;
          const safetyTop = centerY - safetyHeight / 2;
          const footprintLeft = centerX - footprintWidth / 2;
          const footprintTop = centerY - footprintHeight / 2;
          const colors = colorByToken(item.colorToken);

          return `
            <rect x="${safetyLeft}" y="${safetyTop}" width="${safetyWidth}" height="${safetyHeight}" rx="16" fill="${colors.safety}" stroke="${colors.stroke}" stroke-dasharray="10 8" stroke-width="1.5"/>
            <rect x="${footprintLeft}" y="${footprintTop}" width="${footprintWidth}" height="${footprintHeight}" rx="14" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>
            <text x="${centerX}" y="${centerY + 4}" fill="#ffffff" font-family="Arial, sans-serif" font-size="14" font-weight="700" text-anchor="middle">${item.article}</text>
          `;
        })
        .join("")}
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
