import { treeNode } from "./tree";

export function matchesSimpleSelector(node: treeNode, selector: string): boolean {
  if (!node || node.type !== "element") return false;
  if (selector === "*") return true;

  // Cek ID (#header)
  if (selector.startsWith("#")) {
    return node.idName === selector.slice(1);
  }

  // Cek Class (.box)
  if (selector.startsWith(".")) {
    const classes = node.className.split(/\s+/);
    return classes.includes(selector.slice(1));
  }

  // Cek Tag (p, div, h1)
  return node.tagName.toLowerCase() === selector.toLowerCase();
}

export function matchesSelector(nodes: treeNode[], nodeId: number, selector: string): boolean {

  const parts = selector.trim().split(/\s+/);
  if (parts.length === 1) return matchesSimpleSelector(nodes[nodeId], selector);

  return checkSelectorMatch(nodes, nodeId, parts);
}

function checkSelectorMatch(nodes: treeNode[], nodeId: number, parts: string[]): boolean {
  if (parts.length === 0) return true;

  const lastPart = parts[parts.length - 1];
  const currentNode = nodes[nodeId];

  if (!matchesSimpleSelector(currentNode, lastPart)) return false;

  if (parts.length === 1) return true;

  const operator = parts[parts.length - 2];
  const remainingParts = parts.slice(0, parts.length - 2);

  if (operator === ">") {
    if (currentNode.parent === null) return false;
    return checkSelectorMatch(nodes, currentNode.parent, remainingParts);
  } 
  else if (operator === "+") {
    if (currentNode.parent === null) return false;
    const siblings = nodes[currentNode.parent].children;
    const myIdx = siblings.indexOf(nodeId);
    if (myIdx <= 0) return false;
    return checkSelectorMatch(nodes, siblings[myIdx - 1], remainingParts);
  }
  else if (operator === "~") {
      if (currentNode.parent === null) return false;
      const siblings = nodes[currentNode.parent].children;
      const myIdx = siblings.indexOf(nodeId);
      for (let j = 0; j < myIdx; j++) {
          if (checkSelectorMatch(nodes, siblings[j], remainingParts)) return true;
      }
      return false;
  }
  else {
    let parentId = currentNode.parent;
    const descendantParts = parts.slice(0, parts.length - 1); 
    while (parentId !== null) {
      if (checkSelectorMatch(nodes, parentId, descendantParts)) return true;
      parentId = nodes[parentId].parent;
    }
    return false;
  }
}

export function searchBFS(nodes: treeNode[], startId: number, selector: string, topN: number = 999999) {
  let log: number[] = [];
  let res: number[] = [];
  let q: number[] = [startId];
  let start = performance.now();

  while (q.length > 0) {
    let currId = q.shift()!;
    let currNode = nodes[currId];
    if (!currNode) continue;

    log.push(currId);
    if (matchesSelector(nodes, currId, selector)) {
      res.push(currId);
      if (res.length >= topN) break;
    }

    for (const childId of currNode.children) {
      q.push(childId);
    }
  }

  return { results: res, traversalLog: log, visited: log.length, time: performance.now() - start };
}

export function searchDFS(nodes: treeNode[], startId: number, selector: string, topN: number = 999999) {
  let log: number[] = [];
  let res: number[] = [];
  let stack: number[] = [startId];
  let start = performance.now();

  while (stack.length > 0) {
    let currId = stack.pop()!;
    let currNode = nodes[currId];
    if (!currNode) continue;

    log.push(currId);
    if (matchesSelector(nodes, currId, selector)) {
      res.push(currId);
      if (res.length >= topN) break;
    }

    for (let i = currNode.children.length - 1; i >= 0; i--) {
      stack.push(currNode.children[i]);
    }
  }

  return { results: res, traversalLog: log, visited: log.length, time: performance.now() - start };
}
