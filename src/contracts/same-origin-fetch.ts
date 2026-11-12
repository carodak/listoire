/** The only data URLs the app fetches: embedded narration recordings. */
export const mp3DataUrl = /^data:audio\/mpeg;base64,[A-Za-z0-9+/]+=*$/;

interface Options extends RequestInit {
  timeoutMs?: number;
  /**
   * A larger declared Content-Length is answered with a failed (`!ok`) response; a body without
   * one fails while it is read, as soon as it passes the limit.
   */
  maxBytes?: number;
}

/**
 * fetch() restricted to this page's origin (http/https, no credentials in the URL)
 * or an MP3 data URL. Redirects are refused and cookies stay same-origin.
 */
export async function sameOriginFetch(
  url: string | URL,
  { timeoutMs, maxBytes, signal, ...init }: Options = {},
): Promise<Response> {
  if (!isAllowed(url)) throw new Error(`Blocked request outside this site: ${String(url)}`);
  const signals = [signal, timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined].filter(
    (item): item is AbortSignal => Boolean(item),
  );
  // Reviewed sink: isAllowed() above admits only same-origin http(s) URLs and MP3 data URLs.
  // fallow-ignore-next-line security-sink
  const response = await fetch(url, {
    ...init,
    signal: signals.length > 1 ? AbortSignal.any(signals) : signals[0],
    redirect: "error",
    credentials: "same-origin",
  });
  if (maxBytes === undefined) return response;
  if (Number(response.headers.get("content-length")) > maxBytes) {
    await response.body?.cancel();
    return Response.error();
  }
  if (!response.body) return response;
  let read = 0;
  const limited = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      read += chunk.byteLength;
      if (read > maxBytes) controller.error(new Error(`Response larger than ${maxBytes} bytes`));
      else controller.enqueue(chunk);
    },
  });
  const { status, statusText, headers } = response;
  return new Response(response.body.pipeThrough(limited), { status, statusText, headers });
}

function isAllowed(url: string | URL) {
  if (String(url).startsWith("data:")) return mp3DataUrl.test(String(url));
  // Outside a browser (unit tests, tools) there is no page; relative URLs resolve to a stand-in.
  const page = typeof window === "undefined" ? new URL("http://localhost/") : window.location;
  const target = new URL(url, page.href);
  return (
    ["http:", "https:"].includes(target.protocol) &&
    target.origin === page.origin &&
    !target.username &&
    !target.password
  );
}
