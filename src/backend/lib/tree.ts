export type NodeType = "element" | "text" | "comment";

export interface treeNode {
  id: number;
  type: NodeType;
  tagName: string;      // misal: "div", "img", "#text"
  content: string;      // isi teks (untuk text node / comment)
  className : string;
  idName : string;
  parent: number | null; // id parent (-1 atau null = root)
  children: number[];   // id anak-anak
}

export function makeNode(
  id: number,
  type: NodeType,
  tagName: string,
  content: string,
  className : string,
  idName : string,
  parent: number | null
): treeNode {
  return { id, type, tagName, content, className, idName, parent, children: [] };
}

// Fungsi buat ngitung kedalaman pohon paling mentok (Max Depth)
export function getMaxDepth(nodes: treeNode[], currentId: number): number {
  const node = nodes[currentId];
  if (!node || node.children.length === 0) return 1;

  let maxChildDepth = 0;
  for (const childId of node.children) {
    const depth = getMaxDepth(nodes, childId);
    if (depth > maxChildDepth) maxChildDepth = depth;
  }
  return 1 + maxChildDepth;
}
