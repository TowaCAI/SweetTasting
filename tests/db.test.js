// tests/db.test.js
const test = require('node:test');
const assert = require('node:assert');
// Simula IndexedDB en Node.js
require('fake-indexeddb/auto');

// Carga el script de DB para que se ejecute en el entorno simulado
require('../scripts/db.js');

test.describe('Database Operations', () => {
    test('should initialize the database and create object stores', async () => {
        const db = await window.db.initDB();
        assert.ok(db instanceof IDBDatabase);
        assert.ok(db.objectStoreNames.contains(window.db.STORES.gastos));
        assert.ok(db.objectStoreNames.contains(window.db.STORES.ventas));
        assert.ok(db.objectStoreNames.contains(window.db.STORES.productos));
    });

    test('should add and get an item from a store', async () => {
        const newItem = { concepto: 'Harina', costo: 500 };
        const id = await window.db.add(window.db.STORES.gastos, newItem);
        assert.strictEqual(typeof id, 'number');

        const allItems = await window.db.getAll(window.db.STORES.gastos);
        assert.strictEqual(allItems.length, 1);
        assert.strictEqual(allItems[0].concepto, 'Harina');
    });

    test('should remove an item from a store', async () => {
        const newItem = { concepto: 'Azúcar', costo: 700 };
        const id = await window.db.add(window.db.STORES.gastos, newItem);
        
        await window.db.remove(window.db.STORES.gastos, id);
        const item = await window.db.getAll(window.db.STORES.gastos);
        // Filtramos para buscar el que acabamos de borrar
        const deletedItem = item.find(i => i.id === id);
        assert.strictEqual(deletedItem, undefined);
    });
});
