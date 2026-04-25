import { treeNode, makeNode } from "./tree";

const voidElements = new Set([
  "area", "base", "br", "col", "embed",
  "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr"
]);

const rawTextElements = new Set(["script", "style"]);

export interface Token {
  type: "open" | "close" | "text" | "comment" | "doctype";
  name?: string;
  attrs?: Map<string, string>;
  content?: string;
  selfClose?: boolean;
}

function parseAttrs(attrStr: string): Map<string, string> {
  const attrs = new Map<string, string>();
  const re = /([^\s"'>/=]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/=]*)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrStr)) !== null) {
    attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = html.length;

  while (i < len) {
    if (html[i] !== "<") {
      const start = i;
      while (i < len && html[i] !== "<") i++;
      const text = html.slice(start, i).trim();
      if (text) tokens.push({ type: "text", content: text });
      continue;
    }

    i++;

    if (i + 2 < len && html[i] === "!" && html[i + 1] === "-" && html[i + 2] === "-") {
      const end = html.indexOf("-->", i + 3);
      if (end === -1) { i = len; break; }
      tokens.push({ type: "comment", content: html.slice(i + 3, end) });
      i = end + 3;
      continue;
    }

    if (i < len && html[i] === "!") {
      const end = html.indexOf(">", i);
      if (end === -1) { i = len; break; }
      tokens.push({ type: "doctype" });
      i = end + 1;
      continue;
    }

    let tagContent = "";
    let inQuote = "";
    while (i < len) {
      const ch = html[i];
      if (inQuote) {
        tagContent += ch;
        if (ch === inQuote) inQuote = "";
      } else if (ch === '"' || ch === "'") {
        inQuote = ch;
        tagContent += ch;
      } else if (ch === ">") {
        i++;
        break;
      } else {
        tagContent += ch;
      }
      i++;
    }

    tagContent = tagContent.trim();
    if (!tagContent) continue;

    if (tagContent[0] === "/") {
      tokens.push({ type: "close", name: tagContent.slice(1).trim().split(/\s+/)[0].toLowerCase() });
      continue;
    }

    const selfClose = tagContent.endsWith("/");
    const cleanTag = selfClose ? tagContent.slice(0, -1).trim() : tagContent;
    const firstSpace = cleanTag.search(/\s/);
    const name = (firstSpace === -1 ? cleanTag : cleanTag.slice(0, firstSpace)).toLowerCase();
    const attrStr = firstSpace === -1 ? "" : cleanTag.slice(firstSpace + 1);
    const isVoid = voidElements.has(name);

    tokens.push({ type: "open", name, attrs: parseAttrs(attrStr), selfClose: selfClose || isVoid });

    if (rawTextElements.has(name) && !selfClose && !isVoid) {
      const closeTag = `</${name}`;
      const closeIdx = html.toLowerCase().indexOf(closeTag, i);
      if (closeIdx !== -1) {
        const raw = html.slice(i, closeIdx).trim();
        if (raw) tokens.push({ type: "text", content: raw });
        i = html.indexOf(">", closeIdx) + 1;
        tokens.push({ type: "close", name });
      } else {
        i = len;
      }
    }
  }

  return tokens;
}

export function parseHTML(html: string): Token[] {
  return tokenize(html);
}

export function parseTree(tokens: Token[]): treeNode[] {
  const nodes: treeNode[] = [];
  nodes.push(makeNode(0, "#root", "", "", "", null));

  let nodeCount = 0;
  let curRoot = 0;

  for (const token of tokens) {
    if (token.type === "doctype" || token.type === "comment") continue;

    if (token.type === "text") {
      if (token.content?.trim()) {
        const sep = nodes[curRoot].content ? " " : "";
        nodes[curRoot].content += sep + token.content.trim();
      }
      continue;
    }

    if (token.type === "close") {
      let t = curRoot;
      while (t !== 0 && nodes[t].tagName !== token.name) {
        t = nodes[t].parent ?? 0;
      }
      if (nodes[t].tagName === token.name) {
        curRoot = nodes[t].parent ?? 0;
      }
      continue;
    }

    if (token.type === "open") {
      nodeCount++;
      nodes.push(makeNode(
        nodeCount,
        token.name!,
        "",
        token.attrs?.get("class") ?? "",
        token.attrs?.get("id") ?? "",
        curRoot
      ));
      nodes[curRoot].children.push(nodeCount);
      if (!token.selfClose) curRoot = nodeCount;
    }
  }

  return nodes;
}
