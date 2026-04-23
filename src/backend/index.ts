import express from "express";
import cors from "cors";
import { scrapeHTML } from "./lib/scraper";
import { parseHTML, parseTree } from "./lib/parser";
import { searchBFS, searchDFS } from "./lib/algo";
import { getMaxDepth } from "./lib/tree";

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

app.post("/search", async (req, res) => {
  try {
    const { url, html: rawHtml, selector, algo, limit } = req.body;
    console.log(`[${algo}] ${url || "raw HTML"}`);

    let html = rawHtml;
    if (url) html = await scrapeHTML(url);

    if (!html) {
      return res.status(400).json({ error: "Gagal mendapatkan HTML" });
    }

    const nodes = parseTree(parseHTML(html));
    const maxDepth = getMaxDepth(nodes, 0);
    const topN = limit || Infinity;

    const result = algo === "BFS"
      ? searchBFS(nodes, 0, selector, topN)
      : searchDFS(nodes, 0, selector, topN);

    res.json({
      success: true,
      data: {
        nodes,
        maxDepth,
        results: result.results,
        traversalLog: result.traversalLog,
        visited: result.visited,
        time: result.time,
        htmlSource: html
      }
    });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, () => {
  console.log(`server running at http://localhost:${port}`);
});
