/**
 * worker.ts — Worker Thread untuk BFS/DFS paralel.
 *
 * Mendukung dua mode:
 * 1. poolMode: true  — worker tetap hidup, menunggu pesan dari pool dispatcher.
 *    Ini digunakan oleh mt.ts Worker Pool untuk menghindari overhead spawn.
 * 2. poolMode: false / tidak ada — worker jalankan task dari workerData langsung
 *    lalu exit. (mode lama, masih didukung untuk kompatibilitas)
 */

import { workerData, parentPort } from "worker_threads";
import { treeNode } from "./tree";
import { matchesSelector } from "./algo";

interface Task {
  nodes:    treeNode[];
  startId:  number;
  selector: string;
  algo:     "BFS" | "DFS";
  topN:     number;
}

function runTask(task: Task): { log: number[]; results: number[] } {
  const { nodes, startId, selector, algo, topN } = task;
  const log:     number[] = [];
  const results: number[] = [];

  if (algo === "BFS") {
    const queue: number[] = [startId];
    while (queue.length > 0 && results.length < topN) {
      const id   = queue.shift()!;
      const node = nodes[id];
      if (!node) continue;
      log.push(id);
      if (matchesSelector(nodes, id, selector)) results.push(id);
      for (const c of node.children) queue.push(c);
    }
  } else {
    const stack: number[] = [startId];
    while (stack.length > 0 && results.length < topN) {
      const id   = stack.pop()!;
      const node = nodes[id];
      if (!node) continue;
      log.push(id);
      if (matchesSelector(nodes, id, selector)) results.push(id);
      for (let i = node.children.length - 1; i >= 0; i--) {
        stack.push(node.children[i]);
      }
    }
  }

  return { log, results };
}

// ── Pool mode: tunggu pesan, proses, balas, ulangi ──────────────────────────
if (workerData?.poolMode) {
  parentPort!.on("message", (task: Task) => {
    const result = runTask(task);
    parentPort!.postMessage(result);
  });
} else {
  // ── One-shot mode (workerData berisi task langsung) ──────────────────────
  const result = runTask(workerData as Task);
  parentPort!.postMessage(result);
}