export interface treeNode {
  id: number;
  tagName: string;
  content: string;
  className: string;
  idName: string;
  parent: number | null;
  children: number[];
}

export function makeNode(
  id: number,
  tagName: string,
  content: string,
  className: string,
  idName: string,
  parent: number | null
): treeNode {
  return { id, tagName, content, className, idName, parent, children: [] };
}

export function getMaxDepth(nodes: treeNode[], id: number): number {
  const node = nodes[id];
  if (!node || node.children.length === 0) return 1;
  let max = 0;
  for (const cid of node.children) {
    const d = getMaxDepth(nodes, cid);
    if (d > max) max = d;
  }
  return 1 + max;
}
