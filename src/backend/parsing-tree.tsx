type NodeType = "element" | "text" | "comment";

interface treeNode {
  id: number;
  type: NodeType;
  tagName: string;      // misal: "div", "img", "#text"
  content: string;      // isi teks (untuk text node / comment)
  parent: number | null; // id parent (-1 atau null = root)
  children: number[];   // id anak-anak
}

let nodes: treeNode[] = [];

function makeNode(
  id: number,
  type: NodeType,
  tagName: string,
  content: string,
  parent: number | null
): treeNode {
  return { id, type, tagName, content, parent, children: [] };
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
  nodes.push(makeNode(0, "element", "#root", "", null));

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
        const commentNode = makeNode(nodeCount, "comment", "#comment", rawTag, curRoot);
        nodes.push(commentNode);
        nodes[curRoot].children.push(nodeCount);
        i++;
        continue;
      }

      const tagName = rawTag.trim().split(/\s+/)[0].toLowerCase();
      const isVoid = voidElements.has(tagName);

      nodeCount++;// incremennya nodeCountnya
      const newNode = makeNode(nodeCount, "element", tagName, "", curRoot); // buat node baru
      nodes.push(newNode);
      nodes[curRoot].children.push(nodeCount);

      if (!isVoid) {
        curRoot = nodeCount;// skrg berarti rootnya adalah node barunya
      }

    } else { // text biasa
      nodeCount++;
      const textNode = makeNode(nodeCount, "text", "#text", token, curRoot);
      nodes.push(textNode);
      nodes[curRoot].children.push(nodeCount);
    }

    i++;
  }
}


function printTree(nodeId: number, depth: number = 0): void {
  const node = nodes[nodeId];
  const indent = "  ".repeat(depth);
  let label = "";
  if(node.type === "text"){
    label = "#text: " + node.content;
  }
  else if(node.type === "comment"){
    label = "#comment";
  }
  else{
    label = "<" + node.tagName + ">";
  }
  console.log(indent + " [" + node.id + "] " + label );
  for (const childId of node.children) {
    printTree(childId, depth + 1);
  }
}


const input = `<head><title>My First Web Page</title></head>
<body>
  <h1>Welcome</h1>
  <p>Paragraph here.</p>
  <img src="photo.jpg">
  <br>
  <a href="#">Visit Google</a>
</body>`;

const tokens = parseHTML(input);
parseTree(tokens);
printTree(0);
// console.log(tokens);