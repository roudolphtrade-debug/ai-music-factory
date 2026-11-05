import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import entry, { PILOT_PATH } from "./private-pilot-entry";
import type { PrivateLyriaBindings } from "./private-pilot-bindings";

const CONFIG_PATH = "docs/music/cloudflare/wrangler.recette.jsonc";

/** JSONC -> JSON: drops // and /* *\/ comments outside strings, then trailing commas. */
function parseJsonc(text: string): Record<string, unknown> {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === "\\" ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j;
    } else if (c === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      out += "\n";
    } else if (c === "/" && text[i + 1] === "*") {
      i = text.indexOf("*/", i + 2) + 1;
    } else {
      out += c;
    }
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, "$1")) as Record<string, unknown>;
}

const raw = readFileSync(CONFIG_PATH, "utf8");
const config = parseJsonc(raw) as {
  name: string;
  main: string;
  account_id?: string;
  workers_dev: boolean;
  preview_urls: boolean;
  routes: unknown[];
  route?: unknown;
  vars: Record<string, string>;
  define: Record<string, string>;
  d1_databases: { binding: string; database_name: string; database_id: string }[];
  r2_buckets: { binding: string; bucket_name: string; jurisdiction?: string }[];
  queues: {
    producers: { binding: string; queue: string }[];
    consumers: { queue: string; max_batch_size: number; max_retries: number; max_concurrency: number }[];
  };
  triggers: { crons: string[] };
  env?: unknown;
};

describe("recette Wrangler config: isolated, inactive, without secrets", () => {
  it("is not where any build or Wrangler run picks it up by itself", () => {
    expect(readdirSync(".").filter((f) => /^wrangler\.(jsonc?|toml)$/.test(f))).toEqual([]);
  });

  it("keeps its own Worker, D1 and queue, with a D1 placeholder that cannot be deployed as it is", () => {
    expect(config.name).toBe("aimf-lyria-pilot-recette");
    for (const name of [config.d1_databases[0].database_name, config.queues.producers[0].queue, config.queues.consumers[0].queue]) {
      expect(name).toBe("aimf-lyria-pilot-recette");
    }
    expect(config.d1_databases[0].database_id).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/i);
    expect(config.account_id).toBeUndefined();
    expect(config.env).toBeUndefined(); // no production environment hidden in it
  });

  it("stores in the existing private AIMF bucket, in the EU jurisdiction, and in no other bucket", () => {
    expect(config.r2_buckets).toEqual([
      { binding: "AIMF_PRIVATE_LYRIA_BUCKET", bucket_name: "aimf-media-staging", jurisdiction: "eu" },
    ]);
  });

  it("the technical documentation describes the same bucket, jurisdiction and prefix, and never deletes the bucket", () => {
    for (const doc of ["docs/music/LYRIA-PILOT-RECETTE-CLOUDFLARE.md", "docs/music/LYRIA-PRIVATE-DEMO-PLAN.md"]) {
      const text = readFileSync(doc, "utf8");
      expect(text).toContain("aimf-media-staging");
      expect(text).toContain('jurisdiction: "eu"');
      expect(text).toContain("pilot/");
    }
    expect(readFileSync("docs/music/LYRIA-PILOT-RECETTE-CLOUDFLARE.md", "utf8")).toMatch(/bucket partagé `aimf-media-staging` n'est jamais supprimé/);
  });

  it("every R2 binding declares the EU jurisdiction (it cannot be changed once a bucket exists)", () => {
    expect(config.r2_buckets.length).toBeGreaterThan(0);
    for (const bucket of config.r2_buckets) expect(bucket.jurisdiction).toBe("eu");
    // The raw file too: no second r2_buckets block hidden further down.
    expect(raw.match(/"r2_buckets"/g)).toHaveLength(1);
    expect(raw.match(/"bucket_name"/g)).toHaveLength(1);
  });

  it("is reachable by no route, no workers.dev and no preview address", () => {
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
    expect(config.routes).toEqual([]);
    expect(config.route).toBeUndefined();
  });

  it("is closed by default: switch off, emergency stop on, fictitious provider", () => {
    expect(config.vars.AIMF_PRIVATE_LYRIA_ENABLED).toBe("0");
    expect(config.vars.AI_ROUTES_PAUSED).toBe("1");
    expect(config.vars.AIMF_PRIVATE_LYRIA_PROVIDER).toBe("mock");
  });

  it("holds no secret, no key and no owner identity", () => {
    expect(Object.keys(config.vars)).not.toContain("GEMINI_API_KEY");
    expect(Object.keys(config.vars)).not.toContain("AIMF_PRIVATE_LYRIA_OWNER_ID");
    for (const value of Object.values(config.vars)) {
      expect(value).not.toMatch(/AIza|sk-|eyJ|[0-9a-f]{32}/);
    }
    expect(raw).not.toMatch(/AIza[0-9A-Za-z_-]{20,}|eyJ[0-9A-Za-z_-]{10,}/);
  });

  it("binds exactly the names the pilot code reads", () => {
    const bindingsSource = readFileSync("src/music/private-pilot-bindings.ts", "utf8");
    const names = [
      config.d1_databases[0].binding,
      config.r2_buckets[0].binding,
      config.queues.producers[0].binding,
      ...Object.keys(config.vars),
    ];
    for (const name of names) expect(bindingsSource).toContain(`${name}?:`);
  });

  it("one message at a time, no queue retry, a Cron trigger for the autonomous reconciliation", () => {
    expect(config.queues.consumers[0]).toMatchObject({ max_batch_size: 1, max_retries: 0, max_concurrency: 1 });
    expect(config.triggers.crons).toEqual(["*/5 * * * *"]);
  });

  it("points at the dedicated entry, and neutralizes import.meta.env outside Vite", () => {
    expect(resolve("docs/music/cloudflare", config.main)).toBe(resolve("src/music/private-pilot-entry.ts"));
    expect(existsSync(resolve("docs/music/cloudflare", config.main))).toBe(true);
    expect(config.define).toEqual({
      "import.meta.env.VITE_SUPABASE_URL": "undefined",
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": "undefined",
    });
  });
});

describe("dedicated recette Worker entry, with the config's own values", () => {
  const recette = config.vars as PrivateLyriaBindings;

  it("answers nothing but the signed internal pilot path (the old public path included)", async () => {
    const res = await entry.fetch(new Request("https://recette.test/"), recette);
    expect(res.status).toBe(404);
    expect(PILOT_PATH).toBe("/internal/v1/lyria-pilot");
    expect((await entry.fetch(new Request("https://recette.test/api/studio/lyria-private"), recette)).status).toBe(404);
    expect(config.vars.AIMF_PILOT_AUDIENCE).toBe("aimf-lyria-pilot-recette");
    const pilot = await entry.fetch(new Request(`https://recette.test${PILOT_PATH}`), recette);
    expect(pilot.status).toBe(503);
    expect((await pilot.json()).code).toBe("pilot_disabled");
  });

  it("Cron and queue do nothing while the config is closed", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await entry.scheduled({}, recette);
    expect(JSON.parse(String(log.mock.calls[0][0]))).toMatchObject({ event: "aimf_pilot_reconcile", status: "disabled" });
    const ack = vi.fn();
    await entry.queue({ messages: [{ body: { v: 1, jobId: "00000000-0000-4000-8000-000000000001" }, ack }] }, recette);
    expect(ack).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });
});
