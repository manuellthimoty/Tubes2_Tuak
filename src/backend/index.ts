import express from "express";
import cors    from "cors";
import { scrapeHTML }           from "./lib/scraper";
import { parseHTML, parseTree } from "./lib/parser";
import { searchBFS, searchDFS } from "./lib/algo";
import { getMaxDepth }          from "./lib/tree";
import { buildLCATable, queryLCA, pathFromRoot } from "./lib/lca";
import { searchMT }             from "./lib/mt";

const app  = express();
const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

app.use(cors());
// limit 10mb, default Express = 100kb
app.use(express.json({ limit: "10mb" }));


app.post("/parse", async (req, res) => {
  try {
    const { url, html: rawHtml } = req.body;
    let html = rawHtml as string | null;
    if (url) html = await scrapeHTML(url);
    if (!html) return res.status(400).json({ success: false, error: "Gagal mendapatkan HTML" });

    const nodes    = parseTree(parseHTML(html));
    const maxDepth = getMaxDepth(nodes, 0);

    res.json({
      success: true,
      data: { nodes, maxDepth, nodeCount: nodes.length, htmlSource: html }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post("/search", async (req, res) => {
  try {
    const { url, html: rawHtml, selector, algo, limit, mt } = req.body;
    console.log(`[${algo}${mt ? "+MT" : ""}] ${url || "raw HTML"}`);

    let html = rawHtml as string | null;
    if (url) html = await scrapeHTML(url);
    if (!html) return res.status(400).json({ success: false, error: "Gagal mendapatkan HTML" });

    const nodes    = parseTree(parseHTML(html));
    const maxDepth = getMaxDepth(nodes, 0);
    const topN     = (!limit || limit <= 0) ? Infinity : limit;

    let result: {
      results:      number[];
      traversalLog: number[];
      visited:      number;
      time:         number;
      threads?:     number;
    };

    if (mt) {
      result = await searchMT(nodes, selector, algo, topN);
    } else {
      const sr = algo === "BFS"
        ? searchBFS(nodes, 0, selector, topN)
        : searchDFS(nodes, 0, selector, topN);
      result = { ...sr, threads: 1 };
    }

    res.json({
      success: true,
      data: {
        maxDepth,
        results:      result.results,
        traversalLog: result.traversalLog,
        visited:      result.visited,
        time:         result.time,
        threads:      result.threads ?? 1,
        htmlSource:   html,
      },
    });
  } catch (err: any) {
    console.error("[/search]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post("/lca", async (req, res) => {
  try {
    const { html: rawHtml, nodeU, nodeV } = req.body;
    if (nodeU === undefined || nodeV === undefined)
      return res.status(400).json({ success: false, error: "nodeU dan nodeV harus diisi." });
    if (!rawHtml)
      return res.status(400).json({ success: false, error: "html tidak boleh kosong." });

    const u = Number(nodeU);
    const v = Number(nodeV);

    const nodes = parseTree(parseHTML(rawHtml as string));
    if (u < 0 || u >= nodes.length || v < 0 || v >= nodes.length)
      return res.status(400).json({
        success: false,
        error: `Node id tidak valid. Total node: ${nodes.length}. nodeU=${u}, nodeV=${v}`,
      });

    const start = performance.now();
    const table = buildLCATable(nodes);
    const { lca, pathU, pathV, depthU, depthV, depthLCA } = queryLCA(table, u, v);
    const pathURoot = pathFromRoot(table, u);
    const pathVRoot = pathFromRoot(table, v);
    const time = performance.now() - start;

    res.json({
      success: true,
      data: { lca, lcaTag: nodes[lca]?.tagName ?? "?", lcaDepth: depthLCA,
              depthU, depthV, pathU, pathV, pathURoot, pathVRoot, time },
    });
  } catch (err: any) {
    console.error("[/lca]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(port, host, () => {
  console.log(`server running at http://${host}:${port}`);
});
