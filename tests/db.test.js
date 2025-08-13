// tests/db.test.js
const test = require('node:test');
const assert = require('node:assert');
// Simula IndexedDB en Node.js
require('fake-indexeddb/auto');

// Importa la API de la base de datos desde el script
const db = require('../scripts/db.js');

test.describe('Database Operations', () => {
    test('should initialize the database and create object stores', async () => {
        const database = await db.initDB();
        assert.ok(database instanceof IDBDatabase);
        assert.ok(database.objectStoreNames.contains(db.STORES.gastos));
        assert.ok(database.objectStoreNames.contains(db.STORES.ventas));
        assert.ok(database.objectStoreNames.contains(db.STORES.productos));
    });

    test('should add and get an item from a store', async () => {
        const newItem = { concepto: 'Harina', costo: 500 };
        const id = await db.add(db.STORES.gastos, newItem);
        assert.strictEqual(typeof id, 'number');

        const allItems = await db.getAll(db.STORES.gastos);
        assert.strictEqual(allItems.length, 1);
        assert.strictEqual(allItems[0].concepto, 'Harina');
    });

    test('should remove an item from a store', async () => {
        const newItem = { concepto: 'Azúcar', costo: 700 };
        const id = await db.add(db.STORES.gastos, newItem);

        await db.remove(db.STORES.gastos, id);
        const item = await db.getAll(db.STORES.gastos);
        // Filtramos para buscar el que acabamos de borrar
        const deletedItem = item.find(i => i.id === id);
        assert.strictEqual(deletedItem, undefined);
    });
});
