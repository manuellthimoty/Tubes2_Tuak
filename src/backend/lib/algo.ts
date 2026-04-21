import { treeNode } from "./tree";

// Fungsi buat cek apakah node cocok sama selector (tag, .class, atau #id)
export function matchesSimpleSelector(node: treeNode, selector: string): boolean {
  if (!node || node.type !== "element") return false;
  
  if (selector === "*") return true;

  if (selector.startsWith("#")) {
    let idCari = selector.slice(1);
    return node.idName === idCari;
  }

  if (selector.startsWith(".")) {
    let classCari = selector.slice(1);
    let daftarClass = node.className.split(/\s+/);
    return daftarClass.includes(classCari);
  }

  return node.tagName.toLowerCase() === selector.toLowerCase();
}

export function searchBFS(nodes: treeNode[], startId: number, selector: string, topN: number = 999999) {
  let log: number[] = [];
  let res: number[] = [];
  let q: number[] = [startId]; // antrean buat bfs
  
  let start = performance.now();

  while (q.length > 0) {
    let currId = q.shift()!;
    let currNode = nodes[currId];
    
    if (!currNode) continue;

    log.push(currId); // simpan urutan jalan

    if (matchesSimpleSelector(currNode, selector)) {
      res.push(currId);
      if (res.length >= topN) break; 
    }

    // masukin anak-anak ke antrean belakang
    for (let i = 0; i < currNode.children.length; i++) {
      q.push(currNode.children[i]);
    }
  }

  let end = performance.now();

  return {
    results: res,
    traversalLog: log,
    visited: log.length,
    time: end - start
  };
}

export function searchDFS(nodes: treeNode[], startId: number, selector: string, topN: number = 999999) {
  let log: number[] = [];
  let res: number[] = [];
  let stack: number[] = [startId]; // tumpukan buat dfs
  
  let start = performance.now();

  while (stack.length > 0) {
    let currId = stack.pop()!;
    let currNode = nodes[currId];
    
    if (!currNode) continue;

    log.push(currId);

    if (matchesSimpleSelector(currNode, selector)) {
      res.push(currId);
      if (res.length >= topN) break;
    }

    // biar anak paling kiri diproses duluan, masukin ke stack dari kanan ke kiri
    for (let i = currNode.children.length - 1; i >= 0; i--) {
      stack.push(currNode.children[i]);
    }
  }

  let end = performance.now();

  return {
    results: res,
    traversalLog: log,
    visited: log.length,
    time: end - start
  };
}
