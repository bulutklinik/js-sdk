export interface RecordedCall {
  url: string;
  init: RequestInit;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

/** Build an injectable fetch that records calls and delegates to `handler`. */
export function makeFetch(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
): { fetchImpl: typeof fetch; calls: RecordedCall[] } {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string" ? input : input.toString();
    const recordedInit = init ?? {};
    calls.push({ url, init: recordedInit });
    return handler(url, recordedInit);
  }) as typeof fetch;
  return { fetchImpl, calls };
}

export function bodyOf(call: RecordedCall): Record<string, unknown> {
  return JSON.parse(call.init.body as string) as Record<string, unknown>;
}

export function authHeader(call: RecordedCall): string | null {
  return new Headers(call.init.headers).get("authorization");
}
