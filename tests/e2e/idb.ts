import type { Page } from "@playwright/test";

type Access = {
  db: string;
  store: string;
  read?: string[];
  write?: [string, unknown];
  clear?: true;
};

/** Clears or writes, then reads, keys of one IndexedDB store, as the app keeps them. */
const access = (page: Page, request: Access) =>
  page.evaluate(
    ({ db, store, read = [], write, clear }) =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open(db);
        open.onupgradeneeded = () => open.result.createObjectStore(store);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const database = open.result;
          const transaction = database.transaction(
            store,
            write || clear ? "readwrite" : "readonly",
          );
          if (clear) transaction.objectStore(store).clear();
          if (write) transaction.objectStore(store).put(write[1], write[0]);
          const reads = read.map((key) => transaction.objectStore(store).get(key));
          transaction.oncomplete = () => {
            database.close();
            resolve(reads.map((request) => request.result));
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    request,
  );

/** The reader's records, the editor's projects and the editor's uploaded media. */
const stores = {
  reader: { db: "listoire", store: "records" },
  editor: { db: "listoire-editor", store: "projects" },
  media: { db: "listoire-media", store: "files" },
};
type Store = keyof typeof stores;

export const readKeys = (page: Page, where: Store, keys: string[]) =>
  access(page, { ...stores[where], read: keys });

export const writeKey = async (page: Page, where: Store, key: string, value: unknown) => {
  await access(page, { ...stores[where], write: [key, value] });
};

export const clearStore = async (page: Page, where: Store) => {
  await access(page, { ...stores[where], clear: true });
};
