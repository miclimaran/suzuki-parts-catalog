// ===========================
//  SUZUKI PARTS CATALOG - JS
// ===========================

const STORAGE_KEY = 'suzuki_parts_v1';

// ---- SAMPLE DATA ----
const SAMPLE_DATA = [
  { id: uid(), partNumber: '22100-52S00-000', description: 'Dekrup Futura 2019', category: 'Mesin', notes: '' },
  { id: uid(), partNumber: '36250-M74T45-000', description: 'Switch Kombinasi Fronx SGX (W_AEBMCR)', category: 'Elektrikal', notes: 'Varian GX/SGX dengan AEB' },
  { id: uid(), partNumber: '36250-M74T11-000', description: 'Switch Kombinasi Fronx GL (N_AEBR)', category: 'Elektrikal', notes: 'Varian GL tanpa AEB' },
];

// ---- STATE ----
let parts = [];
let searchQuery = '';
let sortKey = '';
let sortDir = 'asc';
let editingId = null;
let deletingId = null;

// ---- INIT ----
function init() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { parts = JSON.parse(saved); } catch { parts = [...SAMPLE_DATA]; }
  } else {
    parts = [...SAMPLE_DATA];
    save();
  }
  buildCategoryList();
  render();
}

// ---- STORAGE ----
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(parts));
}

// ---- UID ----
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- SEARCH ----
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

// ---- SORT ----
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

// ---- FILTER & SORT ----
function getFiltered() {
  let result = [...parts];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(p =>
      p.partNumber.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q)
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

// ---- HIGHLIGHT ----
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

// ---- RENDER ----
function render() {
  const filtered = getFiltered();
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('countDisplay');

  count.textContent = filtered.length;

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    document.getElementById('partsTable').style.display = 'none';
    return;
  }

  empty.style.display = 'none';
  document.getElementById('partsTable').style.display = 'table';

  tbody.innerHTML = filtered.map((p, i) => `
    <tr>
      <td class="row-num">${i + 1}</td>
      <td>
        <span class="part-number">${highlight(p.partNumber, searchQuery)}</span>
      </td>
      <td>
        <div class="description-text">${highlight(p.description, searchQuery)}</div>
        ${p.notes ? `<div class="notes-text">${highlight(p.notes, searchQuery)}</div>` : ''}
      </td>
      <td>
        ${p.category
          ? `<span class="category-badge">${highlight(p.category, searchQuery)}</span>`
          : '<span style="color:var(--gray-300);font-size:12px">—</span>'}
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-icon edit" title="Edit" onclick="openModal('edit','${p.id}')">✏️</button>
          <button class="btn-icon delete" title="Hapus" onclick="openDelete('${p.id}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ---- CATEGORY DATALIST ----
function buildCategoryList() {
  const cats = [...new Set(parts.map(p => p.category).filter(Boolean))].sort();
  const list = document.getElementById('categoryList');
  list.innerHTML = cats.map(c => `<option value="${escHtml(c)}">`).join('');
}

// ---- MODAL ADD/EDIT ----
function openModal(mode, id = null) {
  editingId = null;
  document.getElementById('modalError').style.display = 'none';

  if (mode === 'edit' && id) {
    const part = parts.find(p => p.id === id);
    if (!part) return;
    editingId = id;
    document.getElementById('modalTitle').textContent = 'Edit Part';
    document.getElementById('inputPartNumber').value = part.partNumber;
    document.getElementById('inputDescription').value = part.description;
    document.getElementById('inputCategory').value = part.category || '';
    document.getElementById('inputNotes').value = part.notes || '';
  } else {
    document.getElementById('modalTitle').textContent = 'Tambah Part Baru';
    document.getElementById('inputPartNumber').value = '';
    document.getElementById('inputDescription').value = '';
    document.getElementById('inputCategory').value = '';
    document.getElementById('inputNotes').value = '';
  }

  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('inputPartNumber').focus(), 100);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  editingId = null;
}

function closeModalOverlay(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function savePart() {
  const partNumber = document.getElementById('inputPartNumber').value.trim().toUpperCase();
  const description = document.getElementById('inputDescription').value.trim();
  const category = document.getElementById('inputCategory').value.trim();
  const notes = document.getElementById('inputNotes').value.trim();
  const errorEl = document.getElementById('modalError');

  // Validation
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

  // Duplicate check
  const duplicate = parts.find(p =>
    p.partNumber.toLowerCase() === partNumber.toLowerCase() && p.id !== editingId
  );
  if (duplicate) {
    errorEl.textContent = `⚠ Part Number "${partNumber}" sudah ada di database.`;
    errorEl.style.display = 'block';
    return;
  }

  if (editingId) {
    const idx = parts.findIndex(p => p.id === editingId);
    if (idx !== -1) {
      parts[idx] = { ...parts[idx], partNumber, description, category, notes };
    }
    showToast('✅ Part berhasil diupdate!');
  } else {
    parts.unshift({ id: uid(), partNumber, description, category, notes });
    showToast('✅ Part berhasil ditambahkan!');
  }

  save();
  buildCategoryList();
  render();
  closeModal();
}

// ---- DELETE ----
function openDelete(id) {
  const part = parts.find(p => p.id === id);
  if (!part) return;
  deletingId = id;
  document.getElementById('deleteInfo').textContent =
    `${part.partNumber} — ${part.description}`;
  document.getElementById('deleteOverlay').classList.add('open');
}

function closeDelete() {
  document.getElementById('deleteOverlay').classList.remove('open');
  deletingId = null;
}

function closeDeleteOverlay(e) {
  if (e.target === document.getElementById('deleteOverlay')) closeDelete();
}

function confirmDelete() {
  if (!deletingId) return;
  parts = parts.filter(p => p.id !== deletingId);
  save();
  buildCategoryList();
  render();
  closeDelete();
  showToast('🗑️ Part berhasil dihapus.');
}

// ---- EXPORT EXCEL ----
function exportExcel() {
  const filtered = getFiltered();
  if (filtered.length === 0) {
    showToast('⚠ Tidak ada data untuk diexport.');
    return;
  }

  // Build CSV with BOM for Excel UTF-8
  const BOM = '\uFEFF';
  const header = ['No', 'Part Number', 'Deskripsi / Nama Barang', 'Kategori', 'Catatan'];
  const rows = filtered.map((p, i) => [
    i + 1,
    p.partNumber,
    p.description,
    p.category || '',
    p.notes || ''
  ]);

  const csv = BOM + [header, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  a.href = url;
  a.download = `suzuki-parts-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(`⬇ Export ${filtered.length} part berhasil!`);
}

// ---- TOAST ----
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeDelete();
  }
  // Ctrl/Cmd + K = focus search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

// ---- START ----
init();
