/**
 * Content integrity of the stored songs. A SHA-256 written next to an object (R2 custom metadata) is a claim, not a
 * proof: only hashing the bytes themselves proves what is stored. The fingerprint of reference is the one D1
 * recorded from the bytes in memory when the song was stored (and that R2 itself checked at the write):
 *  - playback: the browser hashes the whole file against `Repr-Digest` before playing it (always). In "server"
 *    mode the HTTP front also hashes it while it streams and FAILS the response at the end on a mismatch (a broken
 *    download, never a complete wrong file). Measured cost under local workerd for 3 MB: 46 to 58 ms with 64 KiB
 *    chunks, about 130 ms with 4 KiB chunks, against about 0 for the native pipe: too much for a 10 ms request,
 *    hence "client" by default;
 *  - recovery of a silent attempt (queue consumer, 30 s of CPU): the whole object is hashed before it is recorded.
 *
 * The incremental hash is native on Cloudflare (`crypto.DigestStream`) and `node:crypto` in Node (tests). Where
 * neither exists, there is no verified read: callers refuse instead of serving unchecked bytes.
 */
export interface StreamingHasher {
  update(chunk: Uint8Array): void | Promise<void>;
  digestHex(): Promise<string>;
}
export type HasherFactory = () => StreamingHasher;

export class IntegrityError extends Error {
  constructor(readonly reason: "size_mismatch" | "digest_mismatch" | "too_large") {
    super(`stored content failed its integrity check: ${reason}`);
    this.name = "IntegrityError";
  }
}

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");

type DigestStreamLike = WritableStream<Uint8Array> & { digest: Promise<ArrayBuffer> };
type NodeCryptoLike = { createHash(algorithm: string): { update(data: Uint8Array): unknown; digest(encoding: "hex"): string } };

/** The best incremental SHA-256 of the runtime, or `null` when none is available (then nothing is served). */
export function defaultHasherFactory(): HasherFactory | null {
  const DigestStream = (globalThis.crypto as unknown as { DigestStream?: new (algorithm: string) => DigestStreamLike } | undefined)
    ?.DigestStream;
  if (typeof DigestStream === "function") {
    return () => {
      const stream = new DigestStream("SHA-256");
      const writer = stream.getWriter();
      return {
        update: (chunk) => writer.write(chunk),
        async digestHex() {
          await writer.close();
          return toHex(await stream.digest);
        },
      };
    };
  }
  const getBuiltinModule = (globalThis as { process?: { getBuiltinModule?: (id: string) => unknown } }).process?.getBuiltinModule;
  const nodeCrypto = getBuiltinModule?.("node:crypto") as NodeCryptoLike | undefined;
  if (nodeCrypto?.createHash) {
    return () => {
      const hash = nodeCrypto.createHash("sha256");
      return {
        update: (chunk) => void hash.update(chunk),
        digestHex: async () => hash.digest("hex"),
      };
    };
  }
  return null;
}

/**
 * Passes `body` through unchanged while hashing it; errors the stream (instead of closing it) when the content is
 * not exactly `expected`. More bytes than announced are refused as soon as they appear.
 */
export function verifiedStream(
  body: ReadableStream<Uint8Array>,
  expected: { sha256: string; bytes: number },
  hasher: StreamingHasher,
): ReadableStream<Uint8Array> {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      async transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > expected.bytes) throw new IntegrityError("size_mismatch");
        await hasher.update(chunk);
        controller.enqueue(chunk);
      },
      async flush() {
        if (seen !== expected.bytes) throw new IntegrityError("size_mismatch");
        if ((await hasher.digestHex()) !== expected.sha256) throw new IntegrityError("digest_mismatch");
      },
    }),
  );
}

/** Hashes a whole stream without keeping it. Stops (and throws) beyond `maxBytes`. */
export async function hashStream(
  body: ReadableStream<Uint8Array>,
  hasher: StreamingHasher,
  maxBytes: number,
): Promise<{ sha256: string; bytes: number }> {
  const reader = body.getReader();
  let bytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new IntegrityError("too_large");
    }
    await hasher.update(value);
  }
  return { sha256: await hasher.digestHex(), bytes };
}

/** `Repr-Digest` (RFC 9530) of a hex SHA-256, so the browser can check the whole file before playing it. */
export function reprDigestHeader(sha256Hex: string): string {
  const bytes = sha256Hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? [];
  return `sha-256=:${btoa(String.fromCharCode(...bytes))}:`;
}
