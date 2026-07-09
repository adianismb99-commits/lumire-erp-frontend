// ============================================
// LUMIRE ERP - app.js (versión definitiva)
// ============================================

const API_URL = 'https://lumire-erp-backend.onrender.com/api';
let token = null;
let productos = [];

// ============================================
// 1. FUNCIONES DE LOGIN
// ============================================

function cargarUsuarioRecordado() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return;
    
    const emailRecordado = localStorage.getItem('recordarUsuario');
    if (emailRecordado) {
        emailInput.value = emailRecordado;
        const rememberCheckbox = document.getElementById('rememberCheckbox');
        if (rememberCheckbox) rememberCheckbox.checked = true;
        const pwdField = document.getElementById('password');
        if (pwdField) pwdField.focus();
    }
}

async function cargarEmpresas() {
    const select = document.getElementById('empresaSelect');
    if (!select) return;
    
    try {
        const response = await fetch(`${API_URL}/empresas`);
        if (!response.ok) throw new Error('Error cargando empresas');
        const empresas = await response.json();
        
        select.innerHTML = '';
        empresas.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = emp.nombre;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando empresas:', error);
        select.innerHTML = '<option value="1">Mi Empresa</option>';
    }
}

async function cargarUsuariosLogin() {
    const select = document.getElementById('usuarioSelect');
    if (!select) return;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/public`);
        if (!response.ok) throw new Error('Error cargando usuarios');
        const usuarios = await response.json();
        
        select.innerHTML = '<option value="">-- Seleccionar usuario --</option>';
        usuarios.forEach(user => {
            const option = document.createElement('option');
            option.value = user.email;
            option.textContent = `${user.nombre} (${user.email})`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        select.innerHTML = '<option value="">-- Error cargando usuarios --</option>';
    }
}

// ============================================
// FUNCIÓN TOGGLE PARA 2FA
// ============================================

function togglePass2fa(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
    input.focus();
}

// ============================================
// 2. DASHBOARD
// ============================================

async function loadDashboard() {
    token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const prodResponse = await fetch(`${API_URL}/productos/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (!prodResponse.ok) throw new Error(`Error productos: ${prodResponse.status}`);
        productos = await prodResponse.json();
        const totalProductosElem = document.getElementById('totalProductos');
        if (totalProductosElem) totalProductosElem.textContent = productos.length;
        
        const ventasResponse = await fetch(`${API_URL}/ventas/`, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });
        if (!ventasResponse.ok) throw new Error(`Error ventas: ${ventasResponse.status}`);
        const ventas = await ventasResponse.json();
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        const totalVentasElem = document.getElementById('totalVentas');
        if (totalVentasElem) totalVentasElem.textContent = `$${totalVentas}`;
        
        // Cargar usuarios
        const usuariosRes = await fetch(`${API_URL}/usuarios/public`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usuarios = await usuariosRes.json();
        const totalUsuariosElem = document.getElementById('totalUsuarios');
        if (totalUsuariosElem) totalUsuariosElem.textContent = usuarios.length;
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = `<div style="color:red; padding:20px;">Error al cargar datos: ${error.message}</div>`;
        }
    }
}

// ============================================
// 3. PUNTO DE VENTA
// ============================================

let carrito = [];

function cargarProductosPOS() {
    const container = document.getElementById('productosContainer');
    if (!container) return;
    
    container.innerHTML = '';
    productos.forEach(prod => {
        const btn = document.createElement('div');
        btn.className = 'producto-item';
        btn.innerHTML = `${prod.nombre}<br>$${prod.precio_venta}`;
        btn.onclick = () => agregarAlCarrito(prod);
        container.appendChild(btn);
    });
}

function agregarAlCarrito(producto) {
    const existente = carrito.find(item => item.id === producto.id);
    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({
            id: producto.id,
            nombre: producto.nombre,
            precio: producto.precio_venta,
            cantidad: 1
        });
    }
    actualizarCarrito();
}

function actualizarCarrito() {
    const container = document.getElementById('carritoItems');
    const totalSpan = document.getElementById('carritoTotal');
    if (!container) return;
    
    container.innerHTML = '';
    let total = 0;
    
    carrito.forEach(item => {
        total += item.precio * item.cantidad;
        const div = document.createElement('div');
        div.className = 'carrito-item';
        div.innerHTML = `
            <span>${item.nombre} x${item.cantidad}</span>
            <span>$${item.precio * item.cantidad}</span>
            <button onclick="eliminarDelCarrito(${item.id})">🗑️</button>
        `;
        container.appendChild(div);
    });
    if (totalSpan) totalSpan.textContent = `$${total}`;
}

function eliminarDelCarrito(id) {
    carrito = carrito.filter(item => item.id !== id);
    actualizarCarrito();
}

async function registrarVenta() {
    if (carrito.length === 0) {
        alert('Agrega productos al carrito');
        return;
    }
    
    const detalles = carrito.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        precio_unitario: item.precio
    }));
    
    try {
        const response = await fetch(`${API_URL}/ventas/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                sesion_caja_id: 1,
                cliente_nombre: 'Mostrador',
                metodo_pago: 'efectivo',
                detalles: detalles
            })
        });
        
        if (response.ok) {
            alert('✅ Venta registrada');
            carrito = [];
            actualizarCarrito();
        } else {
            const error = await response.json();
            alert('Error: ' + JSON.stringify(error));
        }
    } catch (error) {
        alert('Error de conexión: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('recordarUsuario');
    window.location.href = 'index.html';
}

// ============================================
// 4. INICIALIZACIÓN SEGÚN LA PÁGINA
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    
    // === LOGIN (index.html) ===
    if (path.endsWith('index.html') || path === '/' || path === '') {
        cargarUsuarioRecordado();
        cargarEmpresas();
        cargarUsuariosLogin();
        
        // ============================================
        // BOTÓN OJO - LOGIN PRINCIPAL
        // ============================================
        const toggleBtn = document.getElementById('togglePassword');
        const pwdField = document.getElementById('password');
        
        if (toggleBtn && pwdField) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (pwdField.type === 'password') {
                    pwdField.type = 'text';
                    this.textContent = '🙈';
                } else {
                    pwdField.type = 'password';
                    this.textContent = '👁️';
                }
                pwdField.focus();
            });
        }

        // Selector de usuario
        const usuarioSelect = document.getElementById('usuarioSelect');
        if (usuarioSelect) {
            usuarioSelect.addEventListener('change', function(e) {
                const email = e.target.value;
                const emailInput = document.getElementById('email');
                if (email && emailInput) {
                    emailInput.value = email;
                    const pwd = document.getElementById('password');
                    if (pwd) pwd.focus();
                }
            });
        }
        
        // ============================================
        // LOGIN CON 2FA Y RECUPERACIÓN
        // ============================================
        const loginBtn = document.getElementById('loginBtn');
        const errorMsg = document.getElementById('errorMsg');
        if (loginBtn) {
            loginBtn.addEventListener('click', async function() {
                const emailInput = document.getElementById('email');
                const pwdInput = document.getElementById('password');
                const empresaSelect = document.getElementById('empresaSelect');
                const rememberCheckbox = document.getElementById('rememberCheckbox');
                
                const email = emailInput ? emailInput.value.trim() : '';
                const password = pwdInput ? pwdInput.value.trim() : '';
                const empresa_id = empresaSelect ? parseInt(empresaSelect.value) : 1;
                
                if (!email || !password) {
                    if (errorMsg) errorMsg.textContent = 'Completa email y contraseña';
                    return;
                }
                
                try {
                    const response = await fetch(`${API_URL}/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email, password, empresa_id })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        // Si requiere 2FA
                        if (data.requires_2fa) {
                            localStorage.setItem('temporal_token', data.temporal_token);
                            show2FAForm(data.temporal_token);
                            return;
                        }
                        
                        localStorage.setItem('token', data.access_token);
                        if (rememberCheckbox && rememberCheckbox.checked) {
                            localStorage.setItem('recordarUsuario', email);
                        } else {
                            localStorage.removeItem('recordarUsuario');
                        }
                        window.location.href = 'dashboard.html';
                    } else {
                        if (errorMsg) errorMsg.textContent = data.detail || 'Error de login';
                    }
                } catch (error) {
                    console.error('Error:', error);
                    if (errorMsg) errorMsg.textContent = 'Error de conexión: ' + error.message;
                }
            });
        }
        
        // Enter para login
        const pwdEnter = document.getElementById('password');
        if (pwdEnter) {
            pwdEnter.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const btn = document.getElementById('loginBtn');
                    if (btn) btn.click();
                }
            });
        }
    }
    
    // === DASHBOARD ===
    if (path.endsWith('dashboard.html')) {
        loadDashboard();
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
    }
    
    // === PUNTO DE VENTA ===
    if (path.endsWith('ventas.html')) {
        token = localStorage.getItem('token');
        if (!token) {
            window.location.href = 'index.html';
            return;
        }
        
        fetch(`${API_URL}/productos/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(r => r.json())
        .then(data => {
            productos = data;
            cargarProductosPOS();
        })
        .catch(e => console.error('Error cargando productos:', e));
        
        const pagarBtn = document.getElementById('pagarBtn');
        if (pagarBtn) pagarBtn.addEventListener('click', registrarVenta);
        
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
    }
});

// ============================================
// FUNCIÓN show2FAForm (VERSIÓN MEJORADA)
// ============================================

function show2FAForm(temporal_token) {
    const loginBox = document.querySelector('.login-box');
    
    // Ocultar TODO el login anterior
    document.querySelectorAll('.input-group, .checkbox-group, #loginBtn, .subtitle').forEach(el => {
        if (el) el.style.display = 'none';
    });
    
    // Mostrar solo título y formulario 2FA
    const div = document.createElement('div');
    div.id = '2fa-section';
    div.style.cssText = 'padding: 10px 0;';
    div.innerHTML = `
        <h2 style="text-align: center; color: var(--text-primary); margin-bottom: 20px; font-size: 1.4em;">
            <i class="fas fa-shield-alt" style="color: var(--accent-cyan);"></i> Verificación en Dos Pasos
        </h2>
        <p style="text-align: center; color: var(--text-secondary); font-size: 0.9em; margin-bottom: 24px;">
            Ingresa el código de 6 dígitos que configuraste
        </p>
        <div class="input-group">
            <label style="color: var(--text-secondary); text-transform: uppercase; font-size: 0.75em; letter-spacing: 0.5px;">Código de verificación</label>
            <div class="password-wrapper">
                <input type="password" id="codigo2fa" placeholder="Ej: 123456" maxlength="6" style="font-size: 1.2em; letter-spacing: 4px; text-align: center; font-family: 'Courier New', monospace;">
                <button type="button" class="toggle-btn" onclick="togglePass2fa('codigo2fa', this)" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 1.1em; cursor: pointer;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        <button class="btn-primary" id="btnVerificar2fa" style="margin-top: 8px;">
            <i class="fas fa-check"></i> Verificar
        </button>
        <div id="error2fa" class="error" style="margin-top: 12px;"></div>
        <div id="bloqueo2fa" style="display: none; margin-top: 16px; padding: 16px; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-sm); border: 1px solid var(--danger);">
            <p style="color: var(--danger);"><strong><i class="fas fa-lock"></i> Cuenta bloqueada</strong></p>
            <p style="color: var(--text-secondary); font-size: 0.9em;">Ingresa tu <strong>CLAVE SECRETA</strong> para desbloquear:</p>
            <div class="password-wrapper">
                <input type="password" id="claveSecretaDesbloqueo" placeholder="Ingresa tu clave secreta" style="width: 100%; padding: 10px; margin: 8px 0; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); color: var(--text-primary);">
                <button type="button" class="toggle-btn" onclick="togglePass2fa('claveSecretaDesbloqueo', this)" style="position: absolute; right: 14px; top: 55%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); font-size: 1.1em; cursor: pointer;">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
            <button class="btn-primary" id="btnDesbloquear2fa" style="background: var(--warning); color: var(--bg-primary);">
                <i class="fas fa-unlock"></i> Desbloquear
            </button>
            <div id="errorClave" class="error" style="margin-top: 8px;"></div>
        </div>
    `;
    loginBox.appendChild(div);
    
    // ============================================
    // EVENTO: VERIFICAR 2FA
    // ============================================
    document.getElementById('btnVerificar2fa')?.addEventListener('click', async function() {
        const codigo = document.getElementById('codigo2fa').value.trim();
        const errorDiv = document.getElementById('error2fa');
        
        if (!codigo || codigo.length !== 6) {
            errorDiv.textContent = 'Ingresa los 6 dígitos del código';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/verify-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    temporal_token: temporal_token,
                    codigo: codigo
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                localStorage.setItem('token', data.access_token);
                window.location.href = 'dashboard.html';
            } else {
                // Verificar si es un error de bloqueo (3 intentos fallidos)
                if (response.status === 403 && data.detail && data.detail.includes('bloqueada')) {
                    document.getElementById('error2fa').style.display = 'none';
                    document.getElementById('bloqueo2fa').style.display = 'block';
                    document.getElementById('errorClave').textContent = '';
                } else {
                    errorDiv.textContent = data.detail || 'Código inválido';
                }
            }
        } catch (error) {
            errorDiv.textContent = 'Error de conexión';
        }
    });
    
    // ============================================
    // EVENTO: DESBLOQUEAR CON CLAVE SECRETA
    // ============================================
    document.getElementById('btnDesbloquear2fa')?.addEventListener('click', async function() {
        const email = document.getElementById('email')?.value;
        const clave = document.getElementById('claveSecretaDesbloqueo').value.trim();
        const errorDiv = document.getElementById('errorClave');
        
        if (!clave) {
            errorDiv.textContent = 'Ingresa tu clave secreta';
            return;
        }
        
        try {
            const response = await fetch(`${API_URL}/auth/desbloquear-2fa`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    clave_secreta: clave
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('✅ Cuenta desbloqueada. Ahora puedes iniciar sesión.');
                window.location.reload();
            } else {
                // Si el error contiene WhatsApp, mostrarlo con formato
                if (data.detail && data.detail.includes('WhatsApp')) {
                    errorDiv.innerHTML = data.detail.replace(/\n/g, '<br>');
                } else {
                    errorDiv.textContent = data.detail || 'Error al desbloquear';
                }
            }
        } catch (error) {
            errorDiv.textContent = 'Error de conexión';
        }
    });
}