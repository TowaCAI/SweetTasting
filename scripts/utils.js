function calcularCostoUnitario(costo, cantidad) {
    if (cantidad === 0) {
        throw new Error('La cantidad no puede ser cero');
    }
    return costo / cantidad;
}

module.exports = { calcularCostoUnitario };
