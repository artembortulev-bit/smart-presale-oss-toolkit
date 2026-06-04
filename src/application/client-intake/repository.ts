import {
  ClientRequestPhoto,
  ClientRequestRecord,
} from "@/application/client-intake/types";

import { ClientRequestQualificationSnapshot } from "@/application/client-intake/qualification";

export type SaveClientRequestInput = {
  request: ClientRequestRecord;
  qualification?: ClientRequestQualificationSnapshot;
  createdByUserId?: string;
  assignedManagerId?: string;
};

export type ClientRequestRepository = {
  list(): Promise<ClientRequestRecord[]>;
  findById(requestId: string): Promise<ClientRequestRecord | null>;
  findByReference(reference: string): Promise<ClientRequestRecord | null>;
  save(input: SaveClientRequestInput): Promise<ClientRequestRecord>;
  attachPhotos(requestId: string, photos: ClientRequestPhoto[]): Promise<void>;
};
