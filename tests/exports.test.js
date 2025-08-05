test = require('node:test');
assert = require('node:assert');

// Prepare global stubs for datos and XLSX
const llamadas = [];

global.gastos = [{fecha:'2025-01-01', concepto:'Leche', cantidad:1, unidad:'lt', costo:100, categoria:'Ingredientes'}];
global.ventas = [{fecha:'2025-01-01', producto:'Torta', cantidad:2, precio:50, total:100, cliente:'Ana', metodoPago:'Efectivo'}];
global.productos = [{nombre:'Torta', descripcion:'desc', costoProduccion:30, precioVenta:50, tiempoPreparacion:'1h', categoria:'Tortas', stock:5, stockMinimo:1}];

global.XLSX = {
  utils: {
    json_to_sheet: data => data,
    book_new: () => ({ sheets: [] }),
    book_append_sheet: (wb, ws, name) => { wb.sheets.push({ name, data: ws }); }
  },
  writeFile: (wb, filename) => { llamadas.push({ wb, filename }); }
};

const { exportarDatosExcel, descargarGrafico } = require('../scripts/scripts');

// Tests for exportarDatosExcel

test('exportarDatosExcel genera un workbook con tres hojas', () => {
  exportarDatosExcel();
  assert.strictEqual(llamadas.length, 1);
  const wb = llamadas[0].wb;
  assert.strictEqual(wb.sheets.length, 3);
  assert.deepStrictEqual(wb.sheets.map(s => s.name), ['Gastos','Ventas','Productos']);
  assert.ok(llamadas[0].filename.startsWith('SweetTasting_export_'));
});

// Tests for descargarGrafico

// Stub simple document
function createDocumentStub(canvasExists) {
  return {
    getElementById: id => canvasExists ? { toDataURL: () => 'data:image/png;base64,x', } : null,
    createElement: tag => ({ href:'', download:'', click: function(){ this.clicked = true; } })
  };
}

test('descargarGrafico no falla si canvas no existe', () => {
  global.document = createDocumentStub(false);
  assert.doesNotThrow(() => descargarGrafico('none'));
});

test('descargarGrafico dispara descarga cuando el canvas existe', () => {
  const doc = createDocumentStub(true);
  let clicked = false;
  doc.createElement = tag => ({ href:'', download:'', click: () => { clicked = true; } });
  global.document = doc;
  descargarGrafico('grafico');
  assert.strictEqual(clicked, true);
});
