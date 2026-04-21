import { scrapeHTML } from "./lib/scraper";
import { parseHTML, parseTree } from "./lib/parser";
import { searchBFS, searchDFS } from "./lib/algo"; 

async function main() {
  const url = "https://informatika.stei.itb.ac.id/~rinaldi.munir/";
  const selector = "p";
  const tipeAlgo: "BFS" | "DFS" = "BFS"; 
  const limit =  5;

  console.log(`[1] Mengambil HTML dari: ${url}`);
  const html = await scrapeHTML(url);
  if (!html) return;

  console.log("[2] Membangun DOM Tree...");
  const tokens = parseHTML(html);
  const nodes = parseTree(tokens);

  console.log(`[3] Mencari '${selector}' dengan algoritma ${tipeAlgo}...`);
  
  const hasil = (tipeAlgo === "BFS") 
    ? searchBFS(nodes, 0, selector, limit) 
    : searchDFS(nodes, 0, selector, limit);

  console.log("\n--- HASIL PENCARIAN ---");
  console.log("Waktu eksekusi :", hasil.time, "ms");
  console.log("Node dilewati  :", hasil.visited);
  console.log("ID ditemukan   :", hasil.results);
}

main();
