// ============================================
// LUMIRE ERP - app.js (versión modular)
// ============================================

const API_URL = 'https://lumire-erp-docker.onrender.com/api';
let token = null;
let productos = [];

// ============================================
// 1. FUNCIONES DE LOGIN (solo para index.html)
// ============================================

function cargarUsuarioRecordado() {
    const emailInput = document.getElementById('email');
    if (!emailInput) return; // No estamos en login
    
    const emailRecordado = localStorage.getItem('recordarUsuario');
    if (emailRecordado) {
        emailInput.value = emailRecordado;
        const rememberCheckbox = document.getElementById('rememberCheckbox');
        if (rememberCheckbox) rememberCheckbox.checked = true;
        const passwordInput = document.getElementById('password');
        if (passwordInput) passwordInput.focus();
    }
}

async function cargarUsuariosLogin() {
    const select = document.getElementById('usuarioSelect');
    if (!select) return; // No estamos en login
    
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
// 2. FUNCIONES DE DASHBOARD
// ============================================

async function loadDashboard() {
    token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        // Cargar productos
        const prodResponse = await fetch(`${API_URL}/productos/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        productos = await prodResponse.json();
        const totalProductosElem = document.getElementById('totalProductos');
        if (totalProductosElem) totalProductosElem.textContent = productos.length;
        
        // Cargar ventas
        const ventasResponse = await fetch(`${API_URL}/ventas/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ventas = await ventasResponse.json();
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        const totalVentasElem = document.getElementById('totalVentas');
        if (totalVentasElem) totalVentasElem.textContent = `$${totalVentas}`;
        
    } catch (error) {
        console.error('Error en dashboard:', error);
    }
}

// ============================================
// 3. PUNTO DE VENTA (ventas.html)
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
    
    // === Login (index.html) ===
    if (path.endsWith('index.html') || path === '/' || path === '') {
        const loginBtn = document.getElementById('loginBtn');
        const errorMsg = document.getElementById('errorMsg');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const rememberCheckbox = document.getElementById('rememberCheckbox');
        const usuarioSelect = document.getElementById('usuarioSelect');
        
        // Cargar usuario recordado
        cargarUsuarioRecordado();
        
        // Cargar lista de usuarios para el select
        if (usuarioSelect) {
            cargarUsuariosLogin();
            
            // Evento: seleccionar usuario del desplegable
            usuarioSelect.addEventListener('change', function(e) {
                const email = e.target.value;
                if (email && emailInput) {
                    emailInput.value = email;
                    if (passwordInput) passwordInput.focus();
                }
            });
        }
        
        // Evento: login
        if (loginBtn) {
            loginBtn.addEventListener('click', async () => {
                const email = emailInput ? emailInput.value.trim() : '';
                const password = passwordInput ? passwordInput.value.trim() : '';
                
                if (!email || !password) {
                    if (errorMsg) errorMsg.textContent = 'Completa email y contraseña';
                    return;
                }
                
                try {
                    const response = await fetch(`${API_URL}/login`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const data = await response.json();
                    
                    if (response.ok) {
                        token = data.access_token;
                        localStorage.setItem('token', token);
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
        
        // Permitir Enter para login
        if (passwordInput) {
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && loginBtn) {
                    loginBtn.click();
                }
            });
        }
        
        // Botón ojo para login
        const toggleBtn = document.querySelector('.toggle-password');
        if (toggleBtn && passwordInput) {
            toggleBtn.addEventListener('click', function() {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.textContent = type === 'password' ? '👁️' : '🙈';
            });
        }
    }
    
    // === Dashboard (dashboard.html) ===
    if (path.endsWith('dashboard.html')) {
        loadDashboard();
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
    }
    
    // === Punto de Venta (ventas.html) ===
    if (path.endsWith('ventas.html')) {
        // Cargar productos para POS
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
    
    // === Productos (productos.html) ===
    if (path.endsWith('productos.html')) {
        // Aquí iría la lógica de productos si la tienes
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);
    }
});
// Cargar empresas
async function cargarEmpresas() {
    try {
        const response = await fetch(`${API_URL}/empresas`);
        const empresas = await response.json();
        const select = document.getElementById('empresaSelect');
        if (select) {
            select.innerHTML = '';
            empresas.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = emp.nombre;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando empresas:', error);
    }
}

// En el login, enviar empresa_id
const empresa_id = parseInt(document.getElementById('empresaSelect').value);
const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        email: email,
        password: password,
        empresa_id: empresa_id
    })
});