const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { initDB, getDB } = require('./db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'YeyoSistema — Moto Taller & Refaccionaria',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'src', 'preload.js')
    },
    backgroundColor: '#0a0a0a',
    show: false
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  initDB();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────
// IPC — CLIENTES
// ─────────────────────────────────────────────
ipcMain.handle('clientes:getAll', () => {
  const db = getDB();
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY created_at DESC').all();
  return clientes.map(c => ({
    ...c,
    servicios: JSON.parse(c.servicios || '[]'),
    fotos: getFotos(c.id)
  }));
});

ipcMain.handle('clientes:save', (_, cliente) => {
  const db = getDB();
  const id = 'YMT-' + String(nextClientID()).padStart(4, '0');
  db.prepare(`
    INSERT INTO clientes (id, nombre, telefono, moto, modelo, color, placas, ingreso, detalles, status, servicios)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    cliente.nombre,
    cliente.telefono,
    cliente.moto,
    cliente.modelo,
    cliente.color,
    cliente.placas,
    cliente.ingreso,
    cliente.detalles,
    cliente.status,
    JSON.stringify(cliente.servicios || [])
  );
  // Save photos
  if (cliente.fotos && cliente.fotos.length) {
    saveFotos(db, id, cliente.fotos);
  }
  return { id };
});

ipcMain.handle('clientes:update', (_, cliente) => {
  const db = getDB();
  db.prepare(`
    UPDATE clientes SET nombre=?, telefono=?, moto=?, modelo=?, color=?, placas=?, detalles=?, status=?, servicios=?
    WHERE id=?
  `).run(
    cliente.nombre,
    cliente.telefono,
    cliente.moto,
    cliente.modelo,
    cliente.color,
    cliente.placas,
    cliente.detalles,
    cliente.status,
    JSON.stringify(cliente.servicios || []),
    cliente.id
  );
  return { ok: true };
});

ipcMain.handle('clientes:delete', (_, id) => {
  const db = getDB();
  db.prepare('DELETE FROM fotos WHERE cliente_id=?').run(id);
  db.prepare('DELETE FROM clientes WHERE id=?').run(id);
  return { ok: true };
});

ipcMain.handle('clientes:resetAll', () => {
  const db = getDB();
  db.prepare('DELETE FROM fotos').run();
  db.prepare('DELETE FROM clientes').run();
  db.prepare('DELETE FROM cotizaciones').run();
  db.prepare('DELETE FROM cotizacion_rows').run();
  db.prepare('DELETE FROM cotizacion_piezas').run();
  db.prepare("UPDATE counters SET value=0 WHERE name='cliente'").run();
  db.prepare("UPDATE counters SET value=0 WHERE name='cotizacion'").run();
  return { ok: true };
});

// ─────────────────────────────────────────────
// IPC — FOTOS
// ─────────────────────────────────────────────
function getFotos(clienteId) {
  const db = getDB();
  const rows = db.prepare('SELECT data FROM fotos WHERE cliente_id=? ORDER BY orden').all(clienteId);
  return rows.map(r => r.data);
}

function saveFotos(db, clienteId, fotos) {
  db.prepare('DELETE FROM fotos WHERE cliente_id=?').run(clienteId);
  const stmt = db.prepare('INSERT INTO fotos (cliente_id, data, orden) VALUES (?,?,?)');
  fotos.forEach((f, i) => stmt.run(clienteId, f, i));
}

ipcMain.handle('fotos:upload', async (_, clienteId) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Imágenes', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }]
  });
  if (result.canceled) return [];
  const base64s = result.filePaths.map(fp => {
    const buf = fs.readFileSync(fp);
    const ext = path.extname(fp).slice(1).toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  });
  return base64s;
});

// ─────────────────────────────────────────────
// IPC — COTIZACIONES
// ─────────────────────────────────────────────
ipcMain.handle('cotizaciones:getAll', () => {
  const db = getDB();
  const cots = db.prepare('SELECT * FROM cotizaciones ORDER BY created_at DESC').all();
  return cots.map(cot => {
    const rows = db.prepare('SELECT * FROM cotizacion_rows WHERE cotizacion_id=? ORDER BY orden').all(cot.id);
    const rowsWithPieces = rows.map(r => ({
      id: r.id,
      servicio: r.servicio,
      manoObra: r.mano_obra,
      pieces: db.prepare('SELECT * FROM cotizacion_piezas WHERE row_id=? ORDER BY orden').all(r.id).map(p => ({
        nombre: p.nombre,
        cant: p.cant,
        precio: p.precio
      }))
    }));
    return { ...cot, rows: rowsWithPieces };
  });
});

ipcMain.handle('cotizaciones:save', (_, cot) => {
  const db = getDB();
  const grand = (cot.rows || []).reduce((s, r) => {
    const mo = parseFloat(r.manoObra) || 0;
    const pz = (r.pieces || []).reduce((a, p) => a + (parseFloat(p.cant) || 0) * (parseFloat(p.precio) || 0), 0);
    return s + mo + pz;
  }, 0);

  // Upsert cotizacion
  const existing = db.prepare('SELECT id FROM cotizaciones WHERE titulo=?').get(cot.titulo);
  let cotId;
  if (existing) {
    db.prepare(`UPDATE cotizaciones SET cliente_id=?, cliente_nombre=?, cliente_telefono=?, fecha=?, total=? WHERE titulo=?`)
      .run(cot.clienteId || null, cot.clienteNombre || 'Sin cliente', cot.clienteTelefono || '', cot.fecha, grand, cot.titulo);
    cotId = existing.id;
    db.prepare('DELETE FROM cotizacion_piezas WHERE row_id IN (SELECT id FROM cotizacion_rows WHERE cotizacion_id=?)').run(cotId);
    db.prepare('DELETE FROM cotizacion_rows WHERE cotizacion_id=?').run(cotId);
  } else {
    const info = db.prepare(`INSERT INTO cotizaciones (titulo, cliente_id, cliente_nombre, cliente_telefono, fecha, total) VALUES (?,?,?,?,?,?)`)
      .run(cot.titulo, cot.clienteId || null, cot.clienteNombre || 'Sin cliente', cot.clienteTelefono || '', cot.fecha, grand);
    cotId = info.lastInsertRowid;
  }

  // Insert rows and pieces
  const rowStmt = db.prepare('INSERT INTO cotizacion_rows (cotizacion_id, servicio, mano_obra, orden) VALUES (?,?,?,?)');
  const pieceStmt = db.prepare('INSERT INTO cotizacion_piezas (row_id, nombre, cant, precio, orden) VALUES (?,?,?,?,?)');
  (cot.rows || []).forEach((r, i) => {
    const rowInfo = rowStmt.run(cotId, r.servicio || '', parseFloat(r.manoObra) || 0, i);
    (r.pieces || []).forEach((p, j) => {
      pieceStmt.run(rowInfo.lastInsertRowid, p.nombre || '', parseFloat(p.cant) || 1, parseFloat(p.precio) || 0, j);
    });
  });
  return { ok: true };
});

ipcMain.handle('cotizaciones:delete', (_, titulo) => {
  const db = getDB();
  const cot = db.prepare('SELECT id FROM cotizaciones WHERE titulo=?').get(titulo);
  if (cot) {
    db.prepare('DELETE FROM cotizacion_piezas WHERE row_id IN (SELECT id FROM cotizacion_rows WHERE cotizacion_id=?)').run(cot.id);
    db.prepare('DELETE FROM cotizacion_rows WHERE cotizacion_id=?').run(cot.id);
    db.prepare('DELETE FROM cotizaciones WHERE id=?').run(cot.id);
  }
  return { ok: true };
});

// ─────────────────────────────────────────────
// IPC — COUNTERS
// ─────────────────────────────────────────────
function nextClientID() {
  const db = getDB();
  db.prepare("UPDATE counters SET value=value+1 WHERE name='cliente'").run();
  return db.prepare("SELECT value FROM counters WHERE name='cliente'").get().value;
}

ipcMain.handle('counters:nextQuote', () => {
  const db = getDB();
  db.prepare("UPDATE counters SET value=value+1 WHERE name='cotizacion'").run();
  const val = db.prepare("SELECT value FROM counters WHERE name='cotizacion'").get().value;
  return 'COT-' + String(val).padStart(4, '0');
});

// ─────────────────────────────────────────────
// IPC — EXPORT CSV
// ─────────────────────────────────────────────
ipcMain.handle('export:clientesCSV', async (_, clientes) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'Clientes_Yeyo_Mototaller.csv',
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  });
  if (result.canceled) return { ok: false };
  let csv = '\uFEFF';
  csv += 'ID,NOMBRE,TELEFONO,MOTO,MODELO,COLOR,PLACAS,DIA DE INGRESO,STATUS,DETALLES\n';
  clientes.forEach(c => {
    const ing = c.ingreso ? c.ingreso.split('-').reverse().join('/') : '—';
    csv += [c.id||'', `"${c.nombre}"`, `"${c.telefono}"`, `"${c.moto}"`, `"${c.modelo}"`,
      `"${c.color}"`, `"${c.placas}"`, ing, c.status||'', `"${(c.detalles||'').replace(/"/g,"'")}"`].join(',') + '\n';
  });
  fs.writeFileSync(result.filePath, csv, 'utf8');
  shell.showItemInFolder(result.filePath);
  return { ok: true };
});
