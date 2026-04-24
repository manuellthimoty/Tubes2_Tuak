import { treeNode } from "./tree";

/**
 * LCA dengan Binary Lifting.
 *
 * Preprocessing O(N log N), query O(log N).
 * LOG_BITS = 17 → mendukung pohon hingga 2^17 = 131072 node.
 */
const LOG_BITS = 17;

export interface LCATable {
  depth:  number[];      // depth[v]    = kedalaman node v dari root
  up:     number[][];    // up[k][v]    = 2^k-th ancestor node v (-1 jika tidak ada)
  n:      number;
}

/**
 * Bangun tabel Binary Lifting dari array treeNode.
 * Menggunakan BFS iteratif untuk menghindari stack overflow pada pohon dalam.
 */
export function buildLCATable(nodes: treeNode[]): LCATable {
  const n = nodes.length;
  const depth = new Array<number>(n).fill(0);
  // up[k][v] — baris = level k, kolom = node id
  const up: number[][] = Array.from({ length: LOG_BITS }, () => new Array<number>(n).fill(-1));

  // BFS dari root (id = 0)
  const visited = new Uint8Array(n);   // lebih efisien dari boolean[]
  const queue: number[] = [0];
  visited[0]  = 1;
  up[0][0]    = 0;  // root adalah parent dirinya sendiri di level 0

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (const c of nodes[u].children) {
      if (c < n && !visited[c]) {
        visited[c]  = 1;
        depth[c]    = depth[u] + 1;
        up[0][c]    = u;
        queue.push(c);
      }
    }
  }

  // Isi tabel sparse: up[k][v] = up[k-1][ up[k-1][v] ]
  for (let k = 1; k < LOG_BITS; k++) {
    for (let v = 0; v < n; v++) {
      const p = up[k - 1][v];
      up[k][v] = (p === -1) ? -1 : up[k - 1][p];
    }
  }

  return { depth, up, n };
}

/**
 * Query LCA dari dua node u dan v.
 * Mengembalikan: id LCA, path u→LCA, path v→LCA, depth masing-masing.
 */
export function queryLCA(
  table: LCATable,
  uIn: number,
  vIn: number
): {
  lca:      number;
  pathU:    number[];   // node-node dari u naik ke LCA (inklusif kedua ujung)
  pathV:    number[];   // node-node dari v naik ke LCA (inklusif kedua ujung)
  depthU:   number;
  depthV:   number;
  depthLCA: number;
} {
  const { depth, up } = table;
  let u = uIn, v = vIn;

  // Rekam jalur naik selama leveling & lifting
  const pathU: number[] = [];
  const pathV: number[] = [];

  // Pastikan depth[u] >= depth[v]
  const swapped = depth[u] < depth[v];
  if (swapped) { [u, v] = [v, u]; }

  // Leveling: naikkan u setinggi depth[v]
  let diff = depth[u] - depth[v];
  pathU.push(u);
  for (let k = 0; k < LOG_BITS; k++) {
    if ((diff >> k) & 1) {
      u = up[k][u];
      if (u !== -1) pathU.push(u);
    }
  }

  if (u === v) {
    // v adalah ancestor langsung dari u
    const lcaId = v;
    if (swapped) {
      return {
        lca: lcaId,
        pathU: pathV,         // swap balik ke input order
        pathV: pathU,
        depthU: depth[vIn],
        depthV: depth[uIn],
        depthLCA: depth[lcaId],
      };
    }
    return {
      lca: lcaId,
      pathU,
      pathV,
      depthU: depth[uIn],
      depthV: depth[vIn],
      depthLCA: depth[lcaId],
    };
  }

  // Lifting bersama hingga tepat di bawah LCA
  pathV.push(v);
  for (let k = LOG_BITS - 1; k >= 0; k--) {
    if (up[k][u] !== up[k][v]) {
      u = up[k][u];
      v = up[k][v];
      if (u !== -1) pathU.push(u);
      if (v !== -1) pathV.push(v);
    }
  }

  const lcaId = up[0][u];
  pathU.push(lcaId);

  if (swapped) {
    return {
      lca: lcaId,
      pathU: pathV,
      pathV: pathU,
      depthU: depth[vIn],
      depthV: depth[uIn],
      depthLCA: depth[lcaId],
    };
  }
  return {
    lca: lcaId,
    pathU,
    pathV,
    depthU: depth[uIn],
    depthV: depth[vIn],
    depthLCA: depth[lcaId],
  };
}

/**
 * Rekonstruksi path dari root ke suatu node (untuk context UI).
 */
export function pathFromRoot(table: LCATable, nodeId: number): number[] {
  const { up } = table;
  const path: number[] = [];
  let cur = nodeId;
  while (true) {
    path.push(cur);
    const p = up[0][cur];
    if (p === cur) break;   // root
    cur = p;
  }
  return path.reverse();
}