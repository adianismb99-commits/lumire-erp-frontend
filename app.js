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
        
    } catch (error) {
        console.error('Error en dashboard:', error);
        const container = document.getElementById('dashboardContent');
        if (container) {
            container.innerHTML = `<div style="color:red; padding:20px;">Error al cargar datos: ${error.message}</div>`;
        }
    }
    // En loadDashboard(), después de cargar productos y ventas
    try {
        const usuariosRes = await fetch(`${API_URL}/usuarios/public`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const usuarios = await usuariosRes.json();
        const totalUsuariosElem = document.getElementById('totalUsuarios');
        if (totalUsuariosElem) totalUsuariosElem.textContent = usuarios.length;
    } catch (e) {
        console.error('Error cargando usuarios:', e);
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
        // BOTÓN OJO - VERSIÓN MEJORADA
        // ============================================
        const toggleBtn = document.getElementById('togglePassword');
        const pwdField = document.getElementById('password');
        console.log('toggleBtn:', toggleBtn);
        console.log('pwdField:', pwdField);
        
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
                console.log('Cambiado a:', pwdField.type);
            });
            console.log('Event listener del ojo asignado');
        } else {
            console.error('No se encontró toggleBtn o pwdField');
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
        
        // Login
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
        
        // Enter
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