import type { Exhibition } from "./types";

/**
 * Seed data for Ingyu's 3daysofdesign Guide.
 *
 * Images are intentionally left as placeholder labels (rendered as styled
 * blocks in the UI) — no real imagery yet, per the brief.
 *
 * `id` values are stable slugs and are referenced by the Planner page.
 */
export const EXHIBITIONS: Exhibition[] = [
  {
    id: "carl-hansen-son",
    name: "Carl Hansen & Søn",
    zone: "City Center",
    priority: "must-go",
    tags: ["Curator Pick", "Material", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The Danish furniture house behind Hans J. Wegner's most enduring chairs opens its flagship to celebrate a century of craft. Expect freshly upholstered classics alongside quiet new releases, staged like a living room rather than a showroom.",
    whyGo:
      "Few makers let you sit in this much history at once. It is the clearest read on what 'Danish craft' actually means before you spend three days seeing everyone reinterpret it.",
    whatToLookFor:
      "The hand-woven paper cord on the CH24 Wishbone, the grain matching across the new oak pieces, and the archival prototypes tucked into the back room.",
    websiteUrl: "https://www.carlhansen.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Carl+Hansen+%26+S%C3%B8n+Copenhagen",
  },
  {
    id: "fredericia",
    name: "Fredericia",
    zone: "City Center",
    priority: "must-go",
    tags: ["Curator Pick", "Material", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "Fredericia turns its showroom into an editorial set, pairing Børge Mogensen heritage pieces with contemporary commissions. The presentation leans into texture: shearling, patinated leather, and solid wood.",
    whyGo:
      "A masterclass in how a heritage brand stays current without diluting its archive. The styling alone is worth the visit for designers building moodboards.",
    whatToLookFor:
      "New textile collaborations on the Spanish Chair, and how the room transitions from warm daylight to low evening lighting.",
    websiteUrl: "https://fredericia.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Fredericia+Furniture+Copenhagen",
  },
  {
    id: "ark-journal",
    name: "Ark Journal",
    zone: "Frederiksstaden",
    priority: "must-go",
    tags: ["Curator Pick", "Yellow Nose", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The Copenhagen design publication stages a spatial issue — translating its pared-back editorial language into a physical installation of objects, art, and light.",
    whyGo:
      "Ark Journal defines the visual mood half of this festival borrows from. Seeing their world built in three dimensions is the closest thing to a thesis statement for the week.",
    whatToLookFor:
      "The restraint: negative space, a single sculptural object per plinth, and the muted palette that gives the whole festival its tone.",
    websiteUrl: "https://www.arkjournal.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Ark+Journal+Copenhagen",
  },
  {
    id: "composed-matter",
    name: "COMPOSED MATTER",
    zone: "Frederiksstaden",
    priority: "worth-it",
    tags: ["Material", "Curator Pick"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "A curated group show on material honesty — ceramicists, stone workers, and textile makers presenting raw and finished states side by side.",
    whyGo:
      "The best single stop to understand material as narrative. Each maker shows their process, not just the result.",
    whatToLookFor:
      "Unglazed test tiles next to finished work, and the way light reveals surface texture on the stone pieces.",
    websiteUrl: "https://www.3daysofdesign.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Frederiksstaden+Copenhagen",
  },
  {
    id: "frama",
    name: "Frama",
    zone: "Nordhavn",
    priority: "must-go",
    tags: ["Curator Pick", "Material", "Hospitality", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "Frama's apothecary-meets-studio space in a former pharmacy is a destination in its own right. For the festival they layer new furniture, fragrance, and a small café service into the historic interior.",
    whyGo:
      "The single most photographed interior in Copenhagen design, and one of the rare places where the brand world is fully resolved — furniture, scent, food, and architecture in one room.",
    whatToLookFor:
      "The aged-brass and travertine detailing, the Apothecary fragrance bar, and how the new pieces sit against the patinated walls.",
    websiteUrl: "https://framacph.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Frama+Studio+Copenhagen",
  },
  {
    id: "la-cabra",
    name: "La Cabra",
    zone: "City Center",
    priority: "worth-it",
    tags: ["Hospitality", "Material"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The Aarhus-born roaster brings its light-roast, design-forward coffee to a festival pop-up. Expect a minimal bar build and a rotating single-origin menu.",
    whyGo:
      "The smartest fuel stop on a long walking day, and a clean example of hospitality-as-design — the cup, the counter, and the queue are all considered.",
    whatToLookFor:
      "The bar's material palette, the packaging system, and the filter menu — order whatever is freshest on the board.",
    websiteUrl: "https://lacabra.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=La+Cabra+Coffee+Copenhagen",
  },
  {
    id: "kvadrat",
    name: "Kvadrat",
    zone: "Frederiksstaden",
    priority: "must-go",
    tags: ["Curator Pick", "Material", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The Danish textile house presents new collections through large-scale spatial installations, often in collaboration with an invited artist or architect.",
    whyGo:
      "Kvadrat treats textile as architecture. The installation is always one of the festival's most ambitious, and the color work resets your palette for the year.",
    whatToLookFor:
      "The new colorways at scale, the acoustic Soft Cells, and how a single textile changes a room's entire acoustic and visual temperature.",
    websiteUrl: "https://www.kvadrat.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Kvadrat+Copenhagen",
  },
  {
    id: "japanmade",
    name: "Japanmade",
    zone: "Refshaleøen",
    priority: "worth-it",
    tags: ["Japan", "Material", "Curator Pick"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "A showcase of Japanese makers — lacquerware, joinery, ceramics, and tools — curated to highlight the dialogue between Japanese and Scandinavian craft sensibilities.",
    whyGo:
      "The clearest expression of the Japan–Denmark design conversation that runs through the whole festival. Quiet, precise, and full of objects you will want to hold.",
    whatToLookFor:
      "Joinery without visible fasteners, the lacquer depth on the urushi pieces, and the maker's marks on the tools.",
    websiteUrl: "https://www.3daysofdesign.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Refshale%C3%B8en+Copenhagen",
  },
  {
    id: "dynaudio-karimoku",
    name: "Dynaudio × Karimoku",
    zone: "Refshaleøen",
    priority: "worth-it",
    tags: ["Japan", "Material", "Curator Pick", "Yellow Nose"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "Danish acoustics meet Japanese woodcraft in a listening-room collaboration between speaker maker Dynaudio and furniture house Karimoku.",
    whyGo:
      "A genuine cross-cultural product collaboration you can experience with your ears, not just your eyes. The listening sessions are a welcome change of pace.",
    whatToLookFor:
      "How the wood cabinetry shapes the sound, the seating layout of the listening room, and the limited collaboration pieces.",
    websiteUrl: "https://www.dynaudio.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Refshale%C3%B8en+Copenhagen",
  },
  {
    id: "louis-poulsen",
    name: "Louis Poulsen",
    zone: "City Center",
    priority: "must-go",
    tags: ["Lighting", "Curator Pick", "Must Go"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The lighting house behind Poul Henningsen's PH lamps presents new fixtures and a reissue or two, staged to show its signature glare-free light at dusk.",
    whyGo:
      "The definitive Danish lighting statement. Seeing the PH principle — light without glare — demonstrated in a controlled setting is worth planning your evening around.",
    whatToLookFor:
      "The layered shades that hide the bulb, the warm-dim behaviour at low output, and any new finishes on the Panthella.",
    websiteUrl: "https://www.louispoulsen.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Louis+Poulsen+Copenhagen",
  },
  {
    id: "ingo-maurer",
    name: "Ingo Maurer",
    zone: "City Center",
    priority: "worth-it",
    tags: ["Lighting", "Curator Pick"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "The German lighting atelier brings its poetic, experimental fixtures — part sculpture, part light source — to a Copenhagen guest presentation.",
    whyGo:
      "A deliberate counterpoint to Danish restraint: playful, theatrical light that reminds you the festival is not a monoculture.",
    whatToLookFor:
      "The wit in each piece, the hand-built details, and how the gallery stages each fixture as an object in the dark.",
    websiteUrl: "https://www.ingo-maurer.com",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Copenhagen+City+Center",
  },
  {
    id: "display",
    name: "Display",
    zone: "Nordhavn",
    priority: "optional",
    tags: ["Lighting", "Material"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "An emerging studio's group presentation focused on the threshold between object and light — small-batch lamps and reflective surfaces in a raw industrial space.",
    whyGo:
      "Where to look if you want to see what comes next. Lower polish, higher experimentation, and approachable makers happy to talk process.",
    whatToLookFor:
      "Prototype joints, the mix of finishes, and the pieces that feel one iteration away from production.",
    websiteUrl: "https://www.3daysofdesign.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Nordhavn+Copenhagen",
  },
  {
    id: "other-circle",
    name: "Other Circle",
    zone: "Refshaleøen",
    priority: "optional",
    tags: ["Lighting", "Material", "Yellow Nose"],
    images: ["placeholder-1", "placeholder-2", "placeholder-3"],
    about:
      "A collective on Refshaleøen showing atmospheric lighting and tactile objects in a stripped-back harbour-side hall, with an after-hours program as light fades.",
    whyGo:
      "The right way to end a day on Refshaleøen — atmospheric, social, and unhurried, with the best light at golden hour over the water.",
    whatToLookFor:
      "The interplay of natural and artificial light through the evening, and the limited objects produced just for the festival.",
    websiteUrl: "https://www.3daysofdesign.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Refshale%C3%B8en+Copenhagen",
  },
];

/** Fast lookup by id, used by the Planner page. */
export const EXHIBITIONS_BY_ID: Record<string, Exhibition> = Object.fromEntries(
  EXHIBITIONS.map((e) => [e.id, e]),
);
