// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const LOGO_SRC = document.getElementById('logo-img').src;
document.getElementById('login-logo').src = LOGO_SRC;

let clients = [];
let savedQuotes = [];
let quoteRows = [];
let photoDataUrls = [];
let formServicios = [];
let editServicios = [];
let editingClientId = null;

const statusLabel = { ingresado: 'Ingresado', proceso: 'En Proceso', finalizado: 'Finalizado' };
const statusClass  = { ingresado: 's-ingresado', proceso: 's-proceso', finalizado: 's-finalizado' };

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
function doLogin() {
  const user = document.getElementById('login-user').value.trim();
  const pass = document.getElementById('login-pass').value;
  if (user === 'admin' && pass === 'yeyo') {
    document.getElementById('login-overlay').style.display = 'none';
    document.getElementById('login-user').value = '';
    document.getElementById('login-pass').value = '';
  } else {
    const err = document.getElementById('login-error');
    err.style.display = 'block';
    document.getElementById('login-pass').value = '';
    setTimeout(() => { err.style.display = 'none'; }, 2500);
  }
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
async function init() {
  document.getElementById('f-ingreso').valueAsDate = new Date();
  await loadClients();
  await loadQuotes();
  initResumenDate();
}
init();

async function loadClients() {
  clients = await window.api.getClientes();
  updateCountBadge();
}

async function loadQuotes() {
  savedQuotes = await window.api.getCotizaciones();
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function switchTab(tab) {
  const tabs = ['registro', 'clientes', 'cotizacion', 'mis-cotizaciones', 'resumenes'];
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', tabs[i] === tab));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + tab).classList.add('active');
  if (tab === 'clientes') renderClients();
  if (tab === 'cotizacion') populateClientSelect();
  if (tab === 'mis-cotizaciones') { loadQuotes().then(renderSavedQuotes); }
  if (tab === 'resumenes') { loadQuotes().then(renderResumen); }
}

// ─────────────────────────────────────────────
// FOTOS
// ─────────────────────────────────────────────
async function pickFotos() {
  const fotos = await window.api.uploadFotos(null);
  if (!fotos || !fotos.length) return;
  photoDataUrls = [...photoDataUrls, ...fotos];
  renderPhotoPreviews();
}

function renderPhotoPreviews() {
  const prev = document.getElementById('photo-previews');
  prev.innerHTML = photoDataUrls.map((src, i) => `
    <div class="photo-wrap">
      <img class="photo-thumb" src="${src}">
      <button class="photo-del" onclick="removePhoto(${i})" title="Eliminar">
        <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

function removePhoto(idx) {
  photoDataUrls.splice(idx, 1);
  renderPhotoPreviews();
}

// ─────────────────────────────────────────────
// SERVICIOS
// ─────────────────────────────────────────────
function addServicio() {
  formServicios.push({ nombre: '', descripcion: '' });
  renderServiciosList('f-servicios-list', formServicios, 'form');
}
function addEditServicio() {
  editServicios.push({ nombre: '', descripcion: '' });
  renderServiciosList('edit-servicios-list', editServicios, 'edit');
}
function removeServicio(list, idx, mode) {
  list.splice(idx, 1);
  renderServiciosList(mode === 'form' ? 'f-servicios-list' : 'edit-servicios-list', list, mode);
}
function updateServicioField(list, idx, field, val) { list[idx][field] = val; }
function renderServiciosList(containerId, list, mode) {
  const listRef = mode === 'form' ? 'formServicios' : 'editServicios';
  document.getElementById(containerId).innerHTML = list.map((s, i) => `
    <div class="servicio-row">
      <input type="text" placeholder="Nombre servicio" value="${s.nombre || ''}" oninput="updateServicioField(${listRef},${i},'nombre',this.value)">
      <input type="text" placeholder="Descripción / notas..." value="${s.descripcion || ''}" oninput="updateServicioField(${listRef},${i},'descripcion',this.value)">
      <button class="servicio-del" onclick="removeServicio(${listRef},${i},'${mode}')">
        <svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// SAVE CLIENT
// ─────────────────────────────────────────────
async function saveClient() {
  const req = ['f-nombre','f-telefono','f-moto','f-modelo','f-color','f-placas','f-ingreso','f-detalles'];
  const labels = ['Nombre','Teléfono','Moto','Modelo','Color','Placas','Día de ingreso','Detalles'];
  for (let i = 0; i < req.length; i++) {
    if (!document.getElementById(req[i]).value.trim()) { showToast('⚠ ' + labels[i] + ' es requerido'); return; }
  }
  const tel = document.getElementById('f-telefono').value.trim();
  if (tel.length !== 10) { showToast('⚠ El teléfono debe tener 10 dígitos'); return; }

  const result = await window.api.saveCliente({
    nombre:   document.getElementById('f-nombre').value.trim(),
    telefono: tel,
    moto:     document.getElementById('f-moto').value.trim(),
    modelo:   document.getElementById('f-modelo').value.trim(),
    color:    document.getElementById('f-color').value.trim(),
    placas:   document.getElementById('f-placas').value.trim(),
    ingreso:  document.getElementById('f-ingreso').value,
    detalles: document.getElementById('f-detalles').value.trim(),
    status:   document.getElementById('f-status').value,
    servicios: [...formServicios],
    fotos:    [...photoDataUrls]
  });

  await loadClients();
  resetForm();
  showToast('✓ Cliente ' + result.id + ' guardado', 'success');
}

function resetForm() {
  ['f-nombre','f-telefono','f-moto','f-modelo','f-color','f-placas','f-detalles'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('f-ingreso').valueAsDate = new Date();
  document.getElementById('f-status').value = 'ingresado';
  document.getElementById('photo-previews').innerHTML = '';
  document.getElementById('phone-count').textContent = '0 / 10 dígitos';
  formServicios = [];
  document.getElementById('f-servicios-list').innerHTML = '';
  photoDataUrls = [];
}

// ─────────────────────────────────────────────
// RENDER CLIENTS
// ─────────────────────────────────────────────
function renderClients() {
  const list = document.getElementById('clients-list');
  const q = (document.getElementById('search-input').value || '').toLowerCase().trim();
  const sf = document.getElementById('filter-status').value;
  const fb = document.getElementById('filter-by').value;
  updateCountBadge();

  let data = clients.filter(c => {
    let match = true;
    if (q) {
      if (fb === 'nombre') match = c.nombre.toLowerCase().includes(q);
      else if (fb === 'telefono') match = c.telefono.includes(q);
      else if (fb === 'id') match = (c.id || '').toLowerCase().includes(q);
      else if (fb === 'fecha') match = (c.ingreso || '').includes(q);
      else match = [c.nombre, c.moto, c.modelo, c.placas, c.telefono, c.id || '', c.ingreso || ''].join(' ').toLowerCase().includes(q);
    }
    return match && (!sf || c.status === sf);
  });

  if (!data.length) {
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><strong>Sin resultados</strong><p>No hay clientes que coincidan.</p></div>`;
    return;
  }

  list.innerHTML = data.map(c => `
    <div class="client-card">
      <div class="client-id">${c.id || '—'}</div>
      <div>
        <div class="client-name">${c.nombre}</div>
        <div class="client-meta">
          <span class="client-meta-item"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.13 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.04 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${c.telefono}</span>
          <span class="client-meta-item"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${formatDate(c.ingreso)}</span>
          <span class="client-meta-item">${c.moto} ${c.modelo} · ${c.color}</span>
          <span class="client-meta-item">Placas: ${c.placas}</span>
        </div>
      </div>
      <div class="client-card-side">
        <span class="status ${statusClass[c.status]}">${statusLabel[c.status]}</span>
        <div class="card-actions">
          <button class="icon-btn" title="Ver detalle" onclick="openDetail('${c.id}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="icon-btn" title="Editar" onclick="openEdit('${c.id}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-btn del" title="Eliminar" onclick="deleteClient('${c.id}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');
}

function updateCountBadge() {
  document.getElementById('count-badge').textContent = clients.length ? `(${clients.length})` : '';
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

async function deleteClient(id) {
  if (!confirm('¿Eliminar este cliente?')) return;
  await window.api.deleteCliente(id);
  await loadClients();
  renderClients();
  showToast('Cliente eliminado');
}

// ─────────────────────────────────────────────
// MODAL DETAIL
// ─────────────────────────────────────────────
function openDetail(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  document.getElementById('modal-title').innerHTML = c.nombre.toUpperCase() + `<span class="id-tag">${c.id || ''}</span>`;
  document.getElementById('modal-body').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><small>ID</small><p>${c.id || '—'}</p></div>
      <div class="detail-item"><small>Teléfono</small><p>${c.telefono}</p></div>
      <div class="detail-item"><small>Día de ingreso</small><p>${formatDate(c.ingreso)}</p></div>
      <div class="detail-item"><small>Moto / Marca</small><p>${c.moto}</p></div>
      <div class="detail-item"><small>Modelo</small><p>${c.modelo}</p></div>
      <div class="detail-item"><small>Color</small><p>${c.color}</p></div>
      <div class="detail-item"><small>Placas</small><p>${c.placas}</p></div>
    </div>
    <div class="detail-item" style="margin-bottom:1rem;"><small>Detalles / Falla</small><p style="margin-top:4px;line-height:1.6;">${c.detalles || '—'}</p></div>
    ${c.servicios && c.servicios.length ? `<div class="detail-item" style="margin-bottom:1rem;"><small>Servicios</small>${c.servicios.map(s => `<div style="margin-top:.5rem;padding:.5rem 0;border-bottom:1px solid #2a2a2a;"><span style="font-family:var(--fd);font-size:15px;font-weight:700;color:var(--red-b);">${s.nombre || '—'}</span>${s.descripcion ? `<p style="font-size:13px;font-weight:300;color:rgba(240,240,240,.6);margin-top:2px;">${s.descripcion}</p>` : ''}</div>`).join('')}</div>` : ''}
    ${c.fotos && c.fotos.length ? `<div style="margin-bottom:1rem;"><small style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--red);">Fotos</small><div class="detail-photos">${c.fotos.map(f => `<img class="detail-photo" src="${f}" onclick="window.open('${f}')">`).join('')}</div></div>` : ''}
    <div style="margin-top:1.25rem;">
      <small style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:var(--red);display:block;margin-bottom:.75rem;">Status de reparación</small>
      <div class="status-changer">
        <button class="status-btn ${c.status === 'ingresado' ? 'active-ingresado' : ''}" onclick="changeStatus('${c.id}','ingresado')">Ingresado</button>
        <button class="status-btn ${c.status === 'proceso' ? 'active-proceso' : ''}" onclick="changeStatus('${c.id}','proceso')">En Proceso</button>
        <button class="status-btn ${c.status === 'finalizado' ? 'active-finalizado' : ''}" onclick="changeStatus('${c.id}','finalizado')">Finalizado</button>
      </div>
    </div>
    <div style="display:flex;gap:.75rem;margin-top:1rem;flex-wrap:wrap;align-items:center;">
      <a class="wa-detail-btn" href="https://wa.me/52${c.telefono}" target="_blank" style="margin-top:0;">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        WhatsApp — ${c.telefono}
      </a>
      <button onclick="exportClientPDF('${c.id}')" style="display:inline-flex;align-items:center;gap:.5rem;background:var(--bs);border:1px solid var(--red);color:var(--white);font-family:var(--fd);font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:10px 22px;border-radius:3px;cursor:pointer;transition:opacity .2s;" onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
        <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        Exportar Orden PDF
      </button>
    </div>
  `;
  document.getElementById('modal-overlay').style.display = 'flex';
}

async function changeStatus(id, newStatus) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  c.status = newStatus;
  await window.api.updateCliente(c);
  await loadClients();
  openDetail(id);
  renderClients();
  showToast('Status actualizado', 'success');
}

function closeModal(e) { if (e.target === document.getElementById('modal-overlay')) closeModalDirect(); }
function closeModalDirect() { document.getElementById('modal-overlay').style.display = 'none'; }

// ─────────────────────────────────────────────
// EDIT CLIENT
// ─────────────────────────────────────────────
function openEdit(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  editingClientId = id;
  document.getElementById('edit-id-display').textContent = c.id || '—';
  document.getElementById('edit-ingreso-display').textContent = formatDate(c.ingreso);
  document.getElementById('edit-nombre').value = c.nombre || '';
  document.getElementById('edit-telefono').value = c.telefono || '';
  document.getElementById('edit-moto').value = c.moto || '';
  document.getElementById('edit-modelo').value = c.modelo || '';
  document.getElementById('edit-color').value = c.color || '';
  document.getElementById('edit-placas').value = c.placas || '';
  document.getElementById('edit-detalles').value = c.detalles || '';
  document.getElementById('edit-status').value = c.status || 'ingresado';
  editServicios = (c.servicios || []).map(s => ({ ...s }));
  renderServiciosList('edit-servicios-list', editServicios, 'edit');
  document.getElementById('edit-overlay').style.display = 'flex';
}

async function saveEditClient() {
  const c = clients.find(x => x.id === editingClientId);
  if (!c) return;
  const tel = document.getElementById('edit-telefono').value.trim();
  if (!document.getElementById('edit-nombre').value.trim()) { showToast('⚠ Nombre requerido'); return; }
  if (tel.length !== 10) { showToast('⚠ Teléfono debe tener 10 dígitos'); return; }
  c.nombre   = document.getElementById('edit-nombre').value.trim();
  c.telefono = tel;
  c.moto     = document.getElementById('edit-moto').value.trim();
  c.modelo   = document.getElementById('edit-modelo').value.trim();
  c.color    = document.getElementById('edit-color').value.trim();
  c.placas   = document.getElementById('edit-placas').value.trim();
  c.detalles = document.getElementById('edit-detalles').value.trim();
  c.status   = document.getElementById('edit-status').value;
  c.servicios = [...editServicios];
  await window.api.updateCliente(c);
  await loadClients();
  closeEditModalDirect();
  renderClients();
  showToast('✓ Cliente actualizado', 'success');
}

function closeEditModal(e) { if (e.target === document.getElementById('edit-overlay')) closeEditModalDirect(); }
function closeEditModalDirect() { document.getElementById('edit-overlay').style.display = 'none'; editingClientId = null; }

// ─────────────────────────────────────────────
// COTIZACION
// ─────────────────────────────────────────────
function populateClientSelect() {
  const sel = document.getElementById('q-cliente');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Seleccionar cliente —</option>';
  clients.forEach(c => {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = `[${c.id}] ${c.nombre} — ${c.moto} ${c.modelo}`;
    sel.appendChild(o);
  });
  sel.value = current;
  if (!quoteRows.length) addQuoteRow();
}

function onClienteChange() { /* future: auto-fill */ }

async function genQuoteID() {
  const id = await window.api.nextQuoteID();
  document.getElementById('q-titulo').value = id;
  showToast('ID ' + id + ' generado', 'success');
}

function addQuoteRow() {
  const id = Date.now();
  quoteRows.push({ id, servicio: '', manoObra: 0, pieces: [{ nombre: '', cant: 1, precio: 0 }] });
  renderQuoteTable();
}

function addPiece(rowId) {
  const r = quoteRows.find(x => x.id === rowId);
  if (r) { r.pieces.push({ nombre: '', cant: 1, precio: 0 }); renderQuoteTable(); }
}

function removePiece(rowId, pi) {
  const r = quoteRows.find(x => x.id === rowId);
  if (r) { r.pieces.splice(pi, 1); renderQuoteTable(); }
}

function removeQuoteRow(id) { quoteRows = quoteRows.filter(r => r.id !== id); renderQuoteTable(); }

function escAttr(str) { return String(str || '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function piecesTotal(pieces) { return (pieces || []).reduce((s, p) => s + (parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0), 0); }
function rowTotal(r) { return (parseFloat(r.manoObra) || 0) + piecesTotal(r.pieces); }

function renderQuoteTable() {
  document.getElementById('quote-tbody').innerHTML = quoteRows.map(r => `
    <tr id="qrow-${r.id}">
      <td><input type="text" placeholder="Ej. Cambio de pistón" value="${escAttr(r.servicio)}" oninput="updateRowField(${r.id},'servicio',this.value)"></td>
      <td><input type="number" placeholder="0.00" value="${r.manoObra || ''}" min="0" step="any" oninput="updateRowField(${r.id},'manoObra',this.value)" style="text-align:right;"></td>
      <td class="pieces-cell">
        ${r.pieces.map((p, pi) => `
          <div class="piece-row">
            <input type="text" placeholder="Nombre pieza" value="${escAttr(p.nombre)}" oninput="updatePiece(${r.id},${pi},'nombre',this.value)">
            <input type="number" placeholder="Cant." value="${p.cant || ''}" min="0" step="any" oninput="updatePiece(${r.id},${pi},'cant',this.value)" style="text-align:center;">
            <input type="number" placeholder="Precio" value="${p.precio || ''}" min="0" step="any" oninput="updatePiece(${r.id},${pi},'precio',this.value)" style="text-align:right;">
            <span class="pi-total" id="pitotal-${r.id}-${pi}">$${((parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0)).toFixed(2)}</span>
            <button class="piece-del" onclick="removePiece(${r.id},${pi})" title="Quitar pieza"><svg viewBox="0 0 24 24" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          </div>
        `).join('')}
        <button class="add-piece-btn" onclick="addPiece(${r.id})">+ Pieza</button>
      </td>
      <td class="total-cell" id="qtotal-${r.id}">$${rowTotal(r).toFixed(2)}</td>
      <td><button class="icon-btn del" onclick="removeQuoteRow(${r.id})"><svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></td>
    </tr>
  `).join('');
  updateGrandTotal();
}

function updateRowField(id, field, val) {
  const r = quoteRows.find(x => x.id === id);
  if (!r) return;
  r[field] = field === 'servicio' ? val : parseFloat(val) || 0;
  const tc = document.getElementById('qtotal-' + id);
  if (tc) tc.textContent = '$' + rowTotal(r).toFixed(2);
  updateGrandTotal();
}

function updatePiece(rowId, pi, field, val) {
  const r = quoteRows.find(x => x.id === rowId);
  if (!r || !r.pieces[pi]) return;
  r.pieces[pi][field] = field === 'nombre' ? val : parseFloat(val) || 0;
  const cant = parseFloat(r.pieces[pi].cant) || 0;
  const precio = parseFloat(r.pieces[pi].precio) || 0;
  const piTotal = document.getElementById('pitotal-' + rowId + '-' + pi);
  if (piTotal) piTotal.textContent = '$' + (cant * precio).toFixed(2);
  const tc = document.getElementById('qtotal-' + rowId);
  if (tc) tc.textContent = '$' + rowTotal(r).toFixed(2);
  updateGrandTotal();
}

function updateGrandTotal() {
  const total = quoteRows.reduce((s, r) => s + rowTotal(r), 0);
  document.getElementById('quote-grand-total').textContent = '$' + total.toFixed(2);
}

function clearQuote() {
  quoteRows = [];
  document.getElementById('q-titulo').value = '';
  document.getElementById('q-cliente').value = '';
  addQuoteRow();
}

// ─────────────────────────────────────────────
// SAVE & LOAD COTIZACIONES
// ─────────────────────────────────────────────
async function saveCurrentQuote() {
  const titulo = document.getElementById('q-titulo').value.trim();
  if (!titulo) { showToast('⚠ Genera o escribe un ID de cotización'); return; }
  const clienteId = document.getElementById('q-cliente').value;
  const cliente = clients.find(c => c.id === clienteId);
  await window.api.saveCotizacion({
    titulo,
    clienteId: clienteId || null,
    clienteNombre: cliente ? cliente.nombre : 'Sin cliente',
    clienteTelefono: cliente ? cliente.telefono : '',
    fecha: new Date().toISOString().split('T')[0],
    rows: JSON.parse(JSON.stringify(quoteRows))
  });
  await loadQuotes();
  showToast('✓ Cotización guardada: ' + titulo, 'success');
}

function renderSavedQuotes() {
  const list = document.getElementById('quotes-list');
  const q = (document.getElementById('cot-search').value || '').toLowerCase().trim();
  let data = savedQuotes.filter(qt => {
    if (!q) return true;
    return (qt.cliente_nombre || '').toLowerCase().includes(q) ||
           (qt.cliente_telefono || '').includes(q) ||
           (qt.titulo || '').toLowerCase().includes(q);
  });
  if (!data.length) {
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><strong>Sin cotizaciones</strong><p>Guarda cotizaciones desde la pestaña Cotización.</p></div>`;
    return;
  }
  list.innerHTML = data.map(qt => `
    <div class="quote-saved-card">
      <div>
        <div class="qsc-title">${qt.titulo}</div>
        <div class="qsc-meta">
          <span>👤 ${qt.cliente_nombre || 'Sin cliente'}</span>
          ${qt.cliente_telefono ? `<span>📞 ${qt.cliente_telefono}</span>` : ''}
          <span>📅 ${formatDate(qt.fecha)}</span>
          <span>${(qt.rows || []).length} servicio(s)</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.5rem;">
        <span class="qsc-total">$${(qt.total || 0).toFixed(2)}</span>
        <div style="display:flex;gap:.4rem;">
          <button class="icon-btn" title="Ver detalle" onclick="openQViewModal('${qt.titulo}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
          <button class="icon-btn" title="Cargar en editor" onclick="loadQuoteToEditor('${qt.titulo}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
          <button class="icon-btn del" title="Eliminar" onclick="deleteQuote('${qt.titulo}')"><svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </div>
    </div>
  `).join('');
}

function openQViewModal(titulo) {
  const qt = savedQuotes.find(q => q.titulo === titulo);
  if (!qt) return;
  document.getElementById('qview-title').textContent = qt.titulo;
  const grand = (qt.rows || []).reduce((s, r) => s + rowTotal(r), 0);
  document.getElementById('qview-body').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:.75rem;margin-bottom:1.25rem;">
      <div class="detail-item"><small>Cliente</small><p>${qt.cliente_nombre || '—'}</p></div>
      <div class="detail-item"><small>Teléfono</small><p>${qt.cliente_telefono || '—'}</p></div>
      <div class="detail-item"><small>Fecha</small><p>${formatDate(qt.fecha)}</p></div>
    </div>
    <div style="overflow-x:auto;">
      <table class="quote-tbl">
        <thead><tr><th>Servicio</th><th>Mano de Obra</th><th>Piezas</th><th>Total Piezas</th><th>Total</th></tr></thead>
        <tbody>${(qt.rows || []).map(r => `
          <tr>
            <td>${r.servicio || '—'}</td>
            <td style="text-align:right;">$${(parseFloat(r.manoObra) || 0).toFixed(2)}</td>
            <td style="font-size:12px;">${(r.pieces || []).map(p => `${p.nombre || '—'} x${p.cant || 1} @ $${(parseFloat(p.precio) || 0).toFixed(2)}`).join('<br>')}</td>
            <td style="text-align:right;">$${piecesTotal(r.pieces || []).toFixed(2)}</td>
            <td style="text-align:right;font-family:var(--fd);font-size:17px;font-weight:900;color:var(--red-b);">$${rowTotal(r).toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="quote-grand"><span class="quote-grand-label">Total:</span><span class="quote-grand-val">$${grand.toFixed(2)}</span></div>
    <div style="display:flex;gap:.75rem;margin-top:1.25rem;">
      <button class="save-btn" onclick="loadQuoteToEditor('${qt.titulo}');closeQViewModalDirect();switchTab('cotizacion');" style="margin-top:0;">Editar cotización</button>
      <button class="save-btn" onclick="exportSavedQuotePDF('${qt.titulo}')" style="margin-top:0;background:var(--bs);border:1px solid var(--gray2);">PDF</button>
    </div>
  `;
  document.getElementById('qview-overlay').style.display = 'flex';
}

function loadQuoteToEditor(titulo) {
  const qt = savedQuotes.find(q => q.titulo === titulo);
  if (!qt) return;
  document.getElementById('q-titulo').value = qt.titulo;
  document.getElementById('q-cliente').value = qt.cliente_id || '';
  quoteRows = JSON.parse(JSON.stringify(qt.rows || []));
  renderQuoteTable();
  switchTab('cotizacion');
  showToast('Cotización cargada en editor', 'success');
}

async function deleteQuote(titulo) {
  if (!confirm('¿Eliminar cotización ' + titulo + '?')) return;
  await window.api.deleteCotizacion(titulo);
  await loadQuotes();
  renderSavedQuotes();
  showToast('Cotización eliminada');
}

function exportSavedQuotePDF(titulo) {
  const qt = savedQuotes.find(q => q.titulo === titulo);
  if (!qt) return;
  quoteRows = JSON.parse(JSON.stringify(qt.rows || []));
  document.getElementById('q-titulo').value = qt.titulo;
  document.getElementById('q-cliente').value = qt.cliente_id || '';
  exportQuotePDF();
}

// ─────────────────────────────────────────────
// PDF EXPORT — ORDEN DE REGISTRO (CLIENTE)
// ─────────────────────────────────────────────
function exportClientPDF(id) {
  const c = clients.find(x => x.id === id);
  if (!c) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 15;

  const footer = () => {
    doc.setFillColor(10, 10, 10); doc.rect(0, 285, W, 12, 'F');
    doc.setTextColor(150, 150, 150); doc.setFontSize(8);
    doc.text('Yeyo Moto Taller & Refaccionaria — Colima', W / 2, 292, { align: 'center' });
  };

  // Header
  doc.setFillColor(10, 10, 10); doc.rect(0, 0, W, 45, 'F');
  try { doc.addImage(LOGO_SRC, 'JPEG', margin, 5, 30, 30); } catch (e) {}
  doc.setTextColor(204, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('YEYO MOTO TALLER', margin + 35, 16);
  doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text('& REFACCIONARIA — Colima, Col.', margin + 35, 23);
  doc.setTextColor(150, 150, 150);
  doc.text('Tel: 312 104 8071 | Av. el Campesino Sur 45-B, El Moralete', margin + 35, 30);
  doc.setDrawColor(204, 0, 0); doc.setLineWidth(1); doc.line(margin, 46, W - margin, 46);

  // Título de la orden
  doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('ORDEN DE REGISTRO', margin, 57);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(c.id, margin, 64);
  doc.text('Fecha de ingreso: ' + formatDate(c.ingreso), W - margin, 57, { align: 'right' });

  // Tabla de datos del cliente
  doc.autoTable({
    startY: 70,
    body: [
      ['ID', c.id],
      ['Nombre', c.nombre],
      ['Teléfono', c.telefono],
      ['Moto / Marca', c.moto],
      ['Modelo', c.modelo],
      ['Color', c.color],
      ['Placas', c.placas],
      ['Status', statusLabel[c.status] || c.status],
      ['Detalles / Falla', c.detalles || '—'],
    ],
    theme: 'grid',
    bodyStyles: { fontSize: 10, textColor: [30, 30, 30] },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold', fillColor: [235, 235, 235], textColor: [30, 30, 30] },
      1: { cellWidth: 135 }
    },
    margin: { left: margin, right: margin },
    didDrawPage: footer
  });

  let y = doc.lastAutoTable.finalY + 10;

  // Tabla de servicios (si existen)
  if (c.servicios && c.servicios.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(204, 0, 0);
    doc.text('SERVICIOS A REALIZAR', margin, y);
    y += 4;
    doc.autoTable({
      startY: y,
      head: [['SERVICIO', 'DESCRIPCIÓN / NOTAS']],
      body: c.servicios.map(s => [s.nombre || '—', s.descripcion || '—']),
      theme: 'grid',
      headStyles: { fillColor: [204, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
      columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 125 } },
      margin: { left: margin, right: margin },
      didDrawPage: footer
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Si no hay espacio para la firma, nueva página
  if (y > 225) { doc.addPage(); y = 20; }

  // Sección de autorización
  doc.setDrawColor(204, 0, 0); doc.setLineWidth(0.8);
  doc.line(margin, y, W - margin, y);
  y += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(30, 30, 30);
  doc.text('AUTORIZACIÓN DE SERVICIOS', margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70, 70, 70);
  const authText = 'Por medio de la presente, yo el cliente abajo firmante, autorizo a Yeyo Moto Taller & Refaccionaria a realizar los servicios descritos en esta orden de trabajo. Declaro haber leído y aceptado los términos y condiciones del servicio.';
  const splitAuth = doc.splitTextToSize(authText, W - margin * 2);
  doc.text(splitAuth, margin, y);
  y += splitAuth.length * 4.8 + 14;

  // Líneas de firma
  const lineW = 78;
  const col1 = margin;
  const col2 = W - margin - lineW;
  doc.setDrawColor(80, 80, 80); doc.setLineWidth(0.5);
  doc.line(col1, y, col1 + lineW, y);
  doc.line(col2, y, col2 + lineW, y);
  y += 5;
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text('Firma del Cliente', col1, y);
  doc.text('Firma del Encargado', col2, y);
  y += 10;
  doc.line(col1, y, col1 + lineW, y);
  doc.line(col2, y, col2 + lineW, y);
  y += 5;
  doc.setFontSize(9); doc.setTextColor(30, 30, 30);
  doc.text('Nombre: ' + c.nombre, col1, y);
  doc.text('Fecha: ___________________________', col2, y);

  footer();
  doc.save('Orden_' + c.id + '.pdf');
  showToast('PDF exportado', 'success');
}

// ─────────────────────────────────────────────
// PDF EXPORT — COTIZACIÓN
// ─────────────────────────────────────────────
function exportQuotePDF() {
  const { jsPDF } = window.jspdf;
  const titulo = document.getElementById('q-titulo').value || 'Cotización';
  const clienteId = document.getElementById('q-cliente').value;
  const cliente = clients.find(c => c.id === clienteId);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210, margin = 15;
  doc.setFillColor(10, 10, 10); doc.rect(0, 0, W, 45, 'F');
  try { doc.addImage(LOGO_SRC, 'JPEG', margin, 5, 30, 30); } catch (e) {}
  doc.setTextColor(204, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(22);
  doc.text('YEYO MOTO TALLER', margin + 35, 16);
  doc.setFontSize(10); doc.setTextColor(200, 200, 200);
  doc.text('& REFACCIONARIA — Colima, Col.', margin + 35, 23);
  doc.setTextColor(150, 150, 150);
  doc.text('Tel: 312 104 8071 | Av. el Campesino Sur 45-B, El Moralete', margin + 35, 30);
  doc.setDrawColor(204, 0, 0); doc.setLineWidth(1); doc.line(margin, 46, W - margin, 46);
  doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'bold'); doc.setFontSize(14);
  doc.text('COTIZACIÓN', margin, 57);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(titulo, margin, 64);
  doc.text('Fecha: ' + new Date().toLocaleDateString('es-MX'), W - margin, 57, { align: 'right' });
  if (cliente) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('CLIENTE:', margin, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente.nombre} | Tel: ${cliente.telefono} | ${cliente.moto} ${cliente.modelo} | Placas: ${cliente.placas}`, margin + 20, 72);
  }
  const startY = cliente ? 80 : 72;
  const tableData = quoteRows.map(r => {
    const piecesText = (r.pieces || []).map(p => `${p.nombre || '—'} x${p.cant || 1} @ $${(parseFloat(p.precio) || 0).toFixed(2)} = $${((parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0)).toFixed(2)}`).join('\n');
    return [r.servicio || '—', '$' + (parseFloat(r.manoObra) || 0).toFixed(2), piecesText || '—', '$' + piecesTotal(r.pieces || []).toFixed(2), '$' + rowTotal(r).toFixed(2)];
  });
  doc.autoTable({
    startY,
    head: [['SERVICIO', 'MANO DE OBRA', 'PIEZAS', 'TOTAL PIEZAS', 'TOTAL']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [204, 0, 0], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
    columnStyles: { 0: { cellWidth: 38 }, 1: { cellWidth: 28, halign: 'right' }, 2: { cellWidth: 60 }, 3: { cellWidth: 28, halign: 'right' }, 4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      doc.setFillColor(10, 10, 10); doc.rect(0, 285, W, 12, 'F');
      doc.setTextColor(150, 150, 150); doc.setFontSize(8);
      doc.text('Yeyo Moto Taller & Refaccionaria — Colima', W / 2, 292, { align: 'center' });
    }
  });
  const finalY = doc.lastAutoTable.finalY + 8;
  const grand = quoteRows.reduce((s, r) => s + rowTotal(r), 0);
  doc.setFillColor(204, 0, 0); doc.rect(W - margin - 60, finalY - 5, 60, 12, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  doc.text('TOTAL: $' + grand.toFixed(2), W - margin - 3, finalY + 3, { align: 'right' });
  doc.save('Cotizacion_' + titulo.replace(/\s+/g, '_') + '.pdf');
  showToast('PDF exportado', 'success');
}

// ─────────────────────────────────────────────
// EXPORT CSV
// ─────────────────────────────────────────────
async function exportClients() {
  if (!clients.length) { showToast('No hay clientes'); return; }
  const result = await window.api.exportCSV(clients);
  if (result.ok) showToast('✓ Clientes exportados', 'success');
}

// ─────────────────────────────────────────────
// RESET MODAL
// ─────────────────────────────────────────────
function openResetModal() {
  document.getElementById('reset-confirm-input').value = '';
  const btn = document.getElementById('reset-confirm-btn');
  btn.disabled = true; btn.style.background = '#8b0000'; btn.style.color = 'rgba(240,240,240,.3)'; btn.style.cursor = 'not-allowed';
  document.getElementById('reset-overlay').style.display = 'flex';
}
function closeResetModal(e) { if (e.target === document.getElementById('reset-overlay')) closeResetModalDirect(); }
function closeResetModalDirect() { document.getElementById('reset-overlay').style.display = 'none'; }
function checkResetWord() {
  const val = document.getElementById('reset-confirm-input').value;
  const btn = document.getElementById('reset-confirm-btn');
  if (val === 'YEYO') { btn.disabled = false; btn.style.background = 'var(--red-b)'; btn.style.color = 'white'; btn.style.cursor = 'pointer'; }
  else { btn.disabled = true; btn.style.background = '#8b0000'; btn.style.color = 'rgba(240,240,240,.3)'; btn.style.cursor = 'not-allowed'; }
}
async function executeReset() {
  await window.api.resetAll();
  clients = []; savedQuotes = [];
  closeResetModalDirect();
  updateCountBadge();
  renderClients();
  showToast('Base de datos limpiada', 'success');
}

// ─────────────────────────────────────────────
// QUOTE VIEW MODAL
// ─────────────────────────────────────────────
function closeQViewModal(e) { if (e.target === document.getElementById('qview-overlay')) closeQViewModalDirect(); }
function closeQViewModalDirect() { document.getElementById('qview-overlay').style.display = 'none'; }

// ─────────────────────────────────────────────
// RESÚMENES
// ─────────────────────────────────────────────
function initResumenDate() {
  const input = document.getElementById('resumen-fecha');
  if (input) {
    input.value = new Date().toISOString().split('T')[0];
    // Set logo
    const logoImg = document.getElementById('resumen-logo');
    if (logoImg) logoImg.src = LOGO_SRC;
  }
}

function renderResumen() {
  const fecha = document.getElementById('resumen-fecha').value;
  if (!fecha) return;

  // Filter quotes by selected date
  const dayQuotes = savedQuotes.filter(qt => (qt.fecha || '').startsWith(fecha));

  const list = document.getElementById('resumen-list');

  if (!dayQuotes.length) {
    list.innerHTML = `<div class="resumen-empty">
      <svg viewBox="0 0 24 24" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      No hay cotizaciones guardadas para el <strong style="color:var(--white);">${formatDate(fecha)}</strong>
    </div>`;
    // Reset stats
    document.querySelector('#stat-mo .sb-val').textContent = '$0.00';
    document.querySelector('#stat-pz .sb-val').textContent = '$0.00';
    document.querySelector('#stat-tot .sb-val').textContent = '$0.00';
    return;
  }

  // Calculate totals
  let totalMO = 0, totalPiezas = 0;

  dayQuotes.forEach(qt => {
    (qt.rows || []).forEach(r => {
      totalMO += parseFloat(r.manoObra) || 0;
      (r.pieces || []).forEach(p => {
        totalPiezas += (parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0);
      });
    });
  });

  const totalDia = totalMO + totalPiezas;

  // Render quote cards
  list.innerHTML = dayQuotes.map(qt => {
    const qtMO = (qt.rows || []).reduce((s, r) => s + (parseFloat(r.manoObra) || 0), 0);
    const qtPZ = (qt.rows || []).reduce((s, r) =>
      s + (r.pieces || []).reduce((a, p) => a + (parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0), 0), 0);
    const qtTot = qtMO + qtPZ;
    return `
      <div class="resumen-cot-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="rcct">${qt.titulo}</div>
            <div class="rccm">👤 ${qt.cliente_nombre || 'Sin cliente'}${qt.cliente_telefono ? ' · 📞 ' + qt.cliente_telefono : ''}</div>
            <div class="rccm" style="margin-top:.35rem;display:flex;gap:1rem;">
              <span>M.O: <strong style="color:var(--red-b);">$${qtMO.toFixed(2)}</strong></span>
              <span>Piezas: <strong style="color:var(--yellow);">$${qtPZ.toFixed(2)}</strong></span>
            </div>
          </div>
          <div class="rccs">$${qtTot.toFixed(2)}</div>
        </div>
      </div>
    `;
  }).join('');

  // Update stat blocks
  document.querySelector('#stat-mo .sb-val').textContent = '$' + totalMO.toFixed(2);
  document.querySelector('#stat-pz .sb-val').textContent = '$' + totalPiezas.toFixed(2);
  document.querySelector('#stat-tot .sb-val').textContent = '$' + totalDia.toFixed(2);
}

// ─────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────
function showToast(msg, type = 'error') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'success' ? ' success' : '');
  setTimeout(() => { t.className = 'toast'; }, 3000);
}
