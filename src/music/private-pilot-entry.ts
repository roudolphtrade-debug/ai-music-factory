/**
 * Entry of the DEDICATED recette Worker of the private Lyria pilot (`docs/music/cloudflare/wrangler.recette.jsonc`).
 * It holds only the pilot: the light HTTP front, the queue consumer and the Cron reconciliation, so the integration
 * tests on isolated Cloudflare resources depend on nothing the Lovable hosting may or may not offer. Not deployed:
 * deployment, resources and activation each require a separate owner GO.
 *
 * `src/server.ts` exposes the same three handlers for the day the hosting is proven to pass the bindings, `queue()`
 * and `scheduled()` to it; until then, this file is the only tested way to run the pilot on Cloudflare.
 */
import { handlePrivateLyriaRequest } from "./private-demo-handler";
import type { PrivateLyriaBindings } from "./private-pilot-bindings";
import { consumePrivateLyriaBatch, runScheduledReconciliation, scheduledLogLine } from "./private-pilot-worker";

export const PILOT_PATH = "/api/studio/lyria-private";

export default {
  async fetch(request: Request, env: PrivateLyriaBindings): Promise<Response> {
    if (new URL(request.url).pathname !== PILOT_PATH) {
      return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return handlePrivateLyriaRequest(request, env);
  },

  async queue(batch: { messages: readonly { body: unknown; ack(): void }[] }, env: PrivateLyriaBindings): Promise<void> {
    await consumePrivateLyriaBatch(batch, env);
  },

  async scheduled(_controller: unknown, env: PrivateLyriaBindings): Promise<void> {
    console.log(scheduledLogLine(await runScheduledReconciliation(env)));
  },
};
