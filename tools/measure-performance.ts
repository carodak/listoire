/**
 * Repeatable performance measurement of the Reader and the Story Editor (Chromium).
 *
 *   npm run perf -- [--base http://127.0.0.1:4175] [--runs 5] [--out file.json]
 *                                     [--only reader,readerMotion,readerWithDraft,combat,editor]
 *
 * Needs a running dev server (see AGENTS.md) and, for the bundle section, a `dist/` from
 * `npm run build`. Every number is the median of `--runs` fresh browser contexts, in
 * milliseconds unless its name says otherwise. Timings start inside the page, at the click.
 */
import { chromium } from "@playwright/test";
import type { Browser, CDPSession, Page } from "@playwright/test";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import { withFixtureStory } from "../tests/e2e/fixture-story.ts";

const option = (name: string, fallback: string) => {
  const index = process.argv.indexOf(`--${name}`);
  return index < 0 ? fallback : process.argv[index + 1]!;
};
const base = option("base", "http://127.0.0.1:4175");
const runs = Number(option("runs", "5"));
const out = option("out", "");

type Metrics = Record<string, number>;
interface Probe {
  commits: number;
  long: number;
  t0: number;
  done: Promise<number>;
}
declare global {
  interface Window {
    __probe: Probe;
  }
}

/** Counts React commits and long-task time from the first script of every page. */
function installProbe() {
  const probe = { commits: 0, long: 0, t0: 0, done: Promise.resolve(0) };
  window.__probe = probe;
  const renderers = new Map<number, unknown>();
  (window as unknown as Record<string, unknown>).__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true,
    renderers,
    inject(renderer: unknown) {
      renderers.set(renderers.size + 1, renderer);
      return renderers.size;
    },
    onCommitFiberRoot() {
      probe.commits++;
    },
    onCommitFiberUnmount() {},
    onPostCommitFiberRoot() {},
    checkDCE() {},
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) probe.long += entry.duration;
  }).observe({ type: "longtask", buffered: true });
}

/** Time from `act` (a click made inside the page) until `done` is true and painted. */
async function timed(page: Page, act: () => Promise<unknown>, done: string) {
  await page.evaluate((expression) => {
    const probe = window.__probe;
    const check = new Function(`return (${expression})`) as () => unknown;
    probe.t0 = 0;
    probe.done = new Promise((resolve) => {
      const tick = () => {
        let ready: unknown = false;
        try {
          ready = probe.t0 && check();
        } catch {
          ready = false;
        }
        if (ready) requestAnimationFrame(() => resolve(performance.now() - probe.t0));
        else requestAnimationFrame(tick);
      };
      tick();
    });
  }, done);
  await act();
  return page.evaluate(() => window.__probe.done);
}
/** Clicks without Playwright's own waits, stamping the start time in the page. */
const click = (page: Page, selector: string, text?: string) => () =>
  page.evaluate(
    ([selector, text]) => {
      const target = [...document.querySelectorAll<HTMLElement>(selector!)].find(
        (node) => !text || node.textContent?.includes(text),
      );
      if (!target) throw new Error(`Nothing to click: ${selector} ${text ?? ""}`);
      window.__probe.t0 = performance.now();
      target.click();
    },
    [selector, text] as const,
  );
const counters = (page: Page) =>
  page.evaluate(() => ({ commits: window.__probe.commits, long: window.__probe.long }));
const settle = (page: Page, ms: number) => page.waitForTimeout(ms);

const sessions = new WeakMap<Page, Promise<CDPSession>>();
/** Chromium's own counters for this page (one protocol session per page, enabled once). */
async function browserMetrics(page: Page) {
  if (!sessions.has(page))
    sessions.set(
      page,
      page
        .context()
        .newCDPSession(page)
        .then(async (session) => {
          await session.send("Performance.enable");
          return session;
        }),
    );
  const session = await sessions.get(page)!;
  return {
    session,
    read: async () => {
      const { metrics } = await session.send("Performance.getMetrics");
      return (name: string) => metrics.find((metric) => metric.name === name)?.value ?? 0;
    },
  };
}
async function heap(page: Page) {
  const { session, read } = await browserMetrics(page);
  await session.send("HeapProfiler.collectGarbage");
  await session.send("HeapProfiler.collectGarbage");
  const value = await read();
  return {
    heapMb: value("JSHeapUsedSize") / 1048576,
    nodes: value("Nodes"),
    listeners: value("JSEventListeners"),
  };
}
/** Main-thread time spent so far in scripts, style and layout, in milliseconds. */
async function cpu(page: Page) {
  const value = await (await browserMetrics(page)).read();
  return (value("ScriptDuration") + value("RecalcStyleDuration") + value("LayoutDuration")) * 1000;
}

async function newPage(browser: Browser, reducedMotion: "reduce" | "no-preference") {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion,
  });
  await context.addInitScript(installProbe);
  const page = await context.newPage();
  const requests: string[] = [];
  page.on("request", (request) => requests.push(new URL(request.url()).pathname));
  return { context, page, requests };
}

const passage = "document.querySelector('.reader-copy')?.dataset.passage";
const idle = "document.querySelector('.reader')?.getAttribute('aria-busy') === 'false'";

/** Follows the first choice, closing reward notices; returns false when it cannot go on. */
async function nextPage(page: Page) {
  const before = await page.evaluate(passage);
  if (!(await page.locator(".choices button").count())) return null;
  const ms = await timed(
    page,
    click(page, ".choices button"),
    `${idle} && (${passage} !== ${JSON.stringify(before)} || document.querySelector('.reader-modal'))`,
  );
  const modal = page.locator(".reader-modal");
  if (await modal.count()) {
    const plain = page.locator(
      ".reader-modal:not(.reader-combat-modal):not(.check-roll-modal) .reader-modal-footer button",
    );
    if (!(await plain.count())) return null;
    await plain.last().click();
  }
  return ms;
}

async function reader(browser: Browser, motion: "reduce" | "no-preference"): Promise<Metrics> {
  const { context, page, requests } = await newPage(browser, motion);
  const metrics: Metrics = {};
  await cpu(page);
  await page.goto(base + "/");
  await page.locator(".welcome-play:enabled").waitFor();
  metrics.welcomeReady = await page.evaluate(() => performance.now());
  metrics.firstPage = await timed(
    page,
    click(page, ".welcome-play"),
    `document.querySelector('.reader-copy h1') && ${idle}`,
  );
  if (motion === "no-preference") {
    // Commits and main-thread time while the first page reveals its text, then with all the
    // text shown and only the narration playing.
    const start = await counters(page);
    const cpuStart = await cpu(page);
    await settle(page, 3000);
    const revealed = await counters(page);
    metrics.cpuMsPerSecondRevealing = ((await cpu(page)) - cpuStart) / 3;
    await page
      .getByRole("button", { name: "Show all text" })
      .click()
      .catch(() => {});
    await settle(page, 1500);
    const quiet = await counters(page);
    const cpuQuiet = await cpu(page);
    await settle(page, 2000);
    const end = await counters(page);
    metrics.cpuMsPerSecondNarrating = ((await cpu(page)) - cpuQuiet) / 2;
    metrics.commitsPerSecondRevealing = (revealed.commits - start.commits) / 3;
    metrics.commitsPerSecondNarrating = (end.commits - quiet.commits) / 2;
  }
  const turns: number[] = [];
  let pages = 1;
  const startHeap = await heap(page);
  while (pages < 20) {
    const ms = await nextPage(page);
    if (ms === null) {
      // The first-choice path ended or reached a check: read it again from the start.
      if (
        !(await page
          .getByRole("button", { name: "Previous page" })
          .isEnabled()
          .catch(() => false))
      )
        break;
      await page.getByRole("button", { name: "Previous page" }).click();
      await page.waitForFunction(idle);
    } else turns.push(ms);
    pages++;
  }
  metrics.pageTurn = median(turns);
  metrics.pagesRead = pages;
  const endHeap = await heap(page);
  metrics.heapMbAfter20Pages = endHeap.heapMb;
  metrics.heapGrowthMb = endHeap.heapMb - startHeap.heapMb;
  metrics.domNodesAfter20Pages = endHeap.nodes;
  metrics.listenersAfter20Pages = endHeap.listeners;
  metrics.editorModulesLoaded = requests.filter((path) => /\/features\/editor\//.test(path)).length;
  await context.close();
  return metrics;
}

/** The reader in a browser where the Story Editor has saved a draft (the author's case). */
async function readerWithDraft(browser: Browser): Promise<Metrics> {
  const { context, page, requests } = await newPage(browser, "reduce");
  await page.goto(base + "/editor");
  await page.waitForFunction(
    () => /^Saved/.test(document.querySelector(".editor-status [role=status]")?.textContent ?? ""),
    undefined,
    { timeout: 60_000 },
  );
  requests.length = 0;
  await page.goto(base + "/");
  await page.locator(".welcome-play:enabled").waitFor();
  const firstPage = await timed(
    page,
    click(page, ".welcome-play"),
    `document.querySelector('.reader-copy h1') && ${idle}`,
  );
  const workers = requests.filter((path) => /compiler\.worker/.test(path)).length;
  await context.close();
  return { firstPage, compileWorkers: workers };
}

async function combat(browser: Browser): Promise<Metrics> {
  const { context, page } = await newPage(browser, "reduce");
  await withFixtureStory(page);
  await page.goto(base + "/");
  await page.locator(".welcome-play:enabled").click();
  await page.getByRole("button", { name: "Walk to the gate" }).click();
  await page.getByRole("button", { name: "Fight the guardian" }).click();
  const modal = page.locator(".reader-combat-modal");
  await modal.getByRole("button", { name: "Basic attack" }).waitFor();
  const before = await counters(page);
  const log =
    "document.querySelectorAll('.reader-combat-modal [role=log] *, .combat-log *').length";
  const lines = await page.evaluate(log);
  const turn = await timed(
    page,
    click(page, ".reader-combat-modal button", "Basic attack"),
    `${idle} && (${log} !== ${lines} || !document.querySelector('.reader-combat-modal button:not(:disabled)'))`,
  );
  await settle(page, 1500);
  const after = await counters(page);
  await context.close();
  return { combatTurn: turn, combatTurnCommits: after.commits - before.commits };
}

type Ace = {
  getValue(): string;
  insert(text: string): void;
  gotoLine(row: number, column: number): void;
  clearSelection(): void;
  focus(): void;
};
const caretTo = (page: Page, text: string, offset = 0) =>
  page.locator(".ink-editor").evaluate(
    (node, [text, offset]) => {
      const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
      const rows = editor.getValue().split("\n");
      const row = rows.findIndex((line) => line.includes(text as string));
      if (row < 0) throw new Error(`No line contains ${text}`);
      editor.clearSelection();
      editor.gotoLine(row + 1 + (offset as number), 0);
      editor.focus();
    },
    [text, offset] as const,
  );

async function editor(browser: Browser): Promise<Metrics> {
  const { context, page, requests } = await newPage(browser, "reduce");
  const metrics: Metrics = {};
  await page.goto(base + "/editor");
  await page.locator(".preview-slot .prose").waitFor({ timeout: 60_000 });
  metrics.editorLoad = await page.evaluate(() => performance.now());
  await page.waitForFunction(() =>
    /Saved|loaded/.test(document.querySelector(".editor-status [role=status]")?.textContent ?? ""),
  );
  await settle(page, 1500);

  // Typing: each character inserted through Ace, timed to the frame after React has drawn.
  await caretTo(page, "# passage:chemin");
  await page.evaluate(() => {
    // Every status text with its time, to read the autosave steps afterwards.
    const status = document.querySelector(".editor-status [role=status]")!;
    const log: [number, string][] = [];
    (window as unknown as { __status: typeof log }).__status = log;
    new MutationObserver(() => log.push([performance.now(), status.textContent ?? ""])).observe(
      status,
      { childList: true, characterData: true, subtree: true },
    );
  });
  const loadCounters = await counters(page);
  const keys = await page.locator(".ink-editor").evaluate(async (node) => {
    const editor = (node as unknown as { env: { editor: Ace } }).env.editor;
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const times: number[] = [];
    const sync: number[] = [];
    for (const letter of "Zqxjv the quick brown fox ") {
      const start = performance.now();
      editor.insert(letter);
      sync.push(performance.now() - start);
      await frame();
      await frame();
      times.push(performance.now() - start);
      await new Promise((resolve) => setTimeout(resolve, 60));
    }
    return { times, sync };
  });
  const typed = await counters(page);
  // "Painted" waits two frames, so it cannot go below about 17 ms; "Sync" is the handler alone.
  metrics.keystrokePainted = median(keys.times);
  metrics.keystrokePaintedWorst = Math.max(...keys.times);
  metrics.keystrokeSync = median(keys.sync);
  metrics.keystrokeSyncWorst = Math.max(...keys.sync);
  metrics.keystrokeCommits = (typed.commits - loadCounters.commits) / keys.times.length;
  metrics.typingLongTaskMs = typed.long - loadCounters.long;

  // Live preview: from the last key to the typed word showing in the preview.
  const previewStart = Date.now();
  await page.waitForFunction(
    () => document.querySelector(".preview-slot")?.textContent?.includes("Zqxjv"),
    undefined,
    { timeout: 30_000 },
  );
  metrics.previewUpdate = Date.now() - previewStart + 60;

  // Autosave: from "Saving draft" to "Saved", and the main-thread time blocked meanwhile.
  const beforeSave = await counters(page);
  await page.waitForFunction(
    () =>
      (window as unknown as { __status: [number, string][] }).__status.some(([, text]) =>
        text.startsWith("Saved"),
      ),
    undefined,
    { timeout: 60_000 },
  );
  const steps = await page.evaluate(
    () => (window as unknown as { __status: [number, string][] }).__status,
  );
  const at = (prefix: string) => steps.find(([, text]) => text.startsWith(prefix))?.[0] ?? NaN;
  metrics.autosave = at("Saved") - at("Saving");
  const afterSave = await counters(page);
  metrics.autosaveLongTaskMs = afterSave.long - beforeSave.long;
  metrics.autosaveCommits = afterSave.commits - beforeSave.commits;

  // Ribbon tabs and scenes.
  const tabs: number[] = [];
  for (const name of ["Media", "Game", "Story", "Text"])
    tabs.push(
      await timed(
        page,
        click(page, ".ribbon-tabs [role=tab]", name),
        `[...document.querySelectorAll('.ribbon-tabs [role=tab]')].some((tab) => tab.textContent.trim() === ${JSON.stringify(name)} && tab.getAttribute('aria-selected') === 'true')`,
      ),
    );
  metrics.tabSwitch = median(tabs);
  await page.getByRole("tab", { name: "Story Outline" }).click();
  const scenes: number[] = [];
  const outline = page.locator("#outline-panel button");
  const count = Math.min(await outline.count(), 6);
  for (let index = 1; index < count; index++) {
    scenes.push(
      await timed(
        page,
        () =>
          page.evaluate((index) => {
            const button = document.querySelectorAll<HTMLElement>("#outline-panel button")[index]!;
            window.__probe.t0 = performance.now();
            button.click();
          }, index),
        "true",
      ),
    );
  }
  metrics.sceneSwitch = median(scenes);

  // Media > Image: open the dialog on Orée's three-layer image, then its library.
  await caretTo(page, "// @media chemin/chemin.illustration");
  await page.getByRole("tab", { name: "Media", exact: true }).click();
  const imageRequests = () => requests.filter((path) => /\.(webp|png|jpe?g)$/.test(path)).length;
  const beforeDialog = imageRequests();
  metrics.imageDialogOpen = await timed(
    page,
    click(page, "button", "Edit Selected Media"),
    "(() => { const images = [...document.querySelectorAll('dialog[open] .multiplane-viewport img')]; return images.length > 0 && images.every((image) => image.complete); })()",
  );
  const dialog = page.getByRole("dialog", { name: /^Edit image$/i });
  metrics.imageDialogRequests = imageRequests() - beforeDialog;
  const beforeLibrary = imageRequests();
  const beforeLibraryCounters = await counters(page);
  await dialog.getByRole("button", { name: "+ Add layer" }).click();
  metrics.imageLibraryOpen = await timed(
    page,
    click(page, "dialog[open] [role=tab]", "Library"),
    "document.querySelectorAll('dialog[open] .image-picker img, dialog[open] [data-asset] img').length > 0",
  );
  await settle(page, 2500);
  const afterLibrary = await counters(page);
  metrics.imageLibraryRequests = imageRequests() - beforeLibrary;
  metrics.imageLibraryLongTaskMs = afterLibrary.long - beforeLibraryCounters.long;
  metrics.imageLibraryCommits = afterLibrary.commits - beforeLibraryCounters.commits;
  const memory = await heap(page);
  metrics.editorHeapMb = memory.heapMb;
  await context.close();
  return metrics;
}

/** Chunk sizes from dist/, and what the reader's entry pulls in before any lazy import. */
async function bundle(): Promise<Metrics> {
  const metrics: Metrics = {};
  let html: string;
  try {
    html = await readFile("dist/index.html", "utf8");
  } catch {
    return metrics;
  }
  const files = (await readdir("dist/assets")).filter((file) => file.endsWith(".js"));
  const sources = new Map<string, Buffer>();
  for (const file of files) sources.set(file, await readFile(`dist/assets/${file}`));
  const statics = (file: string) =>
    [
      ...sources
        .get(file)!
        .toString("utf8")
        .matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g),
    ].map((match) => match[1]!);
  const initial = new Set<string>();
  const visit = (file: string) => {
    if (initial.has(file) || !sources.has(file)) return;
    initial.add(file);
    statics(file).forEach(visit);
  };
  for (const match of html.matchAll(/assets\/([^"]+\.js)/g)) visit(match[1]!);
  const size = (names: Iterable<string>, gzip = false) =>
    [...names].reduce(
      (sum, name) => sum + (gzip ? gzipSync(sources.get(name)!).length : sources.get(name)!.length),
      0,
    ) / 1024;
  const named = (pattern: RegExp) => files.filter((file) => pattern.test(file));
  metrics.initialJsKb = size(initial);
  metrics.initialJsGzipKb = size(initial, true);
  metrics.initialChunks = initial.size;
  metrics.editorRouteKb = size(named(/^EditorRoute-/));
  metrics.compilerWorkerKb = size(named(/^compiler\.worker-/));
  metrics.totalJsKb = size(files);
  metrics.editorChunksInInitial = [...initial].filter((file) =>
    /Editor|compiler/.test(file),
  ).length;
  return metrics;
}

function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}
/** `--only reader,editor` measures just those sections. */
const only = option("only", "").split(",").filter(Boolean);
const section = (name: string, measure: () => Promise<Metrics>) =>
  only.length && !only.includes(name) ? Promise.resolve({}) : repeat(name, measure);
async function repeat(name: string, measure: () => Promise<Metrics>) {
  const samples: Metrics[] = [];
  for (let run = 0; run < runs; run++) samples.push(await measure());
  const result: Metrics = {};
  for (const key of Object.keys(samples[0] ?? {}))
    result[`${name}.${key}`] = Math.round(median(samples.map((sample) => sample[key]!)) * 10) / 10;
  return result;
}

const browser = await chromium.launch({ args: ["--enable-precise-memory-info"] });
// One discarded visit of each page first: a cold dev server compiles modules on demand.
await reader(browser, "reduce");
await editor(browser);
const results: Metrics = {
  ...(await section("reader", () => reader(browser, "reduce"))),
  ...(await section("readerMotion", () => reader(browser, "no-preference"))),
  ...(await section("readerWithDraft", () => readerWithDraft(browser))),
  ...(await section("combat", () => combat(browser))),
  ...(await section("editor", () => editor(browser))),
  ...Object.fromEntries(
    Object.entries(await bundle()).map(([key, value]) => [
      `bundle.${key}`,
      Math.round(value * 10) / 10,
    ]),
  ),
};
await browser.close();
for (const [key, value] of Object.entries(results)) console.log(`${key.padEnd(40)} ${value}`);
if (out) await writeFile(out, JSON.stringify(results, null, 2) + "\n");
