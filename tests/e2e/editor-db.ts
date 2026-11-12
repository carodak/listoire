import type { Page } from "@playwright/test";

/** Values stored under `keys` in the editor's IndexedDB store (as the app saved them). */
export const readEditorKeys = (page: Page, keys: string[]) =>
  page.evaluate(
    (keys) =>
      new Promise<unknown[]>((resolve, reject) => {
        const request = indexedDB.open("listoire-editor");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const projects = database.transaction("projects").objectStore("projects");
          const reads = keys.map((key) => projects.get(key));
          projects.transaction.oncomplete = () => {
            database.close();
            resolve(reads.map((read) => read.result));
          };
          projects.transaction.onerror = () => reject(projects.transaction.error);
        };
      }),
    keys,
  );

/** Stores `value` under `key` in the editor's IndexedDB store, creating it if needed. */
export const writeEditorKey = (page: Page, key: string, value: unknown) =>
  page.evaluate(
    ([key, value]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("listoire-editor");
        request.onupgradeneeded = () => request.result.createObjectStore("projects");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("projects", "readwrite");
          transaction.objectStore("projects").put(value, key as string);
          transaction.oncomplete = () => {
            database.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      }),
    [key, value] as const,
  );
