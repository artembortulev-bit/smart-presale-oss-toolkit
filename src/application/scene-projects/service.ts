import { getSceneProjectFromStore } from "@/infrastructure/data/scene-project-store";
import { sceneProjectRepository } from "@/infrastructure/db/scene-project-repository";
import { isOperationalDatabaseError } from "@/infrastructure/db/readiness";

export async function getSceneProject(sceneProjectId: string) {
  try {
    const dbProject = await sceneProjectRepository.findById(sceneProjectId);

    if (dbProject) {
      return dbProject;
    }
  } catch (error) {
    if (!isOperationalDatabaseError(error)) {
      throw error;
    }
  }

  return getSceneProjectFromStore(sceneProjectId);
}
