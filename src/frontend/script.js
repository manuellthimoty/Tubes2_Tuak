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

// --- LOGIKA LAMA (TESTING) ---
// searchBtn.addEventListener('click', async () => {
//     const url = urlInput.value;
//     const selector = selectorInput.value;
//     const algo = algoSelect.value;

//     console.log("Tombol diklik!");
//     console.log("URL:", url);
//     console.log("Selector:", selector);
//     console.log("Algoritma:", algo);

//     alert("Tombol sudah bekerja! Cek di Console (F12)");
// });

function drawNode(x, y, label) {
    const nodeDiv = document.createElement('div');
    nodeDiv.className = 'node-container';
    nodeDiv.style.left = x + 'px';
    nodeDiv.style.top = y + 'px';
    nodeDiv.innerText = label;
    treeContainer.appendChild(nodeDiv);
}


searchBtn.addEventListener('click', async () => {
    drawNode(200, 50, "<html>");   
    drawNode(100, 150, "<head>");  
    drawNode(300, 150, "<body>");  
});
