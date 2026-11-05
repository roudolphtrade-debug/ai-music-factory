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

/**
 * The application exposes `fetch` ONLY. The private Lyria pilot's queue consumer and Cron reconciliation live in the
 * dedicated Worker (`src/music/private-pilot-entry.ts`) and nowhere else, so the pilot has a single consumer, a single
 * database and a single cap of five attempts (correction C-2).
 */
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      // Private Lyria pilot: not a TanStack public route. This application only RELAYS it, signed, to the dedicated
      // Worker; it holds no D1, queue or bucket and never calls the provider. Closed by the shared emergency stop
      // AI_ROUTES_PAUSED, and by an absent or incomplete relay configuration.
      if (new URL(request.url).pathname === "/api/studio/lyria-private") {
        const { relayPrivateLyriaRequest } = await import("./music/private-pilot-relay");
        return await relayPrivateLyriaRequest(request, env);
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
};
