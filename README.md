# SweetTasting

Aplicación web progresiva para administrar un emprendimiento de postres. Permite registrar gastos, ventas y productos, además de obtener estadísticas visuales para la toma de decisiones.

## Características
- Persistencia de datos en `localStorage` con opción de exportar a Excel o PDF.
- Panel de control con gráficos interactivos para analizar ventas y gastos.
- Gestión de productos con control de stock y generación de códigos QR.
- Tema claro/oscuro y alertas visuales por bajo stock.
- Funciona como PWA, permitiendo uso sin conexión.

## Requisitos
Solo se necesita un navegador moderno. Para un funcionamiento óptimo se recomienda servir los archivos mediante un servidor estático.

## Uso
1. Clonar el repositorio.
2. Ejecutar un servidor estático en la carpeta del proyecto, por ejemplo:
   ```bash
   npx http-server
   ```
3. Abrir `http://localhost:8080` en el navegador.
4. Registrar gastos, ventas y productos desde la interfaz.

## Desarrollo
El proyecto está construido con HTML, CSS y JavaScript. Los datos se guardan en `localStorage` y se actualizan cada cinco minutos de forma automática.

## Licencia
Este proyecto está disponible bajo la licencia [MIT](LICENSE).
