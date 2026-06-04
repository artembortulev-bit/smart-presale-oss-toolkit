import { promises as fs } from "node:fs";
import path from "node:path";

import { Prisma, PrismaClient } from "@prisma/client";

import { GeneratedCatalogData } from "@/import/catalog/types";
import { slugify } from "@/shared/utils/slugify";

const prisma = new PrismaClient();

const catalogDataPath = path.join(process.cwd(), "generated", "catalog-data.json");
const destructiveSeedFlag = "--confirm-destructive-seed";

function assertDestructiveSeedAllowed() {
  const confirmedByArg = process.argv.includes(destructiveSeedFlag);
  const confirmedByEnv = process.env.ALLOW_DESTRUCTIVE_SEED === "true";

  if (confirmedByArg || confirmedByEnv) {
    return;
  }

  throw new Error(
    [
      "Destructive seed is blocked.",
      "This script resets operational tables and catalog tables.",
      `Run it only intentionally with: npm run db:seed:reset`,
      `Or set ALLOW_DESTRUCTIVE_SEED=true if you are in a disposable local database.`,
    ].join(" "),
  );
}

function optionalDecimal(value?: number) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return new Prisma.Decimal(value);
}

async function readCatalogData() {
  const raw = await fs.readFile(catalogDataPath, "utf8");
  return JSON.parse(raw) as GeneratedCatalogData;
}

async function resetDatabase() {
  await prisma.$transaction([
    prisma.eventLog.deleteMany(),
    prisma.proposalVersionItem.deleteMany(),
    prisma.proposalVersion.deleteMany(),
    prisma.proposalItem.deleteMany(),
    prisma.proposal.deleteMany(),
    prisma.documentTemplate.deleteMany(),
    prisma.sceneProject.deleteMany(),
    prisma.selectionRecommendation.deleteMany(),
    prisma.selectionSession.deleteMany(),
    prisma.clientRequestAsset.deleteMany(),
    prisma.clientRequest.deleteMany(),
    prisma.project.deleteMany(),
    prisma.customerContact.deleteMany(),
    prisma.customerCompany.deleteMany(),
    prisma.user.deleteMany(),
    prisma.rawProductSnapshot.deleteMany(),
    prisma.productAsset.deleteMany(),
    prisma.productPrice.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.product.deleteMany(),
    prisma.series.deleteMany(),
    prisma.category.deleteMany(),
    prisma.importIssue.deleteMany(),
    prisma.importRun.deleteMany(),
    prisma.sourceFile.deleteMany(),
  ]);
}

async function seedCategories(data: GeneratedCatalogData) {
  const categories = [...data.categories].sort((left, right) => {
    if (!left.parentSlug && right.parentSlug) {
      return -1;
    }

    if (left.parentSlug && !right.parentSlug) {
      return 1;
    }

    return left.slug.localeCompare(right.slug, "ru");
  });

  const idBySlug = new Map<string, string>();

  for (const category of categories) {
    const created = await prisma.category.create({
      data: {
        slug: category.slug,
        name: category.name,
        segmentKey: category.segmentKey,
        parentId: category.parentSlug ? idBySlug.get(category.parentSlug) : undefined,
      },
    });

    idBySlug.set(category.slug, created.id);
  }

  return idBySlug;
}

async function seedSeries(data: GeneratedCatalogData) {
  const seriesNames = Array.from(
    new Set(data.products.map((product) => product.seriesName).filter(Boolean)),
  ) as string[];

  const idByName = new Map<string, string>();

  for (const name of seriesNames) {
    const created = await prisma.series.create({
      data: {
        name,
        slug: slugify(name),
      },
    });

    idByName.set(name, created.id);
  }

  return idByName;
}

async function seedProducts(
  data: GeneratedCatalogData,
  categoryIdBySlug: Map<string, string>,
  seriesIdByName: Map<string, string>,
) {
  for (const product of data.products) {
    await prisma.product.create({
      data: {
        slug: product.slug,
        article: product.article,
        articleNormalized: product.articleNormalized,
        externalCode: product.externalCode,
        name: product.name,
        shortDescription: product.name,
        description: product.description,
        classLabel: product.classLabel,
        categoryId: product.categorySlug
          ? categoryIdBySlug.get(product.categorySlug)
          : undefined,
        subcategoryLabel: product.subcategoryLabel,
        seriesId: product.seriesName
          ? seriesIdByName.get(product.seriesName)
          : undefined,
        materials: product.materials,
        ageLabel: product.ageLabel,
        ageMinYears: product.ageMinYears,
        ageMaxYears: product.ageMaxYears,
        lengthM: optionalDecimal(product.lengthM),
        widthM: optionalDecimal(product.widthM),
        heightM: optionalDecimal(product.heightM),
        sizeLabel: product.sizeLabel,
        weightKg: optionalDecimal(product.weightKg),
        volumeM3: optionalDecimal(product.volumeM3),
        basePriceRub: optionalDecimal(product.basePriceRub),
        imageUrl: product.imageUrl,
        gallery: product.gallery,
        source: product.rawSources[0]?.source ?? "MANUAL",
        metadata: product.metadata as Prisma.InputJsonValue,
        prices: {
          create: product.prices.map((price) => ({
            material: price.material,
            level: price.level,
            amountRub: new Prisma.Decimal(price.amountRub),
            source: price.source,
            sourceLabel: price.sourceLabel,
          })),
        },
        assets: {
          create: product.assets.map((asset, index) => ({
            kind: asset.kind,
            url: asset.url,
            title: asset.title,
            sortOrder: index,
          })),
        },
        variants: {
          create: product.variants.map((variant) => ({
            variantKey: variant.variantKey,
            externalCode: variant.externalCode,
            displayName: variant.displayName,
            sizeLabel: variant.sizeLabel,
            lengthM: optionalDecimal(variant.lengthM),
            widthM: optionalDecimal(variant.widthM),
            heightM: optionalDecimal(variant.heightM),
            weightKg: optionalDecimal(variant.weightKg),
            volumeM3: optionalDecimal(variant.volumeM3),
            imageUrl: variant.imageUrl,
            prices: {
              create: variant.prices.map((price) => ({
                material: price.material,
                level: price.level,
                amountRub: new Prisma.Decimal(price.amountRub),
                source: price.source,
                sourceLabel: price.sourceLabel,
              })),
            },
            assets: {
              create: variant.assets.map((asset, index) => ({
                kind: asset.kind,
                url: asset.url,
                title: asset.title,
                sortOrder: index,
              })),
            },
          })),
        },
      },
    });
  }
}

async function seedTemplatesAndScenarios(data: GeneratedCatalogData) {
  await prisma.user.upsert({
    where: { email: "manager@example.local" },
    create: {
      email: "manager@example.local",
      name: "Smart Presale Manager",
      role: "MANAGER",
    },
    update: {
      name: "Smart Presale Manager",
      role: "MANAGER",
      status: "ACTIVE",
    },
  });

  const template = await prisma.documentTemplate.create({
    data: {
      code: "proposal-default",
      kind: "PROPOSAL",
      name: "Коммерческое предложение Smart Presale",
      isDefault: true,
      description: "Основной шаблон КП для MVP.",
      content: {
        blocks: ["hero", "client", "table", "totals", "compliance", "footer"],
      },
    },
  });

  for (const scenario of data.proposalScenarios) {
    const customer = await prisma.customerCompany.create({
      data: {
        name: scenario.customerName,
        legalName: scenario.customerName,
        legalAddress: scenario.address,
      },
    });

    const subtotal = scenario.lines.reduce(
      (sum, line) => sum + (line.totalPriceRub ?? 0),
      0,
    );

    await prisma.proposal.create({
      data: {
        number: `DEMO-${scenario.id.slice(0, 8).toUpperCase()}`,
        title: scenario.title,
        customerId: customer.id,
        templateId: template.id,
        issueDate: scenario.issueDate
          ? new Date(
              `${scenario.issueDate.slice(6, 10)}-${scenario.issueDate.slice(3, 5)}-${scenario.issueDate.slice(0, 2)}`,
            )
          : new Date(),
        subtotalRub: optionalDecimal(subtotal) ?? new Prisma.Decimal(0),
        deliveryRub: new Prisma.Decimal(0),
        installationRub: new Prisma.Decimal(0),
        totalRub: optionalDecimal(subtotal) ?? new Prisma.Decimal(0),
        items: {
          create: scenario.lines.map((line) => ({
            article: line.article ?? "DEMO",
            name: line.name,
            imageUrl: undefined,
            sizeLabel: line.sizeLabel,
            quantity: line.quantity ?? 1,
            unitPriceRub:
              optionalDecimal(line.unitPriceRub ?? 0) ?? new Prisma.Decimal(0),
            totalPriceRub:
              optionalDecimal(line.totalPriceRub ?? line.unitPriceRub ?? 0) ??
              new Prisma.Decimal(0),
          })),
        },
      },
    });
  }
}

async function main() {
  assertDestructiveSeedAllowed();
  const data = await readCatalogData();

  await resetDatabase();
  const categoryIdBySlug = await seedCategories(data);
  const seriesIdByName = await seedSeries(data);
  await seedProducts(data, categoryIdBySlug, seriesIdByName);
  await seedTemplatesAndScenarios(data);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
