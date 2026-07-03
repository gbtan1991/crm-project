export type KeywordStatus = "visible" | "weak" | "not_visible";

export type SeoKeyword = {
  keyword: string;
  region: string;
  status: KeywordStatus;
  volume: number;
};

export type SeoCompetitor = {
  name: string;
  reviews: number | null;
  rating: number | null;
  website: string;
  gmb: string;
  region: string;
  note?: string;
  strengths: string[];
};

export type MissedOpportunity = {
  title: string;
  problem: string;
  impact: string;
};

export type GbpMetric = {
  label: string;
  value: string;
  status: "critical" | "excellent" | "good" | "unknown";
};

export type GbpScoreItem = {
  label: string;
  score: number;
  max: number;
  note: string;
};

export type RankingFactor = {
  factor: string;
  level: "excellent" | "good" | "needs_work" | "critical" | "unknown";
  note: string;
};

export const SEO_KEYWORDS: SeoKeyword[] = [
  { keyword: "Immobilien verkaufen Aargau", region: "Aargau", status: "weak", volume: 260 },
  { keyword: "Immobilienmakler Aargau", region: "Aargau", status: "not_visible", volume: 480 },
  { keyword: "Haus verkaufen Aargau", region: "Aargau", status: "not_visible", volume: 320 },
  { keyword: "Immobilienmakler Freiamt", region: "Freiamt", status: "not_visible", volume: 90 },
  { keyword: "Immobilien Oberwil-Lieli", region: "Oberwil-Lieli", status: "not_visible", volume: 30 },
  { keyword: "Immobilienmakler Muri Aargau", region: "Muri AG", status: "not_visible", volume: 70 },
  { keyword: "Haus verkaufen Muri", region: "Muri AG", status: "not_visible", volume: 50 },
  { keyword: "Immobilienmakler Bremgarten", region: "Bremgarten", status: "not_visible", volume: 90 },
  { keyword: "Haus verkaufen Bremgarten", region: "Bremgarten", status: "not_visible", volume: 60 },
  { keyword: "Immobilienmakler Wohlen", region: "Wohlen", status: "not_visible", volume: 110 },
  { keyword: "Immobilien verkaufen Wohlen", region: "Wohlen", status: "not_visible", volume: 70 },
  { keyword: "Immobilienmakler Lenzburg", region: "Lenzburg", status: "not_visible", volume: 140 },
  { keyword: "Wohnung verkaufen Aargau", region: "Aargau", status: "weak", volume: 210 },
  { keyword: "Immobilienbewertung Aargau", region: "Aargau", status: "weak", volume: 390 },
  { keyword: "Immobilienbewertung kostenlos Aargau", region: "Aargau", status: "not_visible", volume: 170 },
  { keyword: "Einfamilienhaus verkaufen Aargau", region: "Aargau", status: "not_visible", volume: 130 },
  { keyword: "Immobilienmakler Aarau", region: "Aarau", status: "not_visible", volume: 260 },
  { keyword: "Haus verkaufen Aarau", region: "Aarau", status: "not_visible", volume: 190 },
  { keyword: "Immobilienmakler Zug", region: "Zug", status: "not_visible", volume: 480 },
  { keyword: "Immobilienmakler Zürich", region: "Zürich", status: "not_visible", volume: 1200 },
  { keyword: "Hausverkauf Aargau Ratgeber", region: "Aargau", status: "visible", volume: 90 },
  { keyword: "Immobilienberater Aargau", region: "Aargau", status: "weak", volume: 150 },
  { keyword: "Immobilien Zürich verkaufen", region: "Zürich", status: "not_visible", volume: 590 },
  { keyword: "Immobilienmakler Luzern", region: "Luzern", status: "not_visible", volume: 520 },
  { keyword: "Wohnung verkaufen Zürich", region: "Zürich", status: "not_visible", volume: 430 },
];

export const SEO_COMPETITORS: SeoCompetitor[] = [
  {
    name: "Engel & Völkers Baden-Bremgarten",
    reviews: 83,
    rating: 5.0,
    website: "https://www.engelvoelkers.com/ch/de/shops/baden-bremgarten",
    gmb: "https://maps.google.com/?cid=4041662361829243525",
    region: "Ennetbaden / Bremgarten",
    strengths: [
      "Internationales Netzwerk",
      "Starke Marke",
      "83 Bewertungen",
      "5.0 Sterne",
      "Büro in Bremgarten (direktes Einzugsgebiet)",
    ],
  },
  {
    name: "ImmoAnker (Kanton Aargau)",
    reviews: null,
    rating: 5.0,
    website: "https://immoanker.ch/haus-verkaufen-aargau/",
    gmb: "https://maps.google.com/search?q=ImmoAnker+Aargau",
    region: "Kanton Aargau",
    note: "Genaue Google-Bewertungszahl nicht eindeutig verifizierbar",
    strengths: [
      "Professionelle Videotouren",
      "23 Jahre Erfahrung (eigene Angabe)",
      "Starke SEO-Präsenz",
      "923+ Transaktionen (eigene Angabe)",
    ],
  },
  {
    name: "RE/MAX Aarau",
    reviews: null,
    rating: null,
    website: "https://www.remaxaarau.ch/",
    gmb: "https://maps.google.com/search?q=REMAX+Immobilien+Aarau",
    region: "Aarau / Kanton Aargau",
    note: "Genaue Google-Bewertungszahl nicht eindeutig verifizierbar",
    strengths: [
      "Weltweites RE/MAX Netzwerk",
      "Starke Markenbekanntheit",
      "Dubai-Immobilien Nische",
    ],
  },
  {
    name: "Engel & Völkers Aarau",
    reviews: 58,
    rating: 4.7,
    website: "https://www.engelvoelkers.com/ch/de/shops/aarau",
    gmb: "https://maps.google.com/?cid=9684266454478728038",
    region: "Aarau",
    strengths: [
      "Etablierte Marke",
      "58 verifizierte Bewertungen",
      "Lokales Büro in Aarau",
    ],
  },
  {
    name: "Neho (Kanton Aargau)",
    reviews: null,
    rating: 4.3,
    website: "https://neho.ch/de/immobilienmakler-aargau-kanton",
    gmb: "https://maps.google.com/search?q=Neho+Immobilien+Aargau",
    region: "Kanton Aargau (schweizweit)",
    note: "Trustpilot: 4.3 Sterne aus 337 Bewertungen; Google-Profil nicht eindeutig verifizierbar",
    strengths: [
      "Festpreismodell ab CHF 12'000",
      "9'900+ Verkäufe schweizweit",
      "Starke Online-Präsenz",
    ],
  },
];

export const SEO_MISSED_OPPORTUNITIES: MissedOpportunity[] = [
  {
    title: "Fehlende Landingpages pro Region",
    problem:
      "Für Kernregionen wie Muri, Wohlen, Bremgarten, Aarau und Lenzburg existieren keine dedizierten SEO-Landingpages.",
    impact:
      "Mitbewerber wie Engel & Völkers und ImmoAnker dominieren genau diese Suchanfragen und fangen potenzielle Verkäufer ab.",
  },
  {
    title: "Zu wenige Google Bewertungen",
    problem:
      "Mit 17 Google-Bewertungen liegt Portmann Consulting deutlich unter dem Niveau direkter Mitbewerber (Engel & Völkers Baden-Bremgarten: 83 Bewertungen).",
    impact:
      "Google rankt Unternehmen mit mehr Bewertungen höher im Local Pack. Potenzielle Kunden vertrauen Anbietern mit mehr Rezensionen stärker.",
  },
  {
    title: "Kein systematisches Google Business Management",
    problem:
      "Google Beiträge (Posts) sind nicht aktiv genutzt. Frische Inhalte im GBP-Profil verbessern direkt die lokale Sichtbarkeit.",
    impact:
      "Jeder fehlende Beitrag ist eine verpasste Chance, im Local Pack besser zu erscheinen.",
  },
  {
    title: "Schwache Sichtbarkeit für hochvolumige Keywords",
    problem:
      "Für Suchbegriffe wie 'Immobilienmakler Aargau' (480 Suchen/Monat) oder 'Immobilienmakler Zürich' (1'200 Suchen/Monat) ist Portmann Consulting nicht auf Seite 1 sichtbar.",
    impact:
      "Diese Anfragen kommen von Eigentümern mit konkreter Kaufabsicht – und werden aktuell ausschliesslich an Mitbewerber weitergeleitet.",
  },
  {
    title: "Keine Videos auf Website & Social Media integriert",
    problem:
      "Obwohl YouTube-Content vorhanden ist (z.B. Tippgeber-Bonus Video), wird dieser nicht systematisch für SEO und Social Proof eingesetzt.",
    impact:
      "Video-Content erhöht Verweildauer und Conversion – und stärkt die Google-Sichtbarkeit erheblich.",
  },
  {
    title: "Fehlende strukturierte Daten (Schema Markup)",
    problem:
      "Die Website nutzt kein LocalBusiness-Schema Markup, was für Google Maps Sichtbarkeit und Rich Snippets essenziell ist.",
    impact:
      "Ohne Schema Markup verpasst die Website wichtige SEO-Signale, die Google für den Local Pack verwendet.",
  },
];

export const SEO_REGIONS = [
  "Muri AG",
  "Wohlen",
  "Bremgarten",
  "Lenzburg",
  "Villmergen",
  "Fahrwangen",
  "Oberrohrdorf",
  "Aarau",
  "Mellingen",
  "Baden",
];

export const GBP_METRICS: GbpMetric[] = [
  { label: "Google Bewertungen", value: "17", status: "critical" },
  { label: "Durchschnittliche Sternebewertung", value: "5.0 ⭐", status: "excellent" },
  { label: "Letzte Bewertung", value: "vor ca. 1 Monat", status: "good" },
  { label: "Antwort auf Bewertungen", value: "Nicht eindeutig verifizierbar", status: "unknown" },
  { label: "Google Beiträge (Posts)", value: "Nicht aktiv genutzt", status: "critical" },
  { label: "Hauptkategorie", value: "Immobilienmakler", status: "good" },
  { label: "Website verknüpft", value: "Ja", status: "excellent" },
  { label: "Telefon eingetragen", value: "Ja (+41 79 281 51 85)", status: "excellent" },
  { label: "Google Maps CID", value: "5376525474998746972", status: "good" },
];

export const GBP_SCORE_ITEMS: GbpScoreItem[] = [
  { label: "Bewertungsanzahl", score: 15, max: 25, note: "17 vs. 83 (Marktführer)" },
  { label: "Sternebewertung", score: 10, max: 10, note: "5.0 – perfekt" },
  { label: "Profilvollständigkeit", score: 6, max: 15, note: "Fehlende Posts, Q&A" },
  { label: "Aktualität / Aktivität", score: 4, max: 15, note: "Keine Google Posts" },
  { label: "Bilder & Videos", score: 3, max: 15, note: "Nicht eindeutig verifizierbar" },
  { label: "Sichtbarkeit / Wettbewerb", score: 0, max: 20, note: "Kritisch" },
];

export const RANKING_FACTORS: RankingFactor[] = [
  { factor: "Sternebewertung (5.0)", level: "excellent", note: "Perfekte Bewertung – ausgezeichnet." },
  {
    factor: "Bewertungsanzahl (17)",
    level: "critical",
    note: "Deutlich unter Marktführer-Niveau. Marktführer hat 83 Bewertungen.",
  },
  { factor: "Aktualität der Bewertungen", level: "good", note: "Letzte Bewertung vor ca. 1 Monat – positiv." },
  { factor: "Antwortverhalten", level: "unknown", note: "Nicht eindeutig verifizierbar." },
  { factor: "Profilvollständigkeit", level: "needs_work", note: "Fehlende Posts, Q&A-Sektion nicht aktiv genutzt." },
  { factor: "Google Beiträge (Posts)", level: "critical", note: "Keine aktiven Google Posts erkennbar." },
  { factor: "Unternehmensbeschreibung", level: "good", note: "Beschreibung vorhanden auf der Website." },
  { factor: "Kategorien", level: "good", note: "Hauptkategorie Immobilienmakler korrekt." },
  { factor: "Fotos & Videos", level: "unknown", note: "Anzahl der GBP-Fotos nicht eindeutig verifizierbar." },
  {
    factor: "Google Maps Sichtbarkeit",
    level: "critical",
    note: "Für Hauptsuchbegriffe nicht im Local Pack sichtbar.",
  },
];
