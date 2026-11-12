import { appPath } from "./contracts/app-path.ts";
import { createRoot } from "react-dom/client";
import { lazy, Suspense } from "react";
import { I18nextProvider } from "react-i18next";
import { App } from "./app/App.tsx";
import { i18n } from "./i18n/i18n.ts";
import { createIndexedDbStore } from "./persistence/indexeddb-store.ts";
import { SaveManager } from "./persistence/save-manager.ts";
import { unlockAudio } from "./features/media/audio-unlock.ts";
import type { ReaderSettings } from "./contracts/story.ts";
import "./app/app.css";

const saves = new SaveManager(createIndexedDbStore());
const defaults: ReaderSettings = { schemaVersion: 2, language: "en", welcomeSound: true };
// Waited for so the first render has the reader's language; a blocked database never answers.
const initialSettings = await Promise.race([
  saves.settings().catch(() => defaults),
  new Promise<ReaderSettings>((resolve) => setTimeout(() => resolve(defaults), 3000)),
]);
await i18n.changeLanguage(initialSettings.language);
// Browsers allow sound only after a gesture: start audio on the first one (Play, or in the editor).
for (const type of ["click", "keydown"])
  addEventListener(type, unlockAudio, { capture: true, once: true });
const EditorRoute = lazy(() => import("./app/EditorRoute.tsx"));
const editorPath = appPath("editor");
if (window.location.pathname === `${editorPath}/`)
  window.history.replaceState(null, "", editorPath);
createRoot(document.getElementById("root")!).render(
  <I18nextProvider i18n={i18n}>
    <Suspense fallback={<p role="status">Loading Story Editor…</p>}>
      {window.location.pathname === editorPath ? (
        <EditorRoute />
      ) : (
        <App saves={saves} initialSettings={initialSettings} />
      )}
    </Suspense>
  </I18nextProvider>,
);
