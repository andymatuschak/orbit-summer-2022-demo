import OrbitAPIClient from "@withorbit/api-client";
import {
  AttachmentID,
  AttachmentMIMEType,
  encodeUUIDBytesToWebSafeBase64ID,
  EntityType,
  Event,
  EventType,
  generateUniqueID,
  getAttachmentMIMETypeForFilename,
  Task,
  TaskID,
  TaskIngestEvent,
} from "@withorbit/core";
import OrbitStoreWeb from "@withorbit/store-web";
import { APISyncAdapter, syncOrbitStore } from "@withorbit/sync";
import { apiConfig } from "../config";
import { normalizeURL } from "../util/normalizeURL";
import { PromptID } from "./promptSlice";

const getAttachmentURLFromID = async (
  store: OrbitStoreWeb,
  id: AttachmentID,
) => {
  return await store.attachmentStore.getURLForStoredAttachment(id);
};

// NOTE: Explicitly ignoring race conditions throughout this file. It's a prototype!
export class OrbitSyncManager {
  private store: OrbitStoreWeb;
  private apiClient: OrbitAPIClient;
  private apiSyncAdapter: APISyncAdapter;
  private refreshIDToken: (retry: () => Promise<unknown>) => Promise<unknown>;

  constructor(
    userID: string,
    authenticateRequest: () => Promise<{ idToken: string }>,
    refreshIDToken: (retry: () => unknown) => Promise<unknown>,
  ) {
    this.store = new OrbitStoreWeb({ databaseName: userID });
    this.refreshIDToken = refreshIDToken;

    this.apiClient = new OrbitAPIClient(authenticateRequest, apiConfig);
    const apiClient = this.apiClient;
    this.apiSyncAdapter = new APISyncAdapter(apiClient, apiConfig.baseURL);
  }

  async getRemoteTaskStates(
    matchingURL: string = normalizeURL(document.location.href),
  ): Promise<{ [key: PromptID]: Task }> {
    const didSync = await this.sync();
    if (!didSync) {
      return {};
    }

    const output: { [key: PromptID]: Task } = {};
    // This is obviously super dumb; we should add a query for provenance URLs.
    let afterID: TaskID | undefined;
    let tasks: Task[] = [];
    do {
      afterID = tasks.length > 0 ? tasks[tasks.length - 1].id : undefined;
      tasks = await this.store.database.listEntities({
        afterID,
        entityType: EntityType.Task,
        limit: 1000,
      });
      for (const task of tasks) {
        if (task.provenance?.identifier === matchingURL) {
          output[task.id] = task;
        }
      }
    } while (tasks.length > 0);
    return output;
  }

  async storeAndSync(events: Event[]) {
    await this.store.database.putEvents(events);
    await this.sync();
  }

  private async sync() {
    let didSync = false;
    const _sync = async () => {
      await syncOrbitStore({
        source: this.store,
        destination: this.apiSyncAdapter,
      });
      didSync = true;
    };
    try {
      await _sync();
    } catch (e) {
      console.error("Sync failed; attempting to refresh credential", e);
      await this.refreshIDToken(_sync);
    }
    return didSync;
  }
}
