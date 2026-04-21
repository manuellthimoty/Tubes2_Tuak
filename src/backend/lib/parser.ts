import { treeNode, makeNode } from "./tree";

const voidElements = new Set([
  "area", "base", "br", "col", "embed",
  "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr", "!doctype"
]);

function getClassName(rawTag: string): string | null {
  const parts = rawTag.trim().split(/\s+/);
  for (const part of parts) {
    if (part.startsWith("class=")) {
      let value = part.slice(6);
      if (value.startsWith("'") || value.startsWith('"')) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }
  return null;
}

function getIdName(rawTag: string): string | null {
  const parts = rawTag.trim().split(/\s+/);
  for (const part of parts) {
    if (part.startsWith("id=")) {
      let value = part.slice(3);
      if (value.startsWith("'") || value.startsWith('"')) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }
  return null;
}

export function parseHTML(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  let curstr = "";

  while (i < text.length) {
    if (text[i] === "<") {
      if (curstr.trim() !== "") {
        tokens.push(curstr.trim());
        curstr = "";
      }
      tokens.push("<");
    } else if (text[i] === ">") {
      if (curstr.trim() !== "") {
        tokens.push(curstr.trim());
        curstr = "";
      }
      tokens.push(">");
    } else {
      curstr += text[i];
    }
    i++;
  }

  if (curstr.trim() !== "") tokens.push(curstr.trim());
  return tokens;
}

export function parseTree(tokens: string[]): treeNode[] {
  const nodes: treeNode[] = [];
  // Node root (id=0)
  nodes.push(makeNode(0, "element", "#root", "", "", "", null));

  let nodeCount = 0;
  let curRoot = 0;
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "<" || token === ">") {
      i++;
      continue;
    }

    const prevToken = tokens[i - 1];
    if (prevToken === "<") {
      const rawTag = token;

      if (rawTag.startsWith("/")) {
        const parent = nodes[curRoot].parent;
        if (parent !== null) {
          curRoot = parent;
        }
        i++;
        continue;
      }

      if (rawTag.startsWith("!--")) {
        nodeCount++;
        const commentNode = makeNode(nodeCount, "comment", "#comment", "", "", rawTag, curRoot);
        nodes.push(commentNode);
        nodes[curRoot].children.push(nodeCount);
        i++;
        continue;
      }

      const tagName = rawTag.trim().split(/\s+/)[0].toLowerCase();
      const className = getClassName(rawTag) || "";
      const idName = getIdName(rawTag) || "";
      const isVoid = voidElements.has(tagName);

      nodeCount++;
      const newNode = makeNode(nodeCount, "element", tagName, "", className, idName, curRoot);
      nodes.push(newNode);
      nodes[curRoot].children.push(nodeCount);

      if (!isVoid) {
        curRoot = nodeCount;
      }

    } else {
      nodeCount++;
      const textNode = makeNode(nodeCount, "text", "#text", token, "", "", curRoot);
      nodes.push(textNode);
      nodes[curRoot].children.push(nodeCount);
    }

    i++;
  }
  return nodes;
}
