const urlInput = document.getElementById('url-input');
const htmlInput = document.getElementById('html-input');
const parseBtn = document.getElementById('parse-btn');
const step2Panel = document.getElementById('step2-panel');
const selectorInput = document.getElementById('selector-input');
const algoSelect = document.getElementById('algo-select');
const traverseBtn = document.getElementById('traverse-btn');
const speedSelect = document.getElementById('speed-select');
const limitNInput = document.getElementById('limit-n');
const treeContainer = document.getElementById('tree-canvas');
const treeViewport = document.getElementById('tree-viewport');
const logList = document.getElementById('log-list');
const statsInfo = document.getElementById('stats-info');
const zoomLabel = document.getElementById('zoom-label');

let savedHtmlSource = "";
let currentNodesData = [];
let nodeElements = {};
let zoomLevel = 1.0;

const ZOOM_MIN = 0.2;
const ZOOM_MAX = 3.0;
const ZOOM_STEP_BTN = 0.2;
const ZOOM_STEP_WHEEL = 0.08;
const MAX_VISUAL_NODES = 2000;
const MAX_LOG_ENTRIES = 500;

function applyZoom() {
    treeContainer.style.transform = `scale(${zoomLevel})`;
    const baseW = parseInt(treeContainer.style.width) || 3000;
    const baseH = parseInt(treeContainer.style.height) || 3000;
    treeContainer.style.marginRight = (baseW * zoomLevel - baseW) + 'px';
    treeContainer.style.marginBottom = (baseH * zoomLevel - baseH) + 'px';
    zoomLabel.innerText = Math.round(zoomLevel * 100) + '%';
}

function zoomAt(newZoom, pivotX, pivotY) {
    newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(newZoom.toFixed(2))));
    if (newZoom === zoomLevel) return;
    const canvasX = (treeViewport.scrollLeft + pivotX) / zoomLevel;
    const canvasY = (treeViewport.scrollTop + pivotY) / zoomLevel;
    zoomLevel = newZoom;
    applyZoom();
    treeViewport.scrollLeft = canvasX * newZoom - pivotX;
    treeViewport.scrollTop = canvasY * newZoom - pivotY;
}

document.getElementById('zoom-in-btn').addEventListener('click', () => {
    zoomAt(zoomLevel + ZOOM_STEP_BTN, treeViewport.clientWidth / 2, treeViewport.clientHeight / 2);
});

document.getElementById('zoom-out-btn').addEventListener('click', () => {
    zoomAt(zoomLevel - ZOOM_STEP_BTN, treeViewport.clientWidth / 2, treeViewport.clientHeight / 2);
});

document.getElementById('zoom-reset-btn').addEventListener('click', () => {
    zoomLevel = 1.0;
    applyZoom();
});

treeViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = treeViewport.getBoundingClientRect();
    zoomAt(zoomLevel + (e.deltaY > 0 ? -ZOOM_STEP_WHEEL : ZOOM_STEP_WHEEL), e.clientX - rect.left, e.clientY - rect.top);
}, { passive: false });


let isPanning = false;
let panStart = { x: 0, y: 0, sl: 0, st: 0 };

treeViewport.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY, sl: treeViewport.scrollLeft, st: treeViewport.scrollTop };
    treeViewport.style.cursor = 'grabbing';
    e.preventDefault();
});

window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    treeViewport.scrollLeft = panStart.sl - (e.clientX - panStart.x);
    treeViewport.scrollTop = panStart.st - (e.clientY - panStart.y);
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
    const url = urlInput.value.trim();
    const rawHTML = htmlInput.value.trim();

    if (!url && !rawHTML) {
        alert("Masukkan URL atau paste HTML terlebih dahulu.");
        return;
    }

    parseBtn.innerText = "Parsing...";
    parseBtn.disabled = true;
    treeContainer.innerHTML = '';
    zoomLevel = 1.0;
    applyZoom();
    logList.innerHTML = '<li class="log-placeholder">Menyiapkan DOM Tree...</li>';

    try {
        const response = await fetch('http://localhost:3000/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, html: rawHTML, selector: "*", algo: "BFS" })
        });

        const result = await response.json();
        if (result.success) {
            const data = result.data;
            savedHtmlSource = data.htmlSource || rawHTML;
            currentNodesData = data.nodes;

            if (url && data.htmlSource) htmlInput.value = data.htmlSource;

            visualizeTree(data.nodes);
            statsInfo.innerText = `Nodes: ${data.nodes.length} | Max Depth: ${data.maxDepth}`;
            logList.innerHTML = '<li class="log-placeholder">Parsing sukses! Pilih algoritma lalu klik Traverse.</li>';
            step2Panel.classList.remove('disabled');
            traverseBtn.disabled = false;
        } else {
            alert("Gagal parse: " + result.error);
        }
    } catch {
        alert("Koneksi ke backend gagal. Pastikan server sudah berjalan.");
    } finally {
        parseBtn.innerText = "Parse";
        parseBtn.disabled = false;
    }
});

traverseBtn.addEventListener('click', async () => {
    const selector = selectorInput.value.trim();
    const algo = algoSelect.value;

    if (!selector) {
        alert("Masukkan CSS Selector (contoh: div, .class, #id, a.nav)");
        return;
    }

    const limitType = document.querySelector('input[name="limit-type"]:checked').value;
    const limit = limitType === 'topn' ? Math.max(1, parseInt(limitNInput.value) || 10) : 0;

    traverseBtn.innerText = "Running...";
    traverseBtn.disabled = true;
    logList.innerHTML = '';

    Object.values(nodeElements).forEach(el => {
        el.style.borderColor = '#bdc3c7';
        el.style.backgroundColor = 'white';
        el.style.borderWidth = '2px';
    });

    try {
        const response = await fetch('http://localhost:3000/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: "", html: savedHtmlSource, selector, algo, limit })
        });

        const result = await response.json();
        if (result.success) {
            const data = result.data;
            await animateAndLog(data.traversalLog, data.results);

            const summary = document.createElement('li');
            summary.innerHTML = `<b>Selesai!</b> Ditemukan <b>${data.results.length}</b> kecocokan dari <b>${data.visited}</b> node dikunjungi. Waktu: ${data.time.toFixed(2)}ms`;
            summary.style.cssText = 'margin-top:10px;text-align:center;';
            logList.appendChild(summary);
            logList.scrollTop = logList.scrollHeight;
        }
    } catch {
        alert("Terjadi kesalahan saat traversal.");
    } finally {
        traverseBtn.innerText = "Traverse";
        traverseBtn.disabled = false;
    }
});

// --- Visualisasi ---

function visualizeTree(nodes) {
    const NODE_W = 110;
    const LEVEL_H = 90;
    nodeElements = {};

    const renderCount = Math.min(nodes.length, MAX_VISUAL_NODES);

    function calcSubtreeWidth(id) {
        if (id >= renderCount) return NODE_W + 20;
        const node = nodes[id];
        if (!node || node.children.length === 0) return node.subtreeWidth = NODE_W + 20;
        let total = 0;
        for (const cid of node.children) {
            if (cid < renderCount) total += calcSubtreeWidth(cid);
        }
        return node.subtreeWidth = Math.max(total || NODE_W + 20, NODE_W + 20);
    }
    calcSubtreeWidth(0);

    const totalWidth = Math.max(3000, nodes[0].subtreeWidth + 200);
    treeContainer.style.width = totalWidth + 'px';
    treeContainer.style.height = '3000px';

    function positionNode(id, x, y) {
        if (id >= renderCount) return;
        const node = nodes[id];
        if (!node) return;

        const isRoot = id === 0;

        if (!isRoot) {
            node.x = x; node.y = y;
            const div = document.createElement('div');
            div.className = 'node-container';
            div.style.left = (x - 50) + 'px';
            div.style.top = y + 'px';
            div.innerText = `<${node.tagName}>`;
            treeContainer.appendChild(div);
            nodeElements[id] = div;
        }

        const childY = isRoot ? y : y + LEVEL_H;
        let curX = x - (node.subtreeWidth || NODE_W + 20) / 2;
        for (const cid of node.children) {
            if (cid >= renderCount) continue;
            const w = nodes[cid].subtreeWidth || NODE_W + 20;
            positionNode(cid, curX + w / 2, childY);
            curX += w;
        }
    }

    positionNode(0, Math.max(1500, (nodes[0].subtreeWidth || 3000) / 2), 20);
    drawLines();

    if (nodes.length > MAX_VISUAL_NODES) {
        const notice = document.createElement('div');
        notice.style.cssText = 'position:absolute;top:5px;left:10px;background:#fff3cd;border:1px solid #ffc107;padding:5px 10px;border-radius:4px;font-size:12px;z-index:20;';
        notice.innerText = `⚠ Ditampilkan ${MAX_VISUAL_NODES} dari ${nodes.length} node.`;
        treeContainer.appendChild(notice);
    }
}

function drawLines() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("style", "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;");
    treeContainer.prepend(svg);

    for (const node of currentNodesData) {
        if (!nodeElements[node.id]) continue;
        for (const cid of node.children) {
            if (!nodeElements[cid]) continue;
            const child = currentNodesData[cid];
            const midY = (node.y + 30 + child.y) / 2;
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${node.x} ${node.y + 30} L ${node.x} ${midY} L ${child.x} ${midY} L ${child.x} ${child.y}`);
            path.setAttribute("stroke", "#bdc3c7");
            path.setAttribute("stroke-width", "1.5");
            path.setAttribute("fill", "none");
            svg.appendChild(path);
        }
    }
}

async function animateAndLog(logIds, targetIds) {
    const delay = parseInt(speedSelect.value);
    const targets = new Set(targetIds);
    const useAnimation = delay > 0 && logIds.length <= 2000;

    let step = 1;
    for (const id of logIds) {
        if (id === 0) continue;
        const node = currentNodesData[id];
        if (!node) { step++; continue; }

        const isMatch = targets.has(id);
        const el = nodeElements[id];

        if (el) {
            el.style.borderColor = isMatch ? '#27ae60' : '#d35400';
            el.style.borderWidth = isMatch ? '3px' : '2px';
            el.style.backgroundColor = isMatch ? '#e8f8f5' : '#fdf2e9';
        }

        if (step <= MAX_LOG_ENTRIES) {
            const li = document.createElement('li');
            li.className = isMatch ? 'log-item-match' : 'log-item-visit';
            li.innerText = `[${step}] <${node.tagName}> (ID:${id})${isMatch ? " ✅ MATCH!" : ""}`;
            logList.appendChild(li);
            logList.scrollTop = logList.scrollHeight;
        } else if (step === MAX_LOG_ENTRIES + 1) {
            const li = document.createElement('li');
            li.className = 'log-placeholder';
            li.innerText = `... ${logIds.length - MAX_LOG_ENTRIES} langkah lagi tidak ditampilkan`;
            logList.appendChild(li);
        }

        if (useAnimation) await new Promise(r => setTimeout(r, delay));
        step++;
    }

    if (!useAnimation) await new Promise(r => setTimeout(r, 0));
}
