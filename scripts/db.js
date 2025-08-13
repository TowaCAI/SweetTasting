// scripts/db.js

const DB_NAME = 'SweetTastingDB';
const DB_VERSION = 1;
let db;

const STORES = {
    gastos: 'gastos',
    ventas: 'ventas',
    productos: 'productos',
    config: 'config'
};

/**
 * Abre y prepara la conexión con la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>} Una promesa que se resuelve con la instancia de la base de datos.
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject('Error al abrir la base de datos');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = event.target.result;
            if (!tempDb.objectStoreNames.contains(STORES.gastos)) {
                tempDb.createObjectStore(STORES.gastos, { keyPath: 'id', autoIncrement: true });
            }
            if (!tempDb.objectStoreNames.contains(STORES.ventas)) {
                tempDb.createObjectStore(STORES.ventas, { keyPath: 'id', autoIncrement: true });
            }
            if (!tempDb.objectStoreNames.contains(STORES.productos)) {
                tempDb.createObjectStore(STORES.productos, { keyPath: 'id', autoIncrement: true });
            }
            if (!tempDb.objectStoreNames.contains(STORES.config)) {
                // Usamos un 'key' fijo para la configuración, ya que solo hay un objeto de config.
                tempDb.createObjectStore(STORES.config, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Obtiene todos los registros de un object store.
 * @param {string} storeName - El nombre del object store.
 * @returns {Promise<Array<any>>} Una promesa que se resuelve con un array de registros.
 */
async function getAll(storeName) {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onerror = (event) => reject(`Error al obtener datos de ${storeName}: ${event.target.error}`);
        request.onsuccess = (event) => resolve(event.target.result);
    });
}

/**
 * Agrega un nuevo registro a un object store.
 * @param {string} storeName - El nombre del object store.
 * @param {object} item - El objeto a agregar.
 * @returns {Promise<IDBValidKey>} Una promesa que se resuelve con la clave del nuevo registro.
 */
async function add(storeName, item) {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(item);

        request.onerror = (event) => reject(`Error al agregar en ${storeName}: ${event.target.error}`);
        request.onsuccess = (event) => resolve(event.target.result);
    });
}

/**
 * Elimina un registro de un object store por su ID.
 * @param {string} storeName - El nombre del object store.
 * @param {number} id - El ID del registro a eliminar.
 * @returns {Promise<void>}
 */
async function remove(storeName, id) {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onerror = (event) => reject(`Error al eliminar en ${storeName}: ${event.target.error}`);
        request.onsuccess = () => resolve();
    });
}

/**
 * Guarda o actualiza un registro. Útil para la configuración.
 * @param {string} storeName - El nombre del object store.
 * @param {object} item - El objeto a guardar/actualizar.
 * @returns {Promise<IDBValidKey>}
 */
async function put(storeName, item) {
    await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(item);

        request.onerror = (event) => reject(`Error al actualizar en ${storeName}: ${event.target.error}`);
        request.onsuccess = (event) => resolve(event.target.result);
    });
}


window.db = {
    initDB,
    getAll,
    add,
    remove,
    put,
    STORES
};
