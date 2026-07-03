export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input?.trim()) return null;

  let value = input.trim().toLowerCase();

  try {
    if (!value.includes("://")) {
      value = `https://${value}`;
    }
    const url = new URL(value);
    let hostname = url.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }
    return hostname || null;
  } catch {
    const stripped = value
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      ?.split("?")[0];
    return stripped || null;
  }
}

export function hostnamesMatch(a: string, b: string): boolean {
  const left = normalizeDomain(a);
  const right = normalizeDomain(b);
  if (!left || !right) return false;
  return left === right;
}

export function extractHostname(url: string): string | null {
  try {
    return normalizeDomain(url);
  } catch {
    return null;
  }
}
