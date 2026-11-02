import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Private Lyria pilot: not a TanStack public route. OFF without explicit server bindings, and closed by the
      // shared emergency stop AI_ROUTES_PAUSED. The handler checks the owner, reserves in D1 and only enqueues:
      // Google is called by the queue consumer below, never inside this request.
      if (new URL(request.url).pathname === "/api/studio/lyria-private") {
        const { handlePrivateLyriaRequest } = await import("./music/private-demo-handler");
        return await handlePrivateLyriaRequest(request, env as import("./music/private-demo-handler").PrivateLyriaBindings);
      }
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },

  /**
   * Cloudflare Queues consumer of the private Lyria pilot. Without a queue binding configured for this Worker it is
   * never invoked. Every message is acknowledged after handling; the consumer itself guarantees at most one provider
   * call per attempt, whatever the queue redelivers.
   */
  async queue(batch: { messages: readonly { body: unknown; ack(): void }[] }, env: unknown) {
    const { consumePrivateLyriaBatch } = await import("./music/private-pilot-worker");
    await consumePrivateLyriaBatch(batch, env as import("./music/private-pilot-bindings").PrivateLyriaBindings);
  },
};
