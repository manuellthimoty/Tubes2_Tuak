const API_BASE = window.location.hostname
  ? `${window.location.protocol}//${window.location.hostname}:3000`
  : 'http://localhost:3000';

const urlInput      = document.getElementById('url-input');
const htmlInput     = document.getElementById('html-input');
const parseBtn      = document.getElementById('parse-btn');
const step2Panel    = document.getElementById('step2-panel');
const selectorInput = document.getElementById('selector-input');
const algoSelect    = document.getElementById('algo-select');
const traverseBtn   = document.getElementById('traverse-btn');
const lcaBtn        = document.getElementById('lca-btn');
const speedSelect   = document.getElementById('speed-select');
const speedLabel    = document.getElementById('speed-label');
const limitNInput   = document.getElementById('limit-n');
const treeContainer = document.getElementById('tree-canvas');
const treeViewport  = document.getElementById('tree-viewport');
const logList       = document.getElementById('log-list');
const statsInfo     = document.getElementById('stats-info');
const zoomLabel     = document.getElementById('zoom-label');
const lcaStatusBar  = document.getElementById('lca-status-bar');
const lcaChip1      = document.getElementById('lca-chip-1');
const lcaChip2      = document.getElementById('lca-chip-2');
const lcaCancelBtn  = document.getElementById('lca-cancel-btn');

let savedHtmlSource  = "";
let currentNodesData = [];
let nodeElements     = {};
let zoomLevel        = 1.0;

let lcaMode     = false;
let lcaSelected = [];  

const LOG_BITS = 16;
let lcaDepth   = [];
let lcaParent  = [];

const ZOOM_MIN        = 0.2;
const ZOOM_MAX        = 3.0;
const ZOOM_STEP_BTN   = 0.2;
const ZOOM_STEP_WHEEL = 0.08;
const MAX_LOG_ENTRIES  = 500;

speedSelect.addEventListener('input', () => {
    speedLabel.textContent = speedSelect.value + 'ms';
});

function applyZoom() {
    treeContainer.style.transform = `scale(${zoomLevel})`;
    const baseW = parseInt(treeContainer.style.width)  || 3000;
    const baseH = parseInt(treeContainer.style.height) || 3000;
    treeContainer.style.marginRight  = (baseW * zoomLevel - baseW) + 'px';
    treeContainer.style.marginBottom = (baseH * zoomLevel - baseH) + 'px';
    zoomLabel.innerText = Math.round(zoomLevel * 100) + '%';
}

function zoomAt(newZoom, pivotX, pivotY) {
    newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(newZoom.toFixed(2))));
    if (newZoom === zoomLevel) return;
    const canvasX = (treeViewport.scrollLeft + pivotX) / zoomLevel;
    const canvasY = (treeViewport.scrollTop  + pivotY) / zoomLevel;
    zoomLevel = newZoom;
    applyZoom();
    treeViewport.scrollLeft = canvasX * newZoom - pivotX;
    treeViewport.scrollTop  = canvasY * newZoom - pivotY;
}

document.getElementById('zoom-in-btn').addEventListener('click', () =>
    zoomAt(zoomLevel + ZOOM_STEP_BTN, treeViewport.clientWidth / 2, treeViewport.clientHeight / 2));
document.getElementById('zoom-out-btn').addEventListener('click', () =>
    zoomAt(zoomLevel - ZOOM_STEP_BTN, treeViewport.clientWidth / 2, treeViewport.clientHeight / 2));
document.getElementById('zoom-reset-btn').addEventListener('click', () => { zoomLevel = 1.0; applyZoom(); });

treeViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = treeViewport.getBoundingClientRect();
    zoomAt(zoomLevel + (e.deltaY > 0 ? -ZOOM_STEP_WHEEL : ZOOM_STEP_WHEEL),
        e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });

let isPanning = false;
let panStart  = { x: 0, y: 0, sl: 0, st: 0 };

treeViewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (lcaMode && e.target.classList.contains('node-container')) return;
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY, sl: treeViewport.scrollLeft, st: treeViewport.scrollTop };
    treeViewport.style.cursor = 'grabbing';
    e.preventDefault();
});
window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    treeViewport.scrollLeft = panStart.sl - (e.clientX - panStart.x);
    treeViewport.scrollTop  = panStart.st - (e.clientY - panStart.y);
});
window.addEventListener('mouseup', () => {
    if (!isPanning) return;
    isPanning = false;
    treeViewport.style.cursor = 'grab';
});
document.querySelectorAll('input[name="limit-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
        limitNInput.disabled = radio.value !== 'topn';
    });
});
parseBtn.addEventListener('click', async () => {
    const url     = urlInput.value.trim();
    const rawHTML = htmlInput.value.trim();

    if (!url && !rawHTML) {
        alert("Masukkan URL atau paste HTML terlebih dahulu.");
        return;
    }

    parseBtn.innerText = "Parsing...";
    parseBtn.disabled  = true;
    treeContainer.innerHTML = '';
    zoomLevel = 1.0;
    applyZoom();
    logList.innerHTML = '<li class="log-placeholder">Menyiapkan DOM Tree...</li>';

    const es = document.getElementById('empty-state');
    if (es) es.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE}/parse`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, html: rawHTML })
        });

        const result = await response.json();
        if (result.success) {
            const data = result.data;
            savedHtmlSource  = data.htmlSource || rawHTML;
            currentNodesData = data.nodes;

            if (url && data.htmlSource) htmlInput.value = data.htmlSource;
            buildLCAFrontend(data.nodes);

            visualizeTree(data.nodes);

            statsInfo.innerHTML =
                `<span class="stat-item">Nodes: ${data.nodes.length}</span>
                 <span class="stat-divider">|</span>
                 <span class="stat-item">Max Depth: ${data.maxDepth}</span>`;

            logList.innerHTML = '<li class="log-placeholder">Parsing sukses! Pilih algoritma lalu klik Traverse.</li>';
            step2Panel.classList.remove('disabled');
            traverseBtn.disabled = false;
            lcaBtn.disabled      = false;
        } else {
            alert("Gagal parse: " + result.error);
        }
    } catch(e) {
        alert(`Koneksi ke backend gagal.\nURL: ${API_BASE}\n\n` + e);
    } finally {
        parseBtn.innerText = "Parse";
        parseBtn.disabled  = false;
    }
});
traverseBtn.addEventListener('click', async () => {
    const selector = selectorInput.value.trim();
    const algo     = algoSelect.value;

    if (!selector) {
        alert("Masukkan CSS Selector (contoh: div, .class, #id, a.nav)");
        return;
    }

    const limitType = document.querySelector('input[name="limit-type"]:checked').value;
    const limit     = limitType === 'topn' ? Math.max(1, parseInt(limitNInput.value) || 10) : 0;
    const mtCheckbox = document.getElementById('mt-checkbox');
    const useMT      = mtCheckbox ? mtCheckbox.checked : false;

    traverseBtn.innerText = "Running...";
    traverseBtn.disabled  = true;
    logList.innerHTML     = '';

    resetAllNodes();

    try {
        const response = await fetch(`${API_BASE}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html: savedHtmlSource,
                selector,
                algo,
                limit,
                mt: useMT,
            })
        });

        const result = await response.json();
        if (result.success) {
            const data = result.data;
            await animateAndLog(data.traversalLog, data.results);

            const threads = data.threads || 1;
            const summary = document.createElement('li');
            summary.innerHTML =
                `<b>Selesai!</b> Ditemukan <b>${data.results.length}</b> kecocokan ` +
                `dari <b>${data.visited}</b> node dikunjungi. ` +
                `Waktu: <b>${data.time.toFixed(2)}ms</b>` +
                (threads > 1 ? ` | Threads: <b>${threads}</b>` : '');
            summary.style.cssText = 'margin-top:10px;text-align:center;padding:8px;background:#e8f5e0;border-radius:6px;';
            logList.appendChild(summary);
            logList.scrollTop = logList.scrollHeight;
        } else {
            alert("Error traversal: " + result.error);
        }
    } catch(e) {
        alert("Terjadi kesalahan saat traversal.\n\n" + e);
    } finally {
        traverseBtn.innerText = "Traverse";
        traverseBtn.disabled  = false;
    }
});
lcaBtn.addEventListener('click', () => {
    if (!lcaMode) {
        lcaMode     = true;
        lcaSelected = [];
        lcaStatusBar.style.display = 'flex';
        resetAllNodes();
        updateLCAChips();
        logList.innerHTML = '<li class="log-placeholder"> Mode LCA — Klik 2 node pada pohon lalu tekan <b>Traverse LCA</b>.</li>';
    } else {
        if (lcaSelected.length < 2) {
            alert("Pilih 2 node pada pohon terlebih dahulu!");
            return;
        }
        runLCA();
    }
});

lcaCancelBtn.addEventListener('click', () => {
    exitLCAMode();
    resetAllNodes();
});

function exitLCAMode() {
    lcaMode     = false;
    lcaSelected = [];
    lcaStatusBar.style.display = 'none';
}
function attachNodeClickHandler(id, el) {
    el.addEventListener('click', (e) => {
        if (!lcaMode) return;
        e.stopPropagation();

        const idx = lcaSelected.indexOf(id);
        if (idx !== -1) {
            lcaSelected.splice(idx, 1);
            el.classList.remove('node-lca-selected');
        } else {
            if (lcaSelected.length >= 2) {
                const old = lcaSelected.shift();
                if (nodeElements[old]) nodeElements[old].classList.remove('node-lca-selected');
            }
            lcaSelected.push(id);
            el.classList.add('node-lca-selected');
        }
        updateLCAChips();
    });
}

function updateLCAChips() {
    const n0 = lcaSelected[0];
    const n1 = lcaSelected[1];
    const tag0 = n0 !== undefined ? `&lt;${currentNodesData[n0]?.tagName}&gt; #${n0}` : '—';
    const tag1 = n1 !== undefined ? `&lt;${currentNodesData[n1]?.tagName}&gt; #${n1}` : '—';
    lcaChip1.innerHTML = `Node 1: <span>${tag0}</span>`;
    lcaChip2.innerHTML = `Node 2: <span>${tag1}</span>`;
    lcaChip1.classList.toggle('filled', n0 !== undefined);
    lcaChip2.classList.toggle('filled', n1 !== undefined);
}
function resetAllNodes() {
    Object.values(nodeElements).forEach(el => {
        el.className = 'node-container';
    });
}
function buildLCAFrontend(nodes) {
    const n = nodes.length;
    lcaDepth  = new Array(n).fill(0);
    lcaParent = Array.from({ length: LOG_BITS }, () => new Array(n).fill(-1));

    const visited = new Array(n).fill(false);
    const queue   = [0];
    visited[0]    = true;
    lcaParent[0][0] = 0;

    while (queue.length > 0) {
        const u = queue.shift();
        for (const c of (nodes[u].children || [])) {
            if (c < n && !visited[c]) {
                visited[c]      = true;
                lcaDepth[c]     = lcaDepth[u] + 1;
                lcaParent[0][c] = u;
                queue.push(c);
            }
        }
    }
    for (let k = 1; k < LOG_BITS; k++) {
        for (let v = 0; v < n; v++) {
            const p = lcaParent[k-1][v];
            lcaParent[k][v] = p === -1 ? -1 : lcaParent[k-1][p];
        }
    }
}
async function runLCA() {
    const [u, v] = lcaSelected;
    const delay  = parseInt(speedSelect.value);
    logList.innerHTML = '';
    const loadingItem = document.createElement('li');
    loadingItem.innerHTML = `<b>Menghitung LCA</b> untuk Node <b>#${u}</b> &amp; Node <b>#${v}</b>...`;
    loadingItem.style.cssText = 'padding:6px;background:#e8f5e0;border-radius:6px;margin-bottom:4px;text-align:center;';
    logList.appendChild(loadingItem);

    try {
        const response = await fetch(`${API_BASE}/lca`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                html:  savedHtmlSource,
                nodeU: u,
                nodeV: v,
            })
        });

        const result = await response.json();

        if (!result.success) {
            alert("LCA gagal: " + result.error);
            exitLCAMode();
            return;
        }

        const { lca, lcaTag, lcaDepth: depthLCA, depthU, depthV,
                pathU, pathV, pathURoot, pathVRoot, time } = result.data;
        resetAllNodes();
        logList.innerHTML = '';

        const header = document.createElement('li');
        header.innerHTML =
            `<b>LCA Binary Lifting</b> — Node <b>#${u}</b> ` +
            `(depth:${depthU}) &amp; Node <b>#${v}</b> (depth:${depthV})`;
        header.style.cssText = 'padding:6px;background:#e8f5e0;border-radius:6px;margin-bottom:4px;text-align:center;';
        logList.appendChild(header);
        for (const id of pathU) {
            if (id === lca) continue;   // LCA ditampilkan terakhir
            if (nodeElements[id]) {
                nodeElements[id].classList.add('node-lca-path');
                addLogItem(`↑ Path U: Node #${id} &lt;${currentNodesData[id]?.tagName}&gt;`, '#5a8a3a');
                if (delay > 0) await sleep(delay);
            }
        }
        for (const id of pathV) {
            if (id === lca) continue;
            if (nodeElements[id]) {
                nodeElements[id].classList.add('node-lca-path');
                addLogItem(`↑ Path V: Node #${id} &lt;${currentNodesData[id]?.tagName}&gt;`, '#3a7a8a');
                if (delay > 0) await sleep(delay);
            }
        }
        if (nodeElements[u]) {
            nodeElements[u].classList.remove('node-lca-path');
            nodeElements[u].classList.add('node-lca-selected');
        }
        if (nodeElements[v]) {
            nodeElements[v].classList.remove('node-lca-path');
            nodeElements[v].classList.add('node-lca-selected');
        }
        if (nodeElements[lca]) {
            nodeElements[lca].classList.remove('node-lca-path', 'node-lca-selected');
            nodeElements[lca].classList.add('node-lca-result');
        }
        const breadcrumbU = pathURoot.map(id =>
            `<span class="bc-item">#${id}&lt;${currentNodesData[id]?.tagName}&gt;</span>`
        ).join(' › ');
        const breadcrumbV = pathVRoot.map(id =>
            `<span class="bc-item">#${id}&lt;${currentNodesData[id]?.tagName}&gt;</span>`
        ).join(' › ');

        const breadcrumbLi = document.createElement('li');
        breadcrumbLi.innerHTML =
            `<div style="font-size:11px;margin-top:6px;color:#666">` +
            `<b>Root → U:</b> ${breadcrumbU}<br>` +
            `<b>Root → V:</b> ${breadcrumbV}</div>`;
        logList.appendChild(breadcrumbLi);
        const resultLi = document.createElement('li');
        resultLi.innerHTML =
            `<b>LCA ditemukan:</b> Node <b>#${lca}</b> ` +
            `&lt;${lcaTag}&gt; (Depth: ${depthLCA}) | ` +
            `Waktu: <b>${time.toFixed(3)}ms</b>`;
        resultLi.style.cssText =
            'margin-top:8px;padding:8px;background:#a9dfbf;border-radius:6px;' +
            'text-align:center;font-weight:600;';
        logList.appendChild(resultLi);
        logList.scrollTop = logList.scrollHeight;

    } catch(e) {
        alert(`Koneksi ke backend gagal saat menghitung LCA.\nURL: ${API_BASE}\n\n` + e);
    }

    exitLCAMode();
}

function addLogItem(html, color = '#333') {
    const li = document.createElement('li');
    li.innerHTML = html;
    li.style.color = color;
    logList.appendChild(li);
    logList.scrollTop = logList.scrollHeight;
}

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
function visualizeTree(nodes) {
    const NODE_W  = 110;
    const LEVEL_H = 90;
    nodeElements  = {};
    const visitOrder = [];
    {
        const stk = [0];
        while (stk.length > 0) {
            const id = stk.pop();
            if (id == null || !nodes[id]) continue;
            visitOrder.push(id);
            const ch = nodes[id].children;
            for (let i = ch.length - 1; i >= 0; i--) stk.push(ch[i]);
        }
    }
    for (let i = visitOrder.length - 1; i >= 0; i--) {
        const node = nodes[visitOrder[i]];
        if (!node) continue;
        if (node.children.length === 0) {
            node.subtreeWidth = NODE_W + 20;
        } else {
            let total = 0;
            for (const cid of node.children) total += (nodes[cid]?.subtreeWidth || NODE_W + 20);
            node.subtreeWidth = Math.max(total, NODE_W + 20);
        }
    }
    const totalWidth  = Math.max(3000, (nodes[0].subtreeWidth || 3000) + 200);
    const maxD        = lcaDepth.length > 1 ? Math.max(...lcaDepth) : 20;
    const TOP_PAD    = 120;
    const totalHeight = Math.max(3000, (maxD + 3) * (LEVEL_H + 10) + TOP_PAD);
    treeContainer.style.width  = totalWidth + 'px';
    treeContainer.style.height = totalHeight + 'px';
    nodes[0].x = Math.max(1500, (nodes[0].subtreeWidth || 3000) / 2);
    nodes[0].y = TOP_PAD;

    const bfsQ = [0];
    while (bfsQ.length > 0) {
        const id   = bfsQ.shift();
        const node = nodes[id];
        if (!node) continue;

        const isRoot = id === 0;
        if (!isRoot) {
            const div = document.createElement('div');
            div.className = 'node-container';
            div.style.left = Math.round(node.x - 50) + 'px';
            div.style.top  = Math.round(node.y) + 'px';
            div.title      = `<${node.tagName}> (ID: ${id}, Depth: ${lcaDepth[id] ?? '?'})`;
            div.innerText  = `<${node.tagName}>`;
            treeContainer.appendChild(div);
            nodeElements[id] = div;
            attachNodeClickHandler(id, div);
        }
        const childY = isRoot ? node.y : node.y + LEVEL_H;
        let curX     = node.x - (node.subtreeWidth || NODE_W + 20) / 2;
        for (const cid of node.children) {
            if (!nodes[cid]) continue;
            const w     = nodes[cid].subtreeWidth || NODE_W + 20;
            nodes[cid].x = curX + w / 2;
            nodes[cid].y = childY;
            curX += w;
            bfsQ.push(cid);
        }
    }

    drawLines();
}

function drawLines() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;");
    treeContainer.prepend(svg);

    for (const node of currentNodesData) {
        if (!nodeElements[node.id] && node.id !== 0) continue;
        for (const cid of node.children) {
            if (!nodeElements[cid]) continue;
            const child = currentNodesData[cid];
            const midY  = (node.y + 30 + child.y) / 2;
            const path  = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d",
                `M ${Math.round(node.x)} ${Math.round(node.y + 30)} L ${Math.round(node.x)} ${Math.round(midY)} L ${Math.round(child.x)} ${Math.round(midY)} L ${Math.round(child.x)} ${Math.round(child.y)}`);
            path.setAttribute("stroke", "#333");
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("fill", "none");
            svg.appendChild(path);
        }
    }
}
async function animateAndLog(logIds, targetIds) {
    const delay   = parseInt(speedSelect.value);
    const targets = new Set(targetIds);
    const useAnim = delay > 0 && logIds.length <= 2000;

    let step = 1;
    for (const id of logIds) {
        if (id === 0) continue;
        const node    = currentNodesData[id];
        if (!node) { step++; continue; }

        const isMatch = targets.has(id);
        const el      = nodeElements[id];

        if (el) {
            el.classList.remove('node-visited', 'node-match');
            el.classList.add(isMatch ? 'node-match' : 'node-visited');
        }

        if (step <= MAX_LOG_ENTRIES) {
            const li = document.createElement('li');
            li.className = isMatch ? 'log-item-match' : 'log-item-visit';
            li.innerText = `[${step}] <${node.tagName}> (ID:${id})${isMatch ? " [MATCH]" : ""}`;
            logList.appendChild(li);
            logList.scrollTop = logList.scrollHeight;
        } else if (step === MAX_LOG_ENTRIES + 1) {
            const li = document.createElement('li');
            li.className = 'log-placeholder';
            li.innerText = `... ${logIds.length - MAX_LOG_ENTRIES} langkah lagi tidak ditampilkan`;
            logList.appendChild(li);
        }

        if (useAnim) await sleep(delay);
        step++;
    }

    if (!useAnim) await sleep(0);
}