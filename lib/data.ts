import type { Exhibition } from "./types";

/**
 * Seed data for Ingyu's 3daysofdesign Guide.
 *
 * Text fields carry both Traditional Chinese (zh) and English (en).
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
    about: {
      zh: "成就 Hans J. Wegner 多款經典椅的丹麥家具世家,以旗艦店歡慶百年工藝。展出剛重新包覆的經典款與低調的新作,陳設得像客廳、而非展示間。",
      en: "The Danish furniture house behind Hans J. Wegner's most enduring chairs opens its flagship to celebrate a century of craft. Expect freshly upholstered classics alongside quiet new releases, staged like a living room rather than a showroom.",
    },
    whyGo: {
      zh: "很少有品牌能讓你一次「坐進」這麼多歷史。在你接下來三天看遍各家重新詮釋之前,這裡是理解「丹麥工藝」本質最清楚的起點。",
      en: "Few makers let you sit in this much history at once. It is the clearest read on what 'Danish craft' actually means before you spend three days seeing everyone reinterpret it.",
    },
    whatToLookFor: {
      zh: "CH24 Y 字椅上手工編織的紙纖繩、新款橡木件之間的木紋對接,以及藏在後方展間的早期原型。",
      en: "The hand-woven paper cord on the CH24 Wishbone, the grain matching across the new oak pieces, and the archival prototypes tucked into the back room.",
    },
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
    about: {
      zh: "Fredericia 把展示間佈置成一組編輯式場景,將 Børge Mogensen 的經典與當代委製並陳。整體著重質感:羊毛、養色皮革與實木。",
      en: "Fredericia turns its showroom into an editorial set, pairing Børge Mogensen heritage pieces with contemporary commissions. The presentation leans into texture: shearling, patinated leather, and solid wood.",
    },
    whyGo: {
      zh: "一堂示範課:傳統品牌如何在不稀釋自身典藏的前提下保持當代。光是陳列風格,就值得正在做情緒板的設計師走一趟。",
      en: "A masterclass in how a heritage brand stays current without diluting its archive. The styling alone is worth the visit for designers building moodboards.",
    },
    whatToLookFor: {
      zh: "西班牙椅上的新織品聯名,以及展間從日光過渡到傍晚低照度時的氛圍變化。",
      en: "New textile collaborations on the Spanish Chair, and how the room transitions from warm daylight to low evening lighting.",
    },
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
    about: {
      zh: "這本哥本哈根設計刊物打造了一期「空間版」——把它極簡的編輯語彙,轉譯成一處由物件、藝術與光構成的實體裝置。",
      en: "The Copenhagen design publication stages a spatial issue — translating its pared-back editorial language into a physical installation of objects, art, and light.",
    },
    whyGo: {
      zh: "Ark Journal 定義了半個設計節都在借用的視覺氛圍。看見他們的世界以三維方式建構出來,幾乎就是整週設計節的宣言。",
      en: "Ark Journal defines the visual mood half of this festival borrows from. Seeing their world built in three dimensions is the closest thing to a thesis statement for the week.",
    },
    whatToLookFor: {
      zh: "那份克制:留白、每座台座只放一件雕塑感物件,以及奠定整個設計節基調的低彩度色盤。",
      en: "The restraint: negative space, a single sculptural object per plinth, and the muted palette that gives the whole festival its tone.",
    },
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
    about: {
      zh: "一檔關於「材質誠實」的策展聯展——陶藝家、石材匠人與織品創作者,把原始狀態與完成品並列展出。",
      en: "A curated group show on material honesty — ceramicists, stone workers, and textile makers presenting raw and finished states side by side.",
    },
    whyGo: {
      zh: "理解「材質即敘事」最好的單一站點。每位創作者展示的是過程,而不只是結果。",
      en: "The best single stop to understand material as narrative. Each maker shows their process, not just the result.",
    },
    whatToLookFor: {
      zh: "完成品旁未上釉的試片,以及光線如何在石材表面顯露出肌理。",
      en: "Unglazed test tiles next to finished work, and the way light reveals surface texture on the stone pieces.",
    },
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
    about: {
      zh: "Frama 位於一間舊藥局、介於藥房與工作室之間的空間,本身就是必訪目的地。設計節期間,他們在這個歷史室內疊加新家具、香氛與小型咖啡服務。",
      en: "Frama's apothecary-meets-studio space in a former pharmacy is a destination in its own right. For the festival they layer new furniture, fragrance, and a small café service into the historic interior.",
    },
    whyGo: {
      zh: "哥本哈根被拍最多的室內空間之一,也是少數把品牌世界完整收束的地方——家具、香氣、餐飲與建築同處一室。",
      en: "The single most photographed interior in Copenhagen design, and one of the rare places where the brand world is fully resolved — furniture, scent, food, and architecture in one room.",
    },
    whatToLookFor: {
      zh: "養色黃銅與洞石的細節、藥房式香氛吧台,以及新作如何映襯在帶歲月感的牆面前。",
      en: "The aged-brass and travertine detailing, the Apothecary fragrance bar, and how the new pieces sit against the patinated walls.",
    },
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
    about: {
      zh: "這家源自奧胡斯的烘豆品牌,帶著淺焙、設計感十足的咖啡進駐設計節快閃店。預期會是極簡的吧台與輪替的單一產地菜單。",
      en: "The Aarhus-born roaster brings its light-roast, design-forward coffee to a festival pop-up. Expect a minimal bar build and a rotating single-origin menu.",
    },
    whyGo: {
      zh: "長時間徒步日裡最聰明的補給站,也是「款待即設計」的乾淨示範——杯子、吧台、排隊動線都經過考量。",
      en: "The smartest fuel stop on a long walking day, and a clean example of hospitality-as-design — the cup, the counter, and the queue are all considered.",
    },
    whatToLookFor: {
      zh: "吧台的材質配色、包裝系統,以及手沖菜單——點板上最新鮮的那一支。",
      en: "The bar's material palette, the packaging system, and the filter menu — order whatever is freshest on the board.",
    },
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
    about: {
      zh: "這家丹麥織品世家透過大尺度的空間裝置呈現新系列,經常與受邀的藝術家或建築師合作。",
      en: "The Danish textile house presents new collections through large-scale spatial installations, often in collaboration with an invited artist or architect.",
    },
    whyGo: {
      zh: "Kvadrat 把織品當建築來處理。其裝置向來是設計節最具企圖心的作品之一,而它的色彩運用會重設你一整年的色盤。",
      en: "Kvadrat treats textile as architecture. The installation is always one of the festival's most ambitious, and the color work resets your palette for the year.",
    },
    whatToLookFor: {
      zh: "大尺度下的新配色、吸音的 Soft Cells,以及一塊織品如何改變整個空間的聲學與視覺溫度。",
      en: "The new colorways at scale, the acoustic Soft Cells, and how a single textile changes a room's entire acoustic and visual temperature.",
    },
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
    about: {
      zh: "一檔日本職人展——漆器、榫接、陶藝與工具,策展聚焦於日本與北歐工藝感性之間的對話。",
      en: "A showcase of Japanese makers — lacquerware, joinery, ceramics, and tools — curated to highlight the dialogue between Japanese and Scandinavian craft sensibilities.",
    },
    whyGo: {
      zh: "貫穿整個設計節的「日本—丹麥」對話,在這裡表達得最清楚。安靜、精準,滿是你會想拿在手裡的物件。",
      en: "The clearest expression of the Japan–Denmark design conversation that runs through the whole festival. Quiet, precise, and full of objects you will want to hold.",
    },
    whatToLookFor: {
      zh: "看不見任何五金的榫接、漆器件上的漆色深度,以及工具上的職人落款。",
      en: "Joinery without visible fasteners, the lacquer depth on the urushi pieces, and the maker's marks on the tools.",
    },
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
    about: {
      zh: "丹麥聲學與日本木工相遇:喇叭品牌 Dynaudio 與家具世家 Karimoku 合作打造的聆聽室。",
      en: "Danish acoustics meet Japanese woodcraft in a listening-room collaboration between speaker maker Dynaudio and furniture house Karimoku.",
    },
    whyGo: {
      zh: "一場貨真價實的跨文化產品合作,而且你能用耳朵、而非只用眼睛去體驗。聆聽場次也讓步調得以喘息。",
      en: "A genuine cross-cultural product collaboration you can experience with your ears, not just your eyes. The listening sessions are a welcome change of pace.",
    },
    whatToLookFor: {
      zh: "木質箱體如何形塑聲音、聆聽室的座位佈局,以及限量的合作款。",
      en: "How the wood cabinetry shapes the sound, the seating layout of the listening room, and the limited collaboration pieces.",
    },
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
    about: {
      zh: "成就 Poul Henningsen PH 系列燈具的照明世家,推出新燈款與一兩件復刻,並刻意佈置成在黃昏時展現其招牌的無眩光照明。",
      en: "The lighting house behind Poul Henningsen's PH lamps presents new fixtures and a reissue or two, staged to show its signature glare-free light at dusk.",
    },
    whyGo: {
      zh: "最具代表性的丹麥照明宣言。在受控環境裡看見 PH 原則——無眩光的光——被完整示範,值得你為它安排一整個傍晚。",
      en: "The definitive Danish lighting statement. Seeing the PH principle — light without glare — demonstrated in a controlled setting is worth planning your evening around.",
    },
    whatToLookFor: {
      zh: "層層遮住燈泡的燈罩、低輸出時的暖調表現,以及 Panthella 上的任何新飾面。",
      en: "The layered shades that hide the bulb, the warm-dim behaviour at low output, and any new finishes on the Panthella.",
    },
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
    about: {
      zh: "這家德國照明工作室帶來它充滿詩意、實驗性的燈具——半是雕塑、半是光源——於哥本哈根的客座展出。",
      en: "The German lighting atelier brings its poetic, experimental fixtures — part sculpture, part light source — to a Copenhagen guest presentation.",
    },
    whyGo: {
      zh: "刻意與丹麥的克制形成對照:俏皮、戲劇性的光,提醒你這個設計節並非單一風格的天下。",
      en: "A deliberate counterpoint to Danish restraint: playful, theatrical light that reminds you the festival is not a monoculture.",
    },
    whatToLookFor: {
      zh: "每件作品裡的機鋒、手工打造的細節,以及展場如何在暗中把每盞燈當成一件物件來陳列。",
      en: "The wit in each piece, the hand-built details, and how the gallery stages each fixture as an object in the dark.",
    },
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
    about: {
      zh: "一間新銳工作室的聯展,聚焦於物件與光之間的臨界——在粗獷的工業空間裡,展出小批量燈具與反射表面。",
      en: "An emerging studio's group presentation focused on the threshold between object and light — small-batch lamps and reflective surfaces in a raw industrial space.",
    },
    whyGo: {
      zh: "想看「接下來會發生什麼」就來這裡。完成度較低、實驗性較高,創作者也很樂意聊製作過程。",
      en: "Where to look if you want to see what comes next. Lower polish, higher experimentation, and approachable makers happy to talk process.",
    },
    whatToLookFor: {
      zh: "原型上的接合處、各種飾面的混搭,以及那些感覺再迭代一次就能量產的作品。",
      en: "Prototype joints, the mix of finishes, and the pieces that feel one iteration away from production.",
    },
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
    about: {
      zh: "一個位於雷夫斯哈倫島的創作集體,在臨港的素樸大廳裡展出氛圍照明與富觸感的物件,並隨夜色漸暗安排了 after-hours 活動。",
      en: "A collective on Refshaleøen showing atmospheric lighting and tactile objects in a stripped-back harbour-side hall, with an after-hours program as light fades.",
    },
    whyGo: {
      zh: "在雷夫斯哈倫島收尾的最佳方式——氛圍十足、輕鬆社交、不趕時間,水面上的黃金時刻光線最美。",
      en: "The right way to end a day on Refshaleøen — atmospheric, social, and unhurried, with the best light at golden hour over the water.",
    },
    whatToLookFor: {
      zh: "整個傍晚自然光與人造光的交織,以及專為設計節製作的限量物件。",
      en: "The interplay of natural and artificial light through the evening, and the limited objects produced just for the festival.",
    },
    websiteUrl: "https://www.3daysofdesign.dk",
    eventUrl: "https://www.3daysofdesign.dk",
    mapUrl: "https://maps.google.com/?q=Refshale%C3%B8en+Copenhagen",
  },
];

/** Fast lookup by id, used by the Planner page. */
export const EXHIBITIONS_BY_ID: Record<string, Exhibition> = Object.fromEntries(
  EXHIBITIONS.map((e) => [e.id, e]),
);
