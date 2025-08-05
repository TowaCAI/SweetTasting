const test = require('node:test');
const assert = require('node:assert');
const { calcularCostoUnitario } = require('../scripts/utils');

test('calcula el costo por unidad', () => {
  assert.strictEqual(calcularCostoUnitario(100, 4), 25);
});

test('lanza un error si la cantidad es cero', () => {
  assert.throws(() => calcularCostoUnitario(100, 0), /La cantidad no puede ser cero/);
});
