import { treeNode } from "./tree";

export function matchesSimpleSelector(node: treeNode, selector: string): boolean {
  if (!node) return false;
  if (selector === "*") return true;

  if (selector.startsWith(".")) {
    const classes = node.className ? node.className.split(/\s+/).filter(Boolean) : [];
    return selector.split(".").filter(Boolean).every(c => classes.includes(c));
  }

  if (selector.startsWith("#")) {
    return node.idName === selector.slice(1);
  }

  const tagEndIdx = selector.search(/[.#]/);
  const tag = (tagEndIdx === -1 ? selector : selector.slice(0, tagEndIdx)).toLowerCase();

  if (tag && tag !== "*" && node.tagName.toLowerCase() !== tag) return false;

  const classMatches = [...selector.matchAll(/\.([^.#]+)/g)];
  if (classMatches.length > 0) {
    const classes = node.className ? node.className.split(/\s+/).filter(Boolean) : [];
    for (const m of classMatches) {
      if (!classes.includes(m[1])) return false;
    }
  }

  const idMatch = selector.match(/#([^.#]+)/);
  if (idMatch && node.idName !== idMatch[1]) return false;

  return true;
}

export function matchesSelector(nodes: treeNode[], nodeId: number, selector: string): boolean {
  const normalized = selector.trim().replace(/\s*([>+~])\s*/g, " $1 ");
  const parts = normalized.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return matchesSimpleSelector(nodes[nodeId], selector.trim());
  return checkSelectorMatch(nodes, nodeId, parts);
}

function checkSelectorMatch(nodes: treeNode[], nodeId: number, parts: string[]): boolean {
  if (parts.length === 0) return true;

  const node = nodes[nodeId];
  if (!matchesSimpleSelector(node, parts[parts.length - 1])) return false;
  if (parts.length === 1) return true;

  const op = parts[parts.length - 2];
  const rest = parts.slice(0, parts.length - 2);

  if (op === ">") {
    if (node.parent === null) return false;
    return checkSelectorMatch(nodes, node.parent, rest);
  }

  if (op === "+") {
    if (node.parent === null) return false;
    const siblings = nodes[node.parent].children;
    const idx = siblings.indexOf(nodeId);
    if (idx <= 0) return false;
    return checkSelectorMatch(nodes, siblings[idx - 1], rest);
  }

  if (op === "~") {
    if (node.parent === null) return false;
    const siblings = nodes[node.parent].children;
    const idx = siblings.indexOf(nodeId);
    for (let j = 0; j < idx; j++) {
      if (checkSelectorMatch(nodes, siblings[j], rest)) return true;
    }
    return false;
  }

  // descendant combinator
  const ancestor = parts.slice(0, parts.length - 1);
  let parentId = node.parent;
  while (parentId !== null) {
    if (checkSelectorMatch(nodes, parentId, ancestor)) return true;
    parentId = nodes[parentId].parent;
  }
  return false;
}

export function searchBFS(nodes: treeNode[], startId: number, selector: string, topN = Infinity) {
  const log: number[] = [];
  const results: number[] = [];
  const queue: number[] = [startId];
  const start = performance.now();

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes[id];
    if (!node) continue;

    log.push(id);
    if (matchesSelector(nodes, id, selector)) {
      results.push(id);
      if (results.length >= topN) break;
    }

    for (const child of node.children) queue.push(child);
  }

  return { results, traversalLog: log, visited: log.length, time: performance.now() - start };
}

export function searchDFS(nodes: treeNode[], startId: number, selector: string, topN = Infinity) {
  const log: number[] = [];
  const results: number[] = [];
  const stack: number[] = [startId];
  const start = performance.now();

  while (stack.length > 0) {
    const id = stack.pop()!;
    const node = nodes[id];
    if (!node) continue;

    log.push(id);
    if (matchesSelector(nodes, id, selector)) {
      results.push(id);
      if (results.length >= topN) break;
    }

    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }

  return { results, traversalLog: log, visited: log.length, time: performance.now() - start };
}
