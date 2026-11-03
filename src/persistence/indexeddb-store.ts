import { createStore, get, update } from "idb-keyval";
import type { SaveStore } from "./save-manager.ts";

export function createIndexedDbStore(): SaveStore {
  const store = createStore("listoire", "records");
  return {
    read: (key) => get(key, store),
    update: (key, updater) => update(key, updater, store),
  };
}
