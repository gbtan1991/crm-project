import { extractHostname, hostnamesMatch } from "@/lib/seo-visibility/domain";
import type {
  RankingSearchParams,
  RankingSearchResult,
} from "@/lib/seo-visibility/ranking-provider";

const DATAFORSEO_BASE_URL = "https://api.dataforseo.com/v3";

/** Enough for visibility tiers (21+ = not visible) while keeping API cost low. */
export const DATAFORSEO_SEARCH_DEPTH = 30;

const QUEUE_POLL_INTERVAL_MS = 5_000;
const QUEUE_MAX_WAIT_MS = 6 * 60_000;
const PENDING_TASK_STATUS_CODES = new Set([40601, 40602]);

type DataForSeoOrganicItem = {
  type: string;
  rank_group?: number;
  url?: string;
  title?: string;
  domain?: string;
};

type DataForSeoSerpResult = {
  items?: DataForSeoOrganicItem[];
  check_url?: string;
  keyword?: string;
  location_code?: number;
};

type DataForSeoTask = {
  id?: string;
  status_code?: number;
  status_message?: string;
  result?: DataForSeoSerpResult[] | null;
};

type DataForSeoResponse = {
  status_code?: number;
  status_message?: string;
  tasks?: DataForSeoTask[];
};

function getCredentials() {
  const login = process.env.DATAFORSEO_LOGIN?.trim();
  const password = process.env.DATAFORSEO_PASSWORD?.trim();
  if (!login || !password) {
    throw new Error(
      "DATAFORSEO_LOGIN und DATAFORSEO_PASSWORD sind nicht konfiguriert.",
    );
  }
  return { login, password };
}

function getAuthorizationHeader() {
  const { login, password } = getCredentials();
  const encoded = Buffer.from(`${login}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractTopDomains(
  items: DataForSeoOrganicItem[],
  limit = 10,
): string[] {
  const domains: string[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (item.type !== "organic") continue;
    const hostname =
      extractHostname(item.url ?? "") ?? item.domain?.toLowerCase() ?? null;
    if (!hostname || seen.has(hostname)) continue;
    seen.add(hostname);
    domains.push(hostname);
    if (domains.length >= limit) break;
  }

  return domains;
}

export function parseDataForSeoOrganicItems(
  items: DataForSeoOrganicItem[] | undefined,
  targetDomain: string,
): RankingSearchResult {
  const organicResults = (items ?? []).filter((item) => item.type === "organic");
  const topDomains = extractTopDomains(organicResults);

  let position: number | null = null;
  let rankingUrl: string | null = null;
  let rankingTitle: string | null = null;

  for (const result of organicResults) {
    if (!result.url || typeof result.rank_group !== "number") continue;
    if (!hostnamesMatch(result.url, targetDomain)) continue;
    position = result.rank_group;
    rankingUrl = result.url;
    rankingTitle = result.title ?? null;
    break;
  }

  return {
    position,
    rankingUrl,
    rankingTitle,
    topDomains,
  };
}

function shouldLogSerpRankingDebug() {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.SEO_RANKING_DEBUG === "true"
  );
}

export function logSerpRankingDebug(input: {
  keyword: string;
  locationCode: number;
  targetDomain: string;
  checkUrl?: string | null;
  items?: DataForSeoOrganicItem[];
  matchedPosition: number | null;
}) {
  if (!shouldLogSerpRankingDebug()) return;

  const organicResults = (input.items ?? []).filter((item) => item.type === "organic");
  const lines = [
    `[seo-ranking] query="${input.keyword}" location_code=${input.locationCode} target=${input.targetDomain}`,
  ];

  if (input.checkUrl) {
    lines.push(`[seo-ranking] check_url=${input.checkUrl}`);
  }

  if (organicResults.length === 0) {
    lines.push("[seo-ranking]   (no organic results returned)");
  } else {
    for (const result of organicResults) {
      if (typeof result.rank_group !== "number") continue;
      const domain =
        extractHostname(result.url ?? "") ?? result.domain?.toLowerCase() ?? "?";
      lines.push(
        `[seo-ranking]   #${String(result.rank_group).padStart(2, " ")} ${domain} — ${result.url ?? ""}`,
      );
    }
  }

  lines.push(
    `[seo-ranking] matched target position: ${input.matchedPosition ?? "none"}`,
  );
  console.info(lines.join("\n"));
}

function parseAndLogSerpResult(
  serpResult: DataForSeoSerpResult | undefined,
  params: RankingSearchParams,
): RankingSearchResult {
  const parsed = parseDataForSeoOrganicItems(serpResult?.items, params.targetDomain);
  logSerpRankingDebug({
    keyword: params.keyword,
    locationCode: params.locationCode,
    targetDomain: params.targetDomain,
    checkUrl: serpResult?.check_url ?? null,
    items: serpResult?.items,
    matchedPosition: parsed.position,
  });
  return {
    ...parsed,
    checkUrl: serpResult?.check_url ?? null,
  };
}

export function buildDataForSeoSearchTask(params: RankingSearchParams) {
  return {
    keyword: params.keyword,
    location_code: params.locationCode,
    language_code: params.market.languageCode,
    depth: DATAFORSEO_SEARCH_DEPTH,
    se_domain: params.market.googleDomain,
    device: "desktop",
  };
}

async function parseDataForSeoResponse(response: Response): Promise<DataForSeoResponse> {
  if (!response.ok) {
    throw new Error(`DataForSEO-Anfrage fehlgeschlagen (${response.status}).`);
  }

  const data = (await response.json()) as DataForSeoResponse;
  if (typeof data.status_code === "number" && data.status_code !== 20000) {
    throw new Error(data.status_message ?? "DataForSEO-Anfrage fehlgeschlagen.");
  }

  return data;
}

function getTaskError(task: DataForSeoTask | undefined): string | null {
  if (!task) return "DataForSEO hat keine Aufgabe zurückgegeben.";
  const code = task.status_code;
  if (typeof code !== "number") return null;
  if (code === 20000 || code === 20100 || PENDING_TASK_STATUS_CODES.has(code)) {
    return null;
  }
  if (code >= 40000) {
    return task.status_message ?? "DataForSEO-Aufgabe fehlgeschlagen.";
  }
  return null;
}

async function dataForSeoPost(path: string, body: unknown) {
  return fetch(`${DATAFORSEO_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: getAuthorizationHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
}

async function dataForSeoGet(path: string) {
  return fetch(`${DATAFORSEO_BASE_URL}${path}`, {
    method: "GET",
    headers: {
      Authorization: getAuthorizationHeader(),
    },
    cache: "no-store",
  });
}

export async function fetchDataForSeoLiveOrganic(
  params: RankingSearchParams,
): Promise<RankingSearchResult> {
  const response = await dataForSeoPost("/serp/google/organic/live/regular", [
    buildDataForSeoSearchTask(params),
  ]);
  const data = await parseDataForSeoResponse(response);
  const task = data.tasks?.[0];
  const taskError = getTaskError(task);
  if (taskError) {
    throw new Error(taskError);
  }

  const serpResult = task?.result?.[0];
  return parseAndLogSerpResult(serpResult, params);
}

export async function fetchDataForSeoQueuedOrganic(
  params: RankingSearchParams,
): Promise<RankingSearchResult> {
  const postResponse = await dataForSeoPost("/serp/google/organic/task_post", [
    buildDataForSeoSearchTask(params),
  ]);
  const postData = await parseDataForSeoResponse(postResponse);
  const postedTask = postData.tasks?.[0];
  const postError = getTaskError(postedTask);
  if (postError) {
    throw new Error(postError);
  }

  const taskId = postedTask?.id;
  if (!taskId) {
    throw new Error("DataForSEO hat keine Aufgaben-ID zurückgegeben.");
  }

  const deadline = Date.now() + QUEUE_MAX_WAIT_MS;

  while (Date.now() < deadline) {
    const getResponse = await dataForSeoGet(
      `/serp/google/organic/task_get/regular/${taskId}`,
    );
    const getData = await parseDataForSeoResponse(getResponse);
    const task = getData.tasks?.[0];
    const taskError = getTaskError(task);
    if (taskError) {
      throw new Error(taskError);
    }

    const serpResult = task?.result?.[0];
    if (serpResult?.items?.length) {
      return parseAndLogSerpResult(serpResult, params);
    }

    await sleep(QUEUE_POLL_INTERVAL_MS);
  }

  throw new Error(
    "DataForSEO-Aufgabe nicht rechtzeitig abgeschlossen (Timeout nach 6 Minuten).",
  );
}
