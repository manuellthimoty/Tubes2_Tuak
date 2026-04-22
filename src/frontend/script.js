const urlInput = document.getElementById('url-input');
const selectorInput = document.getElementById('selector-input');
const algoSelect = document.getElementById('algo-select');
const searchBtn = document.getElementById('search-btn');
const treeContainer = document.getElementById('tree-canvas');
const resizer = document.getElementById('resizer');
const leftPanel = document.getElementById('html-preview');
const htmlInputArea = document.getElementById('html-input-area');
const messageBox = document.getElementById('message');

resizer.addEventListener('mousedown', (e) => {
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    resizer.style.backgroundColor = '#4ade80';
});

function resize(e) {
    const newWidth = e.clientX - leftPanel.getBoundingClientRect().left;
    if (newWidth > 100 && newWidth < window.innerWidth - 100) {
        leftPanel.style.width = newWidth + 'px';
        leftPanel.style.flex = 'none';
    }
}

function stopResize() {
    document.removeEventListener('mousemove', resize);
    resizer.style.backgroundColor = ''; 
}


function drawNode(x, y, label) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node-container';
    nodeDiv.style.left = x + 'px';
    nodeDiv.style.top = y + 'px';
    nodeDiv.innerText = label;
    treeContainer.appendChild(nodeDiv);
}

searchBtn.addEventListener('click', async () => {
    const url = urlInput.value;
    const selector = selectorInput.value;
    const algo = algoSelect.value;
    const rawHTML = htmlInputArea.value;

    treeContainer.innerHTML = '';

    //buat testing aja
    drawNode(200, 50, "Searching: " + algo);   
    drawNode(100, 150, "Selector: " + selector);  
    drawNode(300, 150, "Status: Ready");  

    console.log("Data Ready:", { url, selector, algo, rawHTML });
});
