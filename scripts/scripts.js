document.addEventListener('DOMContentLoaded', () => {
    // Muestra el contenido principal cuando el DOM está listo
    const mainContent = document.getElementById('mainContent');
    if (mainContent) mainContent.style.display = '';
});

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
if ('serviceWorker' in navigator) {
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
    // Cargar datos desde localStorage si existen
    if (!cargarDatos()) {
        // Usar datos iniciales solo si no hay datos guardados
        gastos = [
            { fecha: '2025-07-11', concepto: 'Leche', cantidad: 1, unidad: 'litro', costo: 2100, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Dulce de leche', cantidad: 1, unidad: 'kg', costo: 3200, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Queso crema', cantidad: 2, unidad: 'unidades', costo: 5400, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Chocolinas', cantidad: 1, unidad: 'paquete', costo: 1950, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Coquitas', cantidad: 1, unidad: 'paquete', costo: 1450, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Vainillas', cantidad: 1, unidad: 'paquete', costo: 2600, categoria: 'Ingredientes' },
            { fecha: '2025-07-11', concepto: 'Plantilla etiquetas', cantidad: 1, unidad: 'set', costo: 4500, categoria: 'Marketing' },
            { fecha: '2025-07-11', concepto: 'Envases y crema chantilly', cantidad: 1, unidad: 'set', costo: 8320, categoria: 'Envases' }
        ];
        ventas = [];
        productos = [];
    }

    // Actualizar UI
    actualizarTablaGastos();
    actualizarTablaVentas();
    actualizarTablaProductos();
    actualizarSelectProductos();
    actualizarDashboard();
    actualizarGraficosDashboard();
    actualizarCostoIngredientes();
    actualizarFormularioConfiguracion();
}

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

function showTab(tabName, evt) {
    // Ocultar todos los tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Mostrar tab seleccionado
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

    // Validación de campos
    if (
        fecha && concepto &&
        !isNaN(cantidad) && cantidad > 0 &&
        unidad &&
        !isNaN(costo) && costo > 0 &&
        categoria
    ) {
        gastos.push({
            fecha,
            concepto,
            cantidad,
            unidad,
            costo,
            categoria
        });

        guardarDatos();
        mostrarNotificacion("Gasto guardado correctamente");

        // Limpiar formulario
        document.getElementById('fechaGasto').value = '';
        document.getElementById('conceptoGasto').value = '';
        document.getElementById('cantidadGasto').value = '';
        document.getElementById('unidadGasto').value = '';
        document.getElementById('costoGasto').value = '';
        document.getElementById('categoriaGasto').value = '';

        actualizarTablaGastos();
        actualizarDashboard();
        actualizarGraficosDashboard();
    } else {
        alert('Por favor completa todos los campos con valores válidos');
    }
}

function actualizarTablaGastos() {
    const tbody = document.getElementById('tablaGastos');
    tbody.innerHTML = '';

    // Leer filtros
    const txt = (document.getElementById('busquedaGastos')?.value || '').toLowerCase();
    const fDesde = document.getElementById('filtroFechaDesdeGasto')?.value;
    const fHasta = document.getElementById('filtroFechaHastaGasto')?.value;
    const categoria = document.getElementById('filtroCategoriaGasto')?.value;

    gastos
        .filter(gasto => {
            let coincide = true;
            if (txt) {
                coincide = Object.values(gasto).some(val => (val + '').toLowerCase().includes(txt));
            }
            if (coincide && fDesde) coincide = gasto.fecha >= fDesde;
            if (coincide && fHasta) coincide = gasto.fecha <= fHasta;
            if (coincide && categoria) coincide = gasto.categoria === categoria;
            return coincide;
        })
        .forEach((gasto, index) => {
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
                <td><button class="delete-btn" onclick="eliminarGasto(${index})">Eliminar</button></td>
            `;
        });
    actualizarCostoIngredientes();
}
// Filtros Gastos
['busquedaGastos','filtroFechaDesdeGasto','filtroFechaHastaGasto','filtroCategoriaGasto'].forEach(id=>{
    if(document.getElementById(id)) document.getElementById(id).oninput = actualizarTablaGastos;
});
function limpiarFiltrosGastos() {
    ['busquedaGastos','filtroFechaDesdeGasto','filtroFechaHastaGasto','filtroCategoriaGasto'].forEach(id=>{
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
    actualizarTablaGastos();
}

function eliminarGasto(index) {
    gastos.splice(index, 1);
    actualizarTablaGastos();
    actualizarDashboard();
    guardarDatos();
    mostrarNotificacion("Gasto eliminado correctamente");
}

// Actualiza automáticamente el campo de costo de ingredientes
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

function agregarVenta() {
    const fecha = document.getElementById('fechaVenta').value;
    const producto = document.getElementById('productoVenta').value;
    const cantidad = parseFloat(document.getElementById('cantidadVenta').value);
    const precio = parseFloat(document.getElementById('precioVenta').value);
    const cliente = document.getElementById('clienteVenta').value;
    const metodoPago = document.getElementById('metodoPago').value;
    // Buscar el producto
    const prodIndex = productos.findIndex(p => p.nombre === producto);
    if (prodIndex !== -1) {
        // Si el producto maneja stock:
        if (typeof productos[prodIndex].stock === 'number') {
            if (cantidad > productos[prodIndex].stock) {
                alert('No hay suficiente stock para esta venta.');
                return; // NO registra la venta
            } else {
                productos[prodIndex].stock -= cantidad;
            }
        }
    }

    if (
        fecha && producto &&
        !isNaN(cantidad) && cantidad > 0 &&
        !isNaN(precio) && precio > 0 &&
        metodoPago
    ) {
        ventas.push({
            fecha,
            producto,
            cantidad,
            precio,
            cliente,
            metodoPago,
            total: cantidad * precio
        });

        guardarDatos();
        mostrarNotificacion("Venta registrada correctamente");

        // Limpiar formulario
        document.getElementById('fechaVenta').value = '';
        document.getElementById('productoVenta').value = '';
        document.getElementById('cantidadVenta').value = '';
        document.getElementById('precioVenta').value = '';
        document.getElementById('clienteVenta').value = '';
        document.getElementById('metodoPago').value = '';

        actualizarTablaVentas();
        actualizarDashboard();
        actualizarGraficosDashboard();
    } else {
        alert('Por favor completa todos los campos obligatorios y con valores válidos');
    }
}

function actualizarTablaVentas() {
    const tbody = document.getElementById('tablaVentas');
    tbody.innerHTML = '';

    // Leer filtros
    const txt = (document.getElementById('busquedaVentas')?.value || '').toLowerCase();
    const fDesde = document.getElementById('filtroFechaDesdeVenta')?.value;
    const fHasta = document.getElementById('filtroFechaHastaVenta')?.value;
    const metodo = document.getElementById('filtroMetodoPago')?.value;

    ventas
        .filter(venta => {
            let coincide = true;
            if (txt) {
                coincide = Object.values(venta).some(val => (val + '').toLowerCase().includes(txt));
            }
            if (coincide && fDesde) coincide = venta.fecha >= fDesde;
            if (coincide && fHasta) coincide = venta.fecha <= fHasta;
            if (coincide && metodo) coincide = venta.metodoPago === metodo;
            return coincide;
        })
        .forEach((venta, index) => {
            const row = tbody.insertRow();
            row.innerHTML = `
                <td>${venta.fecha}</td>
                <td>${venta.producto}</td>
                <td>${venta.cantidad}</td>
                <td>$${venta.precio.toLocaleString()}</td>
                <td>$${venta.total.toLocaleString()}</td>
                <td>${venta.cliente || '-'}</td>
                <td>${venta.metodoPago}</td>
                <td><button class="delete-btn" onclick="eliminarVenta(${index})">Eliminar</button></td>
            `;
        });
}

['busquedaVentas','filtroFechaDesdeVenta','filtroFechaHastaVenta','filtroMetodoPago'].forEach(id=>{
    if(document.getElementById(id)) document.getElementById(id).oninput = actualizarTablaVentas;
});
function limpiarFiltrosVentas() {
    ['busquedaVentas','filtroFechaDesdeVenta','filtroFechaHastaVenta','filtroMetodoPago'].forEach(id=>{
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
    actualizarTablaVentas();
}

function eliminarVenta(index) {
    const venta = ventas[index];
    const prodIndex = productos.findIndex(p => p.nombre === venta.producto);
    if (prodIndex !== -1 && typeof productos[prodIndex].stock === 'number') {
        productos[prodIndex].stock += venta.cantidad;
    }
    ventas.splice(index, 1);
    actualizarTablaVentas();
    actualizarDashboard();
    actualizarGraficosDashboard();
    guardarDatos();
    mostrarNotificacion("Venta eliminada correctamente");
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

    if (
        nombre && descripcion &&
        !isNaN(costoProduccion) && costoProduccion > 0 &&
        !isNaN(precioVenta) && precioVenta > 0 &&
        categoria
    ) {
    productos.push({
        nombre,
        descripcion,
        costoProduccion,
        precioVenta,
        tiempoPreparacion,
        categoria,
        stock: (!isNaN(stockInicial) && stockInicial >= 0) ? stockInicial : 0,
        stockMinimo: (!isNaN(stockMinimo) && stockMinimo >= 0) ? stockMinimo : 0
    });

        guardarDatos();
        mostrarNotificacion("Producto agregado correctamente");

        // Limpiar formulario
        document.getElementById('nombreProducto').value = '';
        document.getElementById('descripcionProducto').value = '';
        document.getElementById('costoProduccion').value = '';
        document.getElementById('precioVentaProducto').value = '';
        document.getElementById('tiempoPreparacion').value = '';
        document.getElementById('stockInicial').value = '';
        document.getElementById('stockMinimo').value = '';
        document.getElementById('categoriaProducto').value = '';

        actualizarTablaProductos();
        actualizarSelectProductos();
        actualizarGraficosDashboard();
    } else {
        alert('Por favor completa todos los campos con valores válidos');
    }
}

function actualizarTablaProductos() {
    const tbody = document.getElementById('tablaProductos');
    tbody.innerHTML = '';

    const txt = (document.getElementById('busquedaProductos')?.value || '').toLowerCase();
    const categoria = document.getElementById('filtroCategoriaProducto')?.value;

    productos
        .filter(producto => {
            let coincide = true;
            if (txt) {
                coincide = Object.values(producto).some(val => (val + '').toLowerCase().includes(txt));
            }
            if (coincide && categoria) coincide = producto.categoria === categoria;
            return coincide;
        })
        .forEach((producto, index) => {
            const margen = (producto.precioVenta > 0)
                ? ((producto.precioVenta - producto.costoProduccion) / producto.precioVenta * 100).toFixed(1)
                : '—';

            // Icono de alerta si stock bajo
            let alertaStock = '';
            if (typeof producto.stock === 'number' && typeof producto.stockMinimo === 'number') {
                if (producto.stock <= producto.stockMinimo) {
                    alertaStock = '<span title="Stock bajo" style="color:#ff6b6b;font-size:1.2em;">⚠️</span>';
                }
            }

            const btnQR = `<button class="qr-btn" style="background:#667eea;color:#fff;border:none;border-radius:5px;padding:4px 10px;cursor:pointer;margin-right:5px;" onclick='generarCodigoQR(productos[${index}])'>QR</button>`;
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
                <td>${btnQR}<button class="delete-btn" onclick="eliminarProducto(${index})">Eliminar</button></td>
            `;
        });
}

['busquedaProductos','filtroCategoriaProducto'].forEach(id=>{
    if(document.getElementById(id)) document.getElementById(id).oninput = actualizarTablaProductos;
});
function limpiarFiltrosProductos() {
    ['busquedaProductos','filtroCategoriaProducto'].forEach(id=>{
        if(document.getElementById(id)) document.getElementById(id).value = '';
    });
    actualizarTablaProductos();
}

function eliminarProducto(index) {
    productos.splice(index, 1);
    actualizarTablaProductos();
    actualizarSelectProductos();
    actualizarGraficosDashboard();
    guardarDatos();
    mostrarNotificacion("Producto eliminado correctamente");
}

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
    const unidadesVendidas = ventas.reduce((sum, venta) => sum + venta.cantidad, 0);
    const gananciaNeta = totalVendido - totalGastado;
    const margenGanancia = totalVendido > 0 ? ((gananciaNeta / totalVendido) * 100).toFixed(1) : 0;

    document.getElementById('totalGastado').textContent = `$${totalGastado.toLocaleString()}`;
    document.getElementById('totalVendido').textContent = `$${totalVendido.toLocaleString()}`;
    document.getElementById('gananciaNeta').textContent = `$${gananciaNeta.toLocaleString()}`;
    document.getElementById('margenGanancia').textContent = `${margenGanancia}%`;

    // Producto más vendido
    const ventasPorProducto = {};
    ventas.forEach(venta => {
        if (ventasPorProducto[venta.producto]) {
            ventasPorProducto[venta.producto] += venta.cantidad;
        } else {
            ventasPorProducto[venta.producto] = venta.cantidad;
        }
    });
    
    const productoMasVendido = Object.keys(ventasPorProducto).reduce((a, b) => 
        ventasPorProducto[a] > ventasPorProducto[b] ? a : b, Object.keys(ventasPorProducto)[0]);
    
    document.getElementById('productoMasVendido').textContent = productoMasVendido || 'No hay ventas registradas';

    // Mejor mes
    const ventasPorMes = {};
    ventas.forEach(venta => {
        if (venta.fecha) {
            const [anio, mes] = venta.fecha.split('-');
            const claveMes = `${anio}-${mes}`;
            if (!ventasPorMes[claveMes]) ventasPorMes[claveMes] = 0;
            ventasPorMes[claveMes] += venta.total;
        }
    });
    let mejorMes = '-';
    let maxVentasMes = 0;
    for (const mes in ventasPorMes) {
        if (ventasPorMes[mes] > maxVentasMes) {
            maxVentasMes = ventasPorMes[mes];
            mejorMes = mes;
        }
    }
    if (mejorMes !== '-') {
        // Formato: YYYY-MM a Mes Año
        const [anio, mes] = mejorMes.split('-');
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        document.getElementById('mejorMes').textContent = `${meses[parseInt(mes, 10) - 1]} ${anio}`;
    } else {
        document.getElementById('mejorMes').textContent = '-';
    }

    // Promedio diario
    const diasConVentas = new Set(ventas.map(v => v.fecha)).size;
    const promedioDiario = diasConVentas > 0 ? (totalVendido / diasConVentas).toFixed(0) : 0;
    document.getElementById('promedioDiario').textContent = `$${promedioDiario}`;

    if (config.metaIngresos > 0 && totalVendido >= config.metaIngresos && !config.notificadoMetaIngresos) {
        enviarNotificacionPush('Meta de ingresos alcanzada', `Ingresos totales $${totalVendido.toLocaleString()}`);
        config.notificadoMetaIngresos = true;
        guardarDatos();
    }
    if (config.metaVentas > 0 && unidadesVendidas >= config.metaVentas && !config.notificadoMetaVentas) {
        enviarNotificacionPush('Meta de ventas alcanzada', `Se vendieron ${unidadesVendidas} unidades`);
        config.notificadoMetaVentas = true;
        guardarDatos();
    }

    // Mostrar alerta general de stock bajo
    const productosBajoStock = productos.filter(p => typeof p.stock === 'number' && typeof p.stockMinimo === 'number' && p.stock <= p.stockMinimo);
    let alertaGeneral = document.getElementById('alertaStockGeneral');
    if (!alertaGeneral) {
        alertaGeneral = document.createElement('div');
        alertaGeneral.id = 'alertaStockGeneral';
        alertaGeneral.style = 'background:#ff6b6b;color:white;padding:12px;border-radius:8px;margin-bottom:12px;display:none;font-weight:600;';
        const dashboard = document.getElementById('dashboard');
        dashboard.insertBefore(alertaGeneral, dashboard.children[1] || null);
    }
    if (productosBajoStock.length) {
        alertaGeneral.textContent = `⚠️ Productos con stock bajo: ${productosBajoStock.map(p=>p.nombre).join(', ')}`;
        alertaGeneral.style.display = '';
    } else {
        alertaGeneral.style.display = 'none';
    }

    config.notificadosStock = config.notificadosStock.filter(nombre => productosBajoStock.some(p => p.nombre === nombre));
    productosBajoStock.forEach(p => {
        if (!config.notificadosStock.includes(p.nombre)) {
            enviarNotificacionPush('Stock bajo', `${p.nombre} restante: ${p.stock}`);
            config.notificadosStock.push(p.nombre);
            guardarDatos();
        }
    });
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
        Margen: ${margenPorcentual}%
    `;
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
        Contribución marginal: ${contribucionMarginal.toFixed(2)}
    `;
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

// Función para generar reporte mensual
function generarReporteMensual() {
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

    const totalVentasMes = ventasDelMes.reduce((sum, venta) => sum + venta.total, 0);
    const totalGastosMes = gastosDelMes.reduce((sum, gasto) => sum + gasto.costo, 0);

    alert(`Reporte del mes actual:\nVentas: ${totalVentasMes.toLocaleString()}\nGastos: ${totalGastosMes.toLocaleString()}\nGanancia: ${(totalVentasMes - totalGastosMes).toLocaleString()}\nCantidad de ventas: ${ventasDelMes.length}\nCantidad de gastos: ${gastosDelMes.length}`);
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    // Establecer fecha actual por defecto
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaGasto').value = hoy;
    document.getElementById('fechaVenta').value = hoy;

    // Cargar datos iniciales
    inicializarDatos();
    actualizarGraficosDashboard();
    solicitarPermisoNotificaciones();
    
    // Agregar botones de utilidad al dashboard
    const dashboard = document.getElementById('dashboard');
    const botonesUtilidad = document.createElement('div');
    botonesUtilidad.className = 'form-section';
    botonesUtilidad.innerHTML = `
        <h3>🛠️ Herramientas</h3>
        <div style="display: flex; gap: 15px; flex-wrap: wrap;">
            <button onclick="exportarDatos()">📊 Exportar Datos</button>
            <button onclick="exportarDatosExcel()">📊 Exportar a Excel</button>
            <button onclick="importarDatos()">📂 Importar Datos</button>
            <button onclick="generarReporteMensual()">📋 Reporte Mensual</button>
            <button onclick="generarReportePDF()">📄 Reporte PDF</button>
            <button onclick="location.reload()">🔄 Reiniciar</button>
        </div>
    `;
    dashboard.appendChild(botonesUtilidad);
});

// Funciones adicionales para mejorar la experiencia
function buscarEnTabla(tablaId, inputId) {
    const input = document.getElementById(inputId);
    const filter = input.value.toLowerCase();
    const tabla = document.getElementById(tablaId);
    const filas = tabla.getElementsByTagName('tr');

    for (let i = 1; i < filas.length; i++) {
        const fila = filas[i];
        const celdas = fila.getElementsByTagName('td');
        let mostrar = false;

        for (let j = 0; j < celdas.length; j++) {
            const celda = celdas[j];
            if (celda.textContent.toLowerCase().indexOf(filter) > -1) {
                mostrar = true;
                break;
            }
        }

        fila.style.display = mostrar ? '' : 'none';
    }
}

// Validación en tiempo real
function validarNumero(input) {
    const valor = input.value;
    if (valor && isNaN(valor)) {
        input.style.borderColor = '#ff6b6b';
        input.setCustomValidity('Por favor ingresa un número válido');
    } else {
        input.style.borderColor = '#e9ecef';
        input.setCustomValidity('');
    }
}

// Aplicar validación a todos los inputs numéricos
document.addEventListener('DOMContentLoaded', function() {
    const inputsNumericos = document.querySelectorAll('input[type="number"]');
    inputsNumericos.forEach(input => {
        input.addEventListener('input', function() {
            validarNumero(this);
        });
    });
});

// Función para generar códigos QR para productos (real)
function generarCodigoQR(producto) {
    // Crear el contenido del QR (puedes personalizar el formato)
    const qrData = `Producto: ${producto.nombre}\nPrecio: $${producto.precioVenta}\nDescripción: ${producto.descripcion}`;

    // Crear modal para mostrar el QR
    let modal = document.getElementById('qrModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'qrModal';
        modal.style.cssText = `
            position: fixed; left: 0; top: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;`;
        modal.innerHTML = `
            <div id="qrContent" style="background: white; padding: 30px 20px 20px 20px; border-radius: 12px; text-align: center; position: relative; min-width: 260px;">
                <button id="cerrarQR" style="position: absolute; top: 8px; right: 12px; background: #ff6b6b; color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 18px; cursor: pointer;">&times;</button>
                <h3 style="margin-bottom: 10px;">Código QR del producto</h3>
                <div id="qrContainer" style="margin-bottom: 10px;"></div>
                <div id="qrText" style="font-size: 14px; color: #555;"></div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('cerrarQR').onclick = function () {
            modal.remove();
        };
    } else {
        modal.style.display = 'flex';
    }

    // Generar el código QR usando la librería qrcodejs
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = '';
    try {
        if (typeof QRCode === 'undefined') {
            qrContainer.innerHTML = '<p>No se pudo cargar la librería de QR.</p>';
        } else {
            new QRCode(qrContainer, {
                text: qrData,
                width: 200,
                height: 200
            });
        }
        document.getElementById('qrText').textContent = `${producto.nombre} - $${producto.precioVenta}`;
    } catch (error) {
        console.error('Error generando el código QR:', error);
        qrContainer.innerHTML = '<p>Error generando el código QR.</p>';
    }
}

// Auto-guardado de datos cada 5 minutos
setInterval(() => {
    guardarDatos();
}, 300000); // 5 minutos

// Mostrar notificaciones de éxito
function mostrarNotificacion(mensaje, tipo = 'success') {
    const notificacion = document.createElement('div');
    notificacion.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${tipo === 'success' ? '#00b894' : '#ff6b6b'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}

// Variables de gráficos Chart.js
let chartBarras, chartTortaGastos, chartTortaProductos;
const esOscuro = document.body.classList.contains('dark');

// Redibuja los gráficos cada vez que cambia la data
function actualizarGraficosDashboard() {
    const esOscuro = document.body.classList.contains('dark');

// Paletas para ambos temas
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

    // --- Ventas y gastos por mes (últimos 12) ---
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

    // Datos y redibujo
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
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } }
            }
        }
    });

    // --- Torta de gastos por categoría ---
    const cats = {};
    gastos.forEach(g => { cats[g.categoria] = (cats[g.categoria]||0) + (g.costo||0); });
    if (chartTortaGastos) chartTortaGastos.destroy();
    chartTortaGastos = new Chart(document.getElementById('graficoTortaGastos').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(cats).length ? Object.keys(cats) : ['Sin datos'],
            datasets: [{
                data: Object.values(cats).length ? Object.values(cats) : [1],
                backgroundColor: [
                    '#667eea', '#feca57', '#fc2121', '#00cec9', '#764ba2', '#f5f822'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } },
            cutout: '65%'
        }
    });

    // --- Torta productos más vendidos ---
    const productosVendidos = {};
    ventas.forEach(v => { productosVendidos[v.producto] = (productosVendidos[v.producto]||0) + (v.cantidad||0); });
    if (chartTortaProductos) chartTortaProductos.destroy();
    chartTortaProductos = new Chart(document.getElementById('graficoTortaProductos').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(productosVendidos).length ? Object.keys(productosVendidos) : ['Sin datos'],
            datasets: [{
                data: Object.values(productosVendidos).length ? Object.values(productosVendidos) : [1],
                backgroundColor: [
                    '#764ba2', '#667eea', '#00cec9', '#feca57', '#ff6b6b', '#2df512', '#b336ec'
                ],
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

// Permite descargar cualquier gráfico como PNG
function descargarGrafico(idCanvas) {
    const canvas = document.getElementById(idCanvas);
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = idCanvas + '.png';
    a.click();
}

actualizarGraficosDashboard();

// ========== Tema oscuro/claro adaptable ==========
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
    // Ajustar gráficos Chart.js para tema
    if (typeof actualizarGraficosDashboard === 'function') actualizarGraficosDashboard();
}

function detectarPreferenciaTema() {
    if (localStorage.getItem('sweetTheme')) {
        return localStorage.getItem('sweetTheme') === 'oscuro';
    } else {
        // Primera vez: detecta sistema
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const temaOscuro = detectarPreferenciaTema();
    aplicarTema(temaOscuro);

    // Evento para botón
    const btnTheme = document.getElementById('toggleTheme');
    if (btnTheme) {
        btnTheme.onclick = function() {
            const esOscuro = document.body.classList.contains('dark');
            localStorage.setItem('sweetTheme', esOscuro ? 'claro' : 'oscuro');
            aplicarTema(!esOscuro);
        };
    }

    // Si el usuario cambia el tema del sistema, podemos ajustar automáticamente:
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.getItem('sweetTheme')) {
                aplicarTema(e.matches);
            }
        });
    }
});

function exportarDatosExcel() {
    // Crea hojas a partir de cada entidad
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

    // Workbook y hojas
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_gastos, "Gastos");
    XLSX.utils.book_append_sheet(wb, ws_ventas, "Ventas");
    XLSX.utils.book_append_sheet(wb, ws_productos, "Productos");

    // Exportar archivo
    XLSX.writeFile(wb, 'SweetTasting_export_' + new Date().toISOString().slice(0,10) + '.xlsx');
}

async function generarReportePDF() {
    // Selecciona sólo el área de dashboard (puedes ajustar el selector)
    const dashboard = document.querySelector('.container');
    if (!dashboard) {
        alert('No se encontró la sección de resumen.');
        return;
    }
    // Muestra spinner o aviso
    let spinner = document.createElement('div');
    spinner.id = "pdfSpinner";
    spinner.style = "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.35);color:#fff;display:flex;align-items:center;justify-content:center;z-index:9000;font-size:2em;";
    spinner.innerHTML = '<span>Generando PDF...</span>';
    document.body.appendChild(spinner);

    // Oculta botones del dashboard temporalmente
    const botones = dashboard.querySelectorAll('button');
    botones.forEach(b => b.style.visibility = 'hidden');

    // Captura imagen
    const canvas = await html2canvas(dashboard, { backgroundColor: null, scale: 2 });

    botones.forEach(b => b.style.visibility = 'visible');
    document.body.removeChild(spinner);

    const imgData = canvas.toDataURL('image/png');
    const orientation = canvas.width > canvas.height ? 'l' : 'p';
    const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height]
    });

    pdf.setFontSize(18);
    pdf.text('Reporte SweetTasting', 30, 35);
    pdf.setFontSize(11);
    pdf.text('Generado: ' + new Date().toLocaleString(), 30, 55);

    pdf.addImage(imgData, 'PNG', 20, 70, canvas.width * 0.46, canvas.height * 0.46);

    pdf.save('Reporte_SweetTasting_' + new Date().toISOString().slice(0,10) + '.pdf');
}
