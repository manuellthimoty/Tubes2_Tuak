type NodeType = "element" | "text" | "comment";

interface treeNode {
  id: number;
  type: NodeType;
  tagName: string;      // misal: "div", "img", "#text"
  content: string;      // isi teks (untuk text node / comment)
  className : string;
  idName : string;
  parent: number | null; // id parent (-1 atau null = root)
  children: number[];   // id anak-anak
}

let nodes: treeNode[] = [];
function makeNode(
  id: number,
  type: NodeType,
  tagName: string,
  content: string,
  className : string,
  idName : string,
  parent: number | null
): treeNode {
  return { id, type, tagName, content,className,idName, parent, children: [] };
}

function getClassName(rawTag: string): string | null {
  const parts = rawTag.trim().split(/\s+/);

  for (const part of parts) {
    if (part.startsWith("class=")) {
      let value = part.slice(6); // buang "class="

      // hapus tanda kutip
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
      let value = part.slice(3); // buang "id="

      // hapus tanda kutip
      if (value.startsWith("'") || value.startsWith('"')) {
        value = value.slice(1, -1);
      }

      return value;
    }
  }
  return null;
}


const voidElements = new Set([
  "area", "base", "br", "col", "embed",
  "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr", "!doctype"
]);

function parseHTML(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  let curstr = "";

  while (i < text.length) {
    if (text[i] === "<") {
      if (curstr.trim() !== "") {
        tokens.push(curstr.trim()); // flush teks sebelumnya
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

function parseTree(tokens: string[]): void {
  // Node root (id=0)
  nodes.push(makeNode(0, "element", "#root", "", "","",null));

  let nodeCount = 0;
  let curRoot = 0; // id node yang sedang aktif sebagai "orang tua"
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token === "<" || token === ">") {
      i++;
      continue;
    }

    const prevToken = tokens[i - 1];
    if (prevToken === "<") {// kalo sebelumnyua "<"
      const rawTag = token;

      if (rawTag.startsWith("/")) {// ini tag penutup
        const parent = nodes[curRoot].parent;
        if (parent !== null) {
          curRoot = parent; // skrg rootnya adalah parent dri root sblmny
        }
        i++;
        continue;
      }

      if (rawTag.startsWith("!--")) {// ini komen
        nodeCount++;
        const commentNode = makeNode(nodeCount, "comment", "#comment","","", rawTag, curRoot);
        nodes.push(commentNode);
        nodes[curRoot].children.push(nodeCount);
        i++;
        continue;
      }

      const tagName = rawTag.trim().split(/\s+/)[0].toLowerCase();
      const className = getClassName(rawTag) || "";
      const idName = getIdName(rawTag) || "";
      const isVoid = voidElements.has(tagName);

      nodeCount++;// incremennya nodeCountnya
      const newNode = makeNode(nodeCount, "element", tagName, "",className,idName, curRoot); // buat node baru]
      nodes.push(newNode);
      nodes[curRoot].children.push(nodeCount);

      if (!isVoid) {
        curRoot = nodeCount;// skrg berarti rootnya adalah node barunya
      }

    } else { // text biasa
      nodeCount++;
      const textNode = makeNode(nodeCount, "text", "#text", token,"","", curRoot);
      nodes.push(textNode);
      nodes[curRoot].children.push(nodeCount);
    }

    i++;
  }
}

function printTree(nodeId: number, depth: number = 0): void {
  const node = nodes[nodeId];
  if(!node) return;
  const indent = "  ".repeat(depth);
  let label = "";
  if(node.type === "text"){
    label = "#text: " + node.content;
  }
  else if(node.type === "comment"){
    label = "#comment";
  }
  else{
    label = "<" + node.tagName;
    if(node.className !== null && node.className !== ""){
      label = label + " class = " + node.className;
    }
    if(node.idName !== null && node.idName !== ""){
      label = label + " id = " + node.idName;
    }

    label += ">";
  }
  console.log(indent + " [" + node.id + "] " + label );
  for (const childId of node.children) {
    printTree(childId, depth + 1);
  }
}


const inputText = `<head><title>My First Web Page</title></head>
<body>
  <h1>Welcome</h1>
  <p class="hai">Paragraph here.</p>
  <img src="photo.jpg">
  <br>
  <a id="haloo" href="#">Visit Google</a>
</body>`;

const tokensRes = parseHTML(inputText);
parseTree(tokensRes);
printTree(0);