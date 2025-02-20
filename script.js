// Configuración base para las peticiones
const API_URL = 'http://localhost:3000/api';

// Sistema de Debug optimizado para el cliente
const Debug = {
    enabled: true,
    maxLogs: 100, // Reducir el número máximo de logs
    
    log: function(type, message, data = null) {
        if (!this.enabled) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            type,
            message,
            data
        };

        // Solo guardar logs críticos
        if (type === 'error') {
            this.saveLog(logEntry);
        }

        // Mostrar en consola con colores
        const styles = {
            error: 'background: #ff0000; color: white;',
            info: 'background: #0066ff; color: white;',
            debug: 'background: #333333; color: white;'
        };

        console.log(`%c[${type.toUpperCase()}] ${message}`, styles[type], data);
    },

    error: function(message, error) {
        this.log('error', message, {
            message: error.message,
            stack: error.stack
        });
    },

    info: function(message, data) {
        this.log('info', message, data);
    },

    debug: function(message, data) {
        this.log('debug', message, data);
    },

    saveLog: function(logEntry) {
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
        logs.push(logEntry);
        // Mantener solo los últimos maxLogs
        if (logs.length > this.maxLogs) {
            logs.splice(0, logs.length - this.maxLogs);
        }
        localStorage.setItem('debug_logs', JSON.stringify(logs));
    },

    getLogs: function() {
        return JSON.parse(localStorage.getItem('debug_logs') || '[]');
    },

    clearLogs: function() {
        localStorage.removeItem('debug_logs');
    }
};

// Función para mostrar secciones
function mostrarSeccion(id) {
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.classList.add('oculto');
    });
    document.getElementById(id).classList.remove('oculto');

    // Cargar datos según la sección
    switch(id) {
        case 'consejos':
            cargarConsejos();
            break;
        case 'comunidad':
            cargarMensajes();
            break;
        case 'seguimiento':
            cargarSeguimientos();
            break;
        case 'test':
            cargarHistorialTests();
            break;
    }
}

// Funciones para Tests
async function enviarTest(event) {
    event.preventDefault();
    Debug.info('Enviando test');
    
    try {
        const formData = new FormData(event.target);
        const testData = {
            reciclaje: parseInt(formData.get('reciclaje')),
            transporte: parseInt(formData.get('transporte')),
            puntuacionTotal: 0
        };
        
        testData.puntuacionTotal = testData.reciclaje + testData.transporte;

        const response = await fetch(`${API_URL}/tests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        await cargarHistorialTests();
        Debug.info('Test guardado');
    } catch (error) {
        Debug.error('Error en test', error);
        alert('Error al guardar el test');
    }
}

async function cargarHistorialTests() {
    try {
        const response = await fetch(`${API_URL}/tests`);
        const tests = await response.json();
        const historialDiv = document.querySelector('.historial-grid');
        historialDiv.innerHTML = '';
        
        tests.forEach(test => {
            const puntuacionMax = 8;
            const porcentaje = (test.puntuacionTotal / puntuacionMax) * 100;
            const colorClass = porcentaje >= 75 ? 'text-success' : 
                             porcentaje >= 50 ? 'text-primary' : 
                             porcentaje >= 25 ? 'text-warning' : 'text-danger';
            
            historialDiv.innerHTML += `
                <div class="test-resultado">
                    <div class="fecha">${new Date(test.fecha).toLocaleDateString()}</div>
                    <div class="puntuacion ${colorClass}">${test.puntuacionTotal}/${puntuacionMax}</div>
                    <div class="progress">
                        <div class="progress-bar bg-${colorClass.split('-')[1]}" 
                             role="progressbar" 
                             style="width: ${porcentaje}%" 
                             aria-valuenow="${porcentaje}" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small>Puntuación: ${porcentaje.toFixed(1)}%</small>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

// Función mejorada para escapar el contenido HTML y saltos de línea
function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/[&<>"']/g, function(match) {
            const escape = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            };
            return escape[match];
        })
        .replace(/\n/g, '\\n') // Escapar saltos de línea
        .replace(/\r/g, '\\r'); // Escapar retornos de carro
}

// Función para desescapar el contenido HTML y saltos de línea
function unescapeHTML(str) {
    if (!str) return '';
    return decodeURIComponent(str)
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r');
}

// Funciones de edición
function habilitarEdicion(id, tipo, texto) {
    const elemento = document.getElementById(`${tipo}-${id}`);
    const contenidoOriginal = escapeHTML(elemento.innerHTML);
    
    elemento.innerHTML = `
        <div class="edicion-form">
            <textarea class="form-control mb-2">${unescapeHTML(texto)}</textarea>
            <div class="btn-group">
                <button onclick="guardarEdicion('${id}', '${tipo}')" class="btn btn-eco btn-sm">
                    <i class="fas fa-save me-1"></i> Guardar
                </button>
                <button onclick="cancelarEdicion('${id}', '${tipo}', '${contenidoOriginal}')" class="btn btn-outline-secondary btn-sm">
                    <i class="fas fa-times me-1"></i> Cancelar
                </button>
            </div>
        </div>
    `;
}

async function guardarEdicion(id, tipo) {
    try {
        const elemento = document.getElementById(`${tipo}-${id}`);
        const nuevoTexto = elemento.querySelector('textarea').value;
        
        const response = await fetch(`${API_URL}/${tipo}s/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ texto: nuevoTexto })
        });

        if (response.ok) {
            // Recargar la sección correspondiente
            switch(tipo) {
                case 'consejo': cargarConsejos(); break;
                case 'seguimiento': cargarSeguimientos(); break;
                case 'mensaje': cargarMensajes(); break;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarError(`Error al editar ${tipo}`);
    }
}

function cancelarEdicion(id, tipo, contenidoOriginal) {
    const elemento = document.getElementById(`${tipo}-${id}`);
    elemento.innerHTML = unescapeHTML(contenidoOriginal);
}

// Funciones para Consejos
async function cargarConsejos() {
    try {
        const response = await fetch(`${API_URL}/consejos`);
        const consejos = await response.json();
        const listaConsejos = document.getElementById('listaConsejos');
        listaConsejos.innerHTML = '';
        
        consejos.forEach(consejo => {
            const textoEscapado = escapeHTML(consejo.texto);
            listaConsejos.innerHTML += `
                <div class="consejo">
                    <div id="consejo-${consejo._id}" class="consejo-contenido">
                        <p>
                            <i class="fas fa-leaf text-success me-2"></i>
                            ${textoEscapado}
                        </p>
                    </div>
                    <div class="acciones">
                        <small class="text-muted">
                            <i class="fas fa-calendar-alt me-1"></i>
                            ${new Date(consejo.fecha).toLocaleDateString()}
                        </small>
                        <div class="btn-group">
                            <button onclick="habilitarEdicion('${consejo._id}', 'consejo', '${textoEscapado}')" class="btn-editar">
                                <i class="fas fa-edit me-1"></i>
                                Editar
                            </button>
                            <button onclick="eliminarConsejo('${consejo._id}')" class="btn-eliminar">
                                <i class="fas fa-trash-alt me-1"></i>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los consejos');
    }
}

async function agregarConsejo(event) {
    event.preventDefault();
    const texto = document.getElementById('nuevoConsejo').value;
    if (texto.trim() !== "") {
        try {
            const response = await fetch(`${API_URL}/consejos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            
            if (response.ok) {
                document.getElementById('nuevoConsejo').value = "";
                cargarConsejos();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function eliminarConsejo(id) {
    try {
        const response = await fetch(`${API_URL}/consejos/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            cargarConsejos();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Funciones para Seguimiento
async function guardarSeguimiento(event) {
    event.preventDefault();
    const texto = document.getElementById('seguimientoTexto').value;
    const categoria = document.getElementById('seguimientoCategoria').value;
    
    if (texto.trim() !== "") {
        try {
            const response = await fetch(`${API_URL}/seguimientos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto, categoria })
            });
            
            if (response.ok) {
                document.getElementById('seguimientoTexto').value = "";
                cargarSeguimientos();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function cargarSeguimientos() {
    try {
        const response = await fetch(`${API_URL}/seguimientos`);
        const seguimientos = await response.json();
        const historialDiv = document.querySelector('.timeline-container');
        historialDiv.innerHTML = '';
        
        seguimientos.forEach(seguimiento => {
            const textoEscapado = escapeHTML(seguimiento.texto);
            const emoji = {
                reciclaje: '♻️',
                energia: '💡',
                transporte: '🚲',
                agua: '💧',
                otros: '🌱'
            }[seguimiento.categoria] || '🌱';

            historialDiv.innerHTML += `
                <div class="seguimiento-entrada">
                    <span class="categoria">
                        ${emoji} ${seguimiento.categoria.charAt(0).toUpperCase() + seguimiento.categoria.slice(1)}
                    </span>
                    <div class="fecha">
                        <i class="fas fa-calendar-alt me-1"></i>
                        ${new Date(seguimiento.fecha).toLocaleDateString()}
                    </div>
                    <div id="seguimiento-${seguimiento._id}" class="texto">
                        ${textoEscapado}
                    </div>
                    <div class="acciones">
                        <button onclick="habilitarEdicion('${seguimiento._id}', 'seguimiento', '${textoEscapado}')" class="btn-editar">
                            <i class="fas fa-edit me-1"></i>
                            Editar
                        </button>
                        <button onclick="eliminarSeguimiento('${seguimiento._id}')" class="btn-eliminar">
                            <i class="fas fa-trash-alt me-1"></i>
                            Eliminar
                        </button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los seguimientos');
    }
}

async function eliminarSeguimiento(id) {
    try {
        const response = await fetch(`${API_URL}/seguimientos/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            cargarSeguimientos();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Funciones para Mensajes de Comunidad
async function publicarMensaje(event) {
    event.preventDefault();
    const texto = document.getElementById('mensajeComunidad').value;
    if (texto.trim() !== "") {
        try {
            const response = await fetch(`${API_URL}/mensajes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ texto })
            });
            
            if (response.ok) {
                document.getElementById('mensajeComunidad').value = "";
                cargarMensajes();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

async function cargarMensajes() {
    try {
        const response = await fetch(`${API_URL}/mensajes`);
        const mensajes = await response.json();
        const mensajesDiv = document.getElementById('mensajesComunidad');
        mensajesDiv.innerHTML = '';
        
        mensajes.forEach(mensaje => {
            const textoEscapado = escapeHTML(mensaje.texto);
            mensajesDiv.innerHTML += `
                <div class="mensaje-card">
                    <div class="mensaje-header">
                        <div class="mensaje-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="mensaje-info">
                            <div class="mensaje-autor">Usuario EcoAmigo</div>
                            <div class="mensaje-fecha">
                                <i class="fas fa-calendar-alt me-1"></i>
                                ${new Date(mensaje.fecha).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                    <div id="mensaje-${mensaje._id}" class="mensaje-contenido">
                        ${unescapeHTML(textoEscapado)}
                    </div>
                    <div class="mensaje-acciones">
                        <div class="mensaje-likes">
                            <button onclick="darLike('${mensaje._id}')" class="btn-like ${mensaje.likes > 0 ? 'liked' : ''}">
                                <i class="fas fa-heart"></i>
                                <span>${mensaje.likes || 0}</span>
                            </button>
                        </div>
                        <div class="btn-group">
                            <button onclick="habilitarEdicion('${mensaje._id}', 'mensaje', '${textoEscapado}')" class="btn-editar">
                                <i class="fas fa-edit me-1"></i>
                                Editar
                            </button>
                            <button onclick="eliminarMensaje('${mensaje._id}')" class="btn-eliminar">
                                <i class="fas fa-trash-alt me-1"></i>
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los mensajes');
    }
}

async function eliminarMensaje(id) {
    try {
        const response = await fetch(`${API_URL}/mensajes/${id}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            cargarMensajes();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function darLike(id) {
    try {
        const response = await fetch(`${API_URL}/mensajes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ $inc: { likes: 1 } })
        });
        if (response.ok) {
            cargarMensajes();
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Agregar manejador global de errores
window.onerror = function(msg, url, lineNo, columnNo, error) {
    Debug.error('Error global', {
        message: msg,
        url: url,
        line: lineNo,
        column: columnNo,
        error: error
    });
    return false;
};

// Agregar manejador de promesas no capturadas
window.addEventListener('unhandledrejection', function(event) {
    Debug.error('Promesa no manejada', {
        reason: event.reason
    });
});

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    Debug.info('Aplicación iniciada');
    
    document.getElementById('testForm').addEventListener('submit', enviarTest);
    document.getElementById('consejoForm').addEventListener('submit', agregarConsejo);
    document.getElementById('seguimientoForm').addEventListener('submit', guardarSeguimiento);
    document.getElementById('mensajeForm').addEventListener('submit', publicarMensaje);
    
    mostrarSeccion('inicio');
}); 