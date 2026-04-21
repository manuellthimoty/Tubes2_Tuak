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
