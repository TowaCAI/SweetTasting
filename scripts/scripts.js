// scripts/scripts.js

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', inicializarApp);
}

// Estado de la aplicación en memoria
let state = {
    gastos: [],
    ventas: [],
    productos: [],
    config: { id: 'main', metaIngresos: 0, metaVentas: 0 }
};

/**
 * Punto de entrada principal. Se ejecuta cuando el DOM está listo.
 */
async function inicializarApp() {
    await cargarDatosIniciales();
    configurarEventListeners();
    actualizarTodasLasVistas();
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = 'block';
}

/**
 * Carga todos los datos desde IndexedDB al estado de la aplicación.
 */
async function cargarDatosIniciales() {
    try {
        await window.db.initDB();
        const [gastos, ventas, productos, config] = await Promise.all([
            window.db.getAll(window.db.STORES.gastos),
            window.db.getAll(window.db.STORES.ventas),
            window.db.getAll(window.db.STORES.productos),
            window.db.getAll(window.db.STORES.config)
        ]);
        state.gastos = gastos;
        state.ventas = ventas;
        state.productos = productos;
        // Si hay configuración guardada, la usamos. Si no, usamos la por defecto.
        if (config.length > 0) {
            state.config = config[0];
        } else {
            // Guardamos la configuración inicial si no existe
            await window.db.put(window.db.STORES.config, state.config);
        }
    } catch (error) {
        console.error("No se pudieron cargar los datos:", error);
        mostrarNotificacion("Error crítico al cargar la base de datos.", "error");
    }
}

/**
 * Centraliza la asignación de todos los event listeners de la UI.
 */
function configurarEventListeners() {
    // Navegación por pestañas
    document.querySelector('.tabs').addEventListener('click', (e) => {
        if (e.target.matches('.tab')) {
            const tabName = e.target.dataset.tab;
            showTab(tabName, e);
        }
    });

    // Formularios
    document.getElementById('formGasto').addEventListener('submit', agregarGasto);
    document.getElementById('formVenta').addEventListener('submit', agregarVenta);
    document.getElementById('formProducto').addEventListener('submit', agregarProducto);

    // Activación de validación en tiempo real
    validarFormularioEnTiempoReal('formGasto');
    validarFormularioEnTiempoReal('formVenta');
    validarFormularioEnTiempoReal('formProducto');

    // Botones de calculadoras, configuración, etc.
    // ... (añadir listeners para otras calculadoras si es necesario)
}

/**
 * Refresca todos los componentes de la UI con los datos del estado actual.
 */
function actualizarTodasLasVistas() {
    actualizarTablaGastos();
    actualizarTablaVentas();
    actualizarTablaProductos();
    actualizarSelectProductos();
    actualizarDashboard();
    // Idealmente, los gráficos también se actualizarían aquí.
}

// =============================================
// SECCIÓN DE VALIDACIÓN DE FORMULARIOS
// =============================================

/**
 * Habilita la validación en tiempo real para un formulario.
 * @param {string} formId - El ID del formulario.
 */
function validarFormularioEnTiempoReal(formId) {
    const form = document.getElementById(formId);
    const submitButton = form.querySelector('button[type="submit"]');
    const inputs = form.querySelectorAll('input, select');

    const validarYActualizarBoton = () => {
        const esValido = form.checkValidity();
        submitButton.disabled = !esValido;
    };

    inputs.forEach(input => {
        input.addEventListener('input', () => {
            validarInput(input);
            validarYActualizarBoton();
        });
    });

    // Estado inicial del botón
    validarYActualizarBoton();
}

/**
 * Valida un campo de input individual y muestra/oculta mensajes de error.
 * @param {HTMLInputElement|HTMLSelectElement} input - El elemento del DOM a validar.
 */
function validarInput(input) {
    let errorContainer = input.parentNode.querySelector('.error-message');
    if (!errorContainer) {
        errorContainer = document.createElement('div');
        errorContainer.className = 'error-message';
        input.parentNode.appendChild(errorContainer);
    }

    if (input.validity.valid) {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
        input.classList.remove('invalid');
    } else {
        errorContainer.textContent = input.validationMessage;
        errorContainer.style.display = 'block';
        input.classList.add('invalid');
    }
}

// =============================================
// SECCIÓN DE GASTOS
// =============================================

async function agregarGasto(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    const gasto = {
        fecha: formData.get('fechaGasto'),
        concepto: formData.get('conceptoGasto'),
        cantidad: parseFloat(formData.get('cantidadGasto')),
        unidad: formData.get('unidadGasto'),
        costo: parseFloat(formData.get('costoGasto')),
        categoria: formData.get('categoriaGasto')
    };

    try {
        const id = await window.db.add(window.db.STORES.gastos, gasto);
        gasto.id = id; // Asignamos el id retornado por la DB
        state.gastos.push(gasto);
        mostrarNotificacion('Gasto agregado con éxito');
        form.reset();
        actualizarTodasLasVistas();
    } catch (error) {
        mostrarNotificacion('Error al guardar el gasto', 'error');
        console.error(error);
    }
}

async function eliminarGasto(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este gasto?')) {
        try {
            await window.db.remove(window.db.STORES.gastos, id);
            state.gastos = state.gastos.filter(g => g.id !== id);
            mostrarNotificacion('Gasto eliminado');
            actualizarTodasLasVistas();
        } catch (error) {
            mostrarNotificacion('Error al eliminar el gasto', 'error');
        }
    }
}

function actualizarTablaGastos() {
    const tbody = document.getElementById('tablaGastos');
    tbody.innerHTML = ''; // Limpiar tabla
    state.gastos.forEach(gasto => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${gasto.fecha}</td>
            <td>${gasto.concepto}</td>
            <td>${gasto.cantidad}</td>
            <td>${gasto.unidad}</td>
            <td>$${gasto.costo.toLocaleString()}</td>
            <td>${gasto.categoria}</td>
            <td><button class="delete-btn" onclick="eliminarGasto(${gasto.id})">Eliminar</button></td>
        `;
    });
}

// =============================================
// SECCIÓN DE VENTAS (Similar a Gastos)
// =============================================
async function agregarVenta(event) {
    event.preventDefault();
    // Lógica similar a agregarGasto
    // ...
}

async function eliminarVenta(id) {
    // Lógica similar a eliminarGasto
    // ...
}

function actualizarTablaVentas() {
    // Lógica similar a actualizarTablaGastos
    // ...
}

// =============================================
// SECCIÓN DE PRODUCTOS (Similar a Gastos)
// =============================================

async function agregarProducto(event) {
    event.preventDefault();
    // Lógica similar a agregarGasto
    // ...
}

async function eliminarProducto(id) {
    // Lógica similar a eliminarGasto
    // ...
}

function actualizarTablaProductos() {
    // Lógica similar a actualizarTablaGastos
    // ...
}

// =============================================
// OTRAS FUNCIONES (UI, Notificaciones, etc.)
// =============================================

/**
 * Muestra una pestaña de contenido y activa el botón correspondiente.
 * @param {string} tabName - El data-tab de la pestaña a mostrar.
 * @param {Event} event - El evento de click original.
 */
function showTab(tabName, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

/**
 * Muestra una notificación temporal en la pantalla.
 * @param {string} mensaje - El texto a mostrar.
 * @param {'success'|'error'} tipo - El tipo de notificación.
 */
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
    setTimeout(() => notificacion.remove(), 3000);
}

function actualizarSelectProductos() {
    const select = document.getElementById('productoVenta');
    select.innerHTML = '<option value="">Seleccionar producto</option>';
    state.productos.forEach(producto => {
        const option = new Option(producto.nombre, producto.nombre);
        select.add(option);
    });
}

function actualizarDashboard() {
    const totalGastado = state.gastos.reduce((sum, g) => sum + g.costo, 0);
    const totalVendido = state.ventas.reduce((sum, v) => sum + v.total, 0);
    const gananciaNeta = totalVendido - totalGastado;
    const margen = totalVendido > 0 ? (gananciaNeta / totalVendido) * 100 : 0;

    document.getElementById('totalGastado').textContent = `$${totalGastado.toLocaleString()}`;
    document.getElementById('totalVendido').textContent = `$${totalVendido.toLocaleString()}`;
    document.getElementById('gananciaNeta').textContent = `$${gananciaNeta.toLocaleString()}`;
    document.getElementById('margenGanancia').textContent = `${margen.toFixed(1)}%`;
}

// =============================================
// FUNCIONES ADICIONALES PARA PRUEBAS Y EXPORTACIÓN
// =============================================

function exportarDatosExcel() {
    const gastos = (typeof global !== 'undefined' && Array.isArray(global.gastos)) ? global.gastos : state.gastos;
    const ventas = (typeof global !== 'undefined' && Array.isArray(global.ventas)) ? global.ventas : state.ventas;
    const productos = (typeof global !== 'undefined' && Array.isArray(global.productos)) ? global.productos : state.productos;

    const ws_gastos = XLSX.utils.json_to_sheet(gastos);
    const ws_ventas = XLSX.utils.json_to_sheet(ventas);
    const ws_productos = XLSX.utils.json_to_sheet(productos);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_gastos, 'Gastos');
    XLSX.utils.book_append_sheet(wb, ws_ventas, 'Ventas');
    XLSX.utils.book_append_sheet(wb, ws_productos, 'Productos');

    const filename = 'SweetTasting_export_' + new Date().toISOString().slice(0,10) + '.xlsx';
    XLSX.writeFile(wb, filename);
}

function descargarGrafico(idCanvas) {
    const canvas = document.getElementById(idCanvas);
    if (!canvas) {
        console.error(`No se encontró el canvas con id ${idCanvas}`);
        return;
    }
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = idCanvas + '.png';
    a.click();
}

if (typeof module !== 'undefined') {
    module.exports = { exportarDatosExcel, descargarGrafico };
}

