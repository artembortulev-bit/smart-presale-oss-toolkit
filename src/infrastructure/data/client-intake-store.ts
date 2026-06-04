import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  ClientRequestPhoto,
  ClientRequestRecord,
  ClientRequestStore,
  clientRequestStoreSchema,
} from "@/application/client-intake/types";
import { logger } from "@/infrastructure/logging/logger";

const defaultStorePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "generated",
  "client-requests.json",
);
const defaultUploadsDir = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "public",
  "uploads",
  "client-requests",
);

const storePath = defaultStorePath;
const uploadsDir = defaultUploadsDir;

const emptyStore = (): ClientRequestStore => ({
  version: 1,
  updatedAt: new Date().toISOString(),
  requests: [],
});

let writeQueue = Promise.resolve();

async function ensureDirectory(fileOrDirectoryPath: string, treatAsFile: boolean) {
  const targetDirectory = treatAsFile ? path.dirname(fileOrDirectoryPath) : fileOrDirectoryPath;
  await fs.mkdir(targetDirectory, { recursive: true });
}

async function readStoreUnsafe() {
  try {
    const raw = await fs.readFile(storePath, "utf8");
    const parsed = clientRequestStoreSchema.safeParse(JSON.parse(raw));

    if (!parsed.success) {
      logger.warn(
        {
          issues: parsed.error.issues,
          storePath,
        },
        "Client intake store is invalid, falling back to empty store",
      );
      return emptyStore();
    }

    return parsed.data;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.error({ error, storePath }, "Failed to read client intake store");
    }

    return emptyStore();
  }
}

async function writeStoreUnsafe(store: ClientRequestStore) {
  await ensureDirectory(storePath, true);
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

export async function listClientRequestsFromStore() {
  const store = await readStoreUnsafe();
  return store.requests.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getClientRequestFromStore(requestId: string) {
  const store = await readStoreUnsafe();
  return store.requests.find((request) => request.id === requestId);
}

export async function createClientRequestInStore(request: ClientRequestRecord) {
  return queueWrite(async () => {
    const store = await readStoreUnsafe();
    const nextStore: ClientRequestStore = {
      ...store,
      updatedAt: new Date().toISOString(),
      requests: [request, ...store.requests.filter((item) => item.id !== request.id)],
    };

    await writeStoreUnsafe(nextStore);
    return request;
  });
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export async function saveClientRequestPhotos(
  requestId: string,
  files: File[],
): Promise<ClientRequestPhoto[]> {
  await ensureDirectory(uploadsDir, false);
  const requestUploadsDir = path.join(uploadsDir, requestId);
  await fs.mkdir(requestUploadsDir, { recursive: true });

  const uploadedAt = new Date().toISOString();

  return Promise.all(
    files.map(async (file, index) => {
      const extension = path.extname(file.name) || `.${file.type.split("/")[1] ?? "jpg"}`;
      const baseName = sanitizeFileName(path.basename(file.name, extension)) || `photo-${index + 1}`;
      const fileName = `${String(index + 1).padStart(2, "0")}-${baseName}${extension}`;
      const absolutePath = path.join(requestUploadsDir, fileName);
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      await fs.writeFile(absolutePath, fileBuffer);

      return {
        id: randomUUID(),
        url: `/uploads/client-requests/${requestId}/${fileName}`,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        uploadedAt,
      } satisfies ClientRequestPhoto;
    }),
  );
}
