if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        // Muestra el contenido principal cuando el DOM está listo
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.style.display = '';
        inicializarAplicacion();
    });
}

// Datos en memoria (persistidos en localStorage)
let gastos = [];
let ventas = [];
let productos = [];
let config = {
    metaIngresos: 0,
    metaVentas: 0,
    notificadoMetaIngresos: false,
    notificadoMetaVentas: false,
    notificadosStock: []
};
let swRegistro = null;
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(reg => {
        swRegistro = reg;
    });
}

// === Funciones de persistencia ===
function cargarDatos() {
    const datosGuardados = localStorage.getItem('sweetTastingData');
    if (datosGuardados) {
        try {
            const datos = JSON.parse(datosGuardados);
            gastos = datos.gastos || [];
            ventas = datos.ventas || [];
            productos = datos.productos || [];
            config = datos.config || config;
            return true;
        } catch (e) {
            console.error("Error al cargar datos:", e);
            return false;
        }
    }
    return false;
}

function guardarDatos() {
    const datos = {
        gastos,
        ventas,
        productos,
        config
    };
    localStorage.setItem('sweetTastingData', JSON.stringify(datos));
}

// Inicializar con datos proporcionados
function inicializarDatos() {
    if (!cargarDatos()) {
        gastos = [
            { id: Date.now() + 1, fecha: '2025-07-11', concepto: 'Leche', cantidad: 1, unidad: 'litro', costo: 2100, categoria: 'Ingredientes' },
            { id: Date.now() + 2, fecha: '2025-07-11', concepto: 'Dulce de leche', cantidad: 1, unidad: 'kg', costo: 3200, categoria: 'Ingredientes' },
        ];
        ventas = [];
        productos = [];
    }
    actualizarTodasLasVistas();
}

function actualizarTodasLasVistas() {
    actualizarTablaGastos();
    actualizarTablaVentas();
    actualizarTablaProductos();
    actualizarSelectProductos();
    actualizarDashboard();
    actualizarGraficosDashboard();
    actualizarCostoIngredientes();
    actualizarFormularioConfiguracion();
}

function inicializarAplicacion() {
    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaGasto').value = hoy;
    document.getElementById('fechaVenta').value = hoy;

    inicializarDatos();
    solicitarPermisoNotificaciones();
    agregarEventListeners();
}

function agregarEventListeners() {
    // Navegación
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (event) => showTab(event.target.dataset.tab, event));
    });

    // Acciones principales
    document.querySelector('#gastos button').addEventListener('click', agregarGasto);
    document.querySelector('#ventas button').addEventListener('click', agregarVenta);
    document.querySelector('#productos button').addEventListener('click', agregarProducto);
    document.querySelector('#calculadora button').addEventListener('click', calcularPrecio);
    document.querySelector('#configuracion button[onclick="guardarConfiguracion()"]')
        .addEventListener('click', guardarConfiguracion);

    // Filtros y búsquedas
    ['busquedaGastos', 'filtroFechaDesdeGasto', 'filtroFechaHastaGasto', 'filtroCategoriaGasto'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarTablaGastos);
    });
    document.querySelector('#gastos .filtros-tabla button').addEventListener('click', limpiarFiltrosGastos);

    ['busquedaVentas', 'filtroFechaDesdeVenta', 'filtroFechaHastaVenta', 'filtroMetodoPago'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarTablaVentas);
    });
    document.querySelector('#ventas .filtros-tabla button').addEventListener('click', limpiarFiltrosVentas);

    ['busquedaProductos', 'filtroCategoriaProducto'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarTablaProductos);
    });
    document.querySelector('#productos .filtros-tabla button').addEventListener('click', limpiarFiltrosProductos);
}

function showTab(tabName, evt) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    if (evt && evt.target) {
        evt.target.classList.add('active');
    }
}

function agregarGasto() {
    const fecha = document.getElementById('fechaGasto').value;
    const concepto = document.getElementById('conceptoGasto').value;
    const cantidad = parseFloat(document.getElementById('cantidadGasto').value);
    const unidad = document.getElementById('unidadGasto').value;
    const costo = parseFloat(document.getElementById('costoGasto').value);
    const categoria = document.getElementById('categoriaGasto').value;

    if (fecha && concepto && !isNaN(cantidad) && cantidad > 0 && unidad && !isNaN(costo) && costo > 0 && categoria) {
        gastos.push({ id: Date.now(), fecha, concepto, cantidad, unidad, costo, categoria });
        guardarDatos();
        mostrarNotificacion("Gasto guardado correctamente");
        document.getElementById('fechaGasto').form.reset();
        actualizarTodasLasVistas();
    } else {
        mostrarNotificacion('Por favor completa todos los campos con valores válidos', 'error');
    }
}

function eliminarGasto(id) {
    gastos = gastos.filter(g => g.id !== id);
    guardarDatos();
    mostrarNotificacion("Gasto eliminado correctamente");
    actualizarTodasLasVistas();
}

function actualizarTablaGastos() {
    const tbody = document.getElementById('tablaGastos');
    tbody.innerHTML = '';
    const txt = (document.getElementById('busquedaGastos')?.value || '').toLowerCase();
    const fDesde = document.getElementById('filtroFechaDesdeGasto')?.value;
    const fHasta = document.getElementById('filtroFechaHastaGasto')?.value;
    const categoria = document.getElementById('filtroCategoriaGasto')?.value;

    gastos
        .filter(gasto => {
            let coincide = true;
            if (txt) coincide = Object.values(gasto).some(val => String(val).toLowerCase().includes(txt));
            if (coincide && fDesde) coincide = gasto.fecha >= fDesde;
            if (coincide && fHasta) coincide = gasto.fecha <= fHasta;
            if (coincide && categoria) coincide = gasto.categoria === categoria;
            return coincide;
        })
        .forEach(gasto => {
            const row = tbody.insertRow();
            const costoUnidad = (gasto.costo / gasto.cantidad).toFixed(2);
            row.innerHTML = `
                <td>${gasto.fecha}</td>
                <td>${gasto.concepto}</td>
                <td>${gasto.cantidad}</td>
                <td>${gasto.unidad}</td>
                <td>$${gasto.costo.toLocaleString()}</td>
                <td>${gasto.categoria}</td>
                <td>$${costoUnidad}</td>
                <td><button class="delete-btn" onclick="eliminarGasto(${gasto.id})">Eliminar</button></td>
            `;
        });
    actualizarCostoIngredientes();
}

function limpiarFiltrosGastos() {
    document.getElementById('busquedaGastos').form.reset();
    actualizarTablaGastos();
}

function agregarVenta() {
    const fecha = document.getElementById('fechaVenta').value;
    const productoNombre = document.getElementById('productoVenta').value;
    const cantidad = parseFloat(document.getElementById('cantidadVenta').value);
    const precio = parseFloat(document.getElementById('precioVenta').value);
    const cliente = document.getElementById('clienteVenta').value;
    const metodoPago = document.getElementById('metodoPago').value;
    const producto = productos.find(p => p.nombre === productoNombre);

    if (producto && typeof producto.stock === 'number' && cantidad > producto.stock) {
        mostrarNotificacion('No hay suficiente stock para esta venta.', 'error');
        return;
    }

    if (fecha && productoNombre && !isNaN(cantidad) && cantidad > 0 && !isNaN(precio) && precio > 0 && metodoPago) {
        if (producto) producto.stock -= cantidad;
        ventas.push({ id: Date.now(), fecha, producto: productoNombre, cantidad, precio, cliente, metodoPago, total: cantidad * precio });
        guardarDatos();
        mostrarNotificacion("Venta registrada correctamente");
        document.getElementById('fechaVenta').form.reset();
        actualizarTodasLasVistas();
    } else {
        mostrarNotificacion('Por favor completa todos los campos obligatorios', 'error');
    }
}

function eliminarVenta(id) {
    const venta = ventas.find(v => v.id === id);
    if (venta) {
        const producto = productos.find(p => p.nombre === venta.producto);
        if (producto && typeof producto.stock === 'number') {
            producto.stock += venta.cantidad;
        }
    }
    ventas = ventas.filter(v => v.id !== id);
    guardarDatos();
    mostrarNotificacion("Venta eliminada correctamente");
    actualizarTodasLasVistas();
}

function actualizarTablaVentas() {
    const tbody = document.getElementById('tablaVentas');
    tbody.innerHTML = '';
    const txt = (document.getElementById('busquedaVentas')?.value || '').toLowerCase();
    const fDesde = document.getElementById('filtroFechaDesdeVenta')?.value;
    const fHasta = document.getElementById('filtroFechaHastaVenta')?.value;
    const metodo = document.getElementById('filtroMetodoPago')?.value;

    ventas
        .filter(venta => {
            let coincide = true;
            if (txt) coincide = Object.values(venta).some(val => String(val).toLowerCase().includes(txt));
            if (coincide && fDesde) coincide = venta.fecha >= fDesde;
            if (coincide && fHasta) coincide = venta.fecha <= fHasta;
            if (coincide && metodo) coincide = venta.metodoPago === metodo;
            return coincide;
        })
        .forEach(venta => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${venta.fecha}</td>
                <td>${venta.producto}</td>
                <td>${venta.cantidad}</td>
                <td>$${venta.precio.toLocaleString()}</td>
                <td>$${venta.total.toLocaleString()}</td>
                <td>${venta.cliente || '-'}</td>
                <td>${venta.metodoPago}</td>
                <td><button class="delete-btn" onclick="eliminarVenta(${venta.id})">Eliminar</button></td>
            `;
        });
}

function limpiarFiltrosVentas() {
    document.getElementById('busquedaVentas').form.reset();
    actualizarTablaVentas();
}

function agregarProducto() {
    const nombre = document.getElementById('nombreProducto').value;
    const descripcion = document.getElementById('descripcionProducto').value;
    const costoProduccion = parseFloat(document.getElementById('costoProduccion').value);
    const precioVenta = parseFloat(document.getElementById('precioVentaProducto').value);
    const tiempoPreparacion = parseFloat(document.getElementById('tiempoPreparacion').value);
    const stockInicial = parseFloat(document.getElementById('stockInicial').value);
    const stockMinimo = parseFloat(document.getElementById('stockMinimo').value);
    const categoria = document.getElementById('categoriaProducto').value;

    if (nombre && !isNaN(costoProduccion) && !isNaN(precioVenta) && categoria) {
        productos.push({
            id: Date.now(),
            nombre,
            descripcion,
            costoProduccion,
            precioVenta,
            tiempoPreparacion: tiempoPreparacion || 0,
            categoria,
            stock: stockInicial || 0,
            stockMinimo: stockMinimo || 0,
        });
        guardarDatos();
        mostrarNotificacion("Producto agregado correctamente");
        document.getElementById('nombreProducto').form.reset();
        actualizarTodasLasVistas();
    } else {
        mostrarNotificacion('Por favor completa los campos obligatorios', 'error');
    }
}

function eliminarProducto(id) {
    productos = productos.filter(p => p.id !== id);
    guardarDatos();
    mostrarNotificacion("Producto eliminado correctamente");
    actualizarTodasLasVistas();
}

function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '';
    const txt = (document.getElementById('busquedaProductos')?.value || '').toLowerCase();
    const categoria = document.getElementById('filtroCategoriaProducto')?.value;

    productos
        .filter(producto => {
            let coincide = true;
            if (txt) coincide = Object.values(producto).some(val => String(val).toLowerCase().includes(txt));
            if (coincide && categoria) coincide = producto.categoria === categoria;
            return coincide;
        })
        .forEach(producto => {
            const margen = (producto.precioVenta > 0)
                ? ((producto.precioVenta - producto.costoProduccion) / producto.precioVenta * 100).toFixed(1)
                : '—';
            let alertaStock = (typeof producto.stock === 'number' && producto.stock <= producto.stockMinimo)
                ? '<span title="Stock bajo" style="color:#ff6b6b;font-size:1.2em;">⚠️</span>'
                : '';

            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${producto.nombre}</td>
                <td>${producto.descripcion}</td>
                <td>$${producto.costoProduccion?.toLocaleString() ?? '-'}</td>
                <td>$${producto.precioVenta?.toLocaleString() ?? '-'}</td>
                <td>${margen}%</td>
                <td>${producto.tiempoPreparacion || '-'}</td>
                <td>${producto.categoria}</td>
                <td>${(typeof producto.stock === 'number') ? producto.stock : '-'}</td>
                <td>${alertaStock}</td>
                <td><button class="delete-btn" onclick="eliminarProducto(${producto.id})">Eliminar</button></td>
            `;
        });
}

function limpiarFiltrosProductos() {
    document.getElementById('busquedaProductos').form.reset();
    actualizarTablaProductos();
}

// Otras funciones (dashboard, cálculos, etc. sin cambios mayores en la lógica, pero con mejoras)

function actualizarSelectProductos() {
    const select = document.getElementById('productoVenta');
    select.innerHTML = '<option value="">Seleccionar producto</option>';
    productos.forEach(producto => {
        const option = document.createElement('option');
        option.value = producto.nombre;
        option.textContent = producto.nombre;
        select.appendChild(option);
    });
}

function actualizarDashboard() {
    const totalGastado = gastos.reduce((sum, gasto) => sum + gasto.costo, 0);
    const totalVendido = ventas.reduce((sum, venta) => sum + venta.total, 0);
    const gananciaNeta = totalVendido - totalGastado;
    const margenGanancia = totalVendido > 0 ? ((gananciaNeta / totalVendido) * 100).toFixed(1) : 0;

    document.getElementById('totalGastado').textContent = `$${totalGastado.toLocaleString()}`;
    document.getElementById('totalVendido').textContent = `$${totalVendido.toLocaleString()}`;
    document.getElementById('gananciaNeta').textContent = `$${gananciaNeta.toLocaleString()}`;
    document.getElementById('margenGanancia').textContent = `${margenGanancia}%`;

    // ... (resto de la lógica del dashboard)
}

async function generarReportePDF() {
    const { jsPDF } = window.jspdf || {};
    if (!jsPDF) {
        mostrarNotificacion('Librería jsPDF no disponible', 'error');
        return;
    }

    const spinner = document.getElementById('pdfSpinner');
    spinner.style.display = 'flex';

    await new Promise(resolve => setTimeout(resolve, 50)); // Pequeña pausa para que se muestre el spinner

    try {
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const ahora = new Date();
        const mesActual = ahora.getMonth();
        const anioActual = ahora.getFullYear();

        const ventasDelMes = ventas.filter(venta => {
            const fechaVenta = new Date(venta.fecha);
            return fechaVenta.getMonth() === mesActual && fechaVenta.getFullYear() === anioActual;
        });
        const gastosDelMes = gastos.filter(gasto => {
            const fechaGasto = new Date(gasto.fecha);
            return fechaGasto.getMonth() === mesActual && fechaGasto.getFullYear() === anioActual;
        });

        const totalVentasMes = ventasDelMes.reduce((sum, v) => sum + v.total, 0);
        const totalGastosMes = gastosDelMes.reduce((sum, g) => sum + g.costo, 0);

        // --- Contenido del PDF ---
        pdf.setFontSize(18);
        pdf.text('Reporte Mensual de SweetTasting', 105, 20, { align: 'center' });
        pdf.setFontSize(11);
        pdf.text(`Generado: ${ahora.toLocaleString()}`, 105, 28, { align: 'center' });

        // Resumen
        pdf.setFontSize(14);
        pdf.text('Resumen del Mes', 14, 40);
        pdf.setFontSize(11);
        pdf.text(`Total Vendido: $${totalVentasMes.toLocaleString()}`, 14, 48);
        pdf.text(`Total Gastado: $${totalGastosMes.toLocaleString()}`, 14, 56);
        pdf.setFontSize(12).setFont(undefined, 'bold');
        pdf.text(`Ganancia Neta: $${(totalVentasMes - totalGastosMes).toLocaleString()}`, 14, 64);
        pdf.setFont(undefined, 'normal');

        // Tabla de Ventas
        if (ventasDelMes.length > 0) {
            pdf.addPage();
            pdf.setFontSize(14).text('Detalle de Ventas del Mes', 14, 20);
            pdf.table(14, 28, ventasDelMes.map(v => ({
                Fecha: v.fecha,
                Producto: v.producto,
                Cantidad: v.cantidad,
                Total: `$${v.total.toLocaleString()}`
            })), { autoSize: true });
        }

        // Tabla de Gastos
        if (gastosDelMes.length > 0) {
            if (ventasDelMes.length === 0) {
                pdf.addPage();
            }
            pdf.setFontSize(14).text('Detalle de Gastos del Mes', 14, pdf.autoTable.previous.finalY + 15);
            pdf.table(14, pdf.autoTable.previous.finalY + 23, gastosDelMes.map(g => ({
                Fecha: g.fecha,
                Concepto: g.concepto,
                Categoría: g.categoria,
                Costo: `$${g.costo.toLocaleString()}`
            })), { autoSize: true });
        }

        pdf.save(`Reporte_SweetTasting_${anioActual}-${mesActual + 1}.pdf`);

    } catch (error) {
        console.error("Error generando PDF:", error);
        mostrarNotificacion("Error al generar el PDF", "error");
    } finally {
        spinner.style.display = 'none';
    }
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.className = `notification ${tipo}`;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}
//... el resto de las funciones como `actualizarGraficosDashboard`, `calcularPrecio`, etc.

function actualizarFormularioConfiguracion() {
    const metaIng = document.getElementById('metaIngresos');
    const metaVen = document.getElementById('metaVentas');
    if (metaIng) metaIng.value = config.metaIngresos || '';
    if (metaVen) metaVen.value = config.metaVentas || '';
}

function guardarConfiguracion() {
    const metaIng = parseFloat(document.getElementById('metaIngresos').value);
    const metaVen = parseFloat(document.getElementById('metaVentas').value);
    config.metaIngresos = !isNaN(metaIng) && metaIng >= 0 ? metaIng : 0;
    config.metaVentas = !isNaN(metaVen) && metaVen >= 0 ? metaVen : 0;
    config.notificadoMetaIngresos = false;
    config.notificadoMetaVentas = false;
    config.notificadosStock = [];
    guardarDatos();
    mostrarNotificacion('Configuración guardada correctamente');
}

function solicitarPermisoNotificaciones() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function enviarNotificacionPush(titulo, mensaje) {
    if (Notification.permission === 'granted' && swRegistro) {
        swRegistro.showNotification(titulo, {
            body: mensaje,
            icon: 'assets/icon-192.png'
        });
    }
}

function actualizarCostoIngredientes() {
    const totalIngredientes = gastos
        .filter(g => g.categoria === 'Ingredientes')
        .reduce((sum, g) => sum + (g.costo || 0), 0);
    const input = document.getElementById('costoIngredientes');
    if (input) {
        input.value = totalIngredientes.toFixed(2);
    }
    return totalIngredientes;
}

function calcularPrecio() {
    const costoIngredientes = parseFloat(document.getElementById('costoIngredientes').value) || 0;
    const costoManoObra = parseFloat(document.getElementById('costoManoObra').value) || 0;
    const gastosGenerales = parseFloat(document.getElementById('gastosGenerales').value) || 0;
    const margenDeseado = parseFloat(document.getElementById('margenDeseado').value) || 0;

    const costoTotal = costoIngredientes + costoManoObra + gastosGenerales;
    let precioVenta = 0;
    let mensaje = '';
    if (margenDeseado >= 100) {
        mensaje = '<span style="color:red">El margen deseado debe ser menor al 100%</span>';
    } else if (margenDeseado < 0) {
        mensaje = '<span style="color:red">El margen deseado no puede ser negativo</span>';
    } else {
        precioVenta = costoTotal / (1 - margenDeseado / 100);
        mensaje = `<strong>Precio de venta recomendado: $${precioVenta.toFixed(2)}</strong><br>
        Costo total: $${costoTotal.toFixed(2)}<br>
        Ganancia: $${(precioVenta - costoTotal).toFixed(2)}`;
    }
    document.getElementById('resultadoPrecio').innerHTML = mensaje;
    document.getElementById('resultadoPrecio').style.display = 'block';
}

function analizarRentabilidad() {
    const precioVenta = parseFloat(document.getElementById('precioVentaAnalisis').value) || 0;
    const costoTotal = parseFloat(document.getElementById('costoTotalAnalisis').value) || 0;
    const cantidadMensual = parseFloat(document.getElementById('cantidadMensual').value) || 0;

    const gananciaPorUnidad = precioVenta - costoTotal;
    const gananciaMensual = gananciaPorUnidad * cantidadMensual;
    const margenPorcentual = precioVenta > 0 ? ((gananciaPorUnidad / precioVenta) * 100).toFixed(1) : 0;

    document.getElementById('resultadoAnalisis').innerHTML = `
        <strong>Ganancia mensual estimada: ${gananciaMensual.toLocaleString()}</strong><br>
        Ganancia por unidad: ${gananciaPorUnidad.toFixed(2)}<br>
        Margen: ${margenPorcentual}%`;
    document.getElementById('resultadoAnalisis').style.display = 'block';
}

function calcularPuntoEquilibrio() {
    const gastosFixed = parseFloat(document.getElementById('gastosFixed').value) || 0;
    const precioUnitario = parseFloat(document.getElementById('precioUnitario').value) || 0;
    const costoVariable = parseFloat(document.getElementById('costoVariable').value) || 0;

    const contribucionMarginal = precioUnitario - costoVariable;
    const puntoEquilibrio = contribucionMarginal > 0 ? (gastosFixed / contribucionMarginal) : 0;
    const ventasEquilibrio = puntoEquilibrio * precioUnitario;

    document.getElementById('resultadoEquilibrio').innerHTML = `
        <strong>Punto de equilibrio: ${Math.ceil(puntoEquilibrio)} unidades</strong><br>
        Ventas necesarias: ${ventasEquilibrio.toLocaleString()}<br>
        Contribución marginal: ${contribucionMarginal.toFixed(2)}`;
    document.getElementById('resultadoEquilibrio').style.display = 'block';
}

// Función para exportar datos (simulación)
function exportarDatos() {
    const datos = {
        gastos,
        ventas,
        productos,
        config,
        timestamp: new Date().toISOString()
    };
    const dataStr = JSON.stringify(datos, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sweet_tasting_backup_' + new Date().toISOString().split('T')[0] + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importarDatos() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const contenido = JSON.parse(e.target.result);
                gastos = contenido.gastos || [];
                ventas = contenido.ventas || [];
                productos = contenido.productos || [];
                config = contenido.config || config;

                guardarDatos();
                inicializarDatos();
                actualizarGraficosDashboard();
                mostrarNotificacion("Datos importados correctamente");
            } catch (error) {
                mostrarNotificacion("Error al importar archivo", "error");
                console.error("Error al importar:", error);
            }
        };
        reader.readAsText(file);
    };

    input.click();
}

let chartBarras, chartTortaGastos, chartTortaProductos;

function actualizarGraficosDashboard() {
    const esOscuro = document.body.classList.contains('dark');

    const coloresBarra = esOscuro
        ? ['rgba(255, 235, 59, 0.8)', 'rgba(255, 107, 107, 0.8)']
        : ['rgba(102, 126, 234, 0.7)', 'rgba(255, 107, 107, 0.7)'];
    const coloresTortaGasto = esOscuro
        ? ['#feca57','#764ba2','#00b894','#ff6b6b','#b336ec','#f5f822','#667eea','#23283a']
        : ['#667eea','#feca57','#fc2121','#00cec9','#764ba2','#f5f822','#b336ec','#feca57'];
    const coloresTortaProd = esOscuro
        ? ['#00cec9','#feca57','#764ba2','#00b894','#ff6b6b','#b336ec','#f5f822','#23283a']
        : ['#764ba2','#667eea','#00cec9','#feca57','#ff6b6b','#2df512','#b336ec','#667eea'];
    const colorTexto = esOscuro ? '#f5f6fa' : '#333';

    const mesesLabels = [];
    const ventasPorMes = {};
    const gastosPorMes = {};
    const ahora = new Date();
    for (let i = 11; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const label = d.toLocaleString('es-AR', { month: 'short', year: '2-digit' });
        const key = d.toISOString().slice(0,7);
        mesesLabels.push(label);
        ventasPorMes[key] = 0;
        gastosPorMes[key] = 0;
    }
    ventas.forEach(v => {
        const key = v.fecha ? v.fecha.slice(0,7) : '';
        if (ventasPorMes[key] !== undefined) ventasPorMes[key] += v.total || 0;
    });
    gastos.forEach(g => {
        const key = g.fecha ? g.fecha.slice(0,7) : '';
        if (gastosPorMes[key] !== undefined) gastosPorMes[key] += g.costo || 0;
    });

    if (chartBarras) chartBarras.destroy();
    chartBarras = new Chart(document.getElementById('graficoBarras').getContext('2d'), {
        type: 'bar',
        data: {
            labels: mesesLabels,
            datasets: [
                {
                    label: 'Ventas',
                    data: Object.values(ventasPorMes),
                    backgroundColor: 'rgba(102, 126, 234, 0.7)',
                    borderRadius: 7
                },
                {
                    label: 'Gastos',
                    data: Object.values(gastosPorMes),
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'top' } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
        }
    });

    const cats = {};
    gastos.forEach(g => { cats[g.categoria] = (cats[g.categoria]||0) + (g.costo||0); });
    if (chartTortaGastos) chartTortaGastos.destroy();
    chartTortaGastos = new Chart(document.getElementById('graficoTortaGastos').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cats).length ? Object.keys(cats) : ['Sin datos'],
            datasets: [{
                data: Object.values(cats).length ? Object.values(cats) : [1],
                backgroundColor: ['#667eea', '#feca57', '#fc2121', '#00cec9', '#764ba2', '#f5f822'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '65%'
        }
    });

    const productosVendidos = {};
    ventas.forEach(v => { productosVendidos[v.producto] = (productosVendidos[v.producto]||0) + (v.cantidad||0); });
    if (chartTortaProductos) chartTortaProductos.destroy();
    chartTortaProductos = new Chart(document.getElementById('graficoTortaProductos').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(productosVendidos).length ? Object.keys(productosVendidos) : ['Sin datos'],
            datasets: [{
                data: Object.values(productosVendidos).length ? Object.values(productosVendidos) : [1],
                backgroundColor: ['#764ba2', '#667eea', '#00cec9', '#feca57', '#ff6b6b', '#2df512', '#b336ec'],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '65%'
        }
    });
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

if (typeof document !== 'undefined') {
    actualizarGraficosDashboard();
}

function aplicarTema(oscuro) {
    if (oscuro) {
        document.body.classList.add('dark');
        document.getElementById('iconTheme').textContent = '☀️';
        document.getElementById('txtTheme').textContent = 'Modo Claro';
    } else {
        document.body.classList.remove('dark');
        document.getElementById('iconTheme').textContent = '🌙';
        document.getElementById('txtTheme').textContent = 'Modo Oscuro';
    }
    if (typeof actualizarGraficosDashboard === 'function') actualizarGraficosDashboard();
}

function detectarPreferenciaTema() {
    if (localStorage.getItem('sweetTheme')) {
        return localStorage.getItem('sweetTheme') === 'oscuro';
    } else {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const temaOscuro = detectarPreferenciaTema();
        aplicarTema(temaOscuro);

        const btnTheme = document.getElementById('toggleTheme');
        if (btnTheme) {
            btnTheme.onclick = function() {
                const esOscuro = document.body.classList.contains('dark');
                localStorage.setItem('sweetTheme', esOscuro ? 'claro' : 'oscuro');
                aplicarTema(!esOscuro);
            };
        }

        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (!localStorage.getItem('sweetTheme')) {
                    aplicarTema(e.matches);
                }
            });
        }
    });
}

function exportarDatosExcel() {
    const ws_gastos = XLSX.utils.json_to_sheet(gastos.map(g=>({
        Fecha: g.fecha,
        Concepto: g.concepto,
        Cantidad: g.cantidad,
        Unidad: g.unidad,
        "Costo Total": g.costo,
        Categoría: g.categoria
    })));
    const ws_ventas = XLSX.utils.json_to_sheet(ventas.map(v=>({
        Fecha: v.fecha,
        Producto: v.producto,
        Cantidad: v.cantidad,
        "Precio Unit.": v.precio,
        Total: v.total,
        Cliente: v.cliente,
        "Método Pago": v.metodoPago
    })));
    const ws_productos = XLSX.utils.json_to_sheet(productos.map(p=>({
        Producto: p.nombre,
        Descripción: p.descripcion,
        "Costo Producción": p.costoProduccion,
        "Precio Venta": p.precioVenta,
        Margen: (p.precioVenta > 0) ? ((p.precioVenta - p.costoProduccion) / p.precioVenta * 100).toFixed(1) + '%' : '—',
        "Tiempo Prep.": p.tiempoPreparacion,
        Categoría: p.categoria,
        Stock: (typeof p.stock === 'number') ? p.stock : '',
        "Stock Mínimo": (typeof p.stockMinimo === 'number') ? p.stockMinimo : ''
    })));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_gastos, "Gastos");
    XLSX.utils.book_append_sheet(wb, ws_ventas, "Ventas");
    XLSX.utils.book_append_sheet(wb, ws_productos, "Productos");

    XLSX.writeFile(wb, 'SweetTasting_export_' + new Date().toISOString().slice(0,10) + '.xlsx');
}

if (typeof module !== 'undefined') {
    module.exports = { descargarGrafico, exportarDatosExcel };
}

