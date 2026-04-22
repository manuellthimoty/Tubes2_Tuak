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
    console.log(`Request ${algo} For: ${url || "HTML"}`);

    let html = rawHtml;
    if (url) {
      html = await scrapeHTML(url);
    }

    if (!html) {
      return res.status(400).json({ error: "Failed got HTML" });
    }

    const tokens = parseHTML(html);
    const nodes = parseTree(tokens);
    const maxDepth = getMaxDepth(nodes, 0);

    const searchLimit = limit || 999999;
    const result = (algo === "BFS") 
      ? searchBFS(nodes, 0, selector, searchLimit)
      : searchDFS(nodes, 0, selector, searchLimit);

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

  } catch (error: any) {
    console.error("Error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`server jalan di http://localhost:${port}`);
});
