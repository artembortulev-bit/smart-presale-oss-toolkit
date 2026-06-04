"use client";

import { useMemo } from "react";
import { ThreeEvent, useLoader } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { TDSLoader } from "three/addons/loaders/TDSLoader.js";

import { matchViewerPartId } from "@/ui/components/catalog/real-model-matching";
import { ProductViewerSpec } from "@/ui/components/catalog/product-viewer-spec";

type RealProductModelProps = {
  spec: ProductViewerSpec;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
};

type PreparedModelPrimitiveProps = {
  object: THREE.Object3D;
  spec: ProductViewerSpec;
  selectedPartId?: string;
  onSelectPart: (partId: string) => void;
};

function getResourcePath(url: string) {
  const lastSlashIndex = url.lastIndexOf("/");
  return lastSlashIndex === -1 ? "/" : url.slice(0, lastSlashIndex + 1);
}

function cloneMaterial(material: THREE.Material, active: boolean) {
  const cloned = material.clone();

  if ("color" in cloned && cloned.color instanceof THREE.Color && active) {
    cloned.color = cloned.color.clone().lerp(new THREE.Color("#ff9d61"), 0.18);
  }

  if ("emissive" in cloned && cloned.emissive instanceof THREE.Color) {
    cloned.emissive = active ? new THREE.Color("#f26622") : new THREE.Color("#000000");
  }

  if ("emissiveIntensity" in cloned) {
    cloned.emissiveIntensity = active ? 0.24 : 0;
  }

  return cloned;
}

function assignInteractiveState(
  mesh: THREE.Mesh,
  spec: ProductViewerSpec,
  selectedPartId?: string,
) {
  const sourceMaterialNames = Array.isArray(mesh.material)
    ? mesh.material.map((material) => material?.name ?? "")
    : [mesh.material?.name ?? ""];
  const matchedPartId = matchViewerPartId(spec.parts, {
    objectName: mesh.name,
    materialNames: sourceMaterialNames,
  });

  mesh.userData.viewerPartId = matchedPartId;

  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) =>
      cloneMaterial(material, Boolean(matchedPartId && matchedPartId === selectedPartId)),
    );
    return;
  }

  if (mesh.material) {
    mesh.material = cloneMaterial(
      mesh.material,
      Boolean(matchedPartId && matchedPartId === selectedPartId),
    );
  }
}

function prepareModel(
  source: THREE.Object3D,
  spec: ProductViewerSpec,
  selectedPartId?: string,
) {
  const clone = source.clone(true);

  clone.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
      assignInteractiveState(node, spec, selectedPartId);
    }
  });

  clone.updateMatrixWorld(true);

  const initialBox = new THREE.Box3().setFromObject(clone);
  const initialSize = initialBox.getSize(new THREE.Vector3());
  const maxDimension = Math.max(initialSize.x, initialSize.y, initialSize.z, 1);
  const scale = (spec.modelScale ?? 4.2) / maxDimension;

  clone.scale.setScalar(scale);
  clone.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(clone);
  const normalizedCenter = normalizedBox.getCenter(new THREE.Vector3());

  clone.position.x -= normalizedCenter.x;
  clone.position.z -= normalizedCenter.z;
  clone.position.y += -0.72 - normalizedBox.min.y;
  clone.updateMatrixWorld(true);

  return clone;
}

function resolvePartId(object: THREE.Object3D | null) {
  let current: THREE.Object3D | null = object;

  while (current) {
    const partId = current.userData.viewerPartId;
    if (typeof partId === "string") {
      return partId;
    }

    current = current.parent;
  }

  return undefined;
}

function PreparedModelPrimitive({
  object,
  spec,
  selectedPartId,
  onSelectPart,
}: PreparedModelPrimitiveProps) {
  const prepared = useMemo(
    () => prepareModel(object, spec, selectedPartId),
    [object, selectedPartId, spec],
  );

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    const partId = resolvePartId(event.object);

    if (!partId) {
      return;
    }

    event.stopPropagation();
    onSelectPart(partId);
  };

  return <primitive object={prepared} onPointerDown={handlePointerDown} />;
}

function GlbModel(props: Omit<PreparedModelPrimitiveProps, "object"> & { url: string }) {
  const gltf = useGLTF(props.url);
  return <PreparedModelPrimitive {...props} object={gltf.scene} />;
}

function ObjModel(props: Omit<PreparedModelPrimitiveProps, "object"> & { url: string }) {
  const object = useLoader(OBJLoader, props.url);
  return <PreparedModelPrimitive {...props} object={object} />;
}

function ObjModelWithMaterials(
  props: Omit<PreparedModelPrimitiveProps, "object"> & {
    url: string;
    materialUrl: string;
  },
) {
  const resourcePath = getResourcePath(props.materialUrl);
  const materials = useLoader(MTLLoader, props.materialUrl, (loader) => {
    loader.setResourcePath(resourcePath);
  });

  const object = useLoader(OBJLoader, props.url, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });

  return <PreparedModelPrimitive {...props} object={object} />;
}

function FbxModel(props: Omit<PreparedModelPrimitiveProps, "object"> & { url: string }) {
  const object = useLoader(FBXLoader, props.url);
  return <PreparedModelPrimitive {...props} object={object} />;
}

function TdsModel(props: Omit<PreparedModelPrimitiveProps, "object"> & { url: string }) {
  const object = useLoader(TDSLoader, props.url, (loader) => {
    loader.setResourcePath(getResourcePath(props.url));
  });

  return <PreparedModelPrimitive {...props} object={object} />;
}

function DaeModel(props: Omit<PreparedModelPrimitiveProps, "object"> & { url: string }) {
  const collada = useLoader(ColladaLoader, props.url);
  return <PreparedModelPrimitive {...props} object={collada?.scene ?? new THREE.Group()} />;
}

export function RealProductModel({
  spec,
  selectedPartId,
  onSelectPart,
}: RealProductModelProps) {
  if (!spec.modelUrl) {
    return null;
  }

  const sharedProps = {
    spec,
    selectedPartId,
    onSelectPart,
  };

  switch (spec.modelFormat) {
    case "OBJ":
      return spec.materialUrl ? (
        <ObjModelWithMaterials
          {...sharedProps}
          url={spec.modelUrl}
          materialUrl={spec.materialUrl}
        />
      ) : (
        <ObjModel {...sharedProps} url={spec.modelUrl} />
      );
    case "FBX":
      return <FbxModel {...sharedProps} url={spec.modelUrl} />;
    case "3DS":
      return <TdsModel {...sharedProps} url={spec.modelUrl} />;
    case "DAE":
      return <DaeModel {...sharedProps} url={spec.modelUrl} />;
    case "GLB":
    default:
      return <GlbModel {...sharedProps} url={spec.modelUrl} />;
  }
}
