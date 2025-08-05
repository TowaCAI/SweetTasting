# SweetTasting 🍓

¡Bienvenido a **SweetTasting**, la PWA que vuelve la gestión de tu emprendimiento de postres tan dulce como sus recetas!

## Tabla de contenidos

- [Características](#características-)
- [Requisitos](#requisitos-)
- [Instalación y uso](#instalación-y-uso-)
- [Desarrollo](#desarrollo-)
- [Contribuir](#contribuir-)
- [Licencia](#licencia-)

## Características 🍰

- Persistencia de datos en `localStorage` con opción de exportar a Excel o PDF.
- Panel de control con gráficos interactivos para analizar ventas y gastos.
- Gestión de productos con control de stock y generación de códigos QR.
- Tema claro/oscuro y alertas visuales por bajo stock.
- Funciona como PWA, permitiendo uso sin conexión.

## Requisitos 🔧

Solo se necesita un navegador moderno. Para un funcionamiento óptimo se recomienda servir los archivos mediante un servidor estático.

## Instalación y uso 🚀

1. Clona este repositorio.
2. Ejecuta un servidor estático en la carpeta del proyecto, por ejemplo:
   ```bash
   npx http-server
   ```
3. Abre `http://localhost:8080` en el navegador.
4. ¡Registra gastos, ventas y productos desde la interfaz y deja que la app haga la magia!

## Desarrollo 🛠️

El proyecto está construido con **HTML**, **CSS** y **JavaScript**. Los datos se guardan en `localStorage` y se actualizan cada cinco minutos de forma automática.

## Contribuir 🤝

¿Tienes una idea para endulzar aún más la app? ¡Las contribuciones y nuevas recetas son bienvenidas! Abre un issue o envía un pull request.

## Licencia 📄

Este proyecto está disponible bajo la licencia [MIT](LICENSE).

