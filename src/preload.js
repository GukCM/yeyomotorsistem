const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Clientes
  getClientes:    ()       => ipcRenderer.invoke('clientes:getAll'),
  saveCliente:    (c)      => ipcRenderer.invoke('clientes:save', c),
  updateCliente:  (c)      => ipcRenderer.invoke('clientes:update', c),
  deleteCliente:  (id)     => ipcRenderer.invoke('clientes:delete', id),
  resetAll:       ()       => ipcRenderer.invoke('clientes:resetAll'),

  // Fotos
  uploadFotos:    (cid)    => ipcRenderer.invoke('fotos:upload', cid),

  // Cotizaciones
  getCotizaciones: ()      => ipcRenderer.invoke('cotizaciones:getAll'),
  saveCotizacion:  (cot)   => ipcRenderer.invoke('cotizaciones:save', cot),
  deleteCotizacion:(titulo)=> ipcRenderer.invoke('cotizaciones:delete', titulo),

  // Counters
  nextQuoteID:    ()       => ipcRenderer.invoke('counters:nextQuote'),

  // Export
  exportCSV:      (data)   => ipcRenderer.invoke('export:clientesCSV', data),
});
