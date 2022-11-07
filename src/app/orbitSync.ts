import OrbitAPIClient from "@withorbit/api-client";
import {
  AttachmentID,
  AttachmentIngestEvent,
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

import { v5 as uuidV5 } from "uuid";

const generateAttachmentIDForURL = (url: string): AttachmentID => {
  const bytes = new Uint8Array(16);
  uuidV5(url, uuidV5.URL, bytes);
  return encodeUUIDBytesToWebSafeBase64ID(bytes) as AttachmentID;
};

const storeAttachment = async (
  store: OrbitStoreWeb,
  attachmentURL: string,
  id: AttachmentID,
  type: AttachmentMIMEType,
) => {
  const imgArrayBuffer = await fetch(attachmentURL).then((o) =>
    o.arrayBuffer(),
  );

  const contents = new Uint8Array(imgArrayBuffer);
  await store.attachmentStore.storeAttachment(contents, id, type);
};

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

        // only handle 1 attachment for now
        if (
          "answer" in task.spec.content &&
          task.spec.content.answer.attachments.length
        ) {
          const attachmentID = task.spec.content.answer.attachments[0];
          task.spec.content.answer.text = `<img src="${await getAttachmentURLFromID(
            this.store,
            attachmentID,
          )}" />`;
        }

        if (task.spec.content.body.attachments.length) {
          const attachmentID = task.spec.content.body.attachments[0];
          task.spec.content.body.text = `<img src="${await getAttachmentURLFromID(
            this.store,
            attachmentID,
          )}" />`;
        }
      }
    } while (tasks.length > 0);
    return output;
  }
  async storeAndSync(events: Event[]) {
    // TODO: should the attachment events be generated before this? Or, can we just use ingestAttachmentFromURLs?

    await this.store.database.putEvents(
      events.filter((o) => o.type !== EventType.TaskIngest),
    );

    // keep attachment ids so we can use them when storing attachments
    // Event[] stores attachments as URLs, which we convert here
    const eventIDToAttachmentIDMap: {
      [k: string]: {
        answerAttachments?: AttachmentID[];
        questionAttachments?: AttachmentID[];
      };
    } = {};

    await this.store.database.putEvents(
      events
        .filter((o) => o.type === EventType.TaskIngest)
        .map((o) => {
          let ret = { ...o } as TaskIngestEvent;
          if ("answer" in ret.spec.content) {
            const answerAttachments = ret.spec.content.answer.attachments.map(
              (attatchmentURL) => generateAttachmentIDForURL(attatchmentURL),
            );

            eventIDToAttachmentIDMap[ret.id] = { answerAttachments };

            ret = {
              ...ret,
              spec: {
                ...ret.spec,
                content: {
                  ...ret.spec.content,
                  answer: {
                    ...ret.spec.content.answer,
                    attachments: answerAttachments,
                  },
                },
              },
            };
          }

          if (ret.spec.content.body.attachments.length) {
            const questionAttachments = ret.spec.content.body.attachments.map(
              (attatchmentURL) => generateAttachmentIDForURL(attatchmentURL),
            );
            eventIDToAttachmentIDMap[ret.id] = { questionAttachments };
            ret = {
              ...ret,
              spec: {
                ...ret.spec,
                content: {
                  ...ret.spec.content,
                  body: {
                    ...ret.spec.content.body,
                    attachments: questionAttachments,
                  },
                },
              },
            };
          }

          return ret;
        }),
    );

    // filter for attachments, convert attachment url to attachmentId, convert attachment data and store
    // track AttachmentIngestEvents for later
    const attachmentIngestEvents = [];
    for (const eventWithAttachment of (events as TaskIngestEvent[]).filter(
      (o) =>
        o.type === EventType.TaskIngest &&
        (("answer" in o.spec.content &&
          o.spec.content.answer.attachments.length) ||
          o.spec.content.body.attachments.length),
    )) {
      if ("answer" in eventWithAttachment.spec.content) {
        const { answerAttachments = [] } =
          eventIDToAttachmentIDMap[eventWithAttachment.id];
        let arrIdx = 0;

        for (const attachmentUrl of eventWithAttachment.spec.content.answer
          .attachments) {
          const id = answerAttachments[arrIdx];
          const mimeType = getAttachmentMIMETypeForFilename(attachmentUrl);

          if (id && mimeType) {
            await storeAttachment(this.store, attachmentUrl, id, mimeType);
            const newEvent: AttachmentIngestEvent = {
              id: generateUniqueID(),
              type: EventType.AttachmentIngest,
              entityID: id,
              timestampMillis: Date.now(),
              mimeType,
            };
            attachmentIngestEvents.push(newEvent);
          }
          arrIdx++;
        }
      }

      const { questionAttachments = [] } =
        eventIDToAttachmentIDMap[eventWithAttachment.id];
      let arrIdx = 0;
      for (const attachmentUrl of eventWithAttachment.spec.content.body
        .attachments) {
        const id = questionAttachments[arrIdx];
        const mimeType = getAttachmentMIMETypeForFilename(attachmentUrl);
        if (id && mimeType) {
          await storeAttachment(this.store, attachmentUrl, id, mimeType);
          const newEvent: AttachmentIngestEvent = {
            id: generateUniqueID(),
            type: EventType.AttachmentIngest,
            entityID: id,
            timestampMillis: Date.now(),
            mimeType,
          };
          attachmentIngestEvents.push(newEvent);
        }
        arrIdx++;
      }
    }

    await this.store.database.putEvents(attachmentIngestEvents);
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
