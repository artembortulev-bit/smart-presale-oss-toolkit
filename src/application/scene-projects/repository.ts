import { SceneProjectRecord } from "@/application/scene-projects/types";

export type SaveSceneProjectInput = Omit<
  SceneProjectRecord,
  "id" | "createdAt" | "updatedAt"
> & {
  id?: string;
  createdByUserId?: string;
};

export type SceneProjectRepository = {
  findById(sceneProjectId: string): Promise<SceneProjectRecord | null>;
  save(input: SaveSceneProjectInput): Promise<SceneProjectRecord>;
};
