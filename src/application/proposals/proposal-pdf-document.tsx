/* eslint-disable jsx-a11y/alt-text */

import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { ProposalDraft } from "@/application/proposals/build-proposal";
import {
  formatProposalAmount,
  formatProposalAmountWithSuffix,
} from "@/application/proposals/proposal-template";

Font.register({
  family: "Noto Sans",
  fonts: [
    {
      src: `${process.cwd()}/public/fonts/NotoSans-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${process.cwd()}/public/fonts/NotoSans-Bold.ttf`,
      fontWeight: 700,
    },
  ],
});

const modernStyles = StyleSheet.create({
  page: {
    padding: 18,
    fontSize: 10,
    color: "#1f1f1f",
    backgroundColor: "#ffffff",
    fontFamily: "Noto Sans",
  },
  headerBanner: {
    width: "100%",
    height: 116,
  },
  infoRow: {
    marginTop: 8,
    gap: 2,
    alignItems: "flex-end",
  },
  infoLine: {
    flexDirection: "row",
    gap: 4,
    fontSize: 10,
  },
  titleBand: {
    marginTop: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#7f7f7f",
    paddingVertical: 5,
    alignItems: "center",
  },
  sceneBlock: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d3d0cb",
    backgroundColor: "#f6f1ea",
    padding: 10,
    gap: 10,
  },
  sceneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  sceneTitleWrap: {
    flexGrow: 1,
    gap: 3,
  },
  sceneKpis: {
    flexDirection: "row",
    gap: 6,
  },
  sceneKpi: {
    width: 74,
    borderWidth: 1,
    borderColor: "#d4d0ca",
    backgroundColor: "#ffffff",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  sceneDiagramWrap: {
    borderWidth: 1,
    borderColor: "#d4d0ca",
    backgroundColor: "#ffffff",
    padding: 6,
  },
  sceneDiagram: {
    width: "100%",
    height: 180,
    objectFit: "contain",
  },
  sceneNote: {
    borderWidth: 1,
    borderColor: "#d4d0ca",
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 8.5,
    lineHeight: 1.4,
  },
  table: {
    width: "100%",
    marginTop: 12,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#8c8c8c",
  },
  row: {
    flexDirection: "row",
  },
  headCell: {
    backgroundColor: "#efefef",
    fontWeight: 700,
    textAlign: "center",
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#8c8c8c",
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 8.2,
  },
  colIndex: { width: "5%" },
  colArticle: { width: "9%" },
  colName: { width: "18%" },
  colImage: { width: "13%" },
  colSize: { width: "10%" },
  colMaterial: { width: "14%" },
  colAge: { width: "10%" },
  colQty: { width: "6%" },
  colUnit: { width: "8%" },
  colTotal: { width: "7%" },
  bodyCenter: {
    textAlign: "center",
  },
  bodyRight: {
    textAlign: "right",
  },
  bodyName: {
    fontWeight: 700,
  },
  imageWrap: {
    width: "100%",
    height: 54,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  lineImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  noImage: {
    fontSize: 7,
    color: "#666666",
    textAlign: "center",
  },
  equipmentTotalRow: {
    flexDirection: "row",
    backgroundColor: "#b6b6b6",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#7f7f7f",
  },
  equipmentTotalLabel: {
    width: "93%",
    textAlign: "right",
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontWeight: 700,
  },
  equipmentTotalValue: {
    width: "7%",
    textAlign: "right",
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontWeight: 700,
  },
  totalsCard: {
    marginLeft: "auto",
    width: 240,
    borderWidth: 1,
    borderColor: "#7f7f7f",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#b6b6b6",
    borderBottomWidth: 1,
    borderColor: "#7f7f7f",
    fontSize: 10,
  },
  totalLineStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#9c9c9c",
    fontSize: 11,
    fontWeight: 700,
  },
  leadTime: {
    borderBottomWidth: 1,
    borderColor: "#7f7f7f",
    paddingVertical: 10,
    textAlign: "center",
    fontSize: 10,
    fontWeight: 700,
  },
  collage: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#9b9b9b",
    padding: 6,
    gap: 6,
  },
  collageRow: {
    flexDirection: "row",
    gap: 6,
  },
  collageTile: {
    position: "relative",
    borderWidth: 1,
    borderColor: "#a8a8a8",
    backgroundColor: "#d9d9d9",
    overflow: "hidden",
  },
  collageTopTile: {
    width: "33.333%",
    height: 102,
  },
  collageBottomWide: {
    width: "66.666%",
    height: 116,
  },
  collageBottomNarrow: {
    width: "33.333%",
    height: 116,
  },
  collageImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  contactBlock: {
    marginTop: 12,
    gap: 3,
    fontSize: 10,
  },
});

const classicStyles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 22,
    fontSize: 10,
    color: "#1f1f1f",
    backgroundColor: "#ffffff",
    fontFamily: "Noto Sans",
  },
  headerBanner: {
    width: "100%",
    height: 130,
    objectFit: "contain",
  },
  introBand: {
    marginTop: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#6f6f6f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textAlign: "center",
    fontSize: 9,
  },
  title: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 16,
    fontWeight: 700,
  },
  customerRow: {
    marginTop: 4,
    marginLeft: "auto",
    width: 255,
    gap: 2,
    fontSize: 9.5,
  },
  customerLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  customerLabel: {
    width: 70,
    textAlign: "right",
  },
  customerValue: {
    width: 175,
  },
  sceneBlock: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#8c8c8c",
    padding: 6,
    gap: 8,
  },
  sceneMeta: {
    flexDirection: "row",
    gap: 6,
  },
  sceneMetaCell: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#d0d0d0",
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  sceneDiagramWrap: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    padding: 4,
  },
  sceneDiagram: {
    width: "100%",
    height: 150,
    objectFit: "contain",
  },
  sceneNote: {
    borderWidth: 1,
    borderColor: "#d0d0d0",
    paddingHorizontal: 6,
    paddingVertical: 5,
    fontSize: 8.2,
    lineHeight: 1.4,
  },
  table: {
    marginTop: 10,
    width: "100%",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#8c8c8c",
  },
  row: {
    flexDirection: "row",
  },
  headCell: {
    fontWeight: 700,
    textAlign: "center",
  },
  cell: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#5f5f5f",
    paddingHorizontal: 3,
    paddingVertical: 4,
    fontSize: 7.8,
  },
  index: { width: "5%" },
  article: { width: "11%" },
  name: { width: "19%" },
  materials: { width: "17%" },
  image: { width: "11%" },
  size: { width: "8%" },
  quantity: { width: "6%" },
  unitPrice: { width: "11%" },
  totalPrice: { width: "12%" },
  center: {
    textAlign: "center",
  },
  right: {
    textAlign: "right",
  },
  nameText: {
    fontWeight: 700,
  },
  imageWrap: {
    width: "100%",
    height: 52,
    backgroundColor: "#efefef",
    alignItems: "center",
    justifyContent: "center",
  },
  imageInner: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  noImage: {
    fontSize: 7,
    color: "#666666",
    textAlign: "center",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#d9d9d9",
  },
  totalRowMuted: {
    flexDirection: "row",
    backgroundColor: "#efefef",
  },
  totalRowStrong: {
    flexDirection: "row",
    backgroundColor: "#d9d9d9",
  },
  totalLabel: {
    width: "78%",
    textAlign: "right",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#5f5f5f",
    fontWeight: 700,
  },
  totalValue: {
    width: "22%",
    textAlign: "right",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#5f5f5f",
    fontWeight: 700,
  },
  totalLabelStrong: {
    width: "78%",
    textAlign: "right",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#5f5f5f",
    fontWeight: 700,
    fontSize: 10.5,
  },
  totalValueStrong: {
    width: "22%",
    textAlign: "right",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#5f5f5f",
    fontWeight: 700,
    fontSize: 10.5,
  },
  footer: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
    fontSize: 9.5,
  },
  footerCol: {
    width: "48%",
    gap: 4,
  },
  footerTitle: {
    fontWeight: 700,
  },
  footerRight: {
    alignItems: "flex-end",
    textAlign: "right",
  },
  collageWrap: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#8c8c8c",
    padding: 6,
  },
  collageImage: {
    width: "100%",
    height: 180,
    objectFit: "contain",
  },
});

type ProposalPdfDocumentProps = {
  draft: ProposalDraft & {
    headerBannerSrc: string;
    qrTileSrc: string;
    fixedCollageSrc?: string;
  };
};

function chunkLines<T>(lines: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < lines.length; index += size) {
    chunks.push(lines.slice(index, index + size));
  }

  return chunks.length > 0 ? chunks : [[]];
}

function SceneLayoutPdfBlock({
  draft,
  mode,
}: ProposalPdfDocumentProps & { mode: "modern" | "classic" }) {
  if (!draft.sceneLayout) {
    return null;
  }

  if (mode === "classic") {
    return (
      <View style={classicStyles.sceneBlock}>
        <Text style={{ fontSize: 10, fontWeight: 700 }}>План размещения</Text>
        <Text style={{ fontSize: 8.8 }}>{draft.sceneLayout.sourceLabel}</Text>
        <View style={classicStyles.sceneMeta}>
          <View style={classicStyles.sceneMetaCell}>
            <Text style={{ fontSize: 7 }}>Контур</Text>
            <Text style={{ fontSize: 8.6, fontWeight: 700 }}>{draft.sceneLayout.plotLabel}</Text>
          </View>
          <View style={classicStyles.sceneMetaCell}>
            <Text style={{ fontSize: 7 }}>Позиции</Text>
            <Text style={{ fontSize: 8.6, fontWeight: 700 }}>{draft.sceneLayout.itemsCount}</Text>
          </View>
          <View style={classicStyles.sceneMetaCell}>
            <Text style={{ fontSize: 7 }}>Коллизии</Text>
            <Text style={{ fontSize: 8.6, fontWeight: 700 }}>{draft.sceneLayout.collisionCount}</Text>
          </View>
        </View>
        {draft.sceneLayout.diagramUrl ? (
          <View style={classicStyles.sceneDiagramWrap}>
            <Image src={draft.sceneLayout.diagramUrl} style={classicStyles.sceneDiagram} />
          </View>
        ) : null}
        {draft.sceneLayout.notes.slice(0, 2).map((note) => (
          <View key={note} style={classicStyles.sceneNote}>
            <Text>{note}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={modernStyles.sceneBlock}>
      <View style={modernStyles.sceneHeader}>
        <View style={modernStyles.sceneTitleWrap}>
          <Text style={{ fontSize: 8.8, letterSpacing: 2, textTransform: "uppercase", color: "#6d655e" }}>
            План размещения
          </Text>
          <Text style={{ fontSize: 13, fontWeight: 700 }}>{draft.sceneLayout.title}</Text>
          <Text style={{ fontSize: 9.2, color: "#5d5650" }}>{draft.sceneLayout.sourceLabel}</Text>
        </View>
        <View style={modernStyles.sceneKpis}>
          <View style={modernStyles.sceneKpi}>
            <Text style={{ fontSize: 7, color: "#776e66" }}>Контур</Text>
            <Text style={{ marginTop: 4, fontSize: 8.8, fontWeight: 700 }}>{draft.sceneLayout.plotLabel}</Text>
          </View>
          <View style={modernStyles.sceneKpi}>
            <Text style={{ fontSize: 7, color: "#776e66" }}>Позиции</Text>
            <Text style={{ marginTop: 4, fontSize: 8.8, fontWeight: 700 }}>{draft.sceneLayout.itemsCount}</Text>
          </View>
          <View style={modernStyles.sceneKpi}>
            <Text style={{ fontSize: 7, color: "#776e66" }}>Коллизии</Text>
            <Text style={{ marginTop: 4, fontSize: 8.8, fontWeight: 700 }}>{draft.sceneLayout.collisionCount}</Text>
          </View>
        </View>
      </View>

      {draft.sceneLayout.diagramUrl ? (
        <View style={modernStyles.sceneDiagramWrap}>
          <Image src={draft.sceneLayout.diagramUrl} style={modernStyles.sceneDiagram} />
        </View>
      ) : null}

      {draft.sceneLayout.notes.slice(0, 2).map((note) => (
        <View key={note} style={modernStyles.sceneNote}>
          <Text>{note}</Text>
        </View>
      ))}
    </View>
  );
}

function ModernLineRows({
  lines,
  startIndex,
}: {
  lines: ProposalDraft["lines"];
  startIndex: number;
}) {
  return (
    <>
      {lines.map((line, index) => (
        <View key={`${line.article}-${index}`} style={modernStyles.row}>
          <Text style={[modernStyles.cell, modernStyles.colIndex, modernStyles.bodyCenter]}>
            {startIndex + index + 1}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colArticle, modernStyles.bodyCenter]}>
            {line.article}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colName, modernStyles.bodyName]}>
            {line.name}
          </Text>
          <View style={[modernStyles.cell, modernStyles.colImage]}>
            <View style={modernStyles.imageWrap}>
              {line.imageUrl ? (
                <Image src={line.imageUrl} style={modernStyles.lineImage} />
              ) : (
                <Text style={modernStyles.noImage}>Без фото</Text>
              )}
            </View>
          </View>
          <Text style={[modernStyles.cell, modernStyles.colSize, modernStyles.bodyCenter]}>
            {line.sizeLabel ?? "По запросу"}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colMaterial]}>
            {line.materialLabel ?? "Уточняется"}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colAge, modernStyles.bodyCenter]}>
            {line.ageLabel ?? "Без возрастных ограничений"}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colQty, modernStyles.bodyCenter]}>
            {line.quantity}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colUnit, modernStyles.bodyRight]}>
            {formatProposalAmount(line.unitPriceRub)}
          </Text>
          <Text style={[modernStyles.cell, modernStyles.colTotal, modernStyles.bodyRight]}>
            {formatProposalAmount(line.totalPriceRub)}
          </Text>
        </View>
      ))}
    </>
  );
}

function ModernTableHeader() {
  return (
    <View style={modernStyles.row}>
      <Text style={[modernStyles.cell, modernStyles.colIndex, modernStyles.headCell]}>№ п/п</Text>
      <Text style={[modernStyles.cell, modernStyles.colArticle, modernStyles.headCell]}>Артикул</Text>
      <Text style={[modernStyles.cell, modernStyles.colName, modernStyles.headCell]}>Наименование</Text>
      <Text style={[modernStyles.cell, modernStyles.colImage, modernStyles.headCell]}>Изображение</Text>
      <Text style={[modernStyles.cell, modernStyles.colSize, modernStyles.headCell]}>Размер</Text>
      <Text style={[modernStyles.cell, modernStyles.colMaterial, modernStyles.headCell]}>Материал</Text>
      <Text style={[modernStyles.cell, modernStyles.colAge, modernStyles.headCell]}>Возраст</Text>
      <Text style={[modernStyles.cell, modernStyles.colQty, modernStyles.headCell]}>Кол-во</Text>
      <Text style={[modernStyles.cell, modernStyles.colUnit, modernStyles.headCell]}>Цена</Text>
      <Text style={[modernStyles.cell, modernStyles.colTotal, modernStyles.headCell]}>Стоимость</Text>
    </View>
  );
}

function ModernProposalPdf({ draft }: ProposalPdfDocumentProps) {
  const firstPageLines = draft.lines.slice(0, 7);
  const overflowLines = draft.lines.slice(7);
  const collageImages = [...draft.showcaseImages.slice(0, 5), draft.qrTileSrc];

  return (
    <>
      <Page size="A4" style={modernStyles.page}>
        <Image src={draft.headerBannerSrc} style={modernStyles.headerBanner} />

        <View style={modernStyles.infoRow}>
          <View style={modernStyles.infoLine}>
            <Text style={{ fontWeight: 700 }}>Дата:</Text>
            <Text>{draft.issueDate}</Text>
          </View>
          <View style={modernStyles.infoLine}>
            <Text style={{ fontWeight: 700 }}>Заказчик:</Text>
            <Text>{draft.customerName}</Text>
          </View>
          {draft.customerAddress ? (
            <View style={modernStyles.infoLine}>
              <Text style={{ fontWeight: 700 }}>Адрес:</Text>
              <Text>{draft.customerAddress}</Text>
            </View>
          ) : null}
        </View>

        <View style={modernStyles.titleBand}>
          <Text>{draft.title}</Text>
        </View>

        <SceneLayoutPdfBlock draft={draft} mode="modern" />

        <View style={modernStyles.table}>
          <ModernTableHeader />
          <ModernLineRows lines={firstPageLines} startIndex={0} />
        </View>

        {overflowLines.length === 0 ? (
          <View style={modernStyles.equipmentTotalRow}>
            <Text style={modernStyles.equipmentTotalLabel}>
              Общая стоимость оборудования
            </Text>
            <Text style={modernStyles.equipmentTotalValue}>
              {formatProposalAmountWithSuffix(draft.subtotalRub)}
            </Text>
          </View>
        ) : null}
      </Page>

      <Page size="A4" style={modernStyles.page}>
        {overflowLines.length > 0 ? (
          <>
            <View style={modernStyles.table}>
              <ModernTableHeader />
              <ModernLineRows lines={overflowLines} startIndex={firstPageLines.length} />
            </View>
            <View style={modernStyles.equipmentTotalRow}>
              <Text style={modernStyles.equipmentTotalLabel}>
                Общая стоимость оборудования
              </Text>
              <Text style={modernStyles.equipmentTotalValue}>
                {formatProposalAmountWithSuffix(draft.subtotalRub)}
              </Text>
            </View>
          </>
        ) : null}

        <View style={{ marginTop: overflowLines.length > 0 ? 14 : 0 }}>
          <View style={modernStyles.totalsCard}>
            <View style={modernStyles.totalLine}>
              <Text>Доставка</Text>
              <Text>{formatProposalAmountWithSuffix(draft.deliveryRub)}</Text>
            </View>
            <View style={modernStyles.totalLine}>
              <Text>Монтаж</Text>
              <Text>{formatProposalAmountWithSuffix(draft.installationRub)}</Text>
            </View>
            <View style={modernStyles.totalLineStrong}>
              <Text>ИТОГО:</Text>
              <Text>{formatProposalAmountWithSuffix(draft.totalRub)}</Text>
            </View>
          </View>

          <Text style={modernStyles.leadTime}>
            Срок изготовления: {draft.leadTimeLabel}
          </Text>

          <View style={modernStyles.collage}>
            <View style={modernStyles.collageRow}>
              {collageImages.slice(0, 3).map((imageSrc, index) => (
                <View key={index} style={[modernStyles.collageTile, modernStyles.collageTopTile]}>
                  <Image src={imageSrc} style={modernStyles.collageImage} />
                </View>
              ))}
            </View>
            <View style={modernStyles.collageRow}>
              <View style={[modernStyles.collageTile, modernStyles.collageTopTile]}>
                <Image src={collageImages[3]} style={modernStyles.collageImage} />
              </View>
              <View style={[modernStyles.collageTile, modernStyles.collageBottomWide]}>
                <Image src={collageImages[4]} style={modernStyles.collageImage} />
              </View>
              <View style={[modernStyles.collageTile, modernStyles.collageBottomNarrow]}>
                <Image src={collageImages[5]} style={modernStyles.collageImage} />
              </View>
            </View>
          </View>

          <View style={modernStyles.contactBlock}>
            <Text>Исполнитель: {draft.managerName}</Text>
            <Text>{draft.managerPhone}</Text>
            <Text>{draft.officePhone}</Text>
            <Text>{draft.email}</Text>
            <Text>{draft.validityLabel}</Text>
          </View>
        </View>
      </Page>
    </>
  );
}

function ClassicLineRows({
  lines,
  startIndex,
}: {
  lines: ProposalDraft["lines"];
  startIndex: number;
}) {
  return (
    <>
      {lines.map((line, index) => (
        <View key={`${line.article}-${index}`} style={classicStyles.row}>
          <Text style={[classicStyles.cell, classicStyles.index, classicStyles.center]}>
            {startIndex + index + 1}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.article, classicStyles.center]}>
            {line.article}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.name, classicStyles.nameText]}>
            {line.name}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.materials]}>
            {line.materialLabel ?? "Уточняется"}
          </Text>
          <View style={[classicStyles.cell, classicStyles.image]}>
            <View style={classicStyles.imageWrap}>
              {line.imageUrl ? (
                <Image src={line.imageUrl} style={classicStyles.imageInner} />
              ) : (
                <Text style={classicStyles.noImage}>Без фото</Text>
              )}
            </View>
          </View>
          <Text style={[classicStyles.cell, classicStyles.size, classicStyles.center]}>
            {line.sizeLabel ?? "По запросу"}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.quantity, classicStyles.center]}>
            {line.quantity}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.unitPrice, classicStyles.right]}>
            {formatProposalAmount(line.unitPriceRub)}
          </Text>
          <Text style={[classicStyles.cell, classicStyles.totalPrice, classicStyles.right]}>
            {formatProposalAmount(line.totalPriceRub)}
          </Text>
        </View>
      ))}
    </>
  );
}

function ClassicTableHeader() {
  return (
    <View style={classicStyles.row}>
      <Text style={[classicStyles.cell, classicStyles.index, classicStyles.headCell]}>№ п/п</Text>
      <Text style={[classicStyles.cell, classicStyles.article, classicStyles.headCell]}>Артикул</Text>
      <Text style={[classicStyles.cell, classicStyles.name, classicStyles.headCell]}>Наименование</Text>
      <Text style={[classicStyles.cell, classicStyles.materials, classicStyles.headCell]}>Материалы</Text>
      <Text style={[classicStyles.cell, classicStyles.image, classicStyles.headCell]}>Изображение</Text>
      <Text style={[classicStyles.cell, classicStyles.size, classicStyles.headCell]}>Размер (м)</Text>
      <Text style={[classicStyles.cell, classicStyles.quantity, classicStyles.headCell]}>Кол-во</Text>
      <Text style={[classicStyles.cell, classicStyles.unitPrice, classicStyles.headCell]}>Цена с НДС</Text>
      <Text style={[classicStyles.cell, classicStyles.totalPrice, classicStyles.headCell]}>Стоимость</Text>
    </View>
  );
}

function ClassicFooter({ draft }: ProposalPdfDocumentProps) {
  return (
    <View style={classicStyles.footer}>
      <View style={classicStyles.footerCol}>
        <Text style={classicStyles.footerTitle}>Исполнитель:</Text>
        <Text>{draft.managerName}</Text>
        {draft.secondaryManagerName ? <Text>{draft.secondaryManagerName}</Text> : null}
        <Text>ООО «Smart Presale»</Text>
        <Text>{draft.email}</Text>
        <Text>Тел: {draft.officePhone}</Text>
      </View>
      <View style={[classicStyles.footerCol, classicStyles.footerRight]}>
        <Text style={classicStyles.footerTitle}>{draft.validityLabel}</Text>
        <Text>Срок изготовления: {draft.leadTimeLabel}</Text>
      </View>
    </View>
  );
}

function ClassicProposalPdf({ draft }: ProposalPdfDocumentProps) {
  const chunks = chunkLines(draft.lines, 8);

  return (
    <>
      {chunks.map((lines, pageIndex) => {
        const startIndex = pageIndex * 8;
        const isLastPage = pageIndex === chunks.length - 1;

        return (
          <Page key={pageIndex} size="A4" style={classicStyles.page}>
            {pageIndex === 0 ? (
              <>
                <Image src={draft.headerBannerSrc} style={classicStyles.headerBanner} />
                <Text style={classicStyles.introBand}>{draft.introText}</Text>
                <Text style={classicStyles.title}>Коммерческое предложение</Text>
                <View style={classicStyles.customerRow}>
                  <View style={classicStyles.customerLine}>
                    <Text style={classicStyles.customerLabel}>Заказчик:</Text>
                    <Text style={classicStyles.customerValue}>{draft.customerName}</Text>
                  </View>
                  <View style={classicStyles.customerLine}>
                    <Text style={classicStyles.customerLabel}>Адрес:</Text>
                    <Text style={classicStyles.customerValue}>
                      {draft.customerAddress ?? "уточняется"}
                    </Text>
                  </View>
                  <View style={classicStyles.customerLine}>
                    <Text style={classicStyles.customerLabel}>Дата:</Text>
                    <Text style={classicStyles.customerValue}>{draft.issueDate}</Text>
                  </View>
                </View>
                <SceneLayoutPdfBlock draft={draft} mode="classic" />
              </>
            ) : null}

            <View style={classicStyles.table}>
              <ClassicTableHeader />
              <ClassicLineRows lines={lines} startIndex={startIndex} />
            </View>

            {isLastPage ? (
              <>
                <View style={classicStyles.totalRow}>
                  <Text style={classicStyles.totalLabel}>
                    Стоимость оборудования без учета доставки, сборки и монтажа
                  </Text>
                  <Text style={classicStyles.totalValue}>
                    {formatProposalAmount(draft.subtotalRub)}
                  </Text>
                </View>
                <View style={classicStyles.totalRowMuted}>
                  <Text style={classicStyles.totalLabel}>
                    Доставка, сборка и монтаж оборудования
                  </Text>
                  <Text style={classicStyles.totalValue}>
                    {formatProposalAmount(draft.deliveryRub + draft.installationRub)}
                  </Text>
                </View>
                <View style={classicStyles.totalRowStrong}>
                  <Text style={classicStyles.totalLabelStrong}>
                    Итого стоимость оборудования
                  </Text>
                  <Text style={classicStyles.totalValueStrong}>
                    {formatProposalAmount(draft.totalRub)}
                  </Text>
                </View>

                {draft.fixedCollageSrc ? (
                  <View style={classicStyles.collageWrap}>
                    <Image src={draft.fixedCollageSrc} style={classicStyles.collageImage} />
                  </View>
                ) : null}

                <ClassicFooter draft={draft} />
              </>
            ) : null}
          </Page>
        );
      })}
    </>
  );
}

export function ProposalPdfDocument({ draft }: ProposalPdfDocumentProps) {
  return (
    <Document title={`${draft.title} - ${draft.customerName}`}>
      {draft.templateKind === "CLASSIC_GRID" ? (
        <ClassicProposalPdf draft={draft} />
      ) : (
        <ModernProposalPdf draft={draft} />
      )}
    </Document>
  );
}
