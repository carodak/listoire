import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import { App } from "./app/App.tsx";
import { i18n } from "./i18n/i18n.ts";
import { createIndexedDbStore } from "./persistence/indexeddb-store.ts";
import { SaveManager } from "./persistence/save-manager.ts";
import "./app/app.css";

const saves = new SaveManager(createIndexedDbStore());
const initialSettings = await saves.settings().catch(() => ({
  schemaVersion: 2 as const,
  language: "en" as const,
  welcomeSound: true,
}));
await i18n.changeLanguage(initialSettings.language);
const EditorRoute = lazy(() => import("./app/EditorRoute.tsx"));
if (window.location.pathname === "/editor/") window.history.replaceState(null, "", "/editor");
createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<p role="status">Loading Story Editor…</p>}>
      {/^\/editor\/?$/.test(window.location.pathname) ? (
        <EditorRoute />
      ) : (
        <App saves={saves} initialSettings={initialSettings} />
      )}
    </Suspense>
  </I18nextProvider>,
);
