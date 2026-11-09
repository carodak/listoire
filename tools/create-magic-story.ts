import { magicCues } from "./magic-direction.ts";
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
    technical?: { width: number; height: number };
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
  canal: asset("contemporary_background_quiet_canal_towpath_001"),
  skyline: asset("contemporary_background_distant_city_skyline_001"),
  railing: asset("shared_foreground_street_lamp_and_rail_frame_001"),
};
const titles: Record<string, [string, string]> = {
  "matin-ville": ["The morning errands", "Les courses du matin"],
  etabli: ["A notch in the balance staff", "Une encoche sur l'axe"],
  livraison: ["Twelve strokes at noon", "Les douze coups de midi"],
  atelier: ["The watch without a spring", "La montre sans ressort"],
  messagere: ["The ninth delivery", "La neuvième livraison"],
  preuve: ["A coin suspended in the air", "Une pièce en suspension"],
  lettre: ["An invitation addressed to you", "Une lettre pour toi"],
  depart: ["Closing the workshop", "Fermer l'atelier"],
  ville: ["The street between the platforms", "La rue entre les quais"],
  boutique: ["The right to learn", "Le droit d'apprendre"],
  chemin: ["The door at dusk", "La porte du crépuscule"],
  passage: ["The crossing", "La traversée"],
  cour: ["Orée", "Orée"],
  refectoire: ["The salt that doesn't sing", "Le sel qui ne chante pas"],
  chambre: ["The orchard room", "La chambre du verger"],
  matin: ["Don't feed the stairs", "Ne pas nourrir les escaliers"],
  relais: ["The keeping of small lights", "L'Entretien des petites lumières"],
  lueur: ["You made that", "C'est toi qui fais cela"],
  "cours-air": ["The Weight of Air", "Le Poids de l'air"],
  "air-test": ["An apple and a river", "Une pomme et une rivière"],
  "air-result": ["The landing can wait", "Pour l'atterrissage, on a le temps"],
  reparation: ["Learning to undo", "Apprendre à défaire"],
  "cours-ecoute": ["The Listening Garden", "Le Jardin d'écoute"],
  "ecoute-test": ["An excellent assistant", "Une excellente assistante"],
  "ecoute-result": ["An afternoon worth keeping", "Un après-midi à garder"],
  bibliotheque: ["The gateway plan", "Le plan des passages"],
  archives: ["A word with its letters missing", "Un mot sans ses lettres"],
  formule: ["Dawnstroke", "Trait d'aube"],
  sceau: ["Other beginners", "D'autres débutants"],
  entrainement: ["The chalk circle", "Le cercle de craie"],
  duel: ["A practice duel", "Un duel d'entraînement"],
  "apres-duel": ["One step to the side", "Un pas de côté"],
  veille: ["The lamps that listen", "Les lampes qui écoutent"],
  serre: ["The missing note", "La note manquante"],
  fissure: ["What you know now", "Ce que tu sais, maintenant"],
  gardien: ["Hold the doorway", "Tenir le passage"],
  apres: ["The first sound", "Le premier bruit"],
  infirmerie: ["Apples provided", "Pommes fournies"],
  promesse: ["Tomorrow's lessons", "Les cours de demain"],
  retour: ["A letter from the workshop", "Le courrier de l'atelier"],
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
const motion = (preset = "none", durationMs = 6000) => ({
  preset,
  speed: "normal",
  intensity: "normal",
  direction: "auto",
  atmosphere: "none",
  layers: [],
  durationMs,
});
function illustration(
  image: string,
  layout = "inline",
  layers: Illustration[] = [],
  preset = "none",
  after = 1,
) {
  const isolated = layers.length === 0 && layout !== "background";
  return { image, layout, layers, preset, after, isolated };
}
const art: Record<string, ReturnType<typeof illustration>> = {
  "matin-ville": illustration(
    images.canal,
    "wide",
    [layer(images.railing, "foreground", 0, 10, 1.12)],
    "gentle-depth",
    1,
  ),
  livraison: illustration(
    images.skyline,
    "wide",
    [layer(images.branch, "foreground", -18, -8, 1.15)],
    "sideways-drift",
    2,
  ),
  messagere: illustration(images.nour, "right"),
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
  chambre: illustration(images.bed, "inline"),
  relais: illustration(images.ysee, "right"),
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
  bibliotheque: illustration(
    images.tree,
    "wide",
    [layer(images.abel, "midground", 25, 10, 0.8), layer(images.grass, "foreground", 0, 20, 1.2)],
    "sideways-drift",
    1,
  ),
};
/** Bilingual [English, French] text; `game()` picks one side. */
type Text = [english: string, french: string];
const abilityIds = [
  "observation",
  "courage",
  "little-light",
  "air-thread",
  "counter-song",
  "dawnstroke",
];
const abilityNames = {
  en: ["Observation", "Courage", "Little Light", "Thread of Air", "Counter-song", "Dawnstroke"],
  fr: ["Observation", "Courage", "Petite Lumière", "Fil d'air", "Contre-chant", "Trait d'aube"],
};
const abilityDescriptions = {
  en: [
    "Spot traces and flaws that are difficult to see.",
    "Keep calm when facing danger.",
    "Kindle a soft light without heat.",
    "Lift and move a small object from a distance.",
    "Hold a note against an approaching threat.",
    "Loosen a broken enchantment with a stroke of light.",
  ],
  fr: [
    "Repérer les traces et les défauts difficiles à voir.",
    "Rester calme devant un danger.",
    "Faire naître une lumière douce, sans chaleur.",
    "Soulever et déplacer un petit objet à distance.",
    "Tenir une note pour repousser ce qui te menace.",
    "Dénouer un enchantement abîmé avec un trait de lumière.",
  ],
};
const itemTable: Record<string, unknown>[] = [
  {
    id: "healing-balm",
    name: ["Healing balm", "Baume de soin"],
    slot: "none",
    consumable: true,
    healing: 3,
  },
  { id: "letter", name: ["The letter from Orée", "La lettre d'Orée"], slot: "none" },
  {
    id: "alder-pen",
    name: ["Alder pen", "Stylet d'aulne"],
    slot: "weapon",
    attribute: "WIL",
    bonus: { WIL: 1, damage: 1 },
  },
  {
    id: "school-seal",
    name: ["School seal", "Sceau de l'école"],
    slot: "accessory",
    bonus: { HP: 1 },
  },
];
const encounterTable = [
  {
    id: "ysee-training",
    name: ["Ysée Valambre", "Ysée Valambre"],
    portrait: images.ysee,
    difficulty: "easy",
    profile: "balanced",
  },
  {
    id: "broken-guardian",
    name: ["The broken guardian", "Le gardien brisé"],
    portrait: images.guardian,
    difficulty: "easy",
    profile: "resilient",
  },
];
const learnActions = ["light", "air", "shield", "dawn"].map((suffix, i) => ({
  id: `learn-${suffix}`,
  label: [`Learn ${abilityNames.en[i + 2]}`, `Apprendre ${abilityNames.fr[i + 2]}`],
  kind: "learn",
  reference: abilityIds[i + 2],
}));
const actionTable: Record<string, unknown>[] = [
  {
    id: "take-balm",
    label: [
      "Ysée gives you a dose of healing balm: restores 3 HP during combat.",
      "Ysée te confie une dose de baume : rend 3 PV pendant un combat.",
    ],
    kind: "give-item",
    reference: "healing-balm",
  },
  {
    id: "take-letter",
    label: ["Letter received", "Lettre reçue"],
    kind: "give-item",
    reference: "letter",
  },
  {
    id: "take-pen",
    label: ["Pen received", "Stylet reçu"],
    kind: "give-item",
    reference: "alder-pen",
  },
  {
    id: "take-seal",
    label: ["Seal received", "Sceau reçu"],
    kind: "give-item",
    reference: "school-seal",
  },
  ...learnActions,
  {
    id: "test-air",
    label: ["Thread of Air", "Fil d'air"],
    kind: "ability-check",
    reference: "air-thread",
  },
  {
    id: "test-shield",
    label: ["Counter-song", "Contre-chant"],
    kind: "ability-check",
    reference: "counter-song",
  },
  {
    id: "test-observation",
    label: ["Study the mark", "Observer la marque"],
    kind: "stat-check",
    attribute: "WIL",
  },
  {
    id: "test-courage",
    label: ["Stand despite fear", "Tenir malgré la peur"],
    kind: "stat-check",
    attribute: "WIL",
  },
  {
    id: "training-duel",
    label: ["Practice duel with Ysée", "Duel d'entraînement avec Ysée"],
    kind: "combat",
    reference: "ysee-training",
  },
  {
    id: "guardian",
    label: ["Protect the doorway", "Protéger le passage"],
    kind: "combat",
    reference: "broken-guardian",
  },
  { id: "recover", label: ["Ysée's care", "Soins d'Ysée"], kind: "heal", amount: 20 },
];
function game(locale: "en" | "fr") {
  const at = locale === "fr" ? 1 : 0;
  const pick = (entries: Record<string, unknown>[], key: string) =>
    entries.map((entry) => ({ ...entry, [key]: (entry[key] as Text)[at] }));
  return GameDefinitionSchema.parse({
    abilities: abilityIds.map((id, i) => ({
      id,
      name: abilityNames[locale][i],
      description: abilityDescriptions[locale][i],
      attribute: i === 3 ? "DEX" : "WIL",
      offensive: i === 5,
      effect: i === 5 ? "stun" : "none",
    })),
    items: pick(itemTable, "name"),
    encounters: pick(encounterTable, "name"),
    actions: pick(actionTable, "label"),
  });
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
    const picture = art[id];
    const events: unknown[] = magicCues(id, sound);
    if (picture) {
      const blockId = `${id}.illustration`;
      const { layers, isolated } = picture;
      const details =
        id === "messagere"
          ? {
              image: images.nour,
              title: "Nour",
              buttonLabel: fr ? "Examiner Nour" : "Examine Nour",
              descriptions: fr
                ? [
                    "Nour porte la lettre du bureau des admissions.",
                    "Son manteau de voyage est encore couvert de poussière.",
                  ]
                : [
                    "Nour carries the admissions letter.",
                    "Her travelling coat is still covered in dust.",
                  ],
              reverse: "",
            }
          : undefined;
      const layout =
        picture.layout === "right"
          ? "right"
          : picture.layout === "fullscreen"
            ? "fullscreen"
            : "inline";
      const image = {
        kind: "media",
        id: blockId,
        image: picture.image,
        layout,
        fit: "contain",
        align: "center",
        widthPercent: isolated && layout === "inline" ? 44 : 100,
        motion: motion(picture.preset),
        ...(layers.length
          ? {
              illustration: {
                base: { role: isolated ? "midground" : "background", x: 0, y: 0, scale: 1 },
                layers,
                aspect: isolated ? "portrait" : "landscape",
                blend: "paper",
                wrap: "none",
                autoCrop: isolated,
              },
            }
          : {}),
        ...(details ? { examination: details } : {}),
      };
      const insert = Math.min(picture.after, ids.length);
      blocks.splice(insert, 0, image);

      script = script.replace(
        new RegExp(`(^.*#\\s*segment:${id}\\.p${insert}\\s*$)`, "m"),
        `$1\n// @media ${id}/${blockId}`,
      );
      if (picture.preset !== "none")
        events.push({
          id: `${blockId}.motion`,
          blockId,
          trigger: { kind: "block", blockId },
          blocking: picture.layout === "fullscreen",
          action: {
            kind: "effect",
            effect: { id: "cinematic-camera", duration: 6000, cinematic: motion(picture.preset) },
          },
        });
    }
    blocks.push({ kind: "choices" });
    scenes[id] = {
      title: titles[id]![index],
      progress: position / (order.length - 1),
      blocks,
      events,
    };
  }
  const profiles = [];
  for (const [key, name, frenchRegister, englishRegister] of [
    ["linda", "Ariane", "féminine · chaleureuse", "feminine · warm"],
    ["richard", "Noé", "masculine · posée", "masculine · calm"],
    ["linda-young", "Lison", "féminine · enfantine", "feminine · childlike"],
    ["richard-young", "Éli", "masculine · juvénile", "masculine · youthful"],
    ["linda-low", "Alma", "féminine · adulte, veloutée", "feminine · mature, mellow"],
    ["richard-deep", "Basile", "masculine · adulte, grave", "masculine · mature, deep"],
  ] as const) {
    const data = await readFile(new URL(`.fallow/narrator-reference/${key}.mp3`, root));
    profiles.push({
      id: `narrator.${key}`,
      label: `${name} · ${fr ? frenchRegister : englishRegister}`,
      model: "multilingual-v3",
      reference: {
        name: `${key}.mp3`,
        data: `data:audio/mpeg;base64,${data.toString("base64")}`,
        rights: `Synthetic reference generated locally using the installed Microsoft ${key.startsWith("linda") ? "Linda" : "Richard"} voice${key.includes("-") ? "; pitch-shaped register" : ""}; no human speaker recording. Provider voice-reference reuse rights not independently verified.`,
      },
    });
  }
  const definition = game(locale);
  languages[locale] = {
    script,
    description: fr
      ? "Tes premiers jours à Orée : un monde caché, quatre sorts à apprendre, un duel d'entraînement et une voix à sauver. Un chapitre jouable, illustré et sonore."
      : "Your first days at Orée: a hidden world, four spells to learn, a practice duel and a voice to save. An illustrated, playable chapter.",
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
      checkpointId: "oree-v1-3",
      chapter: fr ? "Chapitre I — Une lettre inattendue" : "Chapter I — An unexpected letter",
      scenes,
      assets: catalogue.entries.map((entry) => ({
        id: entry.id,
        path: entry.runtimePath,
        type: entry.mediaType,
        alt: (entry.description ?? entry.title).slice(0, 500),
        dimensions:
          entry.mediaType === "image" && entry.technical
            ? { width: entry.technical.width, height: entry.technical.height }
            : undefined,
      })),
      character: {
        name: "Orion",
        portrait: images.hero,
        abilities: definition.abilities.slice(0, 2).map((ability) => ({
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
  release: "oree-1.3.0",
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
  `Created Orée: ${Object.keys(titles).length} bilingual pages, ${catalogue.entries.length} local gallery assets, four learnable spells and two encounters.`,
);
