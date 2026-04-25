# TUAK DOM Visualizer

Aplikasi web untuk menelusuri struktur pohon DOM dari halaman HTML menggunakan algoritma BFS dan DFS, lengkap dengan visualisasi animasi, traversal log, multithreading, dan LCA Binary Lifting.

---

## Algoritma

### BFS (Breadth First Search)
Penelusuran dilakukan level per level menggunakan queue. Node dari level paling atas dikunjungi lebih dulu sebelum turun ke level berikutnya. Cocok untuk menemukan node yang lokasinya dekat dengan root.

### DFS (Depth First Search)
Penelusuran dilakukan sedalam mungkin ke satu cabang sebelum backtrack ke cabang lain, menggunakan stack. Cocok untuk mencari node yang tersebar di kedalaman pohon.

### LCA Binary Lifting
Mencari Lowest Common Ancestor (leluhur bersama terdekat) dari dua node. Menggunakan sparse table (`up[k][v]` = ancestor ke-2^k dari node v) yang dibangun sekali dengan BFS, lalu query dilakukan dalam O(log n).

### Multithreading
Untuk pohon besar (≥ 500 node), frontier pada kedalaman tertentu dibagi ke beberapa Worker Thread (Node.js `worker_threads`) secara round-robin. Setiap worker menjalankan BFS/DFS pada subpohon masing-masing secara paralel.

---

## Requirement

- **Node.js** v18 atau lebih baru
- **npm** (ikut dengan Node.js)
- **ts-node** dan **TypeScript** (diinstall via npm)

---

## Instalasi & Build

```bash
# masuk ke folder backend
cd src/backend

# install dependencies
npm install

# jalankan backend (langsung dari TypeScript, tidak perlu compile manual)
npm run dev
```

Backend berjalan di `http://localhost:3000`.

### Frontend
Frontend adalah file statis, tidak perlu build. Buka `src/frontend/index.html` langsung di browser, atau serve dengan ekstensi Live Server di VS Code.

> Pastikan URL backend di `script.js` sesuai dengan alamat server yang dipakai.

---

## Cara Menjalankan

1. Jalankan backend: `cd src/backend && npm run dev`
2. Buka `src/frontend/index.html` di browser
3. Masukkan URL website atau paste kode HTML langsung
4. Klik **Parse** untuk membangun pohon DOM
5. Pilih algoritma (BFS/DFS), masukkan CSS Selector, atur batas hasil
6. Klik **Traverse** untuk mulai penelusuran dengan animasi
7. Untuk LCA: klik **Traverse LCA**, pilih 2 node pada pohon, klik lagi

### Contoh CSS Selector yang didukung
| Selector | Contoh |
|---|---|
| Tag | `div`, `p`, `a` |
| Class | `.container`, `.btn` |
| ID | `#header` |
| Universal | `*` |
| Child | `div > p` |
| Descendant | `div p` |
| Adjacent sibling | `h1 + p` |
| General sibling | `h1 ~ p` |
| Kombinasi | `div.card > p.text` |

---

## Checklist Fitur

| No | Poin | Status |
|---|---|---|
| 1 | Aplikasi berhasil dikompilasi tanpa kesalahan | ✓ |
| 2 | Aplikasi berhasil dijalankan | ✓ |
| 3 | Input URL, algoritma, CSS selector, jumlah hasil | ✓ |
| 4 | Scraping HTML dari URL | ✓ |
| 5 | Visualisasi pohon DOM | ✓ |
| 6 | Penelusuran pohon DOM dan hasil | ✓ |
| 7 | Highlight jalur traversal | ✓ |
| 8 | Traversal log | ✓ |
| 9 | [Bonus] Video | — |
| 10 | [Bonus] Deploy aplikasi (VM Azure) | ✓ |
| 11 | [Bonus] Animasi penelusuran | ✓ |
| 12 | [Bonus] Multithreading | ✓ |
| 13 | [Bonus] LCA Binary Lifting | ✓ |

---

## Author

| Nama | NIM |
|---|---|
| Juan | 13524032 |
| Ariel Sitorus | 13524085 |
| Manuell Thimoty | 13524102 |

Kelompok: **TUAK** — Tubes 2 Strategi Algoritma, ITB 2025
