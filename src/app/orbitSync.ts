import OrbitAPIClient from "@withorbit/api-client";
import {
  AttachmentMIMEType,
  EntityType,
  Event,
  EventType,
  Task,
  TaskID,
} from "@withorbit/core";
import { OrbitStore } from "@withorbit/store-shared";
import OrbitStoreWeb from "@withorbit/store-web";
import { APISyncAdapter, syncOrbitStore } from "@withorbit/sync";
import { apiConfig } from "../config";
import { normalizeURL } from "../util/normalizeURL";
import { AttachmentEntry } from "./orbitSyncSlice";
import { PromptID } from "./promptSlice";

// NOTE: Explicitly ignoring race conditions throughout this file. It's a prototype!

export class OrbitSyncManager {
  private readonly store: OrbitStore;
  private readonly apiClient: OrbitAPIClient;
  private readonly apiSyncAdapter: APISyncAdapter;
  private readonly refreshIDToken: (
    retry: () => Promise<unknown>,
  ) => Promise<unknown>;

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
          if (task.provenance?.selectors) {
            output[task.id] = task;
          } else {
            console.warn(
              `Missing selectors for task ${task.id}: ${JSON.stringify(
                task.spec,
                null,
                "\t",
              )}`,
            );
          }
        }
      }
    } while (tasks.length > 0);
    return output;
  }

  async storeAndSync(events: Event[], attachments: AttachmentEntry[]) {
    for (const event of events) {
      if (event.type !== EventType.AttachmentIngest) continue;

      const id = event.entityID;
      const attachment = attachments.find((a) => a.id === id);
      if (!attachment) {
        throw new Error(
          `Have attachment ingest event for id ${id} but no URL for that attachment`,
        );
      }
      const fetchResult = await fetch(attachment.url);
      if (!fetchResult.ok) {
        throw new Error(
          `Couldn't fetch pending attachment at ${attachment.url}`,
        );
      }
      const contentType = fetchResult.headers.get("Content-Type");
      if (
        !contentType ||
        !Object.values(AttachmentMIMEType).includes(contentType as any)
      ) {
        throw new Error(
          `Invalid content type ${contentType} for attachment ${attachment.id} at ${attachment.url}`,
        );
      }

      const content = await fetchResult.arrayBuffer();
      await this.store.attachmentStore.storeAttachment(
        new Uint8Array(content),
        attachment.id,
        contentType as AttachmentMIMEType,
      );
    }
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
