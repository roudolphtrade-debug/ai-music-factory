/**
 * Entry of the DEDICATED recette Worker of the private Lyria pilot (`docs/music/cloudflare/wrangler.recette.jsonc`).
 * It holds the whole pilot: the signed HTTP front, the queue consumer and the Cron reconciliation. Not deployed:
 * deployment, resources and activation each require a separate owner GO.
 *
 *  - `fetch`: only `/internal/v1/lyria-pilot`, and only for a request signed by the Lovable relay
 *    (`private-pilot-service.ts`). Any other path, the old public `/api/studio/lyria-private` included: 404.
 *  - `queue` and `scheduled`: this Worker is the ONLY consumer of the pilot queue and the only reconciler of its
 *    database (correction C-2: the Lovable application no longer exposes either), so there is one cap of five.
 */
import type { PrivateLyriaBindings } from "./private-pilot-bindings";
import { PILOT_INTERNAL_PATH } from "./private-pilot-hmac";
import { handlePilotServiceRequest } from "./private-pilot-service";
import { consumePrivateLyriaBatch, runScheduledReconciliation, scheduledLogLine } from "./private-pilot-worker";

export const PILOT_PATH = PILOT_INTERNAL_PATH;

export default {
  async fetch(request: Request, env: PrivateLyriaBindings): Promise<Response> {
    return handlePilotServiceRequest(request, env);
  },

  async queue(batch: { messages: readonly { body: unknown; ack(): void }[] }, env: PrivateLyriaBindings): Promise<void> {
    await consumePrivateLyriaBatch(batch, env);
  },

  async scheduled(_controller: unknown, env: PrivateLyriaBindings): Promise<void> {
    console.log(scheduledLogLine(await runScheduledReconciliation(env)));
  },
};
