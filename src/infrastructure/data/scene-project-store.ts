import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  SceneProjectRecord,
  SceneProjectStore,
  sceneProjectStoreSchema,
} from "@/application/scene-projects/types";
import { logger } from "@/infrastructure/logging/logger";

const storePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "generated",
  "scene-projects.json",
);

const emptyStore = (): SceneProjectStore => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  projects: [],
});

let writeQueue = Promise.resolve();

async function ensureDirectory(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function readStoreUnsafe() {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = sceneProjectStoreSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      logger.warn(
        { issues: parsed.error.issues, storePath },
        "Scene project store is invalid, falling back to empty store",
      );
      return emptyStore();
    }

    return parsed.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error({ error, storePath }, "Failed to read scene project store");
    }

    return emptyStore();
  }
}

async function writeStoreUnsafe(store: SceneProjectStore) {
  await ensureDirectory(storePath);
  const tempPath = `${storePath}.${randomUUID()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempPath, storePath);
}

function queueWrite<T>(task: () => Promise<T>) {
  const nextTask = writeQueue.then(task, task);
  writeQueue = nextTask.then(
    () => undefined,
    () => undefined,
  );

  return nextTask;
}

export async function listSceneProjectsFromStore() {
  const store = await readStoreUnsafe();
  return store.projects.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

export async function getSceneProjectFromStore(projectId: string) {
  const store = await readStoreUnsafe();
  return store.projects.find((project) => project.id === projectId);
}

export async function upsertSceneProjectInStore(
  project: Omit<SceneProjectRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
  },
) {
  return queueWrite(async () => {
    const store = await readStoreUnsafe();
    const existing = project.id
      ? store.projects.find((item) => item.id === project.id)
      : undefined;
    const now = new Date().toISOString();
    const nextProject: SceneProjectRecord = {
      ...project,
      id: existing?.id ?? randomUUID(),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const nextStore: SceneProjectStore = {
      ...store,
      updatedAt: now,
      projects: [nextProject, ...store.projects.filter((item) => item.id !== nextProject.id)],
    };

    await writeStoreUnsafe(nextStore);
    return nextProject;
  });
}
