import OrbitAPIClient, { emulatorAPIConfig } from "@withorbit/api-client";
import { Event, Task, TaskID } from "@withorbit/core";
import OrbitStoreWeb from "@withorbit/store-web";
import { APISyncAdapter, syncOrbitStore } from "@withorbit/sync";
import { PromptId } from "./promptSlice";

// NOTE: Explicitly ignoring race conditions throughout this file. It's a prototype!

export class OrbitSyncManager {
  private store: OrbitStoreWeb;
  private apiClient: OrbitAPIClient;
  private apiSyncAdapter: APISyncAdapter;

  constructor(
    userID: string,
    authenticateRequest: () => Promise<{ idToken: string }>,
  ) {
    this.store = new OrbitStoreWeb({ databaseName: userID });

    // TODO: switch API destination depending on development environment
    const config = emulatorAPIConfig;
    this.apiClient = new OrbitAPIClient(authenticateRequest, config);
    const apiClient = this.apiClient;
    this.apiSyncAdapter = new APISyncAdapter(apiClient, config.baseURL);
  }

  async getRemoteTaskStates(
    promptIDs: PromptId[],
  ): Promise<Map<PromptId, Task>> {
    await this.sync();
    return await this.store.database.getEntities(promptIDs as TaskID[]);
  }

  async storeAndSync(events: Event[]) {
    await this.store.database.putEvents(events);
    await this.sync();
  }

  private async sync() {
    await syncOrbitStore({
      source: this.store,
      destination: this.apiSyncAdapter,
    });
  }
}
