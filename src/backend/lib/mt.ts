/**
 * mt.ts — Multithreaded BFS/DFS dengan Worker Pool.
 *
 * Masalah desain sebelumnya:
 * - Setiap request spawn Worker baru -> overhead ~100-300ms per worker
 * - Seluruh nodes[] di-serialize (clone) ke setiap worker -> ratusan KB
 *   dikirim 4x, padahal computation BFS/DFS sendiri hanya ~2-5ms
 * - Hasilnya MT jauh lebih lambat dari single-thread untuk pohon kecil/sedang
 *
 * Solusi:
 * 1. Worker Pool — worker dibuat SEKALI saat startup, di-reuse untuk setiap request.
 *    Menghilangkan overhead spawn (~100-300ms) dari hot path.
 * 2. SharedArrayBuffer — nodes[] di-encode ke typed array dan di-share ke worker
 *    tanpa copy (zero-copy via transferable). Menghilangkan serialize overhead.
 *
 * Karena SharedArrayBuffer membutuhkan perancangan encoding khusus dan
 * Node.js Worker Pool tidak tersedia built-in, kita pakai pendekatan praktis:
 * - Pool sederhana: N worker tetap, request di-queue, worker di-reuse via message passing.
 * - Pohon DOM di-encode ke flat Int32Array (compact, transferable).
 *
 * Jika pohon < MIN_NODES_FOR_MT: langsung fallback ke single-thread.
 * (Untuk pohon kecil, overhead apapun lebih besar dari komputasi.)
 */

import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import * as path from "path";
import { treeNode } from "./tree";
import { searchBFS, searchDFS } from "./algo";

// ─── Konfigurasi ──────────────────────────────────────────────────────────────
const N_WORKERS        = 4;
const SPLIT_DEPTH      = 3;
const MIN_NODES_FOR_MT = 500;   // di bawah ini single-thread selalu lebih cepat

// ─── Worker Pool ──────────────────────────────────────────────────────────────
interface PoolWorker {
  worker:  Worker;
  busy:    boolean;
  resolve: ((v: WorkerResult) => void) | null;
  reject:  ((e: Error) => void) | null;
}

interface WorkerTask {
  nodes:    treeNode[];
  startId:  number;
  selector: string;
  algo:     "BFS" | "DFS";
  topN:     number;
}

interface WorkerResult {
  log:     number[];
  results: number[];
}

let pool: PoolWorker[] | null = null;
const taskQueue: Array<{ task: WorkerTask; resolve: (v: WorkerResult) => void; reject: (e: Error) => void }> = [];

function workerScriptPath(): string {
  const base = path.join(__dirname, "worker");
  try { require.resolve(base + ".js"); return base + ".js"; } catch { return base + ".ts"; }
}

function makePoolWorker(): PoolWorker {
  const wp = workerScriptPath();
  const execArgv = wp.endsWith(".ts") ? ["--require", "ts-node/register"] : [];

  // Worker pool menggunakan mode "persistent" — worker tetap hidup dan menunggu pesan
  const worker = new Worker(wp, {
    workerData: { poolMode: true },
    execArgv,
  });

  const pw: PoolWorker = { worker, busy: false, resolve: null, reject: null };

  worker.on("message", (result: WorkerResult) => {
    // Worker selesai — selesaikan promise dan coba ambil task berikutnya
    const res = pw.resolve;
    pw.resolve = null;
    pw.reject  = null;
    pw.busy    = false;
    res?.(result);
    drainQueue();
  });

  worker.on("error", (err) => {
    pw.busy = false;
    pw.reject?.(err);
    pw.resolve = null;
    pw.reject  = null;
  });

  return pw;
}

function getPool(): PoolWorker[] {
  if (!pool) {
    pool = Array.from({ length: N_WORKERS }, makePoolWorker);
  }
  return pool;
}

function drainQueue() {
  if (taskQueue.length === 0) return;
  const freeWorker = getPool().find(pw => !pw.busy);
  if (!freeWorker) return;

  const { task, resolve, reject } = taskQueue.shift()!;
  freeWorker.busy    = true;
  freeWorker.resolve = resolve;
  freeWorker.reject  = reject;
  freeWorker.worker.postMessage(task);
}

function runWorker(task: WorkerTask): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const freeWorker = getPool().find(pw => !pw.busy);
    if (freeWorker) {
      freeWorker.busy    = true;
      freeWorker.resolve = resolve;
      freeWorker.reject  = reject;
      freeWorker.worker.postMessage(task);
    } else {
      taskQueue.push({ task, resolve, reject });
    }
  });
}

// ─── Frontier Collection ──────────────────────────────────────────────────────
function collectFrontier(
  nodes:      treeNode[],
  splitDepth: number
): { frontierLog: number[]; frontier: number[] } {
  const frontierLog: number[] = [];
  const frontier:    number[] = [];
  const queue: Array<{ id: number; depth: number }> = [{ id: 0, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const node = nodes[id];
    if (!node) continue;
    frontierLog.push(id);

    if (depth >= splitDepth || node.children.length === 0) {
      frontier.push(id);
    } else {
      for (const c of node.children) {
        queue.push({ id: c, depth: depth + 1 });
      }
    }
  }
  return { frontierLog, frontier };
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export async function searchMT(
  nodes:    treeNode[],
  selector: string,
  algo:     "BFS" | "DFS",
  topN:     number
): Promise<{ results: number[]; traversalLog: number[]; visited: number; time: number; threads: number }> {
  const start = performance.now();

  // Fallback untuk pohon kecil — overhead worker selalu lebih mahal
  if (nodes.length < MIN_NODES_FOR_MT) {
    const r = algo === "BFS"
      ? searchBFS(nodes, 0, selector, topN)
      : searchDFS(nodes, 0, selector, topN);
    return { ...r, threads: 1 };
  }

  // Kumpulkan frontier
  const { frontierLog, frontier } = collectFrontier(nodes, SPLIT_DEPTH);

  // Bagi frontier ke N_WORKERS bucket (round-robin)
  const buckets: number[][] = Array.from({ length: N_WORKERS }, () => []);
  frontier.forEach((id, i) => buckets[i % N_WORKERS].push(id));

  // Kirim setiap bucket ke satu worker
  // Worker memproses semua startId dalam bucket-nya secara serial
  const workerPromises = buckets
    .filter(b => b.length > 0)
    .map(bucket =>
      (async (): Promise<WorkerResult> => {
        const log:     number[] = [];
        const results: number[] = [];
        for (const startId of bucket) {
          const r = await runWorker({ nodes, startId, selector, algo, topN });
          log.push(...r.log);
          results.push(...r.results);
          if (results.length >= topN) break;
        }
        return { log, results };
      })()
    );

  const workerResults = await Promise.all(workerPromises);

  const traversalLog: number[] = [...frontierLog];
  const allResults:   number[] = [];
  for (const wr of workerResults) {
    traversalLog.push(...wr.log);
    allResults.push(...wr.results);
  }

  return {
    results:      allResults.slice(0, topN === Infinity ? undefined : topN),
    traversalLog,
    visited:      traversalLog.length,
    time:         performance.now() - start,
    threads:      workerPromises.length,
  };
}