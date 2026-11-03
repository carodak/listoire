import i18next from "i18next";

const en = {
  language: "Language",
  chapterOne: "Chapter One",
  changeLanguage: "Change language",
  home: "Listoire home",
  languageNames: { en: "English", fr: "French" },
  storyFallback: "This story is available in {{language}}. Your saved progress is preserved.",
  settingsFailed:
    "Your preference could not be saved. It applies for this visit; please try again later.",
  welcome: {
    title: "Step inside the story.",
    subtitle: "A new audiovisual way to experience novels, where your choices shape the story.",
    play: "Play an existing story",
    create: "Create your own scenario",
    soon: "Coming soon",
  },
  loading: "Opening your story…",
  saved: "Your place is saved",
  saving: "Saving your place…",
  end: "The end",
  restart: "Read from the beginning",
  restartConfirm: "Replace this language’s saved progress and begin again?",
  retry: "Reload your saved place",
  backup: "Download saved progress",
  choices: "Choose your next step",
  quiet: "A quiet place for stories",
  storyLabel: "A short story",
  skip: "Skip to content",
  errors: {
    content: "This story could not be opened. Please try again.",
    "save-invalid":
      "Your saved progress could not be read. It has been kept. Download a copy before choosing to start again.",
    "save-incompatible":
      "Your saved progress belongs to another story version. It has been kept. Download a copy or choose to start again.",
    "save-conflict":
      "Another tab changed your saved progress. Reload your saved place to continue.",
    storage:
      "Your place could not be saved. Your previous checkpoint is safe. Please retry before continuing.",
  },
};
const fr: typeof en = {
  language: "Langue",
  chapterOne: "Chapitre un",
  changeLanguage: "Changer de langue",
  home: "Accueil Listoire",
  languageNames: { en: "anglais", fr: "français" },
  storyFallback: "Cette histoire est disponible en {{language}}. Votre progression est conservée.",
  settingsFailed:
    "Votre préférence n’a pas pu être enregistrée. Elle s’applique pour cette visite ; réessayez plus tard.",
  welcome: {
    title: "Entrez dans l’histoire.",
    subtitle:
      "Une nouvelle façon audiovisuelle de vivre les romans, où vos choix façonnent l’histoire.",
    play: "Jouer à une histoire existante",
    create: "Créer votre propre scénario",
    soon: "Bientôt disponible",
  },
  loading: "Ouverture de votre histoire…",
  saved: "Votre progression est enregistrée",
  saving: "Enregistrement…",
  end: "Fin",
  restart: "Relire depuis le début",
  restartConfirm: "Remplacer la progression enregistrée dans cette langue et recommencer ?",
  retry: "Recharger ma progression",
  backup: "Télécharger ma sauvegarde",
  choices: "Choisissez la suite",
  quiet: "Un espace pour les histoires",
  storyLabel: "Une histoire courte",
  skip: "Aller à l’histoire",
  errors: {
    content: "Cette histoire n’a pas pu être ouverte. Veuillez réessayer.",
    "save-invalid":
      "Votre sauvegarde est illisible. Elle a été conservée. Téléchargez-en une copie avant de recommencer.",
    "save-incompatible":
      "Votre sauvegarde appartient à une autre version de l’histoire. Elle a été conservée. Téléchargez-en une copie ou recommencez.",
    "save-conflict":
      "Un autre onglet a modifié votre progression. Rechargez votre sauvegarde pour continuer.",
    storage:
      "L’enregistrement a échoué. Votre dernier point de sauvegarde est intact. Réessayez avant de continuer.",
  },
};

export const i18n = i18next.createInstance();
void i18n.init({
  lng: "en",
  fallbackLng: "en",
  initAsync: false,
  resources: { en: { translation: en }, fr: { translation: fr } },
  interpolation: { escapeValue: false },
});
