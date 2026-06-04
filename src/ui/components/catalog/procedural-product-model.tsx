"use client";

import { PropsWithChildren, useMemo, useState } from "react";
import * as THREE from "three";
import { useCursor } from "@react-three/drei";

import {
  ProductViewerSpec,
  ViewerPart,
  ViewerSceneKind,
} from "@/ui/components/catalog/product-viewer-spec";
import { cleanDisplayText } from "@/shared/utils/display-text";

type ProceduralProductModelProps = {
  spec: ProductViewerSpec;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
};

type InteractivePartProps = PropsWithChildren<{
  part: ViewerPart;
  active: boolean;
  onSelectPart: (partId: string) => void;
}>;

function PartMaterial({
  color,
  active,
  materialLabel,
}: {
  color: string;
  active: boolean;
  materialLabel?: string;
}) {
  const source = `${materialLabel?.toLowerCase() ?? ""} ${cleanDisplayText(materialLabel ?? "").toLowerCase()}`;
  const isMetal =
    source.includes("сталь") || source.includes("металл") || source.includes("нержав");
  const isWood = source.includes("дерев") || source.includes("брус");

  if (isMetal) {
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={0.16}
        metalness={0.92}
        clearcoat={0.55}
        clearcoatRoughness={0.18}
        emissive={active ? "#f26622" : "#000000"}
        emissiveIntensity={active ? 0.14 : 0}
      />
    );
  }

  return (
    <meshStandardMaterial
      color={color}
      roughness={isWood ? 0.65 : 0.35}
      metalness={0.14}
      emissive={active ? "#f26622" : "#000000"}
      emissiveIntensity={active ? 0.18 : 0}
    />
  );
}

function TubeRail({
  points,
  radius,
  color,
  active,
  materialLabel,
}: {
  points: Array<[number, number, number]>;
  radius: number;
  color: string;
  active: boolean;
  materialLabel?: string;
}) {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(point[0], point[1], point[2])),
    );

    return new THREE.TubeGeometry(curve, 32, radius, 12, false);
  }, [points, radius]);

  return (
    <mesh geometry={geometry} castShadow>
      <PartMaterial color={color} active={active} materialLabel={materialLabel} />
    </mesh>
  );
}

function SlideChannelMesh({
  color,
  active,
  materialLabel,
}: {
  color: string;
  active: boolean;
  materialLabel?: string;
}) {
  const geometry = useMemo(() => {
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.18, 1.96, 0.28),
      new THREE.Vector3(0.1, 1.78, 0.33),
      new THREE.Vector3(0.72, 1.34, 0.42),
      new THREE.Vector3(1.52, 0.76, 0.52),
      new THREE.Vector3(2.52, 0.18, 0.62),
      new THREE.Vector3(3.08, 0.02, 0.66),
    ]);

    const shape = new THREE.Shape();
    shape.moveTo(-0.4, 0.18);
    shape.lineTo(-0.32, 0.34);
    shape.quadraticCurveTo(-0.24, 0.2, -0.2, 0.04);
    shape.quadraticCurveTo(-0.12, -0.18, 0, -0.24);
    shape.quadraticCurveTo(0.12, -0.18, 0.2, 0.04);
    shape.quadraticCurveTo(0.24, 0.2, 0.32, 0.34);
    shape.lineTo(0.4, 0.18);
    shape.lineTo(0.28, 0.16);
    shape.quadraticCurveTo(0.22, 0.02, 0.15, -0.08);
    shape.quadraticCurveTo(0, -0.13, -0.15, -0.08);
    shape.quadraticCurveTo(-0.22, 0.02, -0.28, 0.16);
    shape.closePath();

    return new THREE.ExtrudeGeometry(shape, {
      steps: 96,
      bevelEnabled: false,
      curveSegments: 18,
      extrudePath: path,
    });
  }, []);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <PartMaterial color={color} active={active} materialLabel={materialLabel} />
    </mesh>
  );
}

function InteractivePart({ part, active, onSelectPart, children }: InteractivePartProps) {
  const [hovered, setHovered] = useState(false);
  useCursor(hovered);
  const emphasized = active || hovered;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelectPart(part.id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <group scale={emphasized ? 1.02 : 1}>{children}</group>
    </group>
  );
}

function PlaygroundModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const supports = partsById["supports"];
  const platform = partsById["platform"];
  const roof = partsById["roof"];
  const slide = partsById["slide"];
  const ladder = partsById["ladder"];
  const guardPanel = partsById["guard-panel"];

  return (
    <group position={[0, -0.15, 0]}>
      {supports ? (
        <InteractivePart
          part={supports}
          active={selectedPartId === supports.id}
          onSelectPart={onSelectPart}
        >
          {[
            [-0.9, 1.1, -0.8],
            [0.9, 1.1, -0.8],
            [-0.9, 1.1, 0.8],
            [0.9, 1.1, 0.8],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow receiveShadow>
              <cylinderGeometry args={[0.11, 0.11, 2.2, 20]} />
              <PartMaterial color={supports.color} active={selectedPartId === supports.id} />
            </mesh>
          ))}
          <mesh position={[0, 2.02, -0.8]} castShadow>
            <boxGeometry args={[1.9, 0.1, 0.1]} />
            <PartMaterial color={supports.color} active={selectedPartId === supports.id} />
          </mesh>
          <mesh position={[0, 2.02, 0.8]} castShadow>
            <boxGeometry args={[1.9, 0.1, 0.1]} />
            <PartMaterial color={supports.color} active={selectedPartId === supports.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {platform ? (
        <InteractivePart
          part={platform}
          active={selectedPartId === platform.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[0, 1.14, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.0, 0.18, 1.9]} />
            <PartMaterial color={platform.color} active={selectedPartId === platform.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {roof ? (
        <InteractivePart part={roof} active={selectedPartId === roof.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 2.45, 0]} castShadow>
            <coneGeometry args={[1.45, 0.95, 4]} />
            <PartMaterial color={roof.color} active={selectedPartId === roof.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {slide ? (
        <InteractivePart part={slide} active={selectedPartId === slide.id} onSelectPart={onSelectPart}>
          <mesh position={[1.7, 0.65, 0.42]} rotation={[0, 0, -0.7]} castShadow>
            <boxGeometry args={[2.45, 0.12, 0.62]} />
            <PartMaterial color={slide.color} active={selectedPartId === slide.id} />
          </mesh>
          <mesh position={[1.75, 0.8, 0.73]} rotation={[0, 0, -0.7]} castShadow>
            <boxGeometry args={[2.1, 0.08, 0.08]} />
            <PartMaterial color="#5f6975" active={selectedPartId === slide.id} />
          </mesh>
          <mesh position={[1.75, 0.8, 0.1]} rotation={[0, 0, -0.7]} castShadow>
            <boxGeometry args={[2.1, 0.08, 0.08]} />
            <PartMaterial color="#5f6975" active={selectedPartId === slide.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {ladder ? (
        <InteractivePart
          part={ladder}
          active={selectedPartId === ladder.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[-1.38, 0.65, 0.7]} rotation={[0, 0, 0.55]} castShadow>
            <boxGeometry args={[1.55, 0.06, 0.06]} />
            <PartMaterial color={ladder.color} active={selectedPartId === ladder.id} />
          </mesh>
          <mesh position={[-1.05, 0.65, 0.7]} rotation={[0, 0, 0.55]} castShadow>
            <boxGeometry args={[1.55, 0.06, 0.06]} />
            <PartMaterial color={ladder.color} active={selectedPartId === ladder.id} />
          </mesh>
          {[0.18, 0.45, 0.72, 0.99].map((y, index) => (
            <mesh key={index} position={[-1.22, y, 0.7]} rotation={[0, 0, 0.55]} castShadow>
              <boxGeometry args={[0.36, 0.05, 0.58]} />
              <PartMaterial color="#d1ab7b" active={selectedPartId === ladder.id} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {guardPanel ? (
        <InteractivePart
          part={guardPanel}
          active={selectedPartId === guardPanel.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[0, 1.55, -0.98]} castShadow>
            <boxGeometry args={[1.92, 0.82, 0.08]} />
            <PartMaterial color={guardPanel.color} active={selectedPartId === guardPanel.id} />
          </mesh>
          <mesh position={[0.98, 1.55, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[1.7, 0.82, 0.08]} />
            <PartMaterial color={guardPanel.color} active={selectedPartId === guardPanel.id} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function SwingModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const leftSupport = partsById["left-support"];
  const rightSupport = partsById["right-support"];
  const beam = partsById["beam"];
  const suspension = partsById["suspension"];
  const seat = partsById["seat"];

  return (
    <group position={[0, -0.1, 0]}>
      {leftSupport ? (
        <InteractivePart
          part={leftSupport}
          active={selectedPartId === leftSupport.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[-1.45, 1.02, -0.48]} rotation={[0, 0, 0.22]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.2, 18]} />
            <PartMaterial color={leftSupport.color} active={selectedPartId === leftSupport.id} />
          </mesh>
          <mesh position={[-1.45, 1.02, 0.48]} rotation={[0, 0, -0.22]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.2, 18]} />
            <PartMaterial color={leftSupport.color} active={selectedPartId === leftSupport.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {rightSupport ? (
        <InteractivePart
          part={rightSupport}
          active={selectedPartId === rightSupport.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[1.45, 1.02, -0.48]} rotation={[0, 0, 0.22]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.2, 18]} />
            <PartMaterial color={rightSupport.color} active={selectedPartId === rightSupport.id} />
          </mesh>
          <mesh position={[1.45, 1.02, 0.48]} rotation={[0, 0, -0.22]} castShadow>
            <cylinderGeometry args={[0.1, 0.1, 2.2, 18]} />
            <PartMaterial color={rightSupport.color} active={selectedPartId === rightSupport.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {beam ? (
        <InteractivePart part={beam} active={selectedPartId === beam.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 2.1, 0]} castShadow>
            <boxGeometry args={[3.4, 0.16, 0.2]} />
            <PartMaterial color={beam.color} active={selectedPartId === beam.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {suspension ? (
        <InteractivePart
          part={suspension}
          active={selectedPartId === suspension.id}
          onSelectPart={onSelectPart}
        >
          {[-0.32, 0.32].map((x, index) => (
            <mesh key={index} position={[x, 1.18, 0]} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 1.3, 12]} />
              <PartMaterial color={suspension.color} active={selectedPartId === suspension.id} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {seat ? (
        <InteractivePart part={seat} active={selectedPartId === seat.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 0.46, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.12, 0.42]} />
            <PartMaterial color={seat.color} active={selectedPartId === seat.id} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function WorkoutModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const frontPost = partsById["front-post"];
  const rearPost = partsById["rear-post"];
  const pullupBar = partsById["pullup-bar"];
  const parallelBars = partsById["parallel-bars"];
  const crossLink = partsById["cross-link"];

  return (
    <group position={[0, -0.12, 0]}>
      {frontPost ? (
        <InteractivePart
          part={frontPost}
          active={selectedPartId === frontPost.id}
          onSelectPart={onSelectPart}
        >
          {[
            [-1.15, 1.2, 0.55],
            [-1.15, 1.2, -0.55],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 2.4, 18]} />
              <PartMaterial color={frontPost.color} active={selectedPartId === frontPost.id} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {rearPost ? (
        <InteractivePart
          part={rearPost}
          active={selectedPartId === rearPost.id}
          onSelectPart={onSelectPart}
        >
          {[
            [1.15, 1.2, 0.55],
            [1.15, 1.2, -0.55],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 2.4, 18]} />
              <PartMaterial color={rearPost.color} active={selectedPartId === rearPost.id} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {pullupBar ? (
        <InteractivePart
          part={pullupBar}
          active={selectedPartId === pullupBar.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[0, 2.28, 0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 2.35, 16]} />
            <PartMaterial color={pullupBar.color} active={selectedPartId === pullupBar.id} />
          </mesh>
          <mesh position={[0, 2.28, -0.55]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 2.35, 16]} />
            <PartMaterial color={pullupBar.color} active={selectedPartId === pullupBar.id} />
          </mesh>
          {[-0.65, 0, 0.65].map((x, index) => (
            <mesh key={index} position={[x, 2.28, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 1.1, 14]} />
              <PartMaterial color={pullupBar.color} active={selectedPartId === pullupBar.id} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {parallelBars ? (
        <InteractivePart
          part={parallelBars}
          active={selectedPartId === parallelBars.id}
          onSelectPart={onSelectPart}
        >
          {[-0.3, 0.3].map((z, index) => (
            <group key={index}>
              <mesh position={[0, 1.22, z]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.055, 0.055, 2.0, 14]} />
                <PartMaterial color={parallelBars.color} active={selectedPartId === parallelBars.id} />
              </mesh>
              {[-0.9, 0.9].map((x) => (
                <mesh key={x} position={[x, 0.7, z]} castShadow>
                  <cylinderGeometry args={[0.07, 0.07, 1.1, 14]} />
                  <PartMaterial color={parallelBars.color} active={selectedPartId === parallelBars.id} />
                </mesh>
              ))}
            </group>
          ))}
        </InteractivePart>
      ) : null}

      {crossLink ? (
        <InteractivePart
          part={crossLink}
          active={selectedPartId === crossLink.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[2.1, 0.1, 0.1]} />
            <PartMaterial color={crossLink.color} active={selectedPartId === crossLink.id} />
          </mesh>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[1.5, 0.08, 0.08]} />
            <PartMaterial color={crossLink.color} active={selectedPartId === crossLink.id} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function ParkModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const base = partsById["base"];
  const body = partsById["body"];
  const accent = partsById["accent"];

  return (
    <group position={[0, -0.08, 0]}>
      {base ? (
        <InteractivePart part={base} active={selectedPartId === base.id} onSelectPart={onSelectPart}>
          {[
            [-1.05, 0.36, -0.42],
            [1.05, 0.36, -0.42],
            [-1.05, 0.36, 0.42],
            [1.05, 0.36, 0.42],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <boxGeometry args={[0.18, 0.72, 0.18]} />
              <PartMaterial color={base.color} active={selectedPartId === base.id} />
            </mesh>
          ))}
          <mesh position={[0, 0.08, 0]} receiveShadow>
            <boxGeometry args={[2.5, 0.16, 1.2]} />
            <PartMaterial color={base.color} active={selectedPartId === base.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {body ? (
        <InteractivePart part={body} active={selectedPartId === body.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 0.86, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.3, 0.16, 1.0]} />
            <PartMaterial color={body.color} active={selectedPartId === body.id} />
          </mesh>
          <mesh position={[0, 1.46, -0.42]} castShadow>
            <boxGeometry args={[2.3, 1.0, 0.12]} />
            <PartMaterial color={body.color} active={selectedPartId === body.id} />
          </mesh>
        </InteractivePart>
      ) : null}

      {accent ? (
        <InteractivePart
          part={accent}
          active={selectedPartId === accent.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[0.95, 1.05, 0.56]} castShadow>
            <boxGeometry args={[0.22, 1.28, 0.18]} />
            <PartMaterial color={accent.color} active={selectedPartId === accent.id} />
          </mesh>
          <mesh position={[0, 1.98, 0]} castShadow>
            <boxGeometry args={[2.55, 0.18, 1.24]} />
            <PartMaterial color={accent.color} active={selectedPartId === accent.id} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function PavilionModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const frame = partsById["pavilion-frame"];
  const roof = partsById["pavilion-roof"];
  const deck = partsById["pavilion-deck"];
  const panels = partsById["pavilion-panels"];

  return (
    <group position={[0, -0.1, 0]}>
      {frame ? (
        <InteractivePart part={frame} active={selectedPartId === frame.id} onSelectPart={onSelectPart}>
          {[
            [-1.15, 1.05, -0.85],
            [1.15, 1.05, -0.85],
            [-1.15, 1.05, 0.85],
            [1.15, 1.05, 0.85],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 2.1, 18]} />
              <PartMaterial color={frame.color} active={selectedPartId === frame.id} materialLabel={frame.material} />
            </mesh>
          ))}
          <mesh position={[0, 2.12, -0.85]} castShadow>
            <boxGeometry args={[2.5, 0.12, 0.12]} />
            <PartMaterial color={frame.color} active={selectedPartId === frame.id} materialLabel={frame.material} />
          </mesh>
          <mesh position={[0, 2.12, 0.85]} castShadow>
            <boxGeometry args={[2.5, 0.12, 0.12]} />
            <PartMaterial color={frame.color} active={selectedPartId === frame.id} materialLabel={frame.material} />
          </mesh>
        </InteractivePart>
      ) : null}

      {deck ? (
        <InteractivePart part={deck} active={selectedPartId === deck.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 0.08, 0]} receiveShadow castShadow>
            <boxGeometry args={[2.75, 0.16, 2.05]} />
            <PartMaterial color={deck.color} active={selectedPartId === deck.id} materialLabel={deck.material} />
          </mesh>
        </InteractivePart>
      ) : null}

      {roof ? (
        <InteractivePart part={roof} active={selectedPartId === roof.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 2.52, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
            <coneGeometry args={[1.95, 0.76, 4]} />
            <PartMaterial color={roof.color} active={selectedPartId === roof.id} materialLabel={roof.material} />
          </mesh>
          <mesh position={[0, 2.08, 0]} castShadow>
            <boxGeometry args={[2.95, 0.12, 2.35]} />
            <meshStandardMaterial color="#6a5141" roughness={0.55} metalness={0.05} />
          </mesh>
        </InteractivePart>
      ) : null}

      {panels ? (
        <InteractivePart part={panels} active={selectedPartId === panels.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 1.08, -0.92]} castShadow>
            <boxGeometry args={[2.2, 0.64, 0.08]} />
            <PartMaterial color={panels.color} active={selectedPartId === panels.id} materialLabel={panels.material} />
          </mesh>
          <mesh position={[1.2, 1.08, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[1.7, 0.64, 0.08]} />
            <PartMaterial color={panels.color} active={selectedPartId === panels.id} materialLabel={panels.material} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function SandboxModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const board = partsById["sandbox-board"];
  const seat = partsById["sandbox-seat"];
  const fill = partsById["sandbox-fill"];
  const canopy = partsById["sandbox-canopy"];

  return (
    <group position={[0, -0.12, 0]}>
      {board ? (
        <InteractivePart part={board} active={selectedPartId === board.id} onSelectPart={onSelectPart}>
          {([
            [0, 0.36, -1.0, 2.9, 0.32, 0.16],
            [0, 0.36, 1.0, 2.9, 0.32, 0.16],
            [-1.38, 0.36, 0, 0.16, 0.32, 1.85],
            [1.38, 0.36, 0, 0.16, 0.32, 1.85],
          ] as Array<[number, number, number, number, number, number]>).map(([x, y, z, w, h, d], index) => (
            <mesh key={index} position={[x, y, z]} castShadow receiveShadow>
              <boxGeometry args={[w, h, d]} />
              <PartMaterial color={board.color} active={selectedPartId === board.id} materialLabel={board.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {fill ? (
        <InteractivePart part={fill} active={selectedPartId === fill.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 0.23, 0]} receiveShadow>
            <boxGeometry args={[2.38, 0.11, 1.58]} />
            <PartMaterial color={fill.color} active={selectedPartId === fill.id} materialLabel={fill.material} />
          </mesh>
        </InteractivePart>
      ) : null}

      {seat ? (
        <InteractivePart part={seat} active={selectedPartId === seat.id} onSelectPart={onSelectPart}>
          <mesh position={[0, 0.58, 1.02]} castShadow>
            <boxGeometry args={[2.85, 0.11, 0.34]} />
            <PartMaterial color={seat.color} active={selectedPartId === seat.id} materialLabel={seat.material} />
          </mesh>
          <mesh position={[0, 0.58, -1.02]} castShadow>
            <boxGeometry args={[2.85, 0.11, 0.34]} />
            <PartMaterial color={seat.color} active={selectedPartId === seat.id} materialLabel={seat.material} />
          </mesh>
        </InteractivePart>
      ) : null}

      {canopy ? (
        <InteractivePart part={canopy} active={selectedPartId === canopy.id} onSelectPart={onSelectPart}>
          {[-1.05, 1.05].map((x) => (
            <mesh key={x} position={[x, 1.16, -0.82]} castShadow>
              <cylinderGeometry args={[0.06, 0.06, 1.95, 14]} />
              <meshStandardMaterial color="#8b6a4f" roughness={0.56} />
            </mesh>
          ))}
          <mesh position={[0, 2.05, -0.15]} rotation={[0.08, 0, 0]} castShadow>
            <boxGeometry args={[2.8, 0.1, 1.45]} />
            <PartMaterial color={canopy.color} active={selectedPartId === canopy.id} materialLabel={canopy.material} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function BenchModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const frame = partsById["bench-frame"];
  const seat = partsById["bench-seat"];
  const back = partsById["bench-back"];
  const mount = partsById["bench-mount"];

  return (
    <group position={[0, -0.08, 0]}>
      {frame ? (
        <InteractivePart part={frame} active={selectedPartId === frame.id} onSelectPart={onSelectPart}>
          {[-1.18, 1.18].map((x) => (
            <group key={x} position={[x, 0, 0]}>
              <mesh position={[0, 0.42, 0.36]} castShadow>
                <boxGeometry args={[0.12, 0.8, 0.12]} />
                <PartMaterial color={frame.color} active={selectedPartId === frame.id} materialLabel={frame.material} />
              </mesh>
              <mesh position={[0, 0.72, -0.36]} rotation={[0.42, 0, 0]} castShadow>
                <boxGeometry args={[0.12, 1.05, 0.12]} />
                <PartMaterial color={frame.color} active={selectedPartId === frame.id} materialLabel={frame.material} />
              </mesh>
            </group>
          ))}
        </InteractivePart>
      ) : null}

      {mount ? (
        <InteractivePart part={mount} active={selectedPartId === mount.id} onSelectPart={onSelectPart}>
          {[-1.18, 1.18].map((x) => (
            <mesh key={x} position={[x, 0.02, 0.12]} receiveShadow>
              <boxGeometry args={[0.55, 0.06, 0.95]} />
              <PartMaterial color={mount.color} active={selectedPartId === mount.id} materialLabel={mount.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {seat ? (
        <InteractivePart part={seat} active={selectedPartId === seat.id} onSelectPart={onSelectPart}>
          {[-0.26, 0, 0.26].map((z) => (
            <mesh key={z} position={[0, 0.72, z]} castShadow receiveShadow>
              <boxGeometry args={[2.9, 0.1, 0.16]} />
              <PartMaterial color={seat.color} active={selectedPartId === seat.id} materialLabel={seat.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {back ? (
        <InteractivePart part={back} active={selectedPartId === back.id} onSelectPart={onSelectPart}>
          {[-0.18, 0.16, 0.5].map((y) => (
            <mesh key={y} position={[0, 1.05 + y, -0.48]} rotation={[0.22, 0, 0]} castShadow>
              <boxGeometry args={[2.9, 0.12, 0.14]} />
              <PartMaterial color={back.color} active={selectedPartId === back.id} materialLabel={back.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}
    </group>
  );
}

function BasketballModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const post = partsById["basket-post"];
  const arm = partsById["basket-arm"];
  const shield = partsById["basket-shield"];
  const ring = partsById["basket-ring"];

  return (
    <group position={[0, -0.12, 0]}>
      {post ? (
        <InteractivePart part={post} active={selectedPartId === post.id} onSelectPart={onSelectPart}>
          <mesh position={[-1.05, 1.18, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.12, 2.36, 20]} />
            <PartMaterial color={post.color} active={selectedPartId === post.id} materialLabel={post.material} />
          </mesh>
          <mesh position={[-1.05, 0.02, 0]} receiveShadow>
            <cylinderGeometry args={[0.38, 0.42, 0.08, 24]} />
            <meshStandardMaterial color="#d6d0c4" roughness={0.72} />
          </mesh>
        </InteractivePart>
      ) : null}

      {arm ? (
        <InteractivePart part={arm} active={selectedPartId === arm.id} onSelectPart={onSelectPart}>
          <mesh position={[-0.28, 2.25, 0]} rotation={[0, 0, 0.08]} castShadow>
            <boxGeometry args={[1.62, 0.14, 0.14]} />
            <PartMaterial color={arm.color} active={selectedPartId === arm.id} materialLabel={arm.material} />
          </mesh>
        </InteractivePart>
      ) : null}

      {shield ? (
        <InteractivePart part={shield} active={selectedPartId === shield.id} onSelectPart={onSelectPart}>
          <mesh position={[0.64, 2.18, 0]} castShadow>
            <boxGeometry args={[1.08, 0.82, 0.08]} />
            <PartMaterial color={shield.color} active={selectedPartId === shield.id} materialLabel={shield.material} />
          </mesh>
          <mesh position={[0.64, 2.18, 0.045]} castShadow>
            <boxGeometry args={[0.62, 0.42, 0.025]} />
            <meshBasicMaterial color="#111111" transparent opacity={0.08} />
          </mesh>
        </InteractivePart>
      ) : null}

      {ring ? (
        <InteractivePart part={ring} active={selectedPartId === ring.id} onSelectPart={onSelectPart}>
          <mesh position={[1.0, 1.86, 0.3]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[0.28, 0.025, 12, 36]} />
            <PartMaterial color={ring.color} active={selectedPartId === ring.id} materialLabel={ring.material} />
          </mesh>
          <mesh position={[0.75, 1.88, 0.16]} castShadow>
            <boxGeometry args={[0.12, 0.12, 0.32]} />
            <PartMaterial color={ring.color} active={selectedPartId === ring.id} materialLabel={ring.material} />
          </mesh>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function RopeComplexModel({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const posts = partsById["rope-posts"];
  const net = partsById["rope-net"];
  const bridge = partsById["rope-bridge"];
  const fittings = partsById["rope-fittings"];

  return (
    <group position={[0, -0.12, 0]}>
      {posts ? (
        <InteractivePart part={posts} active={selectedPartId === posts.id} onSelectPart={onSelectPart}>
          {[
            [-1.25, 1.1, -0.75],
            [1.25, 1.1, -0.75],
            [-1.25, 1.1, 0.75],
            [1.25, 1.1, 0.75],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <cylinderGeometry args={[0.09, 0.09, 2.2, 18]} />
              <PartMaterial color={posts.color} active={selectedPartId === posts.id} materialLabel={posts.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {net ? (
        <InteractivePart part={net} active={selectedPartId === net.id} onSelectPart={onSelectPart}>
          {[-0.55, -0.18, 0.18, 0.55].map((x) => (
            <mesh key={`v-${x}`} position={[x, 1.18, 0]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 1.45, 10]} />
              <PartMaterial color={net.color} active={selectedPartId === net.id} materialLabel={net.material} />
            </mesh>
          ))}
          {[0.62, 1.0, 1.38, 1.76].map((y) => (
            <mesh key={`h-${y}`} position={[0, y, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.025, 0.025, 2.15, 10]} />
              <PartMaterial color={net.color} active={selectedPartId === net.id} materialLabel={net.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {bridge ? (
        <InteractivePart part={bridge} active={selectedPartId === bridge.id} onSelectPart={onSelectPart}>
          {[-0.32, 0, 0.32].map((z) => (
            <mesh key={z} position={[0, 0.72, 0.75 + z]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 2.25, 12]} />
              <PartMaterial color={bridge.color} active={selectedPartId === bridge.id} materialLabel={bridge.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}

      {fittings ? (
        <InteractivePart part={fittings} active={selectedPartId === fittings.id} onSelectPart={onSelectPart}>
          {[
            [-1.25, 1.75, 0],
            [1.25, 1.75, 0],
            [-1.25, 0.72, 0.75],
            [1.25, 0.72, 0.75],
          ].map((position, index) => (
            <mesh key={index} position={position as [number, number, number]} castShadow>
              <boxGeometry args={[0.18, 0.18, 0.18]} />
              <PartMaterial color={fittings.color} active={selectedPartId === fittings.id} materialLabel={fittings.material} />
            </mesh>
          ))}
        </InteractivePart>
      ) : null}
    </group>
  );
}

function SlideGdap01Model({
  partsById,
  selectedPartId,
  onSelectPart,
}: {
  partsById: Record<string, ViewerPart>;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
}) {
  const supportPosts = partsById["support-posts"];
  const platformDeck = partsById["platform-deck"];
  const slideSurface = partsById["slide-surface"];
  const sidePanels = partsById["side-panels"];
  const handrail = partsById["handrail"];
  const exitSupport = partsById["exit-support"];

  return (
    <group position={[-0.2, -0.08, 0]}>
      {supportPosts ? (
        <InteractivePart
          part={supportPosts}
          active={selectedPartId === supportPosts.id}
          onSelectPart={onSelectPart}
        >
          {[
            [-1.65, 1.18, -0.02],
            [-0.3, 1.18, 0.55],
          ].map((position, index) => (
            <group key={index} position={position as [number, number, number]}>
              <mesh castShadow>
                <cylinderGeometry args={[0.11, 0.11, 2.36, 18]} />
                <PartMaterial
                  color={supportPosts.color}
                  active={selectedPartId === supportPosts.id}
                  materialLabel={supportPosts.material}
                />
              </mesh>
              <mesh position={[0, 1.2, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.05, 14]} />
                <meshStandardMaterial color="#141414" roughness={0.62} metalness={0.12} />
              </mesh>
            </group>
          ))}
          <mesh position={[-2.38, 0.28, -0.46]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.56, 14]} />
            <PartMaterial
              color={supportPosts.color}
              active={selectedPartId === supportPosts.id}
              materialLabel={supportPosts.material}
            />
          </mesh>
          <mesh position={[-0.98, 0.72, 0.1]} rotation={[0, 0, -0.14]} castShadow>
            <cylinderGeometry args={[0.045, 0.045, 1.12, 12]} />
            <PartMaterial
              color={supportPosts.color}
              active={selectedPartId === supportPosts.id}
              materialLabel={supportPosts.material}
            />
          </mesh>
        </InteractivePart>
      ) : null}

      {platformDeck ? (
        <InteractivePart
          part={platformDeck}
          active={selectedPartId === platformDeck.id}
          onSelectPart={onSelectPart}
        >
          {[-0.28, 0, 0.28].map((z, index) => (
            <mesh key={index} position={[-1.84, 0.42, z]} castShadow receiveShadow>
              <boxGeometry args={[1.56, 0.05, 0.24]} />
              <PartMaterial
                color={platformDeck.color}
                active={selectedPartId === platformDeck.id}
                materialLabel={platformDeck.material}
              />
            </mesh>
          ))}
          <mesh position={[-1.84, 0.33, 0]} castShadow>
            <boxGeometry args={[1.62, 0.06, 0.86]} />
            <meshStandardMaterial color="#8d643b" roughness={0.78} metalness={0.06} />
          </mesh>
          <mesh position={[-1.05, 0.31, 0]} castShadow>
            <boxGeometry args={[0.08, 0.22, 0.84]} />
            <meshStandardMaterial color="#8d643b" roughness={0.78} metalness={0.06} />
          </mesh>
        </InteractivePart>
      ) : null}

      {slideSurface ? (
        <InteractivePart
          part={slideSurface}
          active={selectedPartId === slideSurface.id}
          onSelectPart={onSelectPart}
        >
          <group>
            <SlideChannelMesh
              color={slideSurface.color}
              active={selectedPartId === slideSurface.id}
              materialLabel={slideSurface.material}
            />
            <TubeRail
              points={[
                [-0.18, 1.98, 0.63],
                [0.18, 1.78, 0.7],
                [0.78, 1.34, 0.79],
                [1.58, 0.76, 0.92],
                [2.52, 0.18, 1.02],
                [3.1, 0.05, 1.02],
              ]}
              radius={0.036}
              color="#acb3ba"
              active={selectedPartId === slideSurface.id}
              materialLabel={slideSurface.material}
            />
            <TubeRail
              points={[
                [-0.18, 1.98, -0.08],
                [0.18, 1.78, -0.02],
                [0.78, 1.34, 0.04],
                [1.58, 0.76, 0.14],
                [2.52, 0.18, 0.22],
                [3.1, 0.05, 0.22],
              ]}
              radius={0.036}
              color="#acb3ba"
              active={selectedPartId === slideSurface.id}
              materialLabel={slideSurface.material}
            />
            <mesh position={[2.98, 0.02, 0.62]} rotation={[0, -0.14, -0.04]} castShadow>
              <boxGeometry args={[0.62, 0.08, 0.72]} />
              <PartMaterial
                color={slideSurface.color}
                active={selectedPartId === slideSurface.id}
                materialLabel={slideSurface.material}
              />
            </mesh>
          </group>
        </InteractivePart>
      ) : null}

      {sidePanels ? (
        <InteractivePart
          part={sidePanels}
          active={selectedPartId === sidePanels.id}
          onSelectPart={onSelectPart}
        >
          <mesh position={[-0.2, 1.98, 0.69]} rotation={[0, -0.14, 0.06]} castShadow>
            <boxGeometry args={[1.12, 0.9, 0.04]} />
            <PartMaterial
              color={sidePanels.color}
              active={selectedPartId === sidePanels.id}
              materialLabel={sidePanels.material}
            />
          </mesh>
          <mesh position={[-0.68, 1.82, 0.04]} rotation={[0, -0.14, 0.02]} castShadow>
            <boxGeometry args={[0.86, 0.96, 0.04]} />
            <PartMaterial
              color={sidePanels.color}
              active={selectedPartId === sidePanels.id}
              materialLabel={sidePanels.material}
            />
          </mesh>
          <mesh position={[-0.4, 1.95, 0.36]} rotation={[0, -0.14, 0.84]} castShadow>
            <boxGeometry args={[0.68, 0.04, 0.64]} />
            <PartMaterial
              color={sidePanels.color}
              active={selectedPartId === sidePanels.id}
              materialLabel={sidePanels.material}
            />
          </mesh>
          <mesh position={[1.06, 1.02, 0.97]} rotation={[0, -0.14, -0.72]} castShadow>
            <boxGeometry args={[2.72, 0.42, 0.04]} />
            <PartMaterial
              color={sidePanels.color}
              active={selectedPartId === sidePanels.id}
              materialLabel={sidePanels.material}
            />
          </mesh>
          <mesh position={[1.22, 1.02, 0.03]} rotation={[0, -0.14, -0.72]} castShadow>
            <boxGeometry args={[2.72, 0.42, 0.04]} />
            <PartMaterial
              color={sidePanels.color}
              active={selectedPartId === sidePanels.id}
              materialLabel={sidePanels.material}
            />
          </mesh>
        </InteractivePart>
      ) : null}

      {handrail ? (
        <InteractivePart part={handrail} active={selectedPartId === handrail.id} onSelectPart={onSelectPart}>
          <TubeRail
            points={[
              [-1.22, 2.1, 0.08],
              [-0.92, 2.44, 0.16],
              [-0.58, 2.22, 0.24],
              [-0.22, 2.42, 0.42],
              [0.02, 2.24, 0.56],
            ]}
            radius={0.04}
            color={handrail.color}
            active={selectedPartId === handrail.id}
            materialLabel={handrail.material}
          />
        </InteractivePart>
      ) : null}

      {exitSupport ? (
        <InteractivePart
          part={exitSupport}
          active={selectedPartId === exitSupport.id}
          onSelectPart={onSelectPart}
        >
          <group position={[3.18, -0.1, 0.62]}>
            {[-0.32, 0.32].map((z, index) => (
              <mesh key={index} position={[0, 0.24, z]} castShadow>
                <cylinderGeometry args={[0.04, 0.04, 0.48, 12]} />
                <PartMaterial
                  color={exitSupport.color}
                  active={selectedPartId === exitSupport.id}
                  materialLabel={exitSupport.material}
                />
              </mesh>
            ))}
            <mesh position={[0, 0.46, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.6, 12]} />
              <PartMaterial
                color={exitSupport.color}
                active={selectedPartId === exitSupport.id}
                materialLabel={exitSupport.material}
              />
            </mesh>
            <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.032, 0.032, 0.64, 12]} />
              <meshStandardMaterial color="#8d949c" roughness={0.28} metalness={0.64} />
            </mesh>
          </group>
        </InteractivePart>
      ) : null}
    </group>
  );
}

function sceneForKind(kind: ViewerSceneKind) {
  return kind;
}

export function ProceduralProductModel({
  spec,
  selectedPartId,
  onSelectPart,
}: ProceduralProductModelProps) {
  const partsById = useMemo(
    () => Object.fromEntries(spec.parts.map((part) => [part.id, part])),
    [spec.parts],
  );

  const kind = sceneForKind(spec.sceneKind);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]} receiveShadow>
        <circleGeometry args={[4.9, 60]} />
        <meshStandardMaterial color="#ece7e0" />
      </mesh>

      {kind === "PLAYGROUND" ? (
        <PlaygroundModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "SWING" ? (
        <SwingModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "WORKOUT" ? (
        <WorkoutModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "PARK" ? (
        <ParkModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "PAVILION" ? (
        <PavilionModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "SANDBOX" ? (
        <SandboxModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "BENCH" ? (
        <BenchModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "BASKETBALL" ? (
        <BasketballModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "ROPE_COMPLEX" ? (
        <RopeComplexModel
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}

      {kind === "SLIDE_GDAP01" ? (
        <SlideGdap01Model
          partsById={partsById}
          selectedPartId={selectedPartId}
          onSelectPart={onSelectPart}
        />
      ) : null}
    </group>
  );
}
