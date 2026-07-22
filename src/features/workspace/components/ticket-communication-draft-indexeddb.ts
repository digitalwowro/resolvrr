"use client";

import {
  enqueueCommunicationDraftStorage,
} from "./ticket-communication-draft-runtime";

const databaseName = "resolvrr-workspace-drafts";
const storeName = "communicationDrafts";
const databaseVersion = 9;
let databasePromise: Promise<IDBDatabase> | undefined;

export type DraftStorageUnavailableReason =
  | "indexeddb-unavailable"
  | "storage-failed";

function openDraftDatabase(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("indexeddb-unavailable"));
  }
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = (event) => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "id" });
      } else if ((event as IDBVersionChangeEvent).oldVersion < databaseVersion) {
        request.transaction?.objectStore(storeName).clear();
      }
    };
    request.onerror = () => {
      databasePromise = undefined;
      reject(request.error ?? new Error("storage-failed"));
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => {
        request.result.close();
        databasePromise = undefined;
      };
      resolve(request.result);
    };
  });
  return databasePromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const database = await openDraftDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    let requestResult!: T;
    let settled = false;
    const rejectOnce = (error: unknown) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    try {
      const request = callback(transaction.objectStore(storeName));
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () =>
        rejectOnce(request.error ?? new Error("storage-failed"));
      transaction.oncomplete = () => {
        if (settled) return;
        settled = true;
        resolve(requestResult);
      };
      transaction.onerror = () =>
        rejectOnce(transaction.error ?? new Error("storage-failed"));
      transaction.onabort = () =>
        rejectOnce(transaction.error ?? new Error("storage-failed"));
    } catch {
      transaction.abort();
      rejectOnce(new Error("storage-failed"));
    }
  });
}

export function draftStorageUnavailableReason(
  error: unknown,
): DraftStorageUnavailableReason {
  return error instanceof Error && error.message === "indexeddb-unavailable"
    ? "indexeddb-unavailable"
    : "storage-failed";
}

export function readDraftStorageRecord<T>(id: string): Promise<T | undefined> {
  return enqueueCommunicationDraftStorage(() =>
    withStore<T | undefined>("readonly", (store) => store.get(id))
  );
}

export function readAllDraftStorageRecords<T>(): Promise<T[]> {
  return enqueueCommunicationDraftStorage(() =>
    withStore<T[]>("readonly", (store) => store.getAll())
  );
}

export async function putDraftStorageRecord<T>(record: T): Promise<void> {
  await enqueueCommunicationDraftStorage(() =>
    withStore("readwrite", (store) => store.put(record))
  );
}

export function deleteDraftStorageRecord(id: string): Promise<void> {
  return enqueueCommunicationDraftStorage(() =>
    withStore("readwrite", (store) => store.delete(id))
  );
}
