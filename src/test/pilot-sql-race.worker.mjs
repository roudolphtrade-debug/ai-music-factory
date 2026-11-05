// Thread of the P3a concurrency tests: ONE SQLite connection of its own on the shared WAL file, released by a
// barrier together with the other threads, running ONE exact statement of src/music/private-pilot-sql.ts (its text is
// read from that module by the test and handed over as it is, so no TypeScript loader is needed here).
import { parentPort, workerData } from "node:worker_threads";
import { DatabaseSync } from "node:sqlite";

const { file, sql, args, barrier } = workerData;
const db = new DatabaseSync(file);
db.exec("PRAGMA busy_timeout = 10000;");
Atomics.wait(new Int32Array(barrier), 0, 0);
let row = null;
let error = null;
try {
  row = db.prepare(sql).get(...args) ?? null;
} catch (e) {
  error = String(e?.message ?? e);
}
db.close();
parentPort.postMessage({ won: row !== null, error });
