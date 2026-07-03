export type KeywordVisibility = "EXCELLENT" | "WEAK" | "LOW" | "NOT_VISIBLE";

export type RankingTier =
  | "top3"
  | "top10"
  | "top20"
  | "top50"
  | "top100"
  | "none";

export type TierSummary = {
  top3: number;
  top10: number;
  top20: number;
  top50: number;
  top100: number;
  notRanked: number;
};

export function getRankingTier(position: number | null): RankingTier {
  if (position === null || position > 100) return "none";
  if (position <= 3) return "top3";
  if (position <= 10) return "top10";
  if (position <= 20) return "top20";
  if (position <= 50) return "top50";
  return "top100";
}

export function getVisibility(position: number | null): KeywordVisibility {
  if (position === null || position > 20) return "NOT_VISIBLE";
  if (position <= 3) return "EXCELLENT";
  if (position <= 10) return "WEAK";
  return "LOW";
}

export function getVisibilityLabel(visibility: KeywordVisibility): string {
  switch (visibility) {
    case "EXCELLENT":
      return "Sichtbar";
    case "WEAK":
      return "Schwach sichtbar";
    case "LOW":
      return "Gering sichtbar";
    case "NOT_VISIBLE":
      return "Nicht sichtbar";
  }
}

export function getVisibilityDescription(
  visibility: KeywordVisibility,
  businessName?: string,
): string {
  const name = businessName ?? "Ihr Unternehmen";
  switch (visibility) {
    case "EXCELLENT":
      return `${name} erscheint auf Seite 1 – gute Basis.`;
    case "WEAK":
      return "Schwache Platzierung. Mitbewerber erscheinen zuerst.";
    case "LOW":
      return "Platzierung auf Seite 1, aber weit unten. Verbesserungspotenzial vorhanden.";
    case "NOT_VISIBLE":
      return "Kein relevantes Ranking auf Seite 1 erkennbar. Potenzielle Kunden finden zuerst Mitbewerber.";
  }
}

export function aggregateTierCounts(
  rankings: { position: number | null }[],
): TierSummary {
  const summary: TierSummary = {
    top3: 0,
    top10: 0,
    top20: 0,
    top50: 0,
    top100: 0,
    notRanked: 0,
  };

  for (const ranking of rankings) {
    const tier = getRankingTier(ranking.position);
    switch (tier) {
      case "top3":
        summary.top3 += 1;
        break;
      case "top10":
        summary.top10 += 1;
        break;
      case "top20":
        summary.top20 += 1;
        break;
      case "top50":
        summary.top50 += 1;
        break;
      case "top100":
        summary.top100 += 1;
        break;
      case "none":
        summary.notRanked += 1;
        break;
    }
  }

  return summary;
}
