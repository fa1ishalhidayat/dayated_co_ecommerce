'use strict';
/* ===== Dayated Co. - script.js =====
   Data disimpan di localStorage (siap diganti database di UAS). */

const HASH = '1279779981'; // hash password admin, bukan password asli
const KEY = { p: 'dc_produk', o: 'dc_order', s: 'dc_set', c: 'dc_cart', a: 'dc_admin' };
const KAT = ['Jaket', 'Hoodie', 'Sepatu', 'Sweater', 'Baju', 'Kemeja'];
const KON = ['Seperti baru', 'Bagus', 'Layak pakai'];
const STATUS = ['Menunggu pembayaran', 'Sudah dibayar', 'Dikemas', 'Dikirim', 'Selesai', 'Dibatalkan'];
const EMO = { Jaket: '🧥', Hoodie: '🧥', Sepatu: '👟', Sweater: '🧶', Baju: '👕', Kemeja: '👔' };
const COL = { Jaket: ['#1e5a94', '#7fbbe8'], Hoodie: ['#2b6cb0', '#9cc9ee'], Sepatu: ['#3a5f86', '#b9d6ee'], Sweater: ['#3b82c4', '#c4e0f6'], Baju: ['#2f78b5', '#8ec8ec'], Kemeja: ['#1f6aa5', '#a3d0f0'] };
const KEYS = { harga: p => p.harga, nama: p => p.nama.toLowerCase(), stok: p => p.stok };

/* ---------- STRUCT: bentuk data satu produk ---------- */
class Produk {
  constructor(id, nama, kategori, kondisi, ukuran, harga, stok, caption, foto) {
    Object.assign(this, { id, nama, kategori, kondisi, ukuran, harga, stok, caption, foto });
  }
}

/* ---------- POINTER: alamat + referensi ke objek ---------- */
class Pointer {
  constructor(ref) {
    Pointer.next += 16;
    this.alamat = '0x' + Pointer.next.toString(16).toUpperCase().padStart(4, '0');
    this.ref = ref;
  }
  deref() { return this.ref; } // ambil objek yang ditunjuk
}
Pointer.next = 0x1000;

/* ---------- ARRAY: penyimpanan utama ---------- */
let produk = [];   // array of Produk
let cart = [];     // array of { ptr: Pointer -> Produk, qty }
let orders = [], set = {};
let kat = 'Semua', hasil = null, tab = 'produk', editId = null, gagal = 0, kunci = 0;

/* ---------- Helper ---------- */
const $ = s => document.querySelector(s);
const rp = n => 'Rp' + Number(n).toLocaleString('id-ID');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast('Penyimpanan penuh, pakai foto lebih kecil'); return false; } }
const saveP = () => save(KEY.p, produk);
const saveC = () => save(KEY.c, cart.map(c => ({ id: c.ptr.deref().id, qty: c.qty })));
function hash(s) { let h = 5381; s = 'dc:' + s; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0; return String(h); }
const isAdmin = () => { try { return sessionStorage.getItem(KEY.a) === '1'; } catch (e) { return false; } };
let tt;
function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(tt); tt = setTimeout(() => el.hidden = true, 2300); }
const buka = h => { $('#box').innerHTML = h; $('#modal').hidden = false; };
const tutup = () => { $('#modal').hidden = true; pendingCo = false; };

/* ---------- Gambar bawaan 8 produk contoh (ilustrasi SVG, tanpa file luar) ---------- */
const SB = b => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><defs><linearGradient id='bg' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#eaf4fc'/><stop offset='1' stop-color='#cfe4f4'/></linearGradient></defs><rect width='300' height='300' fill='url(#bg)'/><ellipse cx='150' cy='250' rx='94' ry='9' fill='#12304d' opacity='.14'/>${b}</svg>`;
const LS = 'M110 104 L62 148 L58 228 L88 232 L100 182 L100 232 L200 232 L200 182 L212 232 L242 228 L238 148 L190 104 Q150 128 110 104 Z';
const SEEDIMG = {
  1: SB(`<path d='${LS}' fill='#4a7ba8' stroke='#2d5580' stroke-width='2' stroke-linejoin='round'/>
    <ellipse cx='74' cy='196' rx='13' ry='26' fill='#9cc0de' opacity='.35'/><ellipse cx='226' cy='196' rx='13' ry='26' fill='#9cc0de' opacity='.35'/>
    <path d='M110 104 L150 126 L136 148 L98 114Z M190 104 L150 126 L164 148 L202 114Z' fill='#3d6a96' stroke='#2d5580' stroke-width='2' stroke-linejoin='round'/>
    <path d='M150 126 V232' stroke='#2d5580' stroke-width='2'/>
    <rect x='110' y='156' width='26' height='24' rx='3' fill='none' stroke='#cfe3f3' stroke-width='1.5' stroke-dasharray='3 2'/><rect x='164' y='156' width='26' height='24' rx='3' fill='none' stroke='#cfe3f3' stroke-width='1.5' stroke-dasharray='3 2'/>
    <rect x='100' y='222' width='100' height='10' fill='#3d6a96'/>
    <g fill='#e2c98e'><circle cx='150' cy='158' r='3'/><circle cx='150' cy='186' r='3'/><circle cx='150' cy='212' r='3'/></g>`),
  2: SB(`<ellipse cx='150' cy='102' rx='42' ry='30' fill='#16294a'/>
    <path d='${LS}' fill='#213f6b' stroke='#16294a' stroke-width='2' stroke-linejoin='round'/>
    <ellipse cx='150' cy='108' rx='22' ry='10' fill='#0f1d36'/>
    <path d='M116 186 L184 186 L192 226 L108 226Z' fill='#1a3358' stroke='#0f1d36' stroke-width='2' stroke-linejoin='round'/>
    <path d='M140 120 L138 166 M160 120 L162 166' stroke='#e8eef6' stroke-width='2.5' stroke-linecap='round'/><circle cx='138' cy='168' r='3.5' fill='#e8eef6'/><circle cx='162' cy='168' r='3.5' fill='#e8eef6'/>
    <rect x='120' y='148' width='60' height='6' rx='3' fill='#e8eef6' opacity='.85'/><rect x='100' y='224' width='100' height='8' fill='#16294a'/>`),
  3: SB(`<path d='M74 108 L74 208 L248 208 Q258 208 258 196 Q258 180 234 176 Q196 170 180 150 L152 126 L122 116 Q98 108 74 108Z' fill='#2a5d9c' stroke='#1b3f6e' stroke-width='2' stroke-linejoin='round'/>
    <path d='M214 176 Q250 182 258 196 L258 208 L214 208Z' fill='#f4f7fb' stroke='#c3cdd6' stroke-width='1.5'/>
    <path d='M116 126 L148 134 M112 144 L156 152 M110 162 L168 170' stroke='#f4f7fb' stroke-width='3' stroke-linecap='round'/>
    <circle cx='90' cy='170' r='13' fill='#f4f7fb'/><circle cx='90' cy='170' r='6' fill='#2a5d9c'/>
    <rect x='70' y='206' width='192' height='20' rx='10' fill='#f4f7fb' stroke='#c3cdd6' stroke-width='1.5'/><rect x='80' y='214' width='172' height='4' fill='#d9534f'/>`),
  4: SB(`<defs><clipPath id='c'><path d='${LS}'/></clipPath></defs>
    <path d='${LS}' fill='#f4f7fb'/>
    <g clip-path='url(#c)' fill='#3b6ea5'><rect x='40' y='118' width='220' height='9'/><rect x='40' y='136' width='220' height='9'/><rect x='40' y='154' width='220' height='9'/><rect x='40' y='172' width='220' height='9'/><rect x='40' y='190' width='220' height='9'/><rect x='40' y='208' width='220' height='9'/>
    <g fill='#2c5483'><rect x='40' y='224' width='220' height='12'/></g></g>
    <path d='${LS}' fill='none' stroke='#2c5483' stroke-width='2' stroke-linejoin='round'/>
    <path d='M110 104 Q150 128 190 104' fill='none' stroke='#2c5483' stroke-width='7'/>`),
  5: SB(`<path d='M112 102 Q150 126 188 102 L240 130 L222 170 L200 156 L200 232 L100 232 L100 156 L78 170 L60 130Z' fill='#eadfb9' stroke='#b8a977' stroke-width='2' stroke-linejoin='round'/>
    <path d='M112 102 Q150 126 188 102' fill='none' stroke='#b8a977' stroke-width='5'/>
    <text x='150' y='150' font-family='Arial,sans-serif' font-weight='700' font-size='17' text-anchor='middle' fill='#1f6f78' letter-spacing='3'>SURF</text>
    <circle cx='150' cy='174' r='15' fill='#e8833a'/>
    <path d='M118 192 Q130 182 142 192 T166 192 T182 192 M118 203 Q130 193 142 203 T166 203 T182 203' fill='none' stroke='#1f8a8a' stroke-width='4' stroke-linecap='round'/>
    <text x='150' y='224' font-family='Arial,sans-serif' font-weight='700' font-size='10' text-anchor='middle' fill='#1f6f78' letter-spacing='2'>BALI 90s</text>
    <ellipse cx='108' cy='182' rx='4' ry='3' fill='#8a6d3b' opacity='.5'/>`),
  6: SB(`<defs><pattern id='p' width='24' height='24' patternUnits='userSpaceOnUse'><rect width='24' height='24' fill='#2f8f8a'/><rect width='8' height='24' fill='#14504f' opacity='.55'/><rect width='24' height='8' fill='#14504f' opacity='.55'/><rect x='14' width='2' height='24' fill='#f1f6f2' opacity='.5'/><rect y='14' width='24' height='2' fill='#f1f6f2' opacity='.5'/></pattern></defs>
    <path d='${LS}' fill='url(#p)' stroke='#14504f' stroke-width='2' stroke-linejoin='round'/>
    <path d='M110 104 L150 128 L134 150 L96 114Z M190 104 L150 128 L166 150 L204 114Z' fill='#1f6f6a' stroke='#14504f' stroke-width='2' stroke-linejoin='round'/>
    <path d='M150 128 V232' stroke='#14504f' stroke-width='2'/>
    <rect x='108' y='162' width='28' height='28' rx='2' fill='none' stroke='#14504f' stroke-width='2'/>
    <g fill='#f1f6f2'><circle cx='150' cy='160' r='3'/><circle cx='150' cy='186' r='3'/><circle cx='150' cy='212' r='3'/></g>`),
  7: SB(`<defs><clipPath id='c'><path d='${LS}'/></clipPath></defs>
    <path d='${LS}' fill='#2e6db4' stroke='#1d4a80' stroke-width='2' stroke-linejoin='round'/>
    <g clip-path='url(#c)'><rect x='40' y='150' width='220' height='20' fill='#e9f1fa' opacity='.92'/></g>
    <path d='M112 190 V222 M188 190 V222' stroke='#1d4a80' stroke-width='2'/><rect x='100' y='224' width='100' height='8' fill='#1d4a80'/>
    <path d='M126 94 L174 94 L178 118 L150 130 L122 118Z' fill='#1d4a80' stroke='#16396a' stroke-width='2' stroke-linejoin='round'/>
    <path d='M150 130 V224' stroke='#e9f1fa' stroke-width='2.5'/><circle cx='150' cy='140' r='3.5' fill='#e9f1fa'/>`),
  8: SB(`<path d='M76 150 Q76 128 102 126 L128 132 Q158 162 200 168 Q250 172 258 196 L258 208 L76 208Z' fill='#a3abb3' stroke='#6f7880' stroke-width='2' stroke-linejoin='round'/>
    <path d='M76 150 Q76 128 102 126 L118 130 L100 162Z' fill='#8b949c'/>
    <path d='M206 170 Q250 174 258 196 L258 208 L200 208 Q215 190 206 170Z' fill='#b9c0c6'/>
    <path d='M112 170 Q150 202 196 192 L186 208 L100 208Z' fill='#3f7dc0'/>
    <path d='M126 138 L146 130 M140 150 L160 142 M156 160 L176 153' stroke='#e9eef2' stroke-width='3' stroke-linecap='round'/>
    <rect x='72' y='204' width='190' height='24' rx='12' fill='#f4f7fb' stroke='#c3cdd6' stroke-width='1.5'/><rect x='84' y='216' width='166' height='3' fill='#cfd5da'/>`)
};
const svgUri = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);

function art(p) {
  if (p.foto) return p.foto;
  if (SEEDIMG[p.id]) return svgUri(SEEDIMG[p.id]); // gambar bawaan produk contoh
  const c = COL[p.kategori] || ['#1e5a94', '#a8d5f0'];
  const s = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${c[0]}'/><stop offset='1' stop-color='${c[1]}'/></linearGradient></defs><rect width='300' height='300' fill='url(#g)'/><path d='M0 235 Q75 205 150 235 T300 235 V300 H0Z' fill='white' opacity='.2'/><text x='150' y='178' font-size='100' text-anchor='middle'>${EMO[p.kategori] || '🛍️'}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s);
}
function kecilkan(file) {
  return new Promise((ok, no) => {
    const fr = new FileReader();
    fr.onload = () => {
      const im = new Image();
      im.onload = () => {
        const k = Math.min(1, 600 / Math.max(im.width, im.height));
        const cv = document.createElement('canvas');
        cv.width = Math.round(im.width * k); cv.height = Math.round(im.height * k);
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        ok(cv.toDataURL('image/jpeg', 0.72));
      };
      im.onerror = no; im.src = fr.result;
    };
    fr.onerror = no; fr.readAsDataURL(file);
  });
}

function seed() {
  const d = [
    ['Jaket Denim Washed Levi\'s', 'Jaket', 'Bagus', 'L', 185000, 2, 'Denim tebal warna biru laut pudar. Kancing lengkap, tidak ada sobek. Ada luntur halus di lengan sesuai usia pakai.'],
    ['Hoodie Champion Navy', 'Hoodie', 'Seperti baru', 'XL', 145000, 3, 'Fleece masih tebal dan lembut. Sablon logo utuh, tali hoodie lengkap. Tanpa noda.'],
    ['Sepatu Converse Chuck 70 Biru', 'Sepatu', 'Bagus', '42', 275000, 1, 'Insole masih bagus, sol sedikit kusam. Sudah dicuci dan dikeringkan. Panjang dalam 26.5 cm.'],
    ['Sweater Rajut Garis Pantai', 'Sweater', 'Seperti baru', 'M', 95000, 4, 'Rajut katun putih biru motif garis. Tidak bulu-bulu, hangat dan adem dipakai.'],
    ['Kaos Vintage Surf Bali 90s', 'Baju', 'Layak pakai', 'L', 75000, 2, 'Kaos sablon surfing tahun 90an. Warna agak pudar dan ada satu noda kecil di bawah ketiak kiri.'],
    ['Kemeja Flanel Kotak Teal', 'Kemeja', 'Bagus', 'L', 85000, 3, 'Flanel kotak hijau tosca, bahan tebal. Semua kancing lengkap. Cocok untuk outer.'],
    ['Jaket Windbreaker Nike Biru', 'Jaket', 'Bagus', 'M', 165000, 1, 'Ringan dan anti angin, resleting lancar. Ada bekas lipatan kecil di bagian dada.'],
    ['Sepatu New Balance 574 Abu', 'Sepatu', 'Layak pakai', '41', 225000, 1, 'Suede abu dengan aksen biru. Sol masih tebal, ada baret di ujung kiri. Panjang dalam 26 cm.']
  ];
  return d.map((r, i) => new Produk(i + 1, r[0], r[1], r[2], r[3], r[4], r[5], r[6], ''));
}

function init() {
  const raw = load(KEY.p, null);
  produk = (raw && raw.length ? raw : seed()).map(o => Object.assign(new Produk(), o));
  if (!raw) saveP();
  orders = load(KEY.o, []);
  set = Object.assign({ bank: 'BCA', rek: '1234567890', an: 'Dayated Co.', dana: '081234567890', gopay: '081234567890', wa: '6281234567890', ongkir: 15000, qris: '' }, load(KEY.s, {}));
  load(KEY.c, []).forEach(c => { const p = produk.find(x => x.id === c.id); if (p) cart.push({ ptr: new Pointer(p), qty: c.qty }); });
  if (isAdmin()) showAdmin();
  render();
}

/* ---------- Render toko ---------- */
function render() {
  $('#cartCount').textContent = cart.reduce((s, c) => s + c.qty, 0);
  $('#chips').innerHTML = ['Semua', ...KAT].map(k => `<button class="chip ${k === kat ? 'on' : ''}" data-a="kat" data-id="${k}">${k}</button>`).join('');
  const list = (hasil || produk).filter(p => kat === 'Semua' || p.kategori === kat);
  $('#grid').innerHTML = list.length ? list.map(p => `
    <article class="card">
      <div class="ph" data-a="detail" data-id="${p.id}"><img src="${art(p)}" alt="${esc(p.nama)}" loading="lazy"></div>
      <div class="in">
        <div><span class="tag">${esc(p.kategori)}</span><span class="tag">${esc(p.kondisi)}</span><span class="tag">Size ${esc(p.ukuran)}</span></div>
        <h3>${esc(p.nama)}</h3>
        <p class="cap">${esc(p.caption)}</p>
        <div class="price">${rp(p.harga)}</div>
        <div class="meta">Stok: ${p.stok}</div>
        <button class="btn" data-a="tambah" data-id="${p.id}" ${p.stok < 1 ? 'disabled' : ''}>${p.stok < 1 ? 'Habis' : 'Masukkan keranjang'}</button>
      </div>
    </article>`).join('') : '<div class="empty">Belum ada barang yang cocok. Coba kata kunci lain atau klik Reset.</div>';
  renderDemo();
}

function renderDemo() {
  const p0 = produk[0];
  $('#demo').innerHTML = `
  <section><h3>1. Array: produk[]</h3><table><tr><th>Indeks</th><th>Nama</th><th>Harga</th></tr>
    ${produk.map((p, i) => `<tr><td>${i}</td><td>${esc(p.nama)}</td><td>${rp(p.harga)}</td></tr>`).join('')}</table></section>
  <section><h3>2. Struct: class Produk</h3>
    ${p0 ? `<p class="muted">Isi struct pada <code>produk[0]</code>:</p><table>${Object.keys(p0).filter(k => k !== 'foto').map(k => `<tr><td><code>${k}</code></td><td>${esc(String(p0[k]).slice(0, 40))}</td></tr>`).join('')}</table>` : '<p class="muted">Belum ada produk.</p>'}</section>
  <section><h3>3. Pointer: isi keranjang</h3>
    ${cart.length ? `<table><tr><th>Alamat</th><th>Menunjuk ke</th><th>Jml</th></tr>${cart.map(c => `<tr><td><code>${c.ptr.alamat}</code></td><td>${esc(c.ptr.deref().nama)}</td><td>${c.qty}</td></tr>`).join('')}</table><p class="muted">Pointer menyimpan referensi, bukan salinan. Ubah harga di admin, harga di keranjang ikut berubah.</p>` : '<p class="muted">Keranjang kosong. Tambahkan produk untuk melihat pointer bekerja.</p>'}</section>`;
}

/* ---------- Log ---------- */
function log(t, c = '') {
  const b = $('#log');
  if (b.firstElementChild && b.firstElementChild.classList.contains('muted')) b.innerHTML = '';
  const d = document.createElement('div'); d.className = c; d.textContent = t;
  b.appendChild(d); b.scrollTop = b.scrollHeight;
}
const cmp3 = (x, y) => x > y ? 1 : x < y ? -1 : 0;
const nilai = (f, v) => f === 'harga' ? rp(v) : v;

/* ---------- SORTING ---------- */
function bubble(a, fn, dir, f) {
  let cmp = 0, sw = 0;
  for (let i = 0; i < a.length - 1; i++) {
    let tukar = false;
    for (let j = 0; j < a.length - i - 1; j++) {
      cmp++;
      const A = fn(a[j]), B = fn(a[j + 1]), out = dir * cmp3(A, B) > 0;
      log(`Putaran ${i + 1}: [${j}] ${a[j].nama} (${nilai(f, A)}) vs [${j + 1}] ${a[j + 1].nama} (${nilai(f, B)}) -> ${out ? 'TUKAR' : 'tetap'}`, out ? 'y' : 'n');
      if (out) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; sw++; tukar = true; }
    }
    if (!tukar) { log('Tidak ada pertukaran di putaran ini, berhenti lebih awal.'); break; }
  }
  return { cmp, sw };
}
function selection(a, fn, dir, f) {
  let cmp = 0, sw = 0;
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) { cmp++; if (dir * cmp3(fn(a[j]), fn(a[m])) < 0) m = j; }
    log(`Langkah ${i + 1}: isi posisi ${i} dengan ${a[m].nama} (${nilai(f, fn(a[m]))})` + (m !== i ? `, tukar dengan indeks ${m}` : ', sudah di tempat'), m !== i ? 'y' : 'n');
    if (m !== i) { [a[i], a[m]] = [a[m], a[i]]; sw++; }
  }
  return { cmp, sw };
}
function urut() {
  const f = $('#fSort').value, dir = +$('#dSort').value, m = $('#mSort').value;
  const a = [...produk];
  log(`=== ${m === 'bubble' ? 'Bubble' : 'Selection'} Sort: ${f}, ${dir > 0 ? 'kecil ke besar' : 'besar ke kecil'} (${a.length} data) ===`, 'h');
  log('Sebelum: ' + a.map(p => p.nama).join(' | '));
  const r = (m === 'bubble' ? bubble : selection)(a, KEYS[f], dir, f);
  produk = a; hasil = null;
  log('Sesudah: ' + a.map(p => p.nama).join(' | '), 'y');
  log(`Selesai: ${r.cmp} perbandingan, ${r.sw} pertukaran.`, 'y');
  render();
}

/* ---------- SEARCHING ---------- */
function linear(q) {
  const out = [];
  produk.forEach((p, i) => {
    const ok = p.nama.toLowerCase().includes(q);
    log(`Cek indeks ${i}: "${p.nama}" -> ${ok ? 'COCOK' : 'tidak cocok'}`, ok ? 'y' : 'n');
    if (ok) out.push(p);
  });
  return out;
}
function binary(q) {
  const a = [...produk].sort((x, y) => cmp3(x.nama.toLowerCase(), y.nama.toLowerCase()));
  log('Binary search butuh data terurut. Urutan A-Z: ' + a.map(p => p.nama).join(' | '));
  let lo = 0, hi = a.length - 1, ketemu = -1, langkah = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1, awal = a[mid].nama.toLowerCase().slice(0, q.length);
    langkah++;
    log(`Langkah ${langkah}: low=${lo}, high=${hi}, mid=${mid} -> "${a[mid].nama}" ` + (awal === q ? 'COCOK' : awal < q ? 'terlalu kecil, cari ke kanan' : 'terlalu besar, cari ke kiri'), awal === q ? 'y' : 'n');
    if (awal === q) { ketemu = mid; break; }
    if (awal < q) lo = mid + 1; else hi = mid - 1;
  }
  if (ketemu < 0) return [];
  const cocok = i => a[i].nama.toLowerCase().startsWith(q);
  let l = ketemu, r = ketemu;
  while (l > 0 && cocok(l - 1)) l--;
  while (r < a.length - 1 && cocok(r + 1)) r++;
  log(`Data cocok berurutan dari indeks ${l} sampai ${r}.`);
  return a.slice(l, r + 1);
}
function cari() {
  const q = $('#q').value.trim().toLowerCase();
  if (!q) { hasil = null; render(); return toast('Ketik kata kunci dulu'); }
  const m = $('#mSearch').value;
  log(`=== ${m === 'linear' ? 'Linear' : 'Binary'} Search: "${q}" ===`, 'h');
  hasil = m === 'linear' ? linear(q) : binary(q);
  log(`Hasil: ${hasil.length} barang ditemukan.`, 'y');
  render();
}
function reset() {
  hasil = null; kat = 'Semua'; $('#q').value = '';
  produk.sort((a, b) => a.id - b.id);
  log('Data dikembalikan ke urutan awal (berdasarkan id).', 'h');
  render();
}

/* ---------- Keranjang & checkout ---------- */
function tambah(id) {
  const p = produk.find(x => x.id === id); if (!p) return;
  const c = cart.find(x => x.ptr.deref() === p);
  if ((c ? c.qty : 0) + 1 > p.stok) return toast('Stok tinggal ' + p.stok);
  if (c) c.qty++; else cart.push({ ptr: new Pointer(p), qty: 1 });
  saveC(); render(); toast(p.nama + ' masuk keranjang');
}
const subtotal = () => cart.reduce((s, c) => s + c.ptr.deref().harga * c.qty, 0);
function showCart() {
  if (!cart.length) return buka(`<h3>Keranjang</h3><p class="muted">Keranjang masih kosong. Pilih barang dulu di koleksi.</p><div class="row"><button class="btn" data-a="tutup">Lanjut belanja</button></div>`);
  buka(`<h3>Keranjang</h3>${cart.map((c, i) => { const p = c.ptr.deref(); return `
    <div class="line"><div><strong>${esc(p.nama)}</strong><div class="meta">${rp(p.harga)} &middot; ${c.ptr.alamat}</div></div>
    <div class="qty"><button data-a="minus" data-id="${i}">-</button> ${c.qty} <button data-a="plus" data-id="${i}">+</button></div></div>`; }).join('')}
    <div class="total">Subtotal ${rp(subtotal())}</div><p class="meta" style="text-align:right">Ongkir ${rp(set.ongkir)} dihitung saat checkout</p>
    <div class="row"><button class="btn" data-a="checkout">Checkout</button><button class="btn ghost" data-a="tutup">Tutup</button></div>`);
}
function showCheckout() {
  if (!akun) { pendingCo = true; return bukaUser('Silakan masuk atau daftar dulu untuk melanjutkan checkout.'); }
  buka(`<h3>Data pengiriman</h3><form id="fCo">
    <label>Nama lengkap</label><input name="nama" required>
    <label>Nomor WhatsApp</label><input name="hp" required inputmode="tel" placeholder="08xxxxxxxxxx">
    <label>Alamat lengkap</label><textarea name="alamat" rows="3" required></textarea>
    <label>Metode pembayaran</label><select name="metode"><option>Transfer Bank</option><option>Dana</option><option>GoPay</option><option>QRIS</option><option>COD (bayar di tempat)</option></select>
    <div class="total">Total ${rp(subtotal() + Number(set.ongkir))}</div>
    <div class="row"><button class="btn" type="submit">Buat pesanan</button><button class="btn ghost" type="button" data-a="tutup">Batal</button></div></form>`);
  const fc = $('#fCo'); if (fc) fc.elements.nama.value = akun.nama;
}
function infoBayar(o) {
  const m = o.metode;
  if (m === 'Transfer Bank') return `Transfer ke <strong>${esc(set.bank)} ${esc(set.rek)}</strong> a.n. ${esc(set.an)}`;
  if (m === 'Dana') return `Kirim ke <strong>Dana ${esc(set.dana)}</strong> a.n. ${esc(set.an)}`;
  if (m === 'GoPay') return `Kirim ke <strong>GoPay ${esc(set.gopay)}</strong> a.n. ${esc(set.an)}`;
  if (m === 'QRIS') return set.qris ? `Scan QRIS berikut:<img src="${set.qris}" alt="QRIS Dayated Co.">` : 'QRIS belum diunggah penjual. Hubungi penjual lewat WhatsApp.';
  return 'Bayar tunai ke kurir saat barang sampai.';
}
function buatPesanan(f) {
  if (!akun) { pendingCo = true; return bukaUser('Masuk dulu untuk membuat pesanan.'); }
  const d = new FormData(f);
  for (const c of cart) if (c.qty > c.ptr.deref().stok) return toast('Stok ' + c.ptr.deref().nama + ' tidak cukup');
  const o = {
    id: 'DC-' + Date.now().toString(36).toUpperCase(), email: akun.email, nama: d.get('nama'), hp: d.get('hp'), alamat: d.get('alamat'), metode: d.get('metode'),
    items: cart.map(c => ({ nama: c.ptr.deref().nama, harga: c.ptr.deref().harga, qty: c.qty })),
    ongkir: Number(set.ongkir), total: subtotal() + Number(set.ongkir),
    status: d.get('metode').startsWith('COD') ? 'Dikemas' : STATUS[0], waktu: new Date().toLocaleString('id-ID')
  };
  cart.forEach(c => { c.ptr.deref().stok -= c.qty; });
  orders.unshift(o); save(KEY.o, orders); saveP();
  cart = []; saveC(); render();
  const pesan = `Halo Dayated Co., saya ${o.nama}. Pesanan ${o.id} total ${rp(o.total)} via ${o.metode}.`;
  buka(`<h3>Pesanan dibuat</h3><p>Nomor pesanan <strong>${o.id}</strong></p>
    <div class="pay"><strong>Total ${rp(o.total)}</strong> (termasuk ongkir ${rp(o.ongkir)})<br>${infoBayar(o)}</div>
    <p class="meta">Setelah membayar, kirim bukti pembayaran lewat WhatsApp supaya pesanan segera diproses.</p>
    <div class="row"><a class="btn" target="_blank" rel="noopener" href="https://wa.me/${esc(set.wa)}?text=${encodeURIComponent(pesan)}">Kirim bukti via WhatsApp</a><button class="btn ghost" data-a="tutup">Selesai</button></div>`);
}
function detail(id) {
  const p = produk.find(x => x.id === id); if (!p) return;
  buka(`<img src="${art(p)}" alt="${esc(p.nama)}" style="width:100%;border-radius:14px;margin-bottom:.8rem">
    <h3>${esc(p.nama)}</h3><div><span class="tag">${esc(p.kategori)}</span><span class="tag">${esc(p.kondisi)}</span><span class="tag">Size ${esc(p.ukuran)}</span></div>
    <p style="margin:.7rem 0">${esc(p.caption)}</p><div class="price">${rp(p.harga)}</div><p class="meta">Stok: ${p.stok}</p>
    <div class="row"><button class="btn" data-a="tambah" data-id="${p.id}" ${p.stok < 1 ? 'disabled' : ''}>Masukkan keranjang</button><button class="btn ghost" data-a="tutup">Tutup</button></div>`);
}

/* ---------- Admin ---------- */
function bukaAdmin() {
  if (isAdmin()) return showAdmin();
  buka(`<h3>Masuk mode admin</h3><p class="muted">Khusus pemilik toko.</p><form id="fLogin"><label>Password</label><input type="password" name="pw" required autocomplete="off"><div class="row"><button class="btn" type="submit">Masuk</button><button class="btn ghost" type="button" data-a="tutup">Batal</button></div></form>`);
}
function login(f) {
  if (Date.now() < kunci) return toast('Terlalu banyak percobaan. Tunggu 30 detik.');
  if (hash(new FormData(f).get('pw')) === HASH) {
    try { sessionStorage.setItem(KEY.a, '1'); } catch (e) { /* abaikan */ }
    gagal = 0; tutup(); showAdmin(); toast('Selamat datang, admin');
  } else {
    gagal++; if (gagal >= 5) { kunci = Date.now() + 30000; gagal = 0; }
    toast('Password salah'); f.reset();
  }
}
function showAdmin() { $('#shop').hidden = true; $('#adminView').hidden = false; renderAdmin(); window.scrollTo(0, 0); }
function keluarAdmin() { try { sessionStorage.removeItem(KEY.a); } catch (e) { /* abaikan */ } $('#adminView').hidden = true; $('#shop').hidden = false; render(); }
function lihatToko() { $('#adminView').hidden = true; $('#shop').hidden = false; }

function renderAdmin() {
  const e = editId ? produk.find(p => p.id === editId) : null;
  const v = k => e ? esc(e[k]) : '';
  const opt = (arr, cur) => arr.map(x => `<option ${x === cur ? 'selected' : ''}>${x}</option>`).join('');
  let h = `<div class="adm"><h2>Panel admin Dayated Co.</h2>
    <div class="tabs">${[['produk', 'Produk'], ['pesanan', `Pesanan (${orders.length})`], ['bayar', 'Pembayaran']].map(t => `<button class="chip ${tab === t[0] ? 'on' : ''}" data-a="tab" data-id="${t[0]}">${t[1]}</button>`).join('')}
    <button class="chip" data-a="lihat">Lihat toko</button><button class="chip" data-a="logout">Keluar</button></div>`;
  if (tab === 'produk') {
    h += `<form class="form" id="fProd"><h3 class="full">${e ? 'Edit barang' : 'Tambah barang baru'}</h3>
      <div><label>Nama barang</label><input name="nama" required value="${v('nama')}"></div>
      <div><label>Kategori</label><select name="kategori">${opt(KAT, e && e.kategori)}</select></div>
      <div><label>Kondisi</label><select name="kondisi">${opt(KON, e && e.kondisi)}</select></div>
      <div><label>Ukuran</label><input name="ukuran" required value="${v('ukuran')}" placeholder="M / L / 42"></div>
      <div><label>Harga (Rupiah)</label><input name="harga" type="number" min="1000" step="500" required value="${v('harga')}"></div>
      <div><label>Stok</label><input name="stok" type="number" min="0" required value="${e ? e.stok : 1}"></div>
      <div class="full"><label>Deskripsi / kriteria barang (kondisi, cacat, ukuran asli)</label><textarea name="caption" rows="3" required>${v('caption')}</textarea></div>
      <div class="full"><label>Foto ${e ? '(kosongkan jika tidak diganti)' : '(opsional)'}</label><input name="foto" type="file" accept="image/*"></div>
      <div class="full row"><button class="btn sm" type="submit">${e ? 'Simpan perubahan' : 'Posting barang'}</button>${e ? '<button class="btn sm ghost" type="button" data-a="batal">Batal edit</button>' : ''}</div></form>
      <div class="tbl"><table><tr><th></th><th>Nama</th><th>Kategori</th><th>Harga</th><th>Stok</th><th></th></tr>
      ${produk.map(p => `<tr><td><img src="${art(p)}" alt=""></td><td>${esc(p.nama)}</td><td>${esc(p.kategori)}</td><td>${rp(p.harga)}</td><td>${p.stok}</td>
      <td><button class="btn sm" data-a="edit" data-id="${p.id}">Edit</button> <button class="btn sm danger" data-a="hapus" data-id="${p.id}">Hapus</button></td></tr>`).join('')}</table></div>`;
  } else if (tab === 'pesanan') {
    h += `<div class="tbl">${orders.length ? `<table><tr><th>Pesanan</th><th>Pembeli</th><th>Barang</th><th>Total</th><th>Status</th><th></th></tr>
      ${orders.map(o => `<tr><td>${o.id}<div class="meta">${esc(o.waktu)}</div></td><td>${esc(o.nama)}<div class="meta">${esc(o.hp)}<br>${esc(o.alamat)}</div></td>
      <td>${o.items.map(i => `${esc(i.nama)} x${i.qty}`).join('<br>')}</td><td>${rp(o.total)}<div class="meta">${esc(o.metode)}</div></td>
      <td><select data-oid="${o.id}">${opt(STATUS, o.status)}</select></td><td><button class="btn sm danger" data-a="hapuso" data-id="${o.id}">Hapus</button></td></tr>`).join('')}</table>` : '<p class="muted" style="padding:1rem">Belum ada pesanan masuk.</p>'}</div>`;
  } else {
    h += `<form class="form" id="fSet"><h3 class="full">Rekening &amp; pembayaran</h3>
      <div><label>Nama bank</label><input name="bank" value="${esc(set.bank)}"></div>
      <div><label>No. rekening</label><input name="rek" value="${esc(set.rek)}"></div>
      <div><label>Atas nama</label><input name="an" value="${esc(set.an)}"></div>
      <div><label>No. Dana</label><input name="dana" value="${esc(set.dana)}"></div>
      <div><label>No. GoPay</label><input name="gopay" value="${esc(set.gopay)}"></div>
      <div><label>WhatsApp penjual (format 62...)</label><input name="wa" value="${esc(set.wa)}"></div>
      <div><label>Ongkir flat (Rupiah)</label><input name="ongkir" type="number" min="0" value="${Number(set.ongkir)}"></div>
      <div class="full"><label>Gambar QRIS ${set.qris ? '(sudah ada, unggah lagi untuk mengganti)' : ''}</label><input name="qris" type="file" accept="image/*">${set.qris ? `<img src="${set.qris}" alt="QRIS" style="max-width:160px;margin-top:.5rem">` : ''}</div>
      <div class="full row"><button class="btn sm" type="submit">Simpan pengaturan</button></div></form>`;
  }
  $('#adminView').innerHTML = h + '</div>';
}
async function simpanProduk(f) {
  const d = new FormData(f), e = editId ? produk.find(p => p.id === editId) : null;
  const harga = parseInt(d.get('harga'), 10), stok = parseInt(d.get('stok'), 10);
  if (!(harga > 0) || !(stok >= 0)) return toast('Harga dan stok harus angka yang valid');
  let foto = e ? e.foto : '';
  const file = f.elements.foto.files[0];
  if (file) { try { foto = await kecilkan(file); } catch (x) { return toast('Foto tidak bisa dibaca'); } }
  const data = { nama: d.get('nama').trim(), kategori: d.get('kategori'), kondisi: d.get('kondisi'), ukuran: d.get('ukuran').trim(), harga, stok, caption: d.get('caption').trim(), foto };
  if (e) Object.assign(e, data);
  else produk.push(Object.assign(new Produk(), { id: Date.now() }, data));
  saveP(); toast(e ? 'Perubahan disimpan' : 'Barang diposting'); editId = null; renderAdmin();
}
async function simpanSet(f) {
  const d = new FormData(f), file = f.elements.qris.files[0];
  ['bank', 'rek', 'an', 'dana', 'gopay', 'wa'].forEach(k => set[k] = d.get(k).trim());
  set.ongkir = Math.max(0, parseInt(d.get('ongkir'), 10) || 0);
  if (file) { try { set.qris = await kecilkan(file); } catch (x) { return toast('Gambar QRIS tidak bisa dibaca'); } }
  if (save(KEY.s, set)) toast('Pengaturan pembayaran disimpan');
  renderAdmin();
}

/* ---------- Event ---------- */
document.addEventListener('click', e => {
  const n = e.target.closest('.nav a'); if (n && !$('#adminView').hidden) lihatToko();
  if (e.target.id === 'modal') return tutup();
  const b = e.target.closest('[data-a]'); if (!b) return;
  const a = b.dataset.a, id = b.dataset.id, num = Number(id);
  switch (a) {
    case 'theme': toggleTheme(); break;
    case 'akun': akun ? showAkun() : bukaUser(); break;
    case 'udaftar': showDaftar(); break;
    case 'umasuk': bukaUser(); break;
    case 'ugoogle': showGoogleDemo(); break;
    case 'ukirim': uKirim(id); break;
    case 'ukeluar': uKeluar(); break;
    case 'cari': cari(); break;
    case 'urut': urut(); break;
    case 'reset': reset(); break;
    case 'clearlog': $('#log').innerHTML = '<div class="muted">Log dibersihkan.</div>'; break;
    case 'kat': kat = id; render(); break;
    case 'detail': detail(num); break;
    case 'tambah': tambah(num); break;
    case 'cart': showCart(); break;
    case 'plus': { const c = cart[num]; if (c.qty < c.ptr.deref().stok) c.qty++; else toast('Stok tidak cukup'); saveC(); render(); showCart(); break; }
    case 'minus': { const c = cart[num]; c.qty--; if (c.qty < 1) cart.splice(num, 1); saveC(); render(); showCart(); break; }
    case 'checkout': showCheckout(); break;
    case 'tutup': tutup(); break;
    case 'admin': bukaAdmin(); break;
    case 'tab': tab = id; editId = null; renderAdmin(); break;
    case 'lihat': lihatToko(); break;
    case 'logout': keluarAdmin(); break;
    case 'edit': editId = num; renderAdmin(); window.scrollTo(0, 0); break;
    case 'batal': editId = null; renderAdmin(); break;
    case 'hapus':
      if (confirm('Hapus barang ini?')) {
        produk = produk.filter(p => p.id !== num);
        cart = cart.filter(c => c.ptr.deref().id !== num); // buang pointer yang menunjuk ke barang terhapus
        saveP(); saveC(); renderAdmin(); render();
      } break;
    case 'hapuso': if (confirm('Hapus pesanan ini?')) { orders = orders.filter(o => o.id !== id); save(KEY.o, orders); renderAdmin(); } break;
  }
});
document.addEventListener('submit', e => {
  e.preventDefault();
  const id = e.target.id;
  if (id === 'fLogin') login(e.target);
  else if (id === 'fCo') buatPesanan(e.target);
  else if (id === 'fProd') simpanProduk(e.target);
  else if (id === 'fSet') simpanSet(e.target);
  else if (id === 'fUMasuk') uMasuk(e.target);
  else if (id === 'fUDaftar') uDaftar(e.target);
  else if (id === 'fUVerif') uVerif(e.target);
  else if (id === 'fUGoogle') uLoginGoogle(new FormData(e.target).get('email'), new FormData(e.target).get('nama').trim());
});
document.addEventListener('change', e => {
  const oid = e.target.dataset && e.target.dataset.oid; if (!oid) return;
  const o = orders.find(x => x.id === oid); if (o) { o.status = e.target.value; save(KEY.o, orders); toast('Status diperbarui'); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') tutup();
  if (e.key === 'Enter' && e.target.id === 'q') cari();
});

/* ---------- Akun pembeli (daftar, verifikasi email, login Google) ----------
   CATATAN: situs ini statis (tanpa server), jadi akun disimpan di localStorage browser.
   Agar verifikasi email & Google asli berfungsi, isi konfigurasi di bawah.
   Kalau dikosongkan, aplikasi berjalan dalam MODE DEMO (kode tampil di layar,
   login Google disimulasikan). Untuk produksi, pindahkan ke backend. */
const GOOGLE_CLIENT_ID = '';                       // Client ID OAuth Google (Web application)
const EMAILJS = { service: '', template: '', key: '' }; // EmailJS: service_id, template_id, public key
const KEY_U = 'dc_users', KEY_US = 'dc_usess';
let akun = null, users = [], pendingCo = false, demoKode = '', gagalU = 0, kunciU = 0, gsiP = null;

const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
async function sha(t) {
  try { if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''); } } catch (e) { /* pakai cadangan */ }
  return hash(t);
}
const rnd = () => Array.from(crypto.getRandomValues(new Uint32Array(4))).map(x => x.toString(16).padStart(8, '0')).join('');
const kode6 = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
const saveU = () => save(KEY_U, users);

function uInit() {
  users = load(KEY_U, []);
  let e = null; try { e = localStorage.getItem(KEY_US); } catch (x) { /* abaikan */ }
  akun = users.find(u => u.email === e && u.verified) || null;
  uBtn();
}
function uBtn() { const b = $('#userBtn'); if (b) b.textContent = akun ? 'Halo, ' + akun.nama.split(' ')[0] : 'Masuk / Daftar'; }
function masukSukses(u) {
  akun = u; try { localStorage.setItem(KEY_US, u.email); } catch (e) { /* abaikan */ }
  const lanjut = pendingCo; pendingCo = false;
  tutup(); uBtn(); toast('Selamat datang, ' + u.nama);
  if (lanjut) showCheckout();
}

async function kirimKode(u) {
  if (Date.now() - (u.kirimAt || 0) < 30000) { toast('Tunggu sebentar sebelum kirim ulang kode'); return false; }
  const k = kode6();
  u.kode = await sha(u.salt + k); u.exp = Date.now() + 600000; u.coba = 0; u.kirimAt = Date.now(); saveU();
  if (EMAILJS.service && EMAILJS.template && EMAILJS.key) {
    try {
      const r = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_id: EMAILJS.service, template_id: EMAILJS.template, user_id: EMAILJS.key, template_params: { to_email: u.email, to_name: u.nama, kode: k } })
      });
      if (!r.ok) throw new Error(r.status);
      demoKode = ''; return true;
    } catch (e) { toast('Email gagal terkirim. Coba kirim ulang.'); return false; }
  }
  demoKode = k; return true; // mode demo: kode ditampilkan di layar
}

const googleBtn = () => GOOGLE_CLIENT_ID ? '<div id="gBtn" class="gwrap"></div>'
  : '<button class="gbtn" type="button" data-a="ugoogle"><b class="gmark">G</b> Lanjutkan dengan Google (demo)</button>';
function gsiRender() {
  if (!GOOGLE_CLIENT_ID) return;
  gsiP = gsiP || new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  gsiP.then(() => {
    const el = $('#gBtn'); if (!el) return;
    google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: uGoogleCred });
    google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', text: 'continue_with', width: 280 });
  }).catch(() => { gsiP = null; toast('Gagal memuat Google Sign-In'); });
}
function jwt(t) {
  let b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'); while (b.length % 4) b += '=';
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(b), c => c.charCodeAt(0))));
}
function uGoogleCred(r) {
  try {
    const p = jwt(r.credential);
    if (!p.email || p.email_verified === false) return toast('Email Google belum terverifikasi');
    uLoginGoogle(p.email, p.name || p.email.split('@')[0]);
  } catch (e) { toast('Login Google gagal'); }
}
function uLoginGoogle(email, nama) {
  email = email.trim().toLowerCase();
  let u = users.find(x => x.email === email);
  if (!u) { u = { email, nama, via: 'google', pw: '', salt: '', verified: true, kode: '', exp: 0, coba: 0 }; users.push(u); }
  else {
    if (!u.verified) { u.pw = ''; u.salt = ''; u.via = 'google'; } // email dibuktikan Google, buang password yang belum terverifikasi
    u.verified = true; u.kode = ''; if (!u.nama) u.nama = nama;
  }
  saveU(); masukSukses(u);
}
function showGoogleDemo() {
  buka(`<h3>Lanjutkan dengan Google</h3><div class="note">Mode demo: belum terhubung ke Google sungguhan. Isi <code>GOOGLE_CLIENT_ID</code> di script.js untuk login Google asli.</div>
    <form id="fUGoogle"><label>Alamat Gmail</label><input type="email" name="email" required placeholder="nama@gmail.com" autocomplete="email">
    <label>Nama</label><input name="nama" required maxlength="60" autocomplete="name">
    <div class="row"><button class="btn" type="submit">Lanjutkan</button><button class="btn ghost" type="button" data-a="umasuk">Kembali</button></div></form>`);
}

function bukaUser(pesan = '') {
  buka(`<h3>Masuk ke akun</h3>${pesan ? `<div class="note">${esc(pesan)}</div>` : ''}
    <form id="fUMasuk"><label>Email</label><input type="email" name="email" required autocomplete="email">
    <label>Password</label><input type="password" name="pw" required autocomplete="current-password">
    <div class="row"><button class="btn" type="submit">Masuk</button><button class="btn ghost" type="button" data-a="tutup">Batal</button></div></form>
    <div class="sep"><span>atau</span></div>${googleBtn()}
    <p class="meta" style="margin-top:1rem">Belum punya akun? <button class="link ulink" type="button" data-a="udaftar">Daftar sekarang</button></p>`);
  gsiRender();
}
function showDaftar() {
  buka(`<h3>Buat akun baru</h3><form id="fUDaftar">
    <label>Nama lengkap</label><input name="nama" required maxlength="60" autocomplete="name">
    <label>Email</label><input type="email" name="email" required autocomplete="email">
    <label>Password (minimal 8 karakter)</label><input type="password" name="pw" minlength="8" required autocomplete="new-password">
    <label>Ulangi password</label><input type="password" name="pw2" minlength="8" required autocomplete="new-password">
    <div class="row"><button class="btn" type="submit">Daftar &amp; kirim kode</button><button class="btn ghost" type="button" data-a="umasuk">Sudah punya akun</button></div></form>
    <div class="sep"><span>atau</span></div>${googleBtn()}`);
  gsiRender();
}
function showVerif(email) {
  buka(`<h3>Verifikasi email</h3><p>Kode 6 digit dikirim ke <strong>${esc(email)}</strong>. Masukkan kode untuk mengaktifkan akun (berlaku 10 menit).</p>
    ${demoKode ? `<div class="note">Mode demo: pengiriman email belum dihubungkan, jadi kode Anda: <strong>${demoKode}</strong></div>` : ''}
    <form id="fUVerif"><input type="hidden" name="email" value="${esc(email)}"><label>Kode verifikasi</label>
    <input name="kode" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" required autocomplete="one-time-code">
    <div class="row"><button class="btn" type="submit">Verifikasi</button><button class="btn ghost" type="button" data-a="ukirim" data-id="${esc(email)}">Kirim ulang kode</button></div></form>`);
}
function showAkun() {
  buka(`<h3>Akun saya</h3><p><strong>${esc(akun.nama)}</strong></p><p class="meta">${esc(akun.email)} &middot; masuk via ${akun.via === 'google' ? 'Google' : 'Email'}</p>
    <div class="row"><button class="btn" data-a="ukeluar">Keluar</button><button class="btn ghost" data-a="tutup">Tutup</button></div>`);
}
function uKeluar() {
  akun = null; try { localStorage.removeItem(KEY_US); } catch (e) { /* abaikan */ }
  tutup(); uBtn(); toast('Anda sudah keluar');
}

async function uDaftar(f) {
  const d = new FormData(f), nama = d.get('nama').trim(), email = d.get('email').trim().toLowerCase(), pw = d.get('pw');
  if (!nama) return toast('Nama wajib diisi');
  if (!emailOk(email)) return toast('Format email tidak valid');
  if (pw.length < 8) return toast('Password minimal 8 karakter');
  if (pw !== d.get('pw2')) return toast('Konfirmasi password tidak sama');
  let u = users.find(x => x.email === email);
  if (u && u.verified) return toast('Email sudah terdaftar. Silakan masuk.');
  const salt = rnd();
  const rec = { email, nama, via: 'email', salt, pw: await sha(salt + pw), verified: false, kode: '', exp: 0, coba: 0, kirimAt: 0 };
  if (u) Object.assign(u, rec); else { u = rec; users.push(u); }
  if (await kirimKode(u)) showVerif(email);
}
async function uVerif(f) {
  const d = new FormData(f), email = d.get('email'), k = String(d.get('kode')).trim();
  const u = users.find(x => x.email === email);
  if (!u) return toast('Akun tidak ditemukan');
  if (u.verified) return toast('Akun sudah aktif, silakan masuk');
  if (Date.now() > u.exp) return toast('Kode kedaluwarsa. Kirim ulang kode.');
  if (u.coba >= 5) return toast('Terlalu banyak percobaan. Kirim ulang kode.');
  u.coba++;
  if (await sha(u.salt + k) !== u.kode) { saveU(); return toast('Kode salah'); }
  u.verified = true; u.kode = ''; u.exp = 0; u.coba = 0; saveU();
  masukSukses(u);
}
async function uKirim(email) {
  const u = users.find(x => x.email === email); if (!u || u.verified) return;
  if (await kirimKode(u)) { toast('Kode baru dikirim'); showVerif(email); }
}
async function uMasuk(f) {
  if (Date.now() < kunciU) return toast('Terlalu banyak percobaan. Tunggu 30 detik.');
  const d = new FormData(f), email = d.get('email').trim().toLowerCase(), pw = d.get('pw');
  const u = users.find(x => x.email === email);
  if (u && !u.pw) return toast('Akun ini dibuat lewat Google. Gunakan tombol Google.');
  if (!(u && await sha(u.salt + pw) === u.pw)) {
    gagalU++; if (gagalU >= 5) { kunciU = Date.now() + 30000; gagalU = 0; }
    return toast('Email atau password salah');
  }
  gagalU = 0;
  if (!u.verified) { if (await kirimKode(u)) { toast('Email belum diverifikasi. Kode baru dikirim.'); showVerif(email); } else showVerif(email); return; }
  masukSukses(u);
}

/* ---------- Tema terang / gelap ---------- */
function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  const b = $('#themeBtn'); if (b) b.textContent = t === 'dark' ? 'Mode Terang' : 'Mode Gelap';
}
function toggleTheme() {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(t);
  try { localStorage.setItem('dc_theme', t); } catch (e) { /* abaikan */ }
}

applyTheme(document.documentElement.dataset.theme || 'light');
uInit();
init();