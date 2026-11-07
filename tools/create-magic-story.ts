import { readFile, writeFile } from "node:fs/promises";
import { StoryProjectSchema } from "../src/contracts/editor-project.ts";
import { GameDefinitionSchema } from "../src/contracts/game.ts";
import { defaultReadingPreferences } from "../src/contracts/presentation.ts";
import { compileProject } from "../src/features/editor/compiler.ts";

const root = new URL("../", import.meta.url);
const catalogue = JSON.parse(
  await readFile(new URL("assets/catalog/curated.json", root), "utf8"),
) as {
  entries: {
    id: string;
    sourceId?: string;
    title: string;
    description?: string;
    runtimePath: string;
    mediaType: string;
    sourceCollection: string;
    suggested: { roles: string[]; themes: string[]; layerRoles: string[] };
  }[];
};
const asset = (source: string) => {
  const entry = catalogue.entries.find((entry) => entry.sourceId === source || entry.id === source);
  if (!entry) throw new Error(`Missing story asset: ${source}`);
  return entry.id;
};
const images = {
  hero: asset("contemporary_character_curly_haired_woman_standing_001"),
  nour: asset(
    "medieval_fantasy_character_adult_female_medieval_courier_holding_a_folded_letter_001",
  ),
  ysee: asset(
    "medieval_fantasy_character_middle_aged_female_medieval_beekeeper_holding_a_small_skep_001",
  ),
  selyan: asset("medieval_fantasy_character_older_male_medieval_ferryman_with_oar_001"),
  abel: asset("medieval_fantasy_character_adult_male_fantasy_stonemason_in_simple_apron_001"),
  guardian: asset("medieval_fantasy_character_hooded_traveler_standing_001"),
  meadow: asset("shared_background_upland_meadow_footpath_001"),
  river: asset("shared_background_quiet_river_bend_with_far_cliffs_001"),
  dusk: asset("shared_background_moonlit_distant_hills_001"),
  arch: asset("medieval_fantasy_middleground_arched_stone_doorway_standing_alone_001"),
  house: asset("medieval_fantasy_middleground_timber_cottage_001"),
  tree: asset("shared_middleground_bare_deciduous_tree_001"),
  fern: asset("shared_foreground_fern_fronds_001"),
  grass: asset("shared_foreground_thin_grass_fringe_framing_the_lower_edge_001"),
  branch: asset("shared_foreground_bare_branch_upper_left_001"),
  bed: asset("shared_item_single_bed_with_blanket_001"),
  candle: asset("shared_item_single_unlit_candle_stump_001"),
  pen: asset("shared_item_plain_simple_fountain_pen_001"),
  letter: asset("shared_item_small_paper_parcel_tied_with_string_001"),
  apple: asset("shared_item_single_lopsided_apple_001"),
  cup: asset("shared_item_plain_tin_cup_001"),
};
const titles: Record<string, [string, string]> = {
  atelier: ["The watch without a spring", "La montre sans ressort"],
  messagere: ["The ninth delivery", "La neuvième livraison"],
  lettre: ["An invitation addressed to you", "Une lettre pour toi"],
  depart: ["The world behind you", "Le monde derrière toi"],
  chemin: ["The door at dusk", "La porte du crépuscule"],
  passage: ["Your unwritten time", "Ton temps encore à écrire"],
  cour: ["Orée", "Orée"],
  chambre: ["A place for your questions", "Une place pour tes questions"],
  relais: ["The keeping of small lights", "L'Entretien des petites lumières"],
  lueur: ["You made that", "C'est toi qui fais cela"],
  "cours-air": ["The Weight of Air", "Le Poids de l'air"],
  "air-test": ["An apple and a river", "Une pomme et une rivière"],
  "air-result": ["The landing can wait", "Pour l'atterrissage, on a le temps"],
  "cours-ecoute": ["The Listening Garden", "Le Jardin d'écoute"],
  "ecoute-test": ["An excellent assistant", "Une excellente assistante"],
  "ecoute-result": ["An afternoon worth keeping", "Un après-midi à garder"],
  bibliotheque: ["What holds us together", "Ce qui nous tient ensemble"],
  formule: ["Dawnstroke", "Trait d'aube"],
  sceau: ["Other beginners", "D'autres débutants"],
  serre: ["The missing note", "La note manquante"],
  fissure: ["What you know now", "Ce que tu sais, maintenant"],
  gardien: ["Hold the doorway", "Tenir le passage"],
  apres: ["The first sound", "Le premier bruit"],
  infirmerie: ["Apples provided", "Pommes fournies"],
  promesse: ["Tomorrow's lessons", "Les cours de demain"],
  fin: ["Leave a light on", "Laisser une lumière"],
};
const sound = {
  pages: asset("audio.bca76d831cf5165ab7b0"),
  rain: asset("audio.5ed3276af9fe4c73edaa"),
  birds: asset("audio.f972b0a958807be29e67"),
  magic: asset("audio.19ec79604baff7cb7e7a"),
  air: asset("audio.cdf05a1d947cb7c86048"),
  water: asset("audio.a5e745284b70b3e0e263"),
  impact: asset("audio.8e6699fb42384d0c0f21"),
  bells: asset("audio.c1d4bf4645d4e060f331"),
};
type Illustration = {
  image: string;
  role: "background" | "midground" | "foreground";
  x: number;
  y: number;
  scale: number;
};
const layer = (
  image: string,
  role: Illustration["role"],
  x = 0,
  y = 0,
  scale = 1,
): Illustration => ({ image, role, x, y, scale });
const motion = (preset = "none", durationMs = 7500) => ({
  preset,
  speed: "normal",
  intensity: "strong",
  direction: "auto",
  atmosphere: "none",
  layers: [],
  durationMs,
});
function illustration(
  image: string,
  layout = "wide",
  layers: Illustration[] = [],
  preset = "none",
  after = 1,
) {
  const isolated = layers.length === 0 && layout !== "background";
  return { image, layout, layers, preset, after, isolated };
}
const art: Record<string, ReturnType<typeof illustration>> = {
  atelier: illustration(images.candle, "inline", [], "none", 2),
  messagere: illustration(images.nour, "right"),
  lettre: illustration(images.letter, "inline", [], "none", 1),
  depart: illustration(images.hero, "right"),
  chemin: illustration(
    images.meadow,
    "wide",
    [layer(images.arch, "midground", 14, 7, 0.75), layer(images.grass, "foreground", 0, 16, 1.12)],
    "low-diagonal-pullback",
    1,
  ),
  passage: illustration(
    images.meadow,
    "fullscreen",
    [layer(images.arch, "midground", 0, 4, 1.1), layer(images.fern, "foreground", -28, 18, 1.25)],
    "high-arrival-hold-pullback",
    1,
  ),
  cour: illustration(
    images.meadow,
    "wide",
    [
      layer(images.house, "midground", -25, 9, 0.8),
      layer(images.arch, "midground", 24, 5, 0.8),
      layer(images.nour, "midground", 8, 10, 0.7),
      layer(images.branch, "foreground", -22, -8, 1.12),
    ],
    "deep-pullback",
    1,
  ),
  chambre: illustration(images.bed, "inline"),
  relais: illustration(images.ysee, "right"),
  lueur: illustration(images.candle, "inline", [], "cinematic-push-in", 1),
  "cours-air": illustration(
    images.river,
    "wide",
    [
      layer(images.selyan, "midground", 22, 4, 0.85),
      layer(images.fern, "foreground", -32, 13, 1.1),
    ],
    "gentle-depth",
    1,
  ),
  "air-test": illustration(images.apple, "inline"),
  "air-result": illustration(images.selyan, "right"),
  "cours-ecoute": illustration(images.ysee, "right"),
  "ecoute-test": illustration(images.nour, "inline"),
  "ecoute-result": illustration(images.cup, "inline"),
  bibliotheque: illustration(
    images.tree,
    "wide",
    [layer(images.abel, "midground", 25, 10, 0.8), layer(images.grass, "foreground", 0, 20, 1.2)],
    "sideways-drift",
    1,
  ),
  formule: illustration(images.pen, "inline"),
  sceau: illustration(images.abel, "right"),
  serre: illustration(
    images.meadow,
    "wide",
    [layer(images.nour, "midground", 20, 8, 0.85), layer(images.fern, "foreground", -25, 7, 1.2)],
    "atmospheric-still",
    1,
  ),
  fissure: illustration(
    images.dusk,
    "wide",
    [layer(images.arch, "midground", 18, 0, 0.9), layer(images.guardian, "midground", 5, 10, 0.9)],
    "dramatic-descent",
    1,
  ),
  gardien: illustration(images.guardian, "right"),
  apres: illustration(images.nour, "right"),
  infirmerie: illustration(images.ysee, "inline"),
  promesse: illustration(
    images.dusk,
    "wide",
    [layer(images.house, "midground", -5, 5, 0.85), layer(images.grass, "foreground", 0, 18, 1.12)],
    "gentle-depth",
    1,
  ),
  fin: illustration(images.candle, "inline"),
};
function game(locale: "en" | "fr") {
  const fr = locale === "fr";
  const names = fr
    ? ["Observation", "Courage", "Petite Lumière", "Fil d'air", "Contre-chant", "Trait d'aube"]
    : ["Observation", "Courage", "Little Light", "Thread of Air", "Counter-song", "Dawnstroke"];
  const ids = [
    "observation",
    "courage",
    "little-light",
    "air-thread",
    "counter-song",
    "dawnstroke",
  ];
  const descriptions = fr
    ? [
        "Remarquer ce que le monde essaie de te montrer.",
        "Garder ton intention quand la peur fait du bruit.",
        "Faire naître une lumière douce, sans chaleur.",
        "Proposer à un petit objet une autre destination.",
        "Tenir une note pour repousser ce qui te menace.",
        "Dénouer un enchantement abîmé avec un trait de lumière.",
      ]
    : [
        "Notice what the world is trying to show you.",
        "Keep your intention steady when fear grows loud.",
        "Kindle a soft light without heat.",
        "Offer a small object another destination.",
        "Hold a note against an approaching threat.",
        "Loosen a broken enchantment with a stroke of light.",
      ];
  return GameDefinitionSchema.parse({
    abilities: ids.map((id, i) => ({
      id,
      name: names[i],
      description: descriptions[i],
      attribute: i === 3 ? "DEX" : "WIL",
      offensive: i === 5,
      effect: i === 5 ? "stun" : "none",
    })),
    items: [
      { id: "letter", name: fr ? "La lettre d'Orée" : "The letter from Orée", slot: "none" },
      {
        id: "alder-pen",
        name: fr ? "Stylet d'aulne" : "Alder pen",
        slot: "weapon",
        attribute: "WIL",
        bonus: { WIL: 1, damage: 1 },
      },
      {
        id: "school-seal",
        name: fr ? "Sceau de l'école" : "School seal",
        slot: "accessory",
        bonus: { HP: 1 },
      },
    ],
    encounters: [
      {
        id: "broken-guardian",
        name: fr ? "Le gardien brisé" : "The broken guardian",
        difficulty: "easy",
        profile: "resilient",
      },
    ],
    actions: [
      {
        id: "take-letter",
        label: fr ? "Lettre reçue" : "Letter received",
        kind: "give-item",
        reference: "letter",
      },
      {
        id: "take-pen",
        label: fr ? "Stylet reçu" : "Pen received",
        kind: "give-item",
        reference: "alder-pen",
      },
      {
        id: "take-seal",
        label: fr ? "Sceau reçu" : "Seal received",
        kind: "give-item",
        reference: "school-seal",
      },
      ...["light", "air", "shield", "dawn"].map((suffix, i) => ({
        id: `learn-${suffix}`,
        label: fr ? `Apprendre ${names[i + 2]}` : `Learn ${names[i + 2]}`,
        kind: "learn",
        reference: ids[i + 2],
      })),
      {
        id: "test-air",
        label: fr ? "Fil d'air" : "Thread of Air",
        kind: "ability-check",
        reference: "air-thread",
      },
      {
        id: "test-shield",
        label: fr ? "Contre-chant" : "Counter-song",
        kind: "ability-check",
        reference: "counter-song",
      },
      {
        id: "test-observation",
        label: fr ? "Observer la marque" : "Study the mark",
        kind: "stat-check",
        attribute: "WIL",
      },
      {
        id: "test-courage",
        label: fr ? "Tenir malgré la peur" : "Stand despite fear",
        kind: "stat-check",
        attribute: "WIL",
      },
      {
        id: "guardian",
        label: fr ? "Protéger le passage" : "Protect the doorway",
        kind: "combat",
        reference: "broken-guardian",
      },
      { id: "recover", label: fr ? "Soins d'Ysée" : "Ysée's care", kind: "heal", amount: 20 },
    ],
  });
}
function cues(id: string, locale: "en" | "fr") {
  const events: unknown[] = [];
  const audio = (
    suffix: string,
    assetId: string,
    channel = "sfx",
    volume = 0.4,
    segment = 1,
    loop = false,
  ) =>
    events.push({
      id: `${id}.${suffix}`,
      trigger: { kind: "segment", segmentId: `${id}.p${segment}` },
      blocking: false,
      action: {
        kind: "audio",
        assetId,
        channel,
        volume,
        loop,
        fadeMs: channel === "sfx" ? 80 : 1400,
      },
    });
  if (id === "atelier") {
    audio("rain", sound.rain, "ambience", 0.15, 1, true);
    audio("score", "oree.wonder", "music", 0.65, 1, true);
  }
  if (id === "lettre" || id === "bibliotheque") audio("paper", sound.pages, "sfx", 0.3);
  if (id === "passage") {
    audio("arrival", sound.magic, "sfx", 0.4);
    audio("birds", sound.birds, "ambience", 0.2, 1, true);
  }
  if (id === "lueur") audio("light", sound.magic, "sfx", 0.28);
  if (id === "air-test") audio("air", sound.air, "sfx", 0.4, 2);
  if (id === "ecoute-test") audio("water", sound.water, "sfx", 0.35, 2);
  if (id === "serre") {
    audio("silence", "oree.silence", "music", 0.7, 2, true);
    audio("impact", sound.impact, "sfx", 0.4, 2);
    events.push({
      id: "serre.camera-impact",
      blockId: "page",
      trigger: { kind: "segment", segmentId: "serre.p2" },
      blocking: false,
      action: {
        kind: "effect",
        effect: { id: "screen-shake", duration: 550, intensity: 0.9, target: "canvas" },
      },
    });
  }
  if (id === "apres") {
    audio("return", sound.bells, "sfx", 0.22, 2);
    audio("score", "oree.wonder", "music", 0.6, 3, true);
  }
  if (id === "lueur" || id === "passage")
    events.push({
      id: `${id}.bloom`,
      blockId: "page",
      trigger: { kind: "segment", segmentId: `${id}.p1` },
      blocking: false,
      action: {
        kind: "effect",
        effect: { id: "light-flicker", duration: 1200, intensity: 0.6, color: "#ffe2a2" },
      },
    });
  void locale;
  return events;
}
const languages: Record<string, unknown> = {};
for (const locale of ["en", "fr"] as const) {
  const fr = locale === "fr",
    index = fr ? 1 : 0;
  let script = await readFile(new URL(`stories/magic/${locale}.ink`, root), "utf8");
  const scenes: Record<string, unknown> = {};
  const order = Object.keys(titles);
  for (const [position, id] of order.entries()) {
    const ids = [...script.matchAll(new RegExp(`#\\s*segment:(${id}\\.p[0-9]+)`, "g"))].map(
      (match) => match[1]!,
    );
    if (!ids.length) throw new Error(`Missing story page ${id}`);
    const blocks: unknown[] = ids.map((segmentId) => ({ kind: "text", segmentId }));
    const picture = art[id]!;
    const blockId = `${id}.illustration`;
    const { layers, isolated } = picture;
    const details =
      picture.image === images.letter
        ? {
            image: images.letter,
            title: fr ? "La lettre d'Orée" : "The letter from Orée",
            buttonLabel: fr ? "Examiner la lettre" : "Examine the letter",
            descriptions: fr
              ? [
                  "L'encre est de ta propre écriture. Le papier garde la chaleur de ta main.",
                  "Au dos : Apporte quelque chose que tu as réparé.",
                ]
              : [
                  "The ink is in your own handwriting. The paper keeps the warmth of your hand.",
                  "On the reverse: Bring something you have mended.",
                ],
            reverse: fr
              ? "On t'attendait. — Le bureau des admissions"
              : "We have been waiting for you. — Admissions",
          }
        : undefined;
    const image = {
      kind: "media",
      id: blockId,
      image: picture.image,
      layout: picture.layout,
      fit: "contain",
      align: "center",
      widthPercent: isolated && picture.layout === "inline" ? 44 : 100,
      motion: motion(picture.preset),
      illustration: {
        base: { role: isolated ? "midground" : "background", x: 0, y: 0, scale: 1 },
        layers,
        aspect: isolated ? "portrait" : "landscape",
        blend: "paper",
        wrap: isolated && picture.layout === "inline" ? "right" : "none",
        autoCrop: isolated,
      },
      ...(details ? { examination: details } : {}),
    };
    const insert = Math.min(picture.after, ids.length);
    blocks.splice(insert, 0, image);
    blocks.push({ kind: "choices" });
    script = script.replace(
      new RegExp(`(^.*#\\s*segment:${id}\\.p${insert}\\s*$)`, "m"),
      `$1\n// @media ${id}/${blockId}`,
    );
    const events = cues(id, locale);
    if (picture.preset !== "none")
      events.push({
        id: `${blockId}.motion`,
        blockId,
        trigger: { kind: "block", blockId },
        blocking: picture.layout === "fullscreen",
        action: {
          kind: "effect",
          effect: { id: "cinematic-camera", duration: 7500, cinematic: motion(picture.preset) },
        },
      });
    scenes[id] = {
      title: titles[id]![index],
      progress: position / (order.length - 1),
      blocks,
      events,
    };
  }
  const profiles = [];
  for (const [key, name] of [
    ["linda", "Ariane"],
    ["richard", "Noé"],
  ] as const) {
    const data = await readFile(new URL(`.fallow/narrator-reference/${key}.mp3`, root));
    profiles.push({
      id: `narrator.${key}`,
      label: `${name} · ${fr ? (key === "linda" ? "chaleureuse" : "posé") : key === "linda" ? "warm" : "calm"}`,
      model: "multilingual-v3",
      reference: {
        name: `${key}.mp3`,
        data: `data:audio/mpeg;base64,${data.toString("base64")}`,
        rights: `Synthetic reference generated locally using the installed Microsoft ${key === "linda" ? "Linda" : "Richard"} voice; no human speaker recording.`,
      },
    });
  }
  const definition = game(locale);
  languages[locale] = {
    script,
    description: fr
      ? "Une première journée à Orée : découvrir la magie, apprendre quatre sorts et protéger une amie. Un chapitre jouable, illustré et sonore."
      : "Your first day at Orée: discover magic, learn four spells and protect a friend. An illustrated, playable chapter.",
    cover: images.meadow,
    missingTranslation: false,
    narrationMode: "ai-live",
    defaults: {
      ...defaultReadingPreferences,
      backgroundColor: "#f5ead7",
      dropCapColor: "#ae8238",
      reveal: "progressive",
      narration: true,
      narratorVoice: "narrator.linda",
      narrationRate: 1,
      volumes: { sfx: 0.65, ambience: 0.3, music: 0.25, narration: 0.85 },
    },
    configuration: {
      title: fr ? "L'École des choses impossibles" : "The School of Impossible Things",
      checkpointId: "oree",
      chapter: fr ? "Chapitre I — Le temps encore à écrire" : "Chapter I — Your unwritten time",
      scenes,
      assets: catalogue.entries.map((entry) => ({
        id: entry.id,
        path: entry.runtimePath,
        type: entry.mediaType,
        alt: (entry.description ?? entry.title).slice(0, 500),
      })),
      character: {
        portrait: images.hero,
        abilities: definition.abilities
          .slice(0, 2)
          .map((ability) => ({
            id: ability.id,
            name: ability.name!,
            description: ability.description!,
          })),
        inventory: [],
        encounters: [
          {
            id: "nour",
            fact: "met_nour",
            name: "Nour",
            description: fr
              ? "Ancienne livreuse, élève d'Orée et ta colocataire. Elle entend quand les objets ont besoin d'aide."
              : "Former courier, Orée student and your roommate. She hears when objects need help.",
          },
          {
            id: "ysee",
            fact: "met_ysee",
            name: "Ysée Valambre",
            description: fr
              ? "Directrice d'Orée. Elle enseigne l'attention et le courage en prenant soin des abeilles."
              : "Head teacher of Orée. She teaches attention and courage while tending her bees.",
          },
          {
            id: "selyan",
            fact: "met_selyan",
            name: "Sélian",
            description: fr
              ? "Le passeur. Professeur du Poids de l'air, patient avec les pommes comme avec les élèves."
              : "The ferryman. Teacher of the Weight of Air, patient with apples and students alike.",
          },
          {
            id: "abel",
            fact: "met_abel",
            name: "Abel",
            description: fr
              ? "Tailleur de pierre et gardien de la bibliothèque. Il répare ce qui tient l'école ensemble."
              : "Stoneworker and keeper of the library. He repairs what holds the school together.",
          },
        ],
      },
      game: definition,
      voiceProfiles: profiles,
      narratorVoices: [
        ...profiles.map(({ id, label }) => ({ id, label })),
        {
          id: "multilingual-default",
          label: fr ? "Narrateur Multilingual" : "Multilingual narrator",
        },
        ...(!fr ? [{ id: "nano-default", label: "Nano narrator" }] : []),
      ],
      narratorVoiceSelection: profiles.map((voice) => voice.id),
      speechSettings: { temperature: 0.7, exaggeration: 0.4, cfgWeight: 0.4, seed: 4812, pitch: 0 },
      narration: [],
    },
  };
}
const project = StoryProjectSchema.parse({
  schemaVersion: 1,
  storyId: "house",
  release: "oree-1.0.0",
  defaultLocale: "fr",
  shareConfiguration: true,
  gameMode: "with-combat",
  variables: [],
  languages,
});
await compileProject(project);
await writeFile(
  new URL("stories/house/project.json", root),
  JSON.stringify(project, null, 2) + "\n",
);
console.log(
  `Created Orée: ${Object.keys(titles).length} bilingual pages, ${catalogue.entries.length} local gallery assets, four learnable spells and a complete encounter.`,
);
