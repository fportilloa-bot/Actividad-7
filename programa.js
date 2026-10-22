/* ========= BASE DE DATOS (IndexedDB) ========= */

const NOMBRE_BD = "RestauranteDB_v2";
const TABLA = "pedidos";

function abrirBD() {
    return new Promise(function (resolve, reject) {
        if (!window.indexedDB) {
            reject(new Error("Este navegador no soporta IndexedDB."));
            return;
        }

        const peticion = indexedDB.open(NOMBRE_BD, 1);

        peticion.onupgradeneeded = function () {
            peticion.result.createObjectStore(TABLA, {
                keyPath: "id",
                autoIncrement: true
            });
        };

        peticion.onsuccess = function () {
            resolve(peticion.result);
        };

        peticion.onerror = function () {
            reject(peticion.error);
        };
    });
}

async function agregarPedido(pedido) {
    const bd = await abrirBD();

    return new Promise(function (resolve, reject) {
        const tx = bd.transaction(TABLA, "readwrite");
        const peticion = tx.objectStore(TABLA).add(pedido);

        peticion.onsuccess = function () {
            resolve(peticion.result);
        };
        tx.oncomplete = function () {
            bd.close();
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
}

async function obtenerPedidos() {
    const bd = await abrirBD();

    return new Promise(function (resolve, reject) {
        const tx = bd.transaction(TABLA, "readonly");
        const peticion = tx.objectStore(TABLA).getAll();

        peticion.onsuccess = function () {
            // Más recientes primero
            resolve(peticion.result.sort(function (a, b) {
                return b.id - a.id;
            }));
        };
        tx.oncomplete = function () {
            bd.close();
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
}

// MODIFICACIÓN 5: eliminar un solo pedido por su id
async function borrarPedido(id) {
    const bd = await abrirBD();

    return new Promise(function (resolve, reject) {
        const tx = bd.transaction(TABLA, "readwrite");
        tx.objectStore(TABLA).delete(id);

        tx.oncomplete = function () {
            bd.close();
            resolve();
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
}

async function borrarPedidos() {
    const bd = await abrirBD();

    return new Promise(function (resolve, reject) {
        const tx = bd.transaction(TABLA, "readwrite");
        tx.objectStore(TABLA).clear();

        tx.oncomplete = function () {
            bd.close();
            resolve();
        };
        tx.onerror = function () {
            reject(tx.error);
        };
    });
}


/* ========= DATOS DEL MENÚ (8 platillos) ========= */

const PRECIOS = {
    pizza: 12.00,
    hamburguesa: 7.50,
    tacos: 6.00,
    ensalada: 5.50,
    pasta: 9.50,
    hotdog: 4.50,
    sushi: 11.00,
    pollo: 8.00,
    pequena: 1.00,
    mediana: 1.50,
    grande: 2.00,
    papas: 2.50,
    queso: 1.50,
    tocino: 2.00,
    helado: 1.80
};

const NOMBRES = {
    pizza: "Pizza Familiar",
    hamburguesa: "Hamburguesa con Queso",
    tacos: "Orden de Tacos",
    ensalada: "Ensalada César",
    pasta: "Pasta Alfredo",
    hotdog: "Hot Dog",
    sushi: "Sushi Roll",
    pollo: "Pollo Frito",
    pequena: "Pequeña",
    mediana: "Mediana",
    grande: "Grande",
    papas: "Papas Fritas",
    queso: "Extra Queso",
    tocino: "Tocino",
    helado: "Helado de Vainilla"
};

const PLATOS_VALIDOS = ["pizza", "hamburguesa", "tacos", "ensalada", "pasta", "hotdog", "sushi", "pollo"];
const PROPINAS_VALIDAS = [0, 10, 15];


/* ========= ELEMENTOS ========= */

const formulario = document.getElementById("formularioRestaurante");
const areaRecibo = document.getElementById("reciboRespuesta");
const divHistorial = document.getElementById("tablaHistorial");
const btnVerHistorial = document.getElementById("btnVerHistorial");
const btnBorrarHistorial = document.getElementById("btnBorrarHistorial");
const botonesRecibo = document.getElementById("botonesRecibo");
const btnWordRecibo = document.getElementById("btnWordRecibo");
const btnImprimir = document.getElementById("btnImprimir");
const btnWordHistorial = document.getElementById("btnWordHistorial");
const buscarCliente = document.getElementById("buscarCliente");

let ultimoRecibo = "";
let ultimoIdPedido = 0;


/* ========= UTILIDADES ========= */

function dinero(valor) {
    return "$" + Number(valor).toFixed(2);
}

function redondear(valor) {
    return Math.round(valor * 100) / 100;
}

function escaparHTML(texto) {
    return String(texto).replace(/[&<>"']/g, function (caracter) {
        const equivalencias = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return equivalencias[caracter];
    });
}

// Minúsculas y sin tildes, para que "jose" encuentre "José"
function normalizar(texto) {
    return String(texto)
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim();
}

function mostrarError(mensaje) {
    areaRecibo.innerHTML =
            '<p class="mensaje-error">' + escaparHTML(mensaje) + '</p>';
    areaRecibo.style.display = "block";
}


/* ========= EXPORTAR A WORD ========= */

const ESTILOS_DOCUMENTO = `
    body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; }
    h2 { color: #222222; }
    h3 { color: #333333; }
    .item-pedido { border: 1px solid #999999; padding: 8px; margin-bottom: 10px; }
    .caja-total, .total { font-weight: bold; font-size: 14pt; }
`;

function descargarWord(titulo, contenidoHTML, nombreArchivo) {
    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>${escaparHTML(titulo)}</title>
    <style>${ESTILOS_DOCUMENTO}</style>
</head>
<body>
    <h2>Restaurante Delicioso</h2>
    ${contenidoHTML}
</body>
</html>`;

    const blob = new Blob(["\ufeff", html], {type: "application/msword"});
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombreArchivo + ".doc";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}


/* ========= GUARDAR PEDIDO ========= */

formulario.addEventListener("submit", async function (event) {

    event.preventDefault();

    const nombre = document.getElementById("nombreCliente").value.trim();

    if (!nombre) {
        mostrarError("Ingresa el nombre del cliente.");
        return;
    }

    const plato = document.getElementById("platoPrincipal").value;

    if (PLATOS_VALIDOS.indexOf(plato) === -1) {
        mostrarError("Selecciona un plato válido.");
        return;
    }

    const cantidad = parseInt(document.getElementById("cantidadPlato").value, 10);

    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) {
        mostrarError("La cantidad debe ser un número entre 1 y 20.");
        return;
    }

    const porcentajePropina = parseInt(document.getElementById("propina").value, 10);

    if (PROPINAS_VALIDAS.indexOf(porcentajePropina) === -1) {
        mostrarError("Selecciona una propina válida.");
        return;
    }

    const bebida = document.querySelector(
            'input[name="tamanoBebida"]:checked'
            ).value;

    const listaExtras = [];

    if (document.getElementById("extraPapas").checked) {
        listaExtras.push("papas");
    }
    if (document.getElementById("extraQueso").checked) {
        listaExtras.push("queso");
    }
    if (document.getElementById("extraTocino").checked) {
        listaExtras.push("tocino");
    }
    if (document.getElementById("extraHelado").checked) {
        listaExtras.push("helado");
    }

    const notas = document.getElementById("notas").value.trim();

    // Cálculo: platos x cantidad + bebida + extras = subtotal; luego propina
    let subtotal = PRECIOS[plato] * cantidad + PRECIOS[bebida];

    listaExtras.forEach(function (extra) {
        subtotal += PRECIOS[extra];
    });

    subtotal = redondear(subtotal);

    const propina = redondear(subtotal * porcentajePropina / 100);
    const total = redondear(subtotal + propina);

    const pedido = {
        nombre: nombre,
        plato: plato,
        cantidad: cantidad,
        bebida: bebida,
        extras: listaExtras.join(", ") || "Ninguno",
        notas: notas,
        subtotal: subtotal,
        porcentajePropina: porcentajePropina,
        propina: propina,
        total: total,
        fecha: new Date().toLocaleString("es-GT")
    };

    try {
        const id = await agregarPedido(pedido);

        let recibo = `
            <h3>Recibo del Pedido #${id}</h3>
            <p><strong>Cliente:</strong> ${escaparHTML(nombre)}</p>
            <p><strong>Fecha:</strong> ${escaparHTML(pedido.fecha)}</p>
            <hr>
            <p>${NOMBRES[plato]} x${cantidad}: ${dinero(PRECIOS[plato] * cantidad)}</p>
            <p>Bebida ${NOMBRES[bebida]}: ${dinero(PRECIOS[bebida])}</p>
        `;

        listaExtras.forEach(function (extra) {
            recibo += `<p>${NOMBRES[extra]}: ${dinero(PRECIOS[extra])}</p>`;
        });

        if (notas) {
            recibo += `<p><strong>Notas:</strong> ${escaparHTML(notas)}</p>`;
        }

        recibo += `
            <hr>
            <p>Subtotal: ${dinero(subtotal)}</p>
            <p>Propina (${porcentajePropina}%): ${dinero(propina)}</p>
            <p class="total">TOTAL: ${dinero(total)}</p>
        `;

        ultimoRecibo = recibo;
        ultimoIdPedido = id;

        areaRecibo.innerHTML = recibo + "<p>Pedido guardado correctamente ✅</p>";
        areaRecibo.style.display = "block";

        botonesRecibo.style.display = "flex";

        formulario.reset();

        if (divHistorial.style.display === "block") {
            await actualizarHistorialPantalla();
        }

    } catch (error) {
        console.error(error);
        mostrarError("No se pudo guardar el pedido: " + error.message);
    }
});


/* ========= HISTORIAL (con buscador y botón eliminar) ========= */

// Devuelve la cantidad de pedidos mostrados (ya filtrados)
async function actualizarHistorialPantalla() {

    try {
        const todos = await obtenerPedidos();

        if (todos.length === 0) {
            divHistorial.innerHTML = "<p>No hay pedidos registrados.</p>";
            return 0;
        }

        // MODIFICACIÓN 4: filtrar por nombre de cliente
        const textoBusqueda = normalizar(buscarCliente.value);

        const pedidos = todos.filter(function (pedido) {
            return normalizar(pedido.nombre || "").includes(textoBusqueda);
        });

        if (pedidos.length === 0) {
            divHistorial.innerHTML =
                    "<p>No se encontraron pedidos para: <strong>" +
                    escaparHTML(buscarCliente.value.trim()) +
                    "</strong></p>";
            return 0;
        }

        let gananciasTotales = 0;
        let htmlContenido = "";

        pedidos.forEach(function (pedido) {

            gananciasTotales += pedido.total;

            const extras = pedido.extras === "Ninguno"
                    ? "Ninguno"
                    : pedido.extras.split(", ")
                    .map(function (extra) {
                        return NOMBRES[extra] || extra;
                    })
                    .join(", ");

            htmlContenido += `
                <div class="item-pedido">
                    <strong>Pedido #${pedido.id}</strong>
                    <p>${escaparHTML(pedido.fecha)}</p>
                    <p>Cliente: ${escaparHTML(pedido.nombre || "Sin nombre")}</p>
                    <p>Plato: ${NOMBRES[pedido.plato] || "No disponible"} x${pedido.cantidad || 1}</p>
                    <p>Bebida: ${NOMBRES[pedido.bebida] || "No disponible"}</p>
                    <p>Extras: ${escaparHTML(extras)}</p>
                    <p>Propina: ${dinero(pedido.propina || 0)}</p>
                    <p>💰 Total: <strong>${dinero(pedido.total)}</strong></p>
                    <button type="button" class="btn-eliminar" data-id="${pedido.id}">
                        🗑️ Eliminar pedido
                    </button>
                </div>
            `;
        });

        const etiquetaTotal = textoBusqueda
                ? "Ventas de la búsqueda"
                : "Ventas Totales";

        divHistorial.innerHTML = `
            <div class="caja-total">
                ${etiquetaTotal}: ${dinero(redondear(gananciasTotales))}
            </div>
            <p>Mostrando ${pedidos.length} de ${todos.length} pedidos</p>
            <hr>
            ${htmlContenido}
        `;

        return pedidos.length;

    } catch (error) {
        console.error(error);
        divHistorial.textContent = "Error al cargar el historial: " + error.message;
        return 0;
    }
}

btnVerHistorial.addEventListener("click", async function () {

    if (divHistorial.style.display === "block") {

        divHistorial.style.display = "none";
        btnVerHistorial.textContent = "Ver Historial";

    } else {

        await actualizarHistorialPantalla();

        divHistorial.style.display = "block";
        btnVerHistorial.textContent = "Ocultar Historial";
    }
});

// MODIFICACIÓN 4: al escribir en el buscador se filtra en vivo
buscarCliente.addEventListener("input", async function () {

    await actualizarHistorialPantalla();

    divHistorial.style.display = "block";
    btnVerHistorial.textContent = "Ocultar Historial";
});

// MODIFICACIÓN 5: eliminar un pedido individual
// Un solo "escuchador" sobre el historial atiende todos los botones 🗑️
divHistorial.addEventListener("click", async function (event) {

    const boton = event.target.closest(".btn-eliminar");

    if (!boton) {
        return;
    }

    const id = Number(boton.dataset.id);

    if (!Number.isInteger(id)) {
        return;
    }

    const confirmar = confirm(
            "¿Eliminar el pedido #" + id + "? " +
            "Esta acción no se puede deshacer."
            );

    if (!confirmar) {
        return;
    }

    try {
        await borrarPedido(id);
        await actualizarHistorialPantalla();

    } catch (error) {
        console.error(error);
        alert("No se pudo eliminar el pedido: " + error.message);
    }
});

btnBorrarHistorial.addEventListener("click", async function () {

    const confirmar = confirm(
            "¿Estás seguro de eliminar TODOS los pedidos? " +
            "Esta acción no se puede deshacer."
            );

    if (!confirmar) {
        return;
    }

    try {
        await borrarPedidos();

        alert("Historial eliminado correctamente.");

        if (divHistorial.style.display === "block") {
            await actualizarHistorialPantalla();
        }

    } catch (error) {
        console.error(error);
        alert("Error al eliminar el historial: " + error.message);
    }
});


/* ========= BOTONES: WORD E IMPRIMIR ========= */

btnWordRecibo.addEventListener("click", function () {

    if (!ultimoRecibo) {
        return;
    }

    descargarWord(
            "Recibo #" + ultimoIdPedido,
            ultimoRecibo,
            "Recibo_Pedido_" + ultimoIdPedido
            );
});

// Exporta lo que se está viendo (respeta el filtro del buscador)
btnWordHistorial.addEventListener("click", async function () {

    const cantidad = await actualizarHistorialPantalla();

    if (cantidad === 0) {
        alert("No hay pedidos para exportar.");
        return;
    }

    // Copia del historial sin los botones de eliminar
    const copia = divHistorial.cloneNode(true);

    copia.querySelectorAll(".btn-eliminar").forEach(function (boton) {
        boton.remove();
    });

    descargarWord(
            "Historial de Pedidos",
            "<h3>Historial de Pedidos</h3>" + copia.innerHTML,
            "Historial_Pedidos"
            );
});

btnImprimir.addEventListener("click", function () {

    if (!ultimoRecibo) {
        return;
    }

    const ventana = window.open("", "_blank");

    if (!ventana) {
        alert("El navegador bloqueó la ventana. Permite las ventanas emergentes.");
        return;
    }

    ventana.document.write(
            "<html><head><meta charset='utf-8'><title>Recibo #" +
            ultimoIdPedido +
            "</title><style>" +
            ESTILOS_DOCUMENTO +
            "</style></head><body><h2>Restaurante Delicioso</h2>" +
            ultimoRecibo +
            "</body></html>"
            );

    ventana.document.close();
    ventana.focus();
    ventana.print();
});


/* ========= MODIFICACIONES DE DISEÑO (tarjetas, total en vivo, modo oscuro) ========= */

const selectPlato = document.getElementById("platoPrincipal");
const tarjetasPlato = document.querySelectorAll(".plato-card");
const totalEstimado = document.getElementById("totalEstimado");
const btnTema = document.getElementById("btnTema");

// Marca visualmente la tarjeta que coincide con el select
function marcarTarjeta() {
    tarjetasPlato.forEach(function (tarjeta) {
        tarjeta.classList.toggle("activa", tarjeta.dataset.plato === selectPlato.value);
    });
}

// Calcula el total estimado mientras el cliente llena el formulario
function actualizarEstimado() {
    const plato = selectPlato.value;
    const cantidad = parseInt(document.getElementById("cantidadPlato").value, 10) || 0;
    const bebidaMarcada = document.querySelector('input[name="tamanoBebida"]:checked');
    const porcentaje = parseInt(document.getElementById("propina").value, 10) || 0;

    let subtotal = (PRECIOS[plato] || 0) * cantidad;

    if (bebidaMarcada) {
        subtotal += PRECIOS[bebidaMarcada.value];
    }

    if (document.getElementById("extraPapas").checked) { subtotal += PRECIOS.papas; }
    if (document.getElementById("extraQueso").checked) { subtotal += PRECIOS.queso; }
    if (document.getElementById("extraTocino").checked) { subtotal += PRECIOS.tocino; }
    if (document.getElementById("extraHelado").checked) { subtotal += PRECIOS.helado; }

    const total = redondear(subtotal + subtotal * porcentaje / 100);

    totalEstimado.textContent = dinero(total);

    // Pequeña animación al cambiar el número
    totalEstimado.classList.remove("pop");
    void totalEstimado.offsetWidth;
    totalEstimado.classList.add("pop");
}

// Clic en una tarjeta → cambia el select
tarjetasPlato.forEach(function (tarjeta) {
    tarjeta.addEventListener("click", function () {
        selectPlato.value = tarjeta.dataset.plato;
        marcarTarjeta();
        actualizarEstimado();
    });
});

// Cualquier cambio en el formulario actualiza tarjetas y total
formulario.addEventListener("input", function () {
    marcarTarjeta();
    actualizarEstimado();
});

formulario.addEventListener("change", function () {
    marcarTarjeta();
    actualizarEstimado();
});

// Después de guardar (formulario.reset()) se limpia todo
formulario.addEventListener("reset", function () {
    setTimeout(function () {
        marcarTarjeta();
        actualizarEstimado();
    }, 0);
});

// Modo oscuro (recuerda la elección del usuario)
function aplicarTema(oscuro) {
    document.body.classList.toggle("oscuro", oscuro);
    btnTema.textContent = oscuro ? "☀️" : "🌙";
}

btnTema.addEventListener("click", function () {
    const oscuro = !document.body.classList.contains("oscuro");
    aplicarTema(oscuro);

    try {
        localStorage.setItem("temaRestaurante", oscuro ? "oscuro" : "claro");
    } catch (error) {
        // Si el navegador bloquea localStorage, simplemente no se guarda
    }
});

try {
    aplicarTema(localStorage.getItem("temaRestaurante") === "oscuro");
} catch (error) {
    aplicarTema(false);
}

marcarTarjeta();
actualizarEstimado();