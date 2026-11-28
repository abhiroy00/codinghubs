let csrf = "";
let unauthorized: (() => void) | null = null;
export function setCsrf(value: string) {
  csrf = value;
}
export function onUnauthorized(handler: (() => void) | null) {
  unauthorized = handler;
}

export async function api<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    files?: FormData;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const method = options.method || "GET";
  const response = await fetch("/api" + path, {
    method,
    credentials: "same-origin",
    signal: options.signal,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { "X-CSRF-Token": csrf } : {}),
    },
    body:
      options.files ||
      (options.body ? JSON.stringify(options.body) : undefined),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/auth")) unauthorized?.();
    throw new Error(
      data.error?.message || `Request failed (${response.status})`,
    );
  }
  return data as T;
}

export function number(value: number | null | undefined, decimals = 0): string {
  return value == null
    ? "—"
    : value.toLocaleString("en-IN", {
        maximumFractionDigits: decimals,
        minimumFractionDigits: decimals,
      });
}
export function dateLabel(
  value: string | number | undefined,
  withTime = false,
): string {
  if (!value) return "Not available";
  const date = new Date(
    typeof value === "number"
      ? value * 1000
      : value + (value.length === 10 ? "T12:00:00+05:30" : ""),
  );
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}
export function errorText(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "The operation could not be completed";
}
export function bytes(value?: number): string {
  return value == null
    ? "—"
    : value >= 1024 ** 3
      ? `${(value / 1024 ** 3).toFixed(1)} GB`
      : `${(value / 1024 ** 2).toFixed(1)} MB`;
}
