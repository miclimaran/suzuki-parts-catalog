// ===========================
//  SUZUKI PARTS CATALOG - JS
//  with Supabase + Auth + Roles + Import
// ===========================

// ---- SUPABASE CONFIG ----
// Ganti dua nilai di bawah ini dengan URL dan Key dari Supabase Anda
// Supabase Dashboard → Settings → API
const SUPABASE_URL  = 'https://wyhyzeucqyuhhbifzfsm.supabase.co';
const SUPABASE_KEY  = 'sb_publishable__f5uD_8GULoAeleN9Dh79w_UFWlExkg';

const _sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ---- STATE ----
let parts       = [];
let searchQuery = '';
let sortKey     = '';
let sortDir     = 'asc';
let editingId   = null;
let deletingId  = null;
let currentUser = null;
let currentRole = 'viewer'; // 'admin' | 'viewer'

// Import state
let importTab       = 'excel';
let importRawData   = []; // array of arrays (raw rows from file/sheets)

// ============================================================
//  AUTH
// ============================================================

async function initAuth() {
  // Check existing session
  const { data: { session } } = await _sb.auth.getSession();
  if (session) {
    await onLogin(session.user);
  } else {
    showLoginScreen();
  }

  // Listen for auth changes
  _sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      await onLogin(session.user);
    } else if (event === 'SIGNED_OUT') {
      showLoginScreen();
    }
  });
}

async function doLogin() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');
  const errEl    = document.getElementById('loginError');

  errEl.style.display = 'none';

  if (!email || !password) {
    showLoginError('Email dan password wajib diisi.');
    return;
  }

  btn.textContent = 'Memuat...';
  btn.disabled    = true;

  const { data, error } = await _sb.auth.signInWithPassword({ email, password });

  btn.textContent = 'Masuk';
  btn.disabled    = false;

  if (error) {
    showLoginError('Email atau password salah. Coba lagi.');
    return;
  }

  await onLogin(data.user);
}

async function onLogin(user) {
  currentUser = user;

  // Ambil role dari tabel profiles
  const { data: profile } = await _sb.from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  currentRole = profile?.role || 'viewer';

  showApp();
  updateUIForRole();
  await fetchParts();
}

async function doLogout() {
  closeUserDropdown();
  await _sb.auth.signOut();
  currentUser = null;
  currentRole = 'viewer';
  parts = [];
}

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function togglePw() {
  const inp = document.getElementById('loginPassword');
  const btn = document.getElementById('pwToggleBtn');
  if (inp.type === 'password') {
    inp.type    = 'text';
    btn.textContent = '🙈';
  } else {
    inp.type    = 'password';
    btn.textContent = '👁';
  }
}

function showLoginScreen() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appShell').style.display    = 'none';
  document.getElementById('loginEmail').value    = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').style.display = 'none';
}

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appShell').style.display    = 'block';
}

// ---- Role-based UI ----
function updateUIForRole() {
  const isAdmin = currentRole === 'admin';

  // Show/hide admin-only elements
  document.querySelectorAll('.admin-only').forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  // User info
  const email  = currentUser?.email || '';
  const avatar = email.charAt(0).toUpperCase();
  document.getElementById('userAvatar').textContent       = avatar;
  document.getElementById('userEmailDisplay').textContent = email;

  const roleBadge = document.getElementById('userRoleBadge');
  roleBadge.textContent = isAdmin ? '⚡ Admin' : '👁 Viewer';
  roleBadge.className   = 'user-role-badge role-' + currentRole;
}

// User dropdown toggle
document.addEventListener('click', (e) => {
  const avatar   = document.getElementById('userAvatar');
  const dropdown = document.getElementById('userDropdown');
  if (!dropdown) return;
  if (avatar && avatar.contains(e.target)) {
    dropdown.classList.toggle('open');
  } else if (!dropdown.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

function closeUserDropdown() {
  document.getElementById('userDropdown')?.classList.remove('open');
}

// ============================================================
//  DATA — SUPABASE CRUD
// ============================================================

async function fetchParts() {
  showLoading(true);
  const { data, error } = await _sb
    .from('parts')
    .select('*')
    .order('created_at', { ascending: false });

  showLoading(false);

  if (error) {
    showToast('⚠ Gagal memuat data: ' + error.message);
    return;
  }

  parts = data || [];
  buildCategoryList();
  render();
}

async function insertPart(partData) {
  const { data, error } = await _sb.from('parts').insert([partData]).select().single();
  if (error) throw error;
  return data;
}

async function updatePart(id, partData) {
  const { data, error } = await _sb.from('parts').update(partData).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

async function deletePart(id) {
  const { error } = await _sb.from('parts').delete().eq('id', id);
  if (error) throw error;
}

// ============================================================
//  SEARCH & SORT
// ============================================================

function handleSearch() {
  searchQuery = document.getElementById('searchInput').value.trim();
  document.getElementById('clearBtn').style.display = searchQuery ? 'flex' : 'none';
  render();
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  searchQuery = '';
  document.getElementById('clearBtn').style.display = 'none';
  render();
}

function sortTable(key) {
  if (sortKey === key) {
    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey = key;
    sortDir = 'asc';
  }
  document.querySelectorAll('.sort-icon').forEach(el => el.textContent = '↕');
  const icon = document.getElementById('sort-' + key);
  if (icon) icon.textContent = sortDir === 'asc' ? '↑' : '↓';
  render();
}

function getFiltered() {
  let result = [...parts];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      (p.part_number  || '').toLowerCase().includes(q) ||
      (p.description  || '').toLowerCase().includes(q) ||
      (p.notes        || '').toLowerCase().includes(q)
    );
  }

  if (sortKey) {
    result.sort((a, b) => {
      const va = (a[sortKey] || '').toLowerCase();
      const vb = (b[sortKey] || '').toLowerCase();
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return result;
}

// ============================================================
//  RENDER
// ============================================================

function highlight(text, query) {
  if (!query) return escHtml(text);
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return escHtml(text).replace(re, '<mark>$1</mark>');
}

function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showLoading(show) {
  const ls = document.getElementById('loadingState');
  const ts = document.getElementById('table-section');
  if (ls) ls.style.display = show ? 'block' : 'none';
}

function render() {
  const filtered = getFiltered();
  const tbody    = document.getElementById('tableBody');
  const empty    = document.getElementById('emptyState');
  const loading  = document.getElementById('loadingState');
  const count    = document.getElementById('countDisplay');

  if (loading) loading.style.display = 'none';
  count.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('partsTable').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('partsTable').style.display = 'table';

  const isAdmin = currentRole === 'admin';

  tbody.innerHTML = filtered.map((p, i) => `
    <tr>
      <td class="row-num">${i + 1}</td>
      <td>
        <span class="part-number">${highlight(p.part_number, searchQuery)}</span>
      </td>
      <td>
        <div class="description-text">${highlight(p.description, searchQuery)}</div>
      </td>
      <td>
        <div class="notes-text">${highlight(p.notes || '', searchQuery)}</div>
      </td>
      ${isAdmin ? `
      <td>
        <div class="action-btns">
          <button class="btn-icon edit"   title="Edit"  onclick="openModal('edit','${p.id}')">✏️</button>
          <button class="btn-icon delete" title="Hapus" onclick="openDelete('${p.id}')">🗑️</button>
        </div>
      </td>` : ''}
    </tr>
  `).join('');
}

// ---- Category datalist (removed) ----
function buildCategoryList() {
  // kategori dihapus
}

// ============================================================
//  MODAL ADD / EDIT
// ============================================================

function openModal(mode, id = null) {
  if (currentRole !== 'admin') return;
  editingId = null;
  document.getElementById('modalError').style.display = 'none';
  const mw = document.getElementById('modalWarning');
  if (mw) mw.style.display = 'none';
  document.getElementById('saveBtn').dataset.confirmed = '';

  if (mode === 'edit' && id) {
    const part = parts.find(p => p.id === id);
    if (!part) return;
    editingId = id;
    document.getElementById('modalTitle').textContent        = 'Edit Part';
    document.getElementById('inputPartNumber').value         = part.part_number;
    document.getElementById('inputDescription').value        = part.description;
    document.getElementById('inputNotes').value              = part.notes    || '';
  } else {
    document.getElementById('modalTitle').textContent        = 'Tambah Part Baru';
    document.getElementById('inputPartNumber').value         = '';
    document.getElementById('inputDescription').value        = '';
    document.getElementById('inputNotes').value              = '';
  }

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('inputPartNumber').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
  document.getElementById('saveBtn').dataset.confirmed = '';
  const mw = document.getElementById('modalWarning');
  if (mw) mw.style.display = 'none';
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

async function savePart() {
  const partNumber  = document.getElementById('inputPartNumber').value.trim().toUpperCase();
  const description = document.getElementById('inputDescription').value.trim();
  const notes       = document.getElementById('inputNotes').value.trim();
  const errorEl     = document.getElementById('modalError');
  const saveBtn     = document.getElementById('saveBtn');

  errorEl.style.display = 'none';

  if (!partNumber) {
    errorEl.textContent = '⚠ Part Number wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }
  if (!description) {
    errorEl.textContent = '⚠ Deskripsi / Nama Barang wajib diisi.';
    errorEl.style.display = 'block';
    return;
  }

  // --- Cek duplikat deskripsi sama persis (part number + deskripsi identik) ---
  const exactMatch = parts.find(p =>
    p.part_number.toUpperCase() === partNumber &&
    p.description.trim().toLowerCase() === description.toLowerCase() &&
    p.id !== editingId
  );
  if (exactMatch) {
    errorEl.innerHTML = `⛔ Data ini sudah ada persis di database dan tidak bisa disimpan.<br>
      <small style="color:var(--gray-500)">Part: ${escHtml(exactMatch.part_number)} — ${escHtml(exactMatch.description)}</small>`;
    errorEl.style.display = 'block';
    return;
  }

  // --- Cek part number sama, deskripsi beda → warning tapi boleh lanjut ---
  const sameNumberParts = parts.filter(p =>
    p.part_number.toUpperCase() === partNumber && p.id !== editingId
  );
  const warnEl = document.getElementById('modalWarning');
  if (sameNumberParts.length > 0 && !saveBtn.dataset.confirmed) {
    // Tampilkan warning, minta konfirmasi klik sekali lagi
    const list = sameNumberParts.map(p => `• ${escHtml(p.description)}`).join('<br>');
    if (warnEl) {
      warnEl.innerHTML = `⚠ Part Number <strong>${partNumber}</strong> sudah dipakai oleh ${sameNumberParts.length} data lain:<br>
        <div style="margin:6px 0 4px 8px;font-weight:normal">${list}</div>
        Pastikan deskripsi berbeda. Klik <strong>Simpan</strong> lagi untuk tetap menyimpan.`;
      warnEl.style.display = 'block';
    }
    saveBtn.dataset.confirmed = '1';
    saveBtn.textContent = 'Simpan';
    saveBtn.disabled    = false;
    return;
  }
  // Reset konfirmasi & warning
  saveBtn.dataset.confirmed = '';
  if (warnEl) warnEl.style.display = 'none';

  saveBtn.textContent = 'Menyimpan...';
  saveBtn.disabled    = true;

  try {
    if (editingId) {
      const updated = await updatePart(editingId, { part_number: partNumber, description, notes });
      const idx = parts.findIndex(p => p.id === editingId);
      if (idx !== -1) parts[idx] = updated;
      showToast('✅ Part berhasil diupdate!');
    } else {
      const added = await insertPart({ part_number: partNumber, description, notes });
      parts.unshift(added);
      showToast('✅ Part berhasil ditambahkan!');
    }
    buildCategoryList();
    render();
    closeModal();
  } catch (err) {
    if (err.code === '23505') {
      errorEl.textContent = `⚠ Part Number "${partNumber}" sudah ada di database.`;
    } else {
      errorEl.textContent = '⚠ Gagal menyimpan: ' + err.message;
    }
    errorEl.style.display = 'block';
  } finally {
    saveBtn.textContent = 'Simpan';
    saveBtn.disabled    = false;
  }
}

// ============================================================
//  MODAL DELETE
// ============================================================

function openDelete(id) {
  if (currentRole !== 'admin') return;
  const part = parts.find(p => p.id === id);
  if (!part) return;
  deletingId = id;
  document.getElementById('deleteInfo').textContent = `${part.part_number} — ${part.description}`;
  document.getElementById('deleteOverlay').classList.add('open');
}

function closeDelete() {
  document.getElementById('deleteOverlay').classList.remove('open');
  deletingId = null;
}

function closeDeleteOverlay(e) {
  if (e.target === document.getElementById('deleteOverlay')) closeDelete();
}

async function confirmDelete() {
  if (!deletingId) return;
  const btn = document.getElementById('confirmDeleteBtn');
  btn.textContent = 'Menghapus...';
  btn.disabled    = true;
  try {
    await deletePart(deletingId);
    parts = parts.filter(p => p.id !== deletingId);
    buildCategoryList();
    render();
    closeDelete();
    showToast('🗑️ Part berhasil dihapus.');
  } catch (err) {
    showToast('⚠ Gagal menghapus: ' + err.message);
  } finally {
    btn.textContent = 'Hapus';
    btn.disabled    = false;
  }
}

// ============================================================
//  EXPORT EXCEL
// ============================================================

function exportExcel() {
  const filtered = getFiltered();
  if (filtered.length === 0) {
    showToast('⚠ Tidak ada data untuk diexport.');
    return;
  }

  const BOM    = '﻿';
  const header = ['No', 'Part Number', 'Deskripsi / Nama Barang', 'Catatan'];
  const rows   = filtered.map((p, i) => [
    i + 1,
    p.part_number,
    p.description,
    p.notes    || ''
  ]);

  const csv = BOM + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const now  = new Date();
  const ds   = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  a.href     = url;
  a.download = `suzuki-parts-${ds}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`⬇ Export ${filtered.length} part berhasil!`);
}

// ============================================================
//  IMPORT — EXCEL / GOOGLE SHEETS
// ============================================================

function openImportModal() {
  if (currentRole !== 'admin') return;
  importRawData = [];
  document.getElementById('importError').style.display   = 'none';
  document.getElementById('importPreview').style.display = 'none';
  document.getElementById('importSaveBtn').style.display = 'none';
  document.getElementById('importLoadBtn').style.display = 'inline-flex';
  document.getElementById('fileSelected').style.display  = 'none';
  document.getElementById('fileInput').value             = '';
  document.getElementById('sheetsUrl').value             = '';
  const warnEl = document.getElementById('importWarning');
  if (warnEl) warnEl.style.display = 'none';
  switchImportTab('excel');
  document.getElementById('importOverlay').classList.add('open');
}

function closeImport() {
  document.getElementById('importOverlay').classList.remove('open');
}

function closeImportOverlay(e) {
  if (e.target === document.getElementById('importOverlay')) closeImport();
}

function switchImportTab(tab) {
  importTab = tab;
  document.getElementById('tabExcel').classList.toggle('active', tab === 'excel');
  document.getElementById('tabSheets').classList.toggle('active', tab === 'sheets');
  document.getElementById('importPanelExcel').style.display  = tab === 'excel'  ? 'block' : 'none';
  document.getElementById('importPanelSheets').style.display = tab === 'sheets' ? 'block' : 'none';
  importRawData = [];
  document.getElementById('importPreview').style.display  = 'none';
  document.getElementById('importSaveBtn').style.display  = 'none';
  document.getElementById('importError').style.display    = 'none';
  const warnEl = document.getElementById('importWarning');
  if (warnEl) warnEl.style.display = 'none';
}

// Drag & Drop
function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('fileDrop').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  const allowed = ['.xlsx', '.xls', '.csv'];
  const ext     = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowed.includes(ext)) {
    showImportError('Format file tidak didukung. Gunakan .xlsx, .xls, atau .csv');
    return;
  }
  const el = document.getElementById('fileSelected');
  el.textContent = `📄 ${file.name} (${(file.size/1024).toFixed(1)} KB)`;
  el.style.display = 'block';

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data   = new Uint8Array(e.target.result);
      const wb     = XLSX.read(data, { type: 'array' });
      const sheet  = wb.Sheets[wb.SheetNames[0]];
      importRawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      refreshPreview();
    } catch (err) {
      showImportError('Gagal membaca file: ' + err.message);
    }
  };
  reader.readAsArrayBuffer(file);
}

async function loadImportData() {
  if (importTab === 'excel') {
    if (importRawData.length === 0) {
      showImportError('Pilih file terlebih dahulu.');
      return;
    }
    refreshPreview();
    return;
  }

  // Google Sheets
  const rawUrl = document.getElementById('sheetsUrl').value.trim();
  if (!rawUrl) {
    showImportError('Masukkan link Google Sheets terlebih dahulu.');
    return;
  }

  const csvUrl = convertSheetsToCsvUrl(rawUrl);
  if (!csvUrl) {
    showImportError('Link Google Sheets tidak valid. Pastikan formatnya benar.');
    return;
  }

  const btn = document.getElementById('importLoadBtn');
  btn.textContent = 'Memuat...';
  btn.disabled    = true;

  try {
    // Use CORS proxy via Google's own export
    const res  = await fetch(csvUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    importRawData = parseCsv(text);
    refreshPreview();
  } catch (err) {
    showImportError('Gagal memuat Google Sheets. Pastikan sheet sudah di-publish atau "Anyone with link can view".\n\nError: ' + err.message);
  } finally {
    btn.textContent = 'Muat Data';
    btn.disabled    = false;
  }
}

function convertSheetsToCsvUrl(url) {
  // Support both edit and publish URLs
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const id   = match[1];
  const gidM = url.match(/[#&?]gid=(\d+)/);
  const gid  = gidM ? gidM[1] : '0';
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}`;
}

function parseCsv(text) {
  const lines  = text.split(/\r?\n/);
  return lines.map(line => {
    const cells = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (c === ',' && !inQ) {
        cells.push(cur); cur = '';
      } else {
        cur += c;
      }
    }
    cells.push(cur);
    return cells;
  }).filter(row => row.some(c => c.trim() !== ''));
}

function getImportRows() {
  const skip = document.getElementById('skipFirstRow')?.checked;
  const rows = skip ? importRawData.slice(1) : importRawData;
  return rows.filter(row => row.length >= 2 && String(row[0] || '').trim() !== '');
}

function refreshPreview() {
  document.getElementById('importError').style.display = 'none';
  const rows = getImportRows();
  if (rows.length === 0) {
    showImportError('Tidak ada data yang bisa diimport.');
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('importSaveBtn').style.display = 'none';
    return;
  }

  // Cek duplikat: vs database & vs sesama baris di file
  // Aturan:
  //   'exact'  → part_number + deskripsi sama persis (DB)       → DIBLOKIR (dilewati saat import)
  //   'samepn' → part_number sama, deskripsi beda (DB)          → WARNING, tetap diimport
  //   'infile' → part_number sama dalam file, deskripsi beda    → WARNING, tetap diimport
  //   'inexact'→ part_number + deskripsi sama dalam file        → DIBLOKIR (dilewati saat import)

  // Buat map: "PARTNUMBER||deskripsi_lowercase" → true untuk cek exact DB
  const existingExact = new Set(
    parts.map(p => `${p.part_number.toUpperCase()}||${p.description.trim().toLowerCase()}`)
  );
  const existingNums = new Set(parts.map(p => p.part_number.toUpperCase()));

  const seenInFile      = new Set(); // part_number saja
  const seenExactInFile = new Set(); // part_number||deskripsi

  const rowsWithFlag = rows.map(r => {
    const pn   = String(r[0] || '').trim().toUpperCase();
    const desc = String(r[1] || '').trim();
    const key  = `${pn}||${desc.toLowerCase()}`;
    let status = 'new';

    if (existingExact.has(key)) {
      status = 'exact_db';           // sama persis di DB → BLOKIR
    } else if (seenExactInFile.has(key)) {
      status = 'exact_file';         // sama persis di file → BLOKIR
    } else if (existingNums.has(pn)) {
      status = 'samepn_db';          // part number sama di DB, deskripsi beda → WARNING
    } else if (seenInFile.has(pn)) {
      status = 'samepn_file';        // part number sama di file, deskripsi beda → WARNING
    }

    if (pn) { seenInFile.add(pn); seenExactInFile.add(key); }
    return { r, pn, desc, status };
  });

  const cntExactDb   = rowsWithFlag.filter(x => x.status === 'exact_db').length;
  const cntExactFile = rowsWithFlag.filter(x => x.status === 'exact_file').length;
  const cntWarnDb    = rowsWithFlag.filter(x => x.status === 'samepn_db').length;
  const cntWarnFile  = rowsWithFlag.filter(x => x.status === 'samepn_file').length;
  const cntBlocked   = cntExactDb + cntExactFile;
  const cntWill      = rowsWithFlag.length - cntBlocked;

  let countText = `Preview: <strong>${cntWill}</strong> baris akan diimport`;
  if (cntBlocked > 0) countText += ` &nbsp;⛔ <span style="color:#ef4444;font-weight:600">${cntBlocked} dilewati (identik)</span>`;
  if (cntWarnDb + cntWarnFile > 0) countText += ` &nbsp;⚠ <span style="color:#f59e0b;font-weight:600">${cntWarnDb + cntWarnFile} peringatan (no. sama, desc beda)</span>`;
  document.getElementById('previewCount').innerHTML = countText;

  const preview = rowsWithFlag.slice(0, 5);
  const table   = document.getElementById('previewTable');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Part Number</th><th>Deskripsi</th><th>Catatan</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${preview.map(({ r, pn, status }) => {
        let badge = '<span style="color:#22c55e;font-size:11px;font-weight:600">✅ Baru</span>';
        let rowStyle = '';
        if (status === 'exact_db') {
          badge    = '<span style="color:#ef4444;font-size:11px;font-weight:600">⛔ Identik di DB — dilewati</span>';
          rowStyle = 'background:rgba(239,68,68,0.07);opacity:0.7;';
        } else if (status === 'exact_file') {
          badge    = '<span style="color:#ef4444;font-size:11px;font-weight:600">⛔ Identik dalam file — dilewati</span>';
          rowStyle = 'background:rgba(239,68,68,0.07);opacity:0.7;';
        } else if (status === 'samepn_db') {
          badge    = '<span style="color:#f59e0b;font-size:11px;font-weight:600">⚠ No. sama di DB, desc beda — tetap diimport</span>';
          rowStyle = 'background:rgba(245,158,11,0.07);';
        } else if (status === 'samepn_file') {
          badge    = '<span style="color:#f59e0b;font-size:11px;font-weight:600">⚠ No. sama dalam file, desc beda — tetap diimport</span>';
          rowStyle = 'background:rgba(245,158,11,0.07);';
        }
        return `
          <tr style="${rowStyle}">
            <td><strong>${escHtml(pn)}</strong></td>
            <td>${escHtml(r[1] || '')}</td>
            <td>${escHtml(r[2] || '')}</td>
            <td>${badge}</td>
          </tr>`;
      }).join('')}
      ${rows.length > 5 ? `<tr><td colspan="4" style="text-align:center;color:var(--gray-500);font-size:12px">... dan ${rows.length - 5} baris lainnya</td></tr>` : ''}
    </tbody>
  `;

  // Warning ringkasan
  const warnMsgs = [];
  if (cntExactDb   > 0) warnMsgs.push(`⛔ ${cntExactDb} baris identik persis dengan data di database — <strong>akan dilewati</strong>`);
  if (cntExactFile > 0) warnMsgs.push(`⛔ ${cntExactFile} baris identik persis dalam file — <strong>akan dilewati</strong>`);
  if (cntWarnDb    > 0) warnMsgs.push(`⚠ ${cntWarnDb} baris punya nomor part sama dengan di database tapi deskripsi beda — <strong>tetap diimport sebagai data baru</strong>`);
  if (cntWarnFile  > 0) warnMsgs.push(`⚠ ${cntWarnFile} baris punya nomor part sama dalam file tapi deskripsi beda — <strong>tetap diimport sebagai data baru</strong>`);
  if (warnMsgs.length > 0) showImportWarning(warnMsgs.join('<br>'));

  document.getElementById('importPreview').style.display = 'block';
  document.getElementById('importSaveBtn').style.display = cntWill > 0 ? 'inline-flex' : 'none';
}

async function doImport() {
  const rows = getImportRows();
  if (rows.length === 0) return;

  const btn = document.getElementById('importSaveBtn');
  btn.textContent = 'Mengimport...';
  btn.disabled    = true;

  // Saring: skip yang identik persis (part_number + deskripsi sama) dengan DB atau sesama file
  const existingExact   = new Set(
    parts.map(p => `${p.part_number.toUpperCase()}||${p.description.trim().toLowerCase()}`)
  );
  const seenExactInFile = new Set();

  const toInsert = [];
  let skipped = 0;

  for (const r of rows) {
    const pn   = String(r[0] || '').trim().toUpperCase();
    const desc = String(r[1] || '').trim();
    const key  = `${pn}||${desc.toLowerCase()}`;
    if (!pn || !desc) continue;
    if (existingExact.has(key) || seenExactInFile.has(key)) {
      skipped++;
      continue;
    }
    seenExactInFile.add(key);
    toInsert.push({ part_number: pn, description: desc, notes: String(r[2] || '').trim() });
  }

  if (toInsert.length === 0) {
    showImportError(`Semua baris identik persis dengan data yang sudah ada. Tidak ada yang diimport.`);
    btn.textContent = 'Import Semua';
    btn.disabled    = false;
    return;
  }

  // Insert biasa (bukan upsert) — part number boleh sama asal deskripsi beda
  const { error } = await _sb.from('parts').insert(toInsert).select();

  btn.textContent = 'Import Semua';
  btn.disabled    = false;

  if (error) {
    showImportError('Import gagal: ' + error.message);
    return;
  }

  let msg = `✅ ${toInsert.length} part berhasil diimport!`;
  if (skipped > 0) msg += ` (${skipped} dilewati karena identik)`;
  showToast(msg);
  closeImport();
  await fetchParts();
}

function showImportError(msg) {
  const el = document.getElementById('importError');
  el.textContent    = msg;
  el.style.display  = 'block';
}

function showImportWarning(html) {
  const el = document.getElementById('importWarning');
  if (!el) return;
  el.innerHTML     = html;
  el.style.display = 'block';
}

// ============================================================
//  KELOLA AKUN (admin only)
// ============================================================

async function openUserMgmt() {
  closeUserDropdown();
  document.getElementById('userMgmtOverlay').classList.add('open');
  await loadUserList();
}

function closeUserMgmt() {
  document.getElementById('userMgmtOverlay').classList.remove('open');
}

function closeUserMgmtOverlay(e) {
  if (e.target === document.getElementById('userMgmtOverlay')) closeUserMgmt();
}

async function loadUserList() {
  const wrap = document.getElementById('userListWrap');
  wrap.innerHTML = '<div style="text-align:center;padding:20px">⏳ Memuat...</div>';

  const { data: profiles, error } = await _sb.from('profiles').select('*').order('created_at');
  if (error) {
    wrap.innerHTML = '<div style="color:var(--red)">Gagal memuat daftar akun.</div>';
    return;
  }

  if (!profiles || profiles.length === 0) {
    wrap.innerHTML = '<div style="text-align:center;color:var(--gray-500);padding:20px">Tidak ada akun ditemukan.</div>';
    return;
  }

  wrap.innerHTML = `
    <table class="user-table">
      <thead><tr><th>Email</th><th>Role</th><th>Aksi</th></tr></thead>
      <tbody>
        ${profiles.map(p => `
          <tr id="userrow-${p.id}">
            <td>${escHtml(p.email || '—')}</td>
            <td>
              <span class="user-role-badge role-${p.role}">${p.role === 'admin' ? '⚡ Admin' : '👁 Viewer'}</span>
            </td>
            <td>
              ${p.id !== currentUser.id ? `
                <button class="btn btn-ghost btn-sm" onclick="toggleUserRole('${p.id}','${p.role}')">
                  ${p.role === 'admin' ? 'Jadikan Viewer' : 'Jadikan Admin'}
                </button>
              ` : '<span style="font-size:12px;color:var(--gray-400)">Akun Anda</span>'}
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="user-mgmt-info" style="margin-top:16px">
      Untuk menambah atau menghapus akun, gunakan <a href="https://supabase.com/dashboard" target="_blank">Supabase Dashboard</a> → Authentication → Users.
    </div>
  `;
}

async function toggleUserRole(userId, currentRoleVal) {
  const newRole = currentRoleVal === 'admin' ? 'viewer' : 'admin';
  const { error } = await _sb.from('profiles').update({ role: newRole }).eq('id', userId);
  if (error) {
    showToast('⚠ Gagal mengubah role: ' + error.message);
    return;
  }
  showToast(`✅ Role berhasil diubah ke ${newRole}`);
  await loadUserList();
}

// ============================================================
//  TOAST
// ============================================================

let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ============================================================
//  KEYBOARD SHORTCUTS
// ============================================================

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDelete();
    closeImport();
    closeUserMgmt();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput')?.focus();
  }
});

// Login: Enter key
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginPassword')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doLogin();
  });
  document.getElementById('loginEmail')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginPassword').focus();
  });
});

// ============================================================
//  INIT
// ============================================================

initAuth();
