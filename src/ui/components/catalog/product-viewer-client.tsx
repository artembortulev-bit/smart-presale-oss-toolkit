"use client";

import { Component, Suspense, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";

import { GeneratedProduct } from "@/import/catalog/types";
import { cn } from "@/shared/utils/cn";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { CatalogMediaImage } from "@/ui/components/catalog/catalog-media-image";
import { ProceduralProductModel } from "@/ui/components/catalog/procedural-product-model";
import { RealProductModel } from "@/ui/components/catalog/real-product-model";
import {
  buildProductViewerSpec,
  ProductViewerSpec,
  ViewerPart,
} from "@/ui/components/catalog/product-viewer-spec";
import { Eyebrow, Pill } from "@/ui/components/common/visual-system";

type ProductViewerClientProps = {
  product: GeneratedProduct;
  requireRealAsset?: boolean;
  confidenceModeLabel?: string;
};

type ViewerMode = "interactive3d" | "images";

class ViewerErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function clean(value?: string) {
  if (!value) {
    return value;
  }

  return cleanDisplayText(value)
    .replaceAll("Катальнаяповерхность", "Катальная поверхность")
    .replaceAll("поверхность иступени", "поверхность и ступени")
    .replaceAll("иступени", "и ступени")
    .replaceAll("кромки ирейлы", "кромки и рейлы");
}

function buildImageGallery(product: GeneratedProduct) {
  return Array.from(new Set([product.imageUrl, ...product.gallery].filter(Boolean)));
}

function Empty3DState() {
  return (
    <div
      data-track-v-unavailable="true"
      className="flex min-h-[520px] items-center justify-center rounded-[34px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffaf3_0%,#eee2d3_100%)] p-8 text-center"
    >
      <div className="max-w-md">
        <Eyebrow>3D proof</Eyebrow>
        <h3 className="safe-heading mt-4 text-[2.4rem] font-semibold leading-none tracking-[-0.07em] text-[var(--foreground)]">
          3D-модель готовится
        </h3>
        <p className="safe-text mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
          Для публичного показа нужен готовый real asset. Вместо подмены показываем
          честное состояние подготовки и сохраняем фото/параметры изделия.
        </p>
      </div>
    </div>
  );
}

function ViewerHotspots({
  parts,
  activePartId,
  onSelectPart,
}: {
  parts: ViewerPart[];
  activePartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  return (
    <>
      {parts.map((part, index) => {
        const active = part.id === activePartId;

        return (
          <group key={part.id} position={part.annotationPosition}>
            <Html center distanceFactor={9}>
              <button
                type="button"
                aria-label={clean(part.label)}
                title={clean(part.label)}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPart(part.id);
                }}
                className={cn(
                  "relative flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold shadow-[0_8px_18px_rgba(24,20,18,0.12)] backdrop-blur-xl transition-all",
                  active
                    ? "scale-110 border-[rgba(239,100,29,0.42)] bg-[var(--accent)] text-white"
                    : "border-white/80 bg-white/84 text-[var(--foreground)] hover:scale-105 hover:bg-white",
                )}
              >
                <span
                  className="absolute -right-px -top-px h-1.5 w-1.5 rounded-full border border-white"
                  style={{ backgroundColor: part.color }}
                />
                {index + 1}
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}

function ResponsiveViewerCamera({ spec }: { spec: ProductViewerSpec }) {
  const { size } = useThree();
  const { fov, position } = useMemo(() => {
    const basePosition = spec.cameraPosition ?? [6.2, 4.2, 6.8];
    const narrow = size.width < 640;
    const tablet = size.width >= 640 && size.width < 980;
    const distanceMultiplier = narrow ? 2.28 : tablet ? 1.32 : 1;
    const heightMultiplier = narrow ? 1.24 : tablet ? 1.1 : 1;

    if (narrow) {
      return {
        fov: 46,
        position: [2.6, basePosition[1] * heightMultiplier, 11.4] as [
          number,
          number,
          number,
        ],
      };
    }

    if (tablet) {
      return {
        fov: 38,
        position: [4.5, basePosition[1] * heightMultiplier, 8.2] as [
          number,
          number,
          number,
        ],
      };
    }

    return {
      fov: 33,
      position: [
        basePosition[0] * distanceMultiplier,
        basePosition[1] * heightMultiplier,
        basePosition[2] * distanceMultiplier,
      ] as [number, number, number],
    };
  }, [size.width, spec.cameraPosition]);

  return <PerspectiveCamera makeDefault position={position} fov={fov} />;
}

function ViewerCanvas({
  spec,
  selectedPartId,
  onSelectPart,
  allowProceduralFallback,
}: {
  spec: ProductViewerSpec;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
  allowProceduralFallback: boolean;
}) {
  return (
    <Canvas
      camera={{ position: spec.cameraPosition ?? [6.2, 4.2, 6.8], fov: 33 }}
      gl={{ antialias: true }}
      shadows
    >
      <ResponsiveViewerCamera spec={spec} />
      <color attach="background" args={["#f5ecdf"]} />
      <fog attach="fog" args={["#f5ecdf", 9, 19]} />
      <ambientLight intensity={0.88} />
      <hemisphereLight args={["#fff7ec", "#b9a38d", 0.68]} />
      <directionalLight
        castShadow
        position={[6.8, 8.9, 5.2]}
        intensity={2.35}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 4, -4]} intensity={0.58} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.755, 0]} receiveShadow>
        <planeGeometry args={[9.5, 9.5]} />
        <meshStandardMaterial color="#eadcc9" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, -0.12]} position={[0, -0.748, 0]} receiveShadow>
        <planeGeometry args={[6.7, 4.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
      </mesh>

      <Suspense
        fallback={
          <Html center>
            <div className="rounded-full border border-[var(--border)] bg-white/88 px-4 py-2 text-xs font-semibold text-[var(--foreground-muted)] shadow-[0_12px_36px_rgba(24,20,18,0.12)] backdrop-blur-xl">
              Загружаем 3D-модель
            </div>
          </Html>
        }
      >
        {spec.hasRealModel && spec.modelUrl ? (
          <RealProductModel
            spec={spec}
            selectedPartId={selectedPartId}
            onSelectPart={onSelectPart}
          />
        ) : allowProceduralFallback ? (
          <ProceduralProductModel
            spec={spec}
            selectedPartId={selectedPartId}
            onSelectPart={onSelectPart}
          />
        ) : null}
        <ViewerHotspots
          parts={spec.parts}
          activePartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      </Suspense>

      <ContactShadows position={[0, -0.72, 0]} scale={11} blur={3.8} opacity={0.34} />
      <OrbitControls
        enableDamping
        enablePan={false}
        minDistance={3.8}
        maxDistance={9.6}
        target={spec.cameraTarget ?? [0, 1.1, 0]}
        maxPolarAngle={Math.PI / 2.02}
      />
    </Canvas>
  );
}

function ProductImagePanel({ product }: { product: GeneratedProduct }) {
  const images = buildImageGallery(product);
  const [activeImage, setActiveImage] = useState(images[0]);

  return (
    <div className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffaf3_0%,#eee2d3_100%)] p-4">
      <div className="relative aspect-[16/11] overflow-hidden rounded-[28px] bg-white/66">
        <CatalogMediaImage
          src={activeImage}
          alt={cleanDisplayText(product.name)}
          className="object-contain p-6 sm:p-8"
          fetchPriority="high"
          loading="eager"
          fallback={
            <div className="flex h-full items-center justify-center px-8 text-center text-sm leading-7 text-[var(--foreground-muted)]">
              Медиа в подготовке.
            </div>
          }
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.slice(0, 4).map((imageUrl) => (
            <button
              key={imageUrl}
              type="button"
              onClick={() => setActiveImage(imageUrl)}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-[18px] border bg-white/70 transition",
                activeImage === imageUrl
                  ? "border-[rgba(239,100,29,0.42)]"
                  : "border-[var(--border)] hover:border-[rgba(239,100,29,0.24)]",
              )}
            >
              <CatalogMediaImage
                src={imageUrl}
                alt={cleanDisplayText(product.name)}
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SelectedPartPanel({
  selectedPart,
  parts,
  activePartId,
  spec,
  onSelectPart,
}: {
  selectedPart?: ViewerPart;
  parts: ViewerPart[];
  activePartId?: string;
  spec: ProductViewerSpec;
  onSelectPart: (partId: string) => void;
}) {
  const selectedLabel =
    selectedPart?.id === "ride-surface"
      ? "Катальная поверхность и ступени"
      : clean(selectedPart?.label) ?? "Узел изделия";

  return (
    <aside className="proof-panel--dark rounded-[34px] p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Eyebrow className="text-white/48">Материалы и узлы</Eyebrow>
        <Pill tone={spec.hasRealModel ? "accent" : "muted"}>
          {spec.hasRealModel ? "3D-модель изделия" : "3D готовится"}
        </Pill>
      </div>

      <div className="mt-6 flex items-start gap-3">
        <span
          className="mt-1.5 h-3.5 w-3.5 rounded-full border border-white/60"
          style={{ backgroundColor: selectedPart?.color ?? "#ef641d" }}
        />
        <div className="min-w-0">
          <h3
            className="safe-heading text-2xl font-semibold leading-tight"
            style={{ letterSpacing: "-0.01em", wordSpacing: "0.12em" }}
          >
            {selectedLabel}
          </h3>
          <p className="safe-text mt-3 text-sm leading-7 text-white/68">
            {clean(selectedPart?.purpose ?? selectedPart?.description) ??
              "Выберите точку на модели, чтобы посмотреть материал и назначение узла."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3">
        <div className="rounded-[22px] bg-white/[0.055] px-4 py-4">
          <Eyebrow className="text-white/42">Материал</Eyebrow>
          <div className="safe-text mt-2 text-sm leading-6 text-white">
            {clean(selectedPart?.material) ?? "Материал уточняется"}
          </div>
        </div>
        <div className="rounded-[22px] bg-white/[0.055] px-4 py-4">
          <Eyebrow className="text-white/42">Исполнение</Eyebrow>
          <div className="safe-text mt-2 text-sm leading-6 text-white/76">
            {clean(selectedPart?.finish) ?? "Исполнение уточняется"}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {parts.map((part, index) => (
          <button
            key={part.id}
            type="button"
            onClick={() => onSelectPart(part.id)}
            className={cn(
              "rounded-full border px-3 py-2 text-sm transition",
              part.id === activePartId
                ? "border-[rgba(239,100,29,0.44)] bg-[rgba(239,100,29,0.18)] text-white"
                : "border-white/10 bg-white/[0.045] text-white/72 hover:text-white",
            )}
          >
            {index + 1}. {clean(part.label)}
          </button>
        ))}
      </div>
    </aside>
  );
}

function MaterialLegend({ parts }: { parts: ViewerPart[] }) {
  const legendParts = useMemo(
    () =>
      parts.filter(
        (part, index, collection) =>
          collection.findIndex(
            (candidate) =>
              candidate.label === part.label && candidate.material === part.material,
          ) === index,
      ),
    [parts],
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {legendParts.map((part, index) => (
        <div
          key={part.id}
          className="rounded-[22px] border border-[var(--border)] bg-white/74 px-4 py-4"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white bg-[var(--surface)] text-[11px] font-bold text-[var(--foreground)] shadow-sm">
              {index + 1}
            </span>
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white shadow-sm"
              style={{ backgroundColor: part.color }}
            />
            <div className="min-w-0">
              <div className="safe-text text-sm font-semibold text-[var(--foreground)]">
                {clean(part.label)}
              </div>
              <div className="safe-text mt-1 text-sm leading-6 text-[var(--foreground-muted)]">
                {clean(part.material)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProductViewerClient({
  product,
  requireRealAsset,
  confidenceModeLabel,
}: ProductViewerClientProps) {
  const spec = buildProductViewerSpec(product);
  const defaultSelectedPartId = spec.defaultPartId ?? spec.parts[0]?.id;
  const [mode, setMode] = useState<ViewerMode>("interactive3d");
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(
    defaultSelectedPartId,
  );
  const activePartId = spec.parts.some((part) => part.id === selectedPartId)
    ? selectedPartId
    : defaultSelectedPartId;
  const selectedPart = spec.parts.find((part) => part.id === activePartId) ?? spec.parts[0];
  const realAssetMissing = Boolean(requireRealAsset && !spec.hasRealModel);
  const allowProceduralFallback = !requireRealAsset;
  const viewerTitle =
    mode === "interactive3d"
      ? spec.hasRealModel
        ? "3D-модель изделия"
        : "3D-визуализация"
      : "Фотогалерея";
  const assetLabel = spec.hasRealModel
    ? "3D-модель изделия"
    : "Демо-визуализация";

  return (
    <div
      data-track-v-viewer={requireRealAsset ? "showcase" : "catalog"}
      data-track-v-mode={spec.hasRealModel ? "real-asset" : "procedural-visualization"}
      className="rounded-[40px] border border-[var(--border)] bg-[rgba(255,250,243,0.72)] p-3 shadow-[0_24px_80px_rgba(24,20,18,0.06)]"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-2 pt-2">
        <div className="min-w-0">
          <Eyebrow>Визуальный proof</Eyebrow>
          <div className="safe-heading mt-2 text-2xl font-semibold tracking-[-0.055em] text-[var(--foreground)]">
            {viewerTitle}
          </div>
          {confidenceModeLabel ? (
            <div className="safe-text mt-1 text-sm font-semibold text-[var(--accent)]">
              {cleanDisplayText(confidenceModeLabel)}
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Pill tone={spec.hasRealModel ? "accent" : "muted"}>{assetLabel}</Pill>
          <div className="rounded-full border border-[var(--border)] bg-white/78 p-1">
            <button
              type="button"
              onClick={() => setMode("interactive3d")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                mode === "interactive3d"
                  ? "bg-[var(--surface-dark)] text-white"
                  : "text-[var(--foreground-muted)]",
              )}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setMode("images")}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                mode === "images"
                  ? "bg-[var(--surface-dark)] text-white"
                  : "text-[var(--foreground-muted)]",
              )}
            >
              Фото
            </button>
          </div>
        </div>
      </div>

      {mode === "images" ? (
        <ProductImagePanel product={product} />
      ) : realAssetMissing ? (
        <Empty3DState />
      ) : (
        <ViewerErrorBoundary fallback={<Empty3DState />}>
          <div className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="relative h-[560px] overflow-hidden rounded-[34px] bg-[linear-gradient(145deg,#fff9f0_0%,#ead8bf_100%)] lg:h-[690px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(239,100,29,0.17),transparent_25%),radial-gradient(circle_at_78%_78%,rgba(66,106,120,0.11),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0))]" />
              <div className="pointer-events-none absolute inset-x-[12%] bottom-[13%] h-[18%] rounded-[999px] bg-[radial-gradient(ellipse_at_center,rgba(23,20,18,0.12),transparent_68%)] blur-sm" />
              <div className="absolute left-4 top-4 z-10 flex flex-wrap gap-2">
                <Pill tone="default">Вращение</Pill>
                <Pill tone="default">Zoom</Pill>
                <Pill tone="accent">Узлы</Pill>
              </div>
              <div
                className="relative h-full"
                data-track-v-canvas={requireRealAsset ? "required-real-asset" : undefined}
              >
                <ViewerCanvas
                  spec={spec}
                  selectedPartId={activePartId}
                  onSelectPart={setSelectedPartId}
                  allowProceduralFallback={allowProceduralFallback}
                />
              </div>
            </div>

            <SelectedPartPanel
              selectedPart={selectedPart}
              parts={spec.parts}
              activePartId={activePartId}
              spec={spec}
              onSelectPart={setSelectedPartId}
            />
          </div>

          <div className="mt-4 rounded-[30px] border border-[var(--border)] bg-white/58 p-4">
            <Eyebrow>Легенда материалов</Eyebrow>
            <div className="mt-4">
              <MaterialLegend parts={spec.parts} />
            </div>
          </div>
        </ViewerErrorBoundary>
      )}
    </div>
  );
}
