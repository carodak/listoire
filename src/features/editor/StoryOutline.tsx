import { sceneMediaEntries } from "./scene-media.ts";
import { useState } from "react";
import type { StoryProject } from "../../contracts/editor-project.ts";
import { outlineEntries } from "./ink-outline.ts";

interface StoryOutlineProps {
  language: StoryProject["languages"][string];
  locale: string;
  locales: string[];
  selectedScene: string;
  onLocale: (locale: string) => void;
  onNavigate: (path: string) => void;
  onDialog: (dialog: string) => void;
  onMedia: (id: string, kind: string) => void;
  onHover: (id: string | null) => void;
}

export function StoryOutline({
  language,
  locale,
  locales,
  selectedScene,
  onLocale,
  onNavigate,
  onDialog,
  onMedia,
  onHover,
}: StoryOutlineProps) {
  const [tab, setTab] = useState("Files");
  return (
    <aside className="editor-outline" aria-label="Project navigation">
      <div className="sidebar-tabs" role="tablist" aria-label="Project panels">
        {["Files", "Story Outline", "Scene Media"].map((name) => (
          <button
            key={name}
            title={`Show ${name.toLowerCase()}`}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
          >
            {name}
          </button>
        ))}
      </div>
      {tab === "Files" && (
        <ProjectFiles locale={locale} locales={locales} onLocale={onLocale} onDialog={onDialog} />
      )}
      {tab === "Story Outline" && (
        <ScriptOutline script={language.script} onNavigate={onNavigate} />
      )}
      {tab === "Scene Media" && (
        <SceneMedia
          language={language}
          selectedScene={selectedScene}
          onDialog={onDialog}
          onMedia={onMedia}
          onHover={onHover}
        />
      )}
    </aside>
  );
}
function ProjectFiles({
  locale,
  locales,
  onLocale,
  onDialog,
}: Pick<StoryOutlineProps, "locale" | "locales" | "onLocale" | "onDialog">) {
  return (
    <div className="project-files">
      <p className="outline-heading">▾ house</p>
      {locales.map((code) => (
        <button
          key={code}
          aria-current={code === locale ? "page" : undefined}
          className={code === locale ? "selected" : ""}
          title={`Edit the complete ${code} Ink story`}
          onClick={() => onLocale(code)}
        >
          ▤ {code}.ink
        </button>
      ))}
      <button
        title="Edit the shared story configuration"
        onClick={() => onDialog("Project Properties")}
      >
        ⚙ story.json
      </button>
    </div>
  );
}
function ScriptOutline({
  script,
  onNavigate,
}: {
  script: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <div>
      <p className="editor-hint">Knots are main sections; Stitches are sections within them.</p>
      {outlineEntries(script).map((entry) => (
        <button
          key={entry.path}
          title={`Go to ${entry.kind}: ${entry.path}`}
          className={entry.kind === "Stitch" ? "outline-stitch" : undefined}
          onClick={() => onNavigate(entry.path)}
        >
          <span>{entry.kind === "Knot" ? "§" : "¶"}</span>
          {entry.name}
          <small>{entry.kind}</small>
        </button>
      ))}
    </div>
  );
}
function SceneMedia({
  language,
  selectedScene,
  onDialog,
  onMedia,
  onHover,
}: Pick<StoryOutlineProps, "language" | "selectedScene" | "onDialog" | "onMedia" | "onHover">) {
  const entries = sceneMediaEntries(language, selectedScene);
  return (
    <div>
      <p className="outline-heading">{selectedScene}</p>
      <p className="editor-hint">
        Media in this section. Hover to find its command in the script; click to edit.
      </p>
      <button
        title="Edit this section's presentation settings"
        onClick={() => onDialog("Scene Properties")}
      >
        ⚙ Scene Properties
      </button>
      {entries.map((entry) => (
        <button
          key={entry.id}
          title={`Edit ${entry.kind.toLowerCase()}: ${entry.label}`}
          onMouseEnter={() => onHover(entry.id)}
          onMouseLeave={() => onHover(null)}
          onFocus={() => onHover(entry.id)}
          onBlur={() => onHover(null)}
          onClick={() => onMedia(entry.id, entry.kind)}
        >
          <span>{entry.kind === "Image" ? "▧" : "✧"}</span>
          {entry.label}
          <small>{entry.id}</small>
        </button>
      ))}
      {!entries.length && <p>No media in this section yet.</p>}
    </div>
  );
}
