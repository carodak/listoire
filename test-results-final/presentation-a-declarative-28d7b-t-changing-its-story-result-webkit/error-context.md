# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: presentation.spec.ts >> a declarative cinematic can be skipped without changing its story result
- Location: tests\e2e\presentation.spec.ts:88:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Show all text', exact: true })
    - locator resolved to <button class="transport-button">Show all text</button>
  - attempting click action
    - waiting for element to be visible, enabled and stable
    - element is not stable
  - retrying click action
    - waiting for element to be visible, enabled and stable
  - element was detached from the DOM, retrying

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Skip to content" [ref=e4]:
    - /url: "#story"
  - banner [ref=e5]:
    - button "Listoire home" [ref=e6] [cursor=pointer]: listoire.
    - group [ref=e8]:
      - 'button "Language: English" [ref=e9] [cursor=pointer]':
        - generic [ref=e16]: English
        - generic [aria-hidden] [ref=e17]: ⌄
  - main [ref=e18]:
    - generic [ref=e19]:
      - complementary [ref=e20]:
        - button "Pause" [ref=e22] [cursor=pointer]
        - group [ref=e23]:
          - generic "Reading preferences" [ref=e24] [cursor=pointer]
          - option "Small"
          - option "Medium" [selected]
          - option "Large"
          - option "Serif" [selected]
          - option "Sans serif"
          - option "Comfortable" [selected]
          - option "Spacious"
          - option "Progressive" [selected]
          - option "Instant"
      - complementary "My Character" [ref=e25]:
        - button "My Character" [ref=e26] [cursor=pointer]: ▸ My Character
    - paragraph [ref=e27]: Chapter One
    - heading "The Girl in the Photograph" [level=1] [ref=e28]
    - generic [ref=e29]:
      - paragraph [ref=e30]:
        - generic [ref=e31]: “Why the upstairs room?”
        - text: “Why the upstairs room?”
      - paragraph [ref=e32]:
        - generic [ref=e33]: The woman hesitated. “Because it was sealed twenty-nine years ago. And someone opened it last night.”
        - text: The woman hesitated. “Because it was sealed twenty-nine years ago. And someone opened it last night.”
      - figure [ref=e34]:
        - img "Black-and-white line portrait of a young woman looking over her shoulder." [ref=e36]
      - paragraph [ref=e37]:
        - generic [ref=e38]: The call ended.
        - text: The call ended.
      - navigation "Choose your next step" [ref=e39]:
        - button "Continue reading" [ref=e40] [cursor=pointer]:
          - generic [aria-hidden] [ref=e42]: ↗
    - progressbar "Story progress" [ref=e43]
    - generic [ref=e44]:
      - status [ref=e45]: Your place is saved
      - generic [ref=e46]:
        - button "Read from the beginning" [ref=e47] [cursor=pointer]
        - button "Download saved progress" [ref=e48] [cursor=pointer]
```

# Test source

```ts
  3   |   page,
  4   | }) => {
  5   |   await page.emulateMedia({ reducedMotion: "no-preference" });
  6   |   await page.route("**/api/narration", (route) => route.fulfill({ status: 503, body: "{}" }));
  7   |   await page.route("**/stories/house/en.json", async (route) => {
  8   |     const response = await route.fetch();
  9   |     const bundle = await response.json();
  10  |     bundle.narration = [];
  11  |     await route.fulfill({ json: bundle });
  12  |   });
  13  |   await page.addInitScript(() => {
  14  |     const state = { calls: 0, cancels: 0, pauses: 0, resumes: 0, utterance: null as unknown };
  15  |     Object.assign(window, { voiceTest: state });
  16  |     Object.defineProperty(window, "speechSynthesis", {
  17  |       value: {
  18  |         getVoices: () => [{ lang: "en-GB", localService: true }],
  19  |         speak: (utterance: unknown) => {
  20  |           state.calls++;
  21  |           state.utterance = utterance;
  22  |         },
  23  |         cancel: () => {
  24  |           state.cancels++;
  25  |         },
  26  |         pause: () => {
  27  |           state.pauses++;
  28  |         },
  29  |         resume: () => {
  30  |           state.resumes++;
  31  |         },
  32  |       },
  33  |     });
  34  |     Object.defineProperty(window, "SpeechSynthesisUtterance", {
  35  |       value: class {
  36  |         text: string;
  37  |         constructor(text: string) {
  38  |           this.text = text;
  39  |         }
  40  |       },
  41  |     });
  42  |   });
  43  |   await page.goto("/");
  44  |   await page.getByRole("button", { name: "Play an existing story" }).click();
  45  |   const heading = page.getByRole("heading", { name: "The Girl in the Photograph" });
  46  |   await expect(heading).toBeVisible();
  47  |   await page.getByText("Reading preferences", { exact: true }).click();
  48  |   await page.getByLabel("Read aloud", { exact: true }).check();
  49  |   await expect
  50  |     .poll(() =>
  51  |       page.evaluate(() => (window as unknown as { voiceTest: { calls: number } }).voiceTest.calls),
  52  |     )
  53  |     .toBe(1);
  54  |   await page.getByRole("button", { name: "Pause", exact: true }).click();
  55  |   await page.getByRole("button", { name: "Resume", exact: true }).click();
  56  |   await page.evaluate(() => {
  57  |     const voice = (
  58  |       window as unknown as { voiceTest: { utterance: { onboundary: (event: unknown) => void } } }
  59  |     ).voiceTest;
  60  |     voice.utterance.onboundary({ charIndex: 40, charLength: 3 });
  61  |   });
  62  |   await expect(page.locator(".prose p").first()).toContainText("The first time");
  63  |   await page.getByLabel("Read aloud", { exact: true }).uncheck();
  64  |   await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  65  |   await expect(heading).toBeVisible();
  66  |   const result = await page.evaluate(async () => {
  67  |     const voice = (
  68  |       window as unknown as { voiceTest: { cancels: number; pauses: number; resumes: number } }
  69  |     ).voiceTest;
  70  |     const database = await new Promise<IDBDatabase>((resolve, reject) => {
  71  |       const request = indexedDB.open("listoire");
  72  |       request.onsuccess = () => resolve(request.result);
  73  |       request.onerror = () => reject(request.error);
  74  |     });
  75  |     const revision = await new Promise<number>((resolve) => {
  76  |       const request = database.transaction("records").objectStore("records").get("save:house:en");
  77  |       request.onsuccess = () => resolve(request.result.revision);
  78  |     });
  79  |     database.close();
  80  |     return { ...voice, revision };
  81  |   });
  82  |   expect(result.revision).toBe(1);
  83  |   expect(result.cancels).toBeGreaterThan(0);
  84  |   expect(result.pauses).toBeGreaterThan(0);
  85  |   expect(result.resumes).toBeGreaterThan(0);
  86  | });
  87  | 
  88  | test("a declarative cinematic can be skipped without changing its story result", async ({
  89  |   page,
  90  | }) => {
  91  |   await page.emulateMedia({ reducedMotion: "no-preference" });
  92  |   await page.goto("/");
  93  |   await page.getByRole("button", { name: "Play an existing story" }).click();
  94  |   await page.getByRole("button", { name: "Show all text", exact: true }).click();
  95  |   await page.getByRole("button", { name: "Continue reading", exact: true }).click();
  96  |   await page.getByRole("button", { name: "Show all text", exact: true }).click();
  97  |   await page.getByRole("button", { name: "Ask about the locked room", exact: true }).click();
  98  |   await page
  99  |     .getByRole("dialog")
  100 |     .getByRole("button", { name: "Skip cinematic", exact: true })
  101 |     .click();
  102 |   await expect(page.getByRole("button", { name: "Skip cinematic", exact: true })).toHaveCount(0);
> 103 |   await page.getByRole("button", { name: "Show all text", exact: true }).click();
      |                                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  104 |   await expect(page.locator(".prose")).toContainText("twenty-nine years");
  105 |   await expect(page.getByRole("button", { name: "Continue reading", exact: true })).toBeEnabled();
  106 |   const running = await page
  107 |     .locator(".cinematic-stage")
  108 |     .evaluate((stage) => stage.getAnimations({ subtree: true }).length);
  109 |   expect(running).toBe(0);
  110 | });
  111 | 
```