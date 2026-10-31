/**
 * Auto-audited PLP image fit overrides for aspect-[4/5] cards.
 * All current shop label images are square (1:1). object-cover zooms and
 * clips cork/label breathing room, so every wine uses object-contain with
 * an edge-sampled background (never gray muted).
 */
export const PLP_CONTAIN_IMAGE_BY_HANDLE: Readonly<
  Record<string, { edgeColor: string }>
> = {
  "a-love-supreme-2024": { edgeColor: "#e9d9ce" }, // A Love Supreme 1200x1200
  "au-mas-2024": { edgeColor: "#f9f0f4" }, // Au Mas 1024x1024
  "barycentre-2023": { edgeColor: "#f0e6dc" }, // Barycentre 1024x1024
  "bienvenu-e-s-2025": { edgeColor: "#e4d8d0" }, // Bienvenu-e-s 1200x1200
  "blanc-de-noir-2024": { edgeColor: "#f7e9de" }, // Blanc de Noir 1200x1200
  "carignan-2024": { edgeColor: "#fef6ef" }, // Carignan 1024x1024
  "carignan-blanc-2024": { edgeColor: "#dbe5f8" }, // Carignan Blanc 1024x1024
  "carignan-radical-2022": { edgeColor: "#f5f2f4" }, // Carignan Radical 1024x1024
  "ch-teau-del-ranq-2023": { edgeColor: "#f3e4d8" }, // Château del Ranq 1200x1200
  "claparedes-2023": { edgeColor: "#f0e1d2" }, // Claparedes 1200x1200
  "courtiol-2022": { edgeColor: "#cab8c3" }, // Courtiol 1024x1024
  "dans-les-bois-2023": { edgeColor: "#f1d2ab" }, // Dans les bois 1024x1024
  "debout-2025": { edgeColor: "#eadfd7" }, // Debout 1200x1200
  "dolce-vita-2022": { edgeColor: "#f7e9de" }, // Dolce Vita 1200x1200
  "douce-brise-2023": { edgeColor: "#b0c7b0" }, // Douce Brise 1024x1024
  "extralucide-2023": { edgeColor: "#e6dce9" }, // Extralucide 1080x1080
  "fantaisie-orange-2024-2024": { edgeColor: "#fae1b9" }, // Fantaisie Orange 2024 1024x1024
  "fantaisie-rouge-clair-2024": { edgeColor: "#e5c9bb" }, // Fantaisie Rouge Clair 1024x1024
  "fantasque-de-fantine-2024": { edgeColor: "#f4c69e" }, // Fantasque de Fantine 1024x1024
  "faugeres-tradition-2020": { edgeColor: "#dec6b6" }, // Faugeres Tradition 1080x1080
  "flore-et-sens-2023": { edgeColor: "#e9f0f5" }, // Flore Et Sens 1024x1024
  "fractale-2022": { edgeColor: "#f5e6d8" }, // Fractale 1200x1200
  "gemme-2023": { edgeColor: "#fbd7ca" }, // Gemme 1200x1200
  "gourmandise-2025": { edgeColor: "#f1e6db" }, // Gourmandise 1200x1200
  "grenache-2024": { edgeColor: "#fdf1f1" }, // Grenache 1024x1024
  "grenade-2024": { edgeColor: "#ee6c5f" }, // Grenade 1024x1024
  "grizzly-NV": { edgeColor: "#f2e5d9" }, // Grizzly 1200x1200
  "hippie-killer-2023": { edgeColor: "#ffce97" }, // Hippie Killer 1024x1024
  "impro-2022": { edgeColor: "#e3baa4" }, // Impro 1024x1024
  "inimigos-do-fim-2024": { edgeColor: "#ffc695" }, // Inimigos Do Fim 1024x1024
  "jardin-d-ivresse-2024": { edgeColor: "#c9aad9" }, // Jardin d'Ivresse 1024x1024
  "joy-2024": { edgeColor: "#f4e9df" }, // Joy 1200x1200
  "kairos-2024": { edgeColor: "#f1e4d8" }, // Kairos 1200x1200
  "l-2023": { edgeColor: "#e5d0ba" }, // L 1200x1200
  "l-oeil-du-l-zard-2022": { edgeColor: "#9ebac6" }, // L’Oeil du Lézard 1080x1080
  "la-cad-ne-2024": { edgeColor: "#f9e8db" }, // La Cadène 1200x1200
  "la-lanterne-rouge-2021": { edgeColor: "#e1d3bc" }, // La Lanterne Rouge 1024x1024
  "la-mouette-2024": { edgeColor: "#f0e3d6" }, // La Mouette 1200x1200
  "la-plage-2024": { edgeColor: "#e2d5c8" }, // La Plage 1024x1024
  "la-r-volte-rouge-2023": { edgeColor: "#f8c794" }, // La Rêvolte Rouge 1200x1200
  "la-vertu-2023": { edgeColor: "#f6e8dc" }, // La Vertu 1200x1200
  "le-fils-du-l-zard-2023": { edgeColor: "#b2ced4" }, // Le Fils du Lézard 1024x1024
  "le-grand-carr-2024": { edgeColor: "#fcf3f3" }, // Le Grand Carré 1024x1024
  "le-nouveau-western-2024": { edgeColor: "#f0e4d8" }, // Le Nouveau Western 1200x1200
  "le-ribou-2021": { edgeColor: "#f4e4d7" }, // Le Ribou 1200x1200
  "leno-dolce-sole-2022": { edgeColor: "#e7dad2" }, // Leno Dolce Sole 1200x1200
  "les-copains-d-abord-2025": { edgeColor: "#efe1d4" }, // Les Copains d'Abord 1200x1200
  "les-p-tillantes-2024": { edgeColor: "#f3e4da" }, // Les Pétillantes 1200x1200
  "les-toiles-filantes-2023": { edgeColor: "#ead9c5" }, // Les Étoiles Filantes 1200x1200
  "les-tremieres-2024": { edgeColor: "#ebe4ef" }, // Les Tremieres 1024x1024
  "madame-la-rouge-NV": { edgeColor: "#f0e1d4" }, // Madame la Rouge 1200x1200
  "maelstr-m-2022": { edgeColor: "#f5f1f3" }, // Maelström 1024x1024
  "mangourass-2022": { edgeColor: "#fcc08a" }, // Mangourass 1024x1024
  "matiere-noire-2024": { edgeColor: "#b0aca2" }, // Matiere Noire 1024x1024
  "micocoulier-2025": { edgeColor: "#f6e7da" }, // Micocoulier 1200x1200
  "miss-piggy-blues-2024": { edgeColor: "#eedbcd" }, // Miss Piggy Blues 1200x1200
  "nouvelle-vauge-2023": { edgeColor: "#88929b" }, // Nouvelle Vauge 1024x1024
  "nuit-d-orage-2023": { edgeColor: "#edd4b9" }, // Nuit d’Orage 1080x1080
  "otium-2023": { edgeColor: "#e5dcd2" }, // Otium 1200x1200
  "pachorra-2023": { edgeColor: "#ddd6cb" }, // Pachorra 1200x1200
  "papillon-m-2023": { edgeColor: "#c39c9d" }, // Papillon M 1024x1024
  "perdu-dans-les-dunes-2023": { edgeColor: "#f7f2f5" }, // Perdu dans les Dunes 1024x1024
  "point-2024": { edgeColor: "#f7f2f5" }, // Point 1024x1024
  "pouc-t-2024": { edgeColor: "#f8ece4" }, // Poucèt 1200x1200
  "premi-re-longuer-2024": { edgeColor: "#e5ded0" }, // Première Longuer 1024x1024
  "premices-2023": { edgeColor: "#eaaa68" }, // Premices 1200x1200
  "punkahontas-2023": { edgeColor: "#f5eff4" }, // Punkahontas 1024x1024
  "quel-ne-de-course-2023": { edgeColor: "#f9f3f6" }, // Quel âne de course 1024x1024
  "quero-quero-2025": { edgeColor: "#efdccd" }, // Quero Quero 1200x1200
  "r-siste-2025": { edgeColor: "#f5e6d9" }, // Résiste 1200x1200
  "redares-2024": { edgeColor: "#f2e4d8" }, // Redares 1200x1200
  "rocalhas-2020": { edgeColor: "#e0ccb7" }, // Rocalhas 1024x1024
  "rose-boh-me-2023": { edgeColor: "#f6e8e0" }, // Rose Bohême 1200x1200
  "scamu-2022": { edgeColor: "#eddccc" }, // Scamu 1200x1200
  "septentrion-2023": { edgeColor: "#f2e1d1" }, // Septentrion 1200x1200
  "sorci-res-2024": { edgeColor: "#e5d8c9" }, // Sorcières 1024x1024
  "svoboda-2023": { edgeColor: "#f1e5da" }, // Svoboda 1200x1200
  "symbiose-2025": { edgeColor: "#f7cec7" }, // Symbiose 1024x1024
  "syrah-nostra-2022": { edgeColor: "#ecddd0" }, // Syrah Nostra 1200x1200
  "t-indien-2023": { edgeColor: "#f1e7dc" }, // Été Indien 1200x1200
  "ultravision-2023": { edgeColor: "#f0e6dc" }, // Ultravision 1080x1080
  "un-coup-de-kuq-2023": { edgeColor: "#f5f1f5" }, // Un coup de kuq 1024x1024
  "une-case-en-plus-2021": { edgeColor: "#f8d18f" }, // Une Case en Plus 1200x1200
  "up-tempo-2024": { edgeColor: "#e8dcce" }, // Up Tempo 1024x1024
  "valcabri-res-de-fantine-2024": { edgeColor: "#f4dcaf" }, // Valcabrières de Fantine 1024x1024
  "vermentino-2022": { edgeColor: "#bcaf9b" }, // Vermentino 1024x1024
  "vivace-2024": { edgeColor: "#ddd6cb" }, // Vivace 1024x1024
  "white-is-blanc-2023": { edgeColor: "#d8dcc7" }, // White is Blanc 1024x1024
  "white-is-rouge-2021": { edgeColor: "#f2dccc" }, // White is Rouge 1024x1024
  "xiii-2023": { edgeColor: "#f5eff3" }, // XIII 1024x1024
  "yo-no-puedo-mas-2024": { edgeColor: "#f0e6dc" }, // Yo No Puedo Mas 1024x1024
  "zeph-2023": { edgeColor: "#f7f3f5" }, // Zeph 1024x1024
};
