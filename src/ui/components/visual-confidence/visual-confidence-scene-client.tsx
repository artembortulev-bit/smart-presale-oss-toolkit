"use client";

import { Component, Suspense, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, Edges, Html, OrbitControls } from "@react-three/drei";

import { TRACK_V_SCENE_PRESET } from "@/application/visual-confidence/showcase";
import { GeneratedProduct } from "@/import/catalog/types";
import { cn } from "@/shared/utils/cn";
import { cleanDisplayText } from "@/shared/utils/display-text";
import { RealProductModel } from "@/ui/components/catalog/real-product-model";
import {
  buildProductViewerSpec,
  ViewerPart,
} from "@/ui/components/catalog/product-viewer-spec";
import { Eyebrow, Pill } from "@/ui/components/common/visual-system";

type VisualConfidenceSceneClientProps = {
  product: GeneratedProduct;
};

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? <SceneUnavailablePanel /> : this.props.children;
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

function SceneUnavailablePanel() {
  return (
    <div
      data-track-v-scene-unavailable="true"
      className="flex min-h-[560px] items-center justify-center rounded-[34px] border border-[var(--border)] bg-[linear-gradient(135deg,#fffaf3_0%,#eee2d3_100%)] p-8 text-center"
    >
      <div className="max-w-md">
        <Eyebrow>Визуальный контекст</Eyebrow>
        <h3 className="safe-heading mt-4 text-[2.3rem] font-semibold leading-none tracking-[-0.07em] text-[var(--foreground)]">
          3D-сцена готовится
        </h3>
        <p className="safe-text mt-4 text-sm leading-7 text-[var(--foreground-muted)]">
          Для демонстрации размещения нужен готовый real asset. Вместо подмены
          показываем честное состояние подготовки.
        </p>
      </div>
    </div>
  );
}

function SceneHotspots({
  parts,
  selectedPartId,
  onSelectPart,
}: {
  parts: ViewerPart[];
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  return (
    <>
      {parts.map((part, index) => (
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
              data-track-v-hotspot={part.id}
              className={cn(
                "relative flex h-4 w-4 items-center justify-center rounded-full border text-[8px] font-bold shadow-[0_8px_18px_rgba(17,17,17,0.12)] backdrop-blur-xl transition",
                part.id === selectedPartId
                  ? "scale-110 border-[rgba(239,100,29,0.44)] bg-[var(--accent)] text-white"
                  : "border-white/80 bg-white/86 text-[var(--foreground)] hover:scale-105 hover:bg-white",
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
      ))}
    </>
  );
}

function PlotOverlays() {
  const preset = TRACK_V_SCENE_PRESET;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.76, 0]} receiveShadow>
        <planeGeometry args={[preset.bounds.widthM, preset.bounds.lengthM]} />
        <meshStandardMaterial color={preset.overlayStyle.plotColor} roughness={0.96} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.731, 0]}>
        <planeGeometry args={[preset.safetyZone.widthM, preset.safetyZone.lengthM]} />
        <meshBasicMaterial
          color={preset.overlayStyle.safetyColor}
          transparent
          opacity={0.09}
        />
        <Edges color={preset.overlayStyle.safetyColor} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.71, 0]}>
        <planeGeometry args={[preset.footprint.widthM, preset.footprint.lengthM]} />
        <meshBasicMaterial
          color={preset.overlayStyle.footprintColor}
          transparent
          opacity={0.11}
        />
        <Edges color={preset.overlayStyle.footprintColor} />
      </mesh>
    </group>
  );
}

function SiteContextBackdrop() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.79, -5.2]} receiveShadow>
        <planeGeometry args={[11.5, 1.65]} />
        <meshStandardMaterial color="#d8c7b2" roughness={0.92} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, -0.2]} position={[-3.4, -0.765, 2.15]} receiveShadow>
        <planeGeometry args={[1.05, 5.8]} />
        <meshStandardMaterial color="#d1b993" roughness={0.94} />
      </mesh>

      {[-4.7, -3.1, -1.5, 0.1, 1.7, 3.3, 4.7].map((x, index) => (
        <group key={`fence-${x}`} position={[x, -0.13, -4.7]}>
          <mesh castShadow>
            <boxGeometry args={[0.08, 1.18, 0.08]} />
            <meshStandardMaterial color="#816753" roughness={0.7} />
          </mesh>
          {index < 6 ? (
            <mesh position={[0.78, 0.4, 0]} castShadow>
              <boxGeometry args={[1.5, 0.07, 0.055]} />
              <meshStandardMaterial color="#aa896c" roughness={0.72} />
            </mesh>
          ) : null}
        </group>
      ))}

      {([
        [-4.7, -6.15, 1.55, 1.05],
        [-3.35, -6.45, 2.25, 1.1],
        [3.15, -6.2, 1.85, 1.08],
        [4.55, -6.5, 2.45, 1.18],
      ] as Array<[number, number, number, number]>).map(([x, z, height, width], index) => (
        <mesh
          key={`building-${index}`}
          position={[x, height / 2 - 0.72, z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[width, height, 0.58]} />
          <meshStandardMaterial color={index % 2 ? "#d9d3c9" : "#cfc7ba"} roughness={0.86} />
        </mesh>
      ))}

      {([
        [-4.35, -3.75],
        [4.15, -3.75],
        [-3.65, 3.75],
        [3.9, 3.65],
      ] as Array<[number, number]>).map(([x, z], index) => (
        <group key={`tree-${index}`} position={[x, -0.72, z]}>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.075, 0.1, 1.1, 12]} />
            <meshStandardMaterial color="#956845" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.34, 0]} castShadow>
            <coneGeometry args={[0.52, 1.08, 18]} />
            <meshStandardMaterial color="#748d5b" roughness={0.68} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function SceneLegend() {
  const preset = TRACK_V_SCENE_PRESET;
  const items = [
    {
      label: "Участок",
      value: `${preset.bounds.widthM}×${preset.bounds.lengthM} м`,
      color: preset.overlayStyle.plotColor,
    },
    {
      label: "Контур изделия",
      value: `${preset.footprint.widthM}×${preset.footprint.lengthM} м`,
      color: preset.overlayStyle.footprintColor,
    },
    {
      label: "Зона безопасности",
      value: `${preset.safetyZone.widthM}×${preset.safetyZone.lengthM} м`,
      color: preset.overlayStyle.safetyColor,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-[22px] border border-[var(--border)] bg-white/74 px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full border border-white"
              style={{ backgroundColor: item.color }}
            />
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-soft)]">
              {item.label}
            </div>
          </div>
          <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function VisualConfidenceSceneClient({
  product,
}: VisualConfidenceSceneClientProps) {
  const spec = useMemo(() => buildProductViewerSpec(product), [product]);
  const defaultPartId = spec.defaultPartId ?? spec.parts[0]?.id;
  const [selectedPartId, setSelectedPartId] = useState<string | undefined>(defaultPartId);
  const selectedPart =
    spec.parts.find((part) => part.id === selectedPartId) ?? spec.parts[0];
  const selectedLabel =
    selectedPart?.id === "ride-surface"
      ? "Катальная поверхность и ступени"
      : clean(selectedPart?.label);

  if (!spec.hasRealModel) {
    return <SceneUnavailablePanel />;
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <SceneErrorBoundary>
          <div className="overflow-hidden rounded-[34px] border border-[var(--border)] bg-[rgba(255,250,243,0.78)] p-3 shadow-[0_24px_80px_rgba(24,20,18,0.07)]">
            <div
              data-track-v-scene="deterministic-preset"
              className="relative h-[560px] overflow-hidden rounded-[30px] bg-[linear-gradient(160deg,#fff8ee_0%,#e7d4b8_100%)] lg:h-[680px]"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(239,100,29,0.16),transparent_26%),radial-gradient(circle_at_18%_82%,rgba(61,88,99,0.12),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0))]" />
              <div className="pointer-events-none absolute left-4 top-4 z-20">
                <Pill tone="accent">Размещение на площадке</Pill>
              </div>

              <Canvas
                className="relative z-10"
                camera={{
                  position: TRACK_V_SCENE_PRESET.camera.position,
                  fov: TRACK_V_SCENE_PRESET.camera.fov,
                }}
                gl={{ antialias: true, alpha: true }}
                shadows
              >
                <fog attach="fog" args={["#f3eadc", 12, 25]} />
                <ambientLight intensity={0.82} />
                <hemisphereLight args={["#fff6e8", "#bda68c", 0.64]} />
                <directionalLight
                  castShadow
                  position={[7.0, 9.5, 5.8]}
                  intensity={2.35}
                  shadow-mapSize-width={2048}
                  shadow-mapSize-height={2048}
                />
                <directionalLight position={[-5.7, 4.6, -5]} intensity={0.55} />

                <PlotOverlays />
                <SiteContextBackdrop />

                <Suspense
                  fallback={
                    <Html center>
                      <div className="rounded-full border border-[var(--border)] bg-white/88 px-4 py-2 text-xs font-semibold text-[var(--foreground-muted)] shadow-[0_12px_36px_rgba(24,20,18,0.12)] backdrop-blur-xl">
                        Загружаем 3D-сцену
                      </div>
                    </Html>
                  }
                >
                  <RealProductModel
                    spec={spec}
                    selectedPartId={selectedPartId}
                    onSelectPart={setSelectedPartId}
                  />
                  <SceneHotspots
                    parts={spec.parts}
                    selectedPartId={selectedPartId}
                    onSelectPart={setSelectedPartId}
                  />
                </Suspense>

                <ContactShadows position={[0, -0.7, 0]} scale={11} blur={3.8} opacity={0.3} />
                <OrbitControls
                  enableDamping
                  enablePan={TRACK_V_SCENE_PRESET.controls.pan}
                  enableZoom={TRACK_V_SCENE_PRESET.controls.zoom}
                  target={TRACK_V_SCENE_PRESET.camera.target}
                  minDistance={4.2}
                  maxDistance={10.5}
                  maxPolarAngle={Math.PI / 2.03}
                />
              </Canvas>
            </div>
          </div>
        </SceneErrorBoundary>

        <SceneLegend />
      </div>

      <aside className="proof-panel--dark rounded-[34px] p-6 text-white">
        <Eyebrow className="text-white/48">Контекст размещения</Eyebrow>
        <h3
          className="safe-heading mt-4 text-[2rem] font-semibold leading-none"
          style={{ letterSpacing: "-0.01em", wordSpacing: "0.1em" }}
        >
          Как объект встанет на площадке
        </h3>
        <p className="safe-text mt-4 text-sm leading-7 text-white/66">
          Сцена показывает масштаб изделия, контур и ориентировочную зону безопасности.
          Это визуальное доказательство для разговора с клиентом до подготовки полного проекта.
        </p>

        <div className="mt-6 grid gap-3">
          <div className="rounded-[22px] bg-white/[0.055] px-4 py-4">
            <Eyebrow className="text-white/42">Выбранный узел</Eyebrow>
            <div className="safe-text mt-2 text-lg font-semibold">
              {selectedLabel}
            </div>
            <p className="safe-text mt-2 text-sm leading-6 text-white/68">
              {clean(selectedPart?.material)}
            </p>
          </div>
          <div className="rounded-[22px] bg-white/[0.055] px-4 py-4">
            <Eyebrow className="text-white/42">Что проверяем</Eyebrow>
            <div className="safe-text mt-2 text-sm leading-7 text-white/76">
              Габарит, контур, зону безопасности и визуальную посадку изделия на участке клиента.
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
