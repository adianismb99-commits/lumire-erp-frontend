// Configuración
const API_URL = 'https://lumire-erp-docker.onrender.com/api';
let token = null;
let productos = [];
let usuariosLista = [];

// Elementos del DOM
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usuarioSelect = document.getElementById('usuarioSelect');
const rememberCheckbox = document.getElementById('rememberCheckbox');

// ========== FUNCIONES DE LOGIN ==========

// Cargar lista de usuarios desde el backend
async function cargarUsuarios() {
    const tokenGuardado = localStorage.getItem('token');
    if (!tokenGuardado) return;
    
    try {
        const response = await fetch(`${API_URL}/usuarios/`, {
            headers: { 'Authorization': `Bearer ${tokenGuardado}` }
        });
        
        if (response.ok) {
            const usuarios = await response.json();
            usuariosLista = usuarios;
            
            // Llenar el select
            usuarioSelect.innerHTML = '<option value="">-- Seleccionar usuario --</option>';
            usuarios.forEach(user => {
                const option = document.createElement('option');
                option.value = user.email;
                option.textContent = `${user.nombre} (${user.email})`;
                usuarioSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error cargando usuarios:', error);
    }
}

// Recordar usuario
function guardarUsuarioRecordado(email) {
    if (rememberCheckbox.checked) {
        localStorage.setItem('recordarUsuario', email);
    } else {
        localStorage.removeItem('recordarUsuario');
    }
}

function cargarUsuarioRecordado() {
    const emailRecordado = localStorage.getItem('recordarUsuario');
    if (emailRecordado) {
        emailInput.value = emailRecordado;
        rememberCheckbox.checked = true;
        // Opcional: enfocar contraseña
        passwordInput.focus();
    }
}

// Login
async function hacerLogin(email, password) {
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
            guardarUsuarioRecordado(email);
            window.location.href = 'dashboard.html';
        } else {
            errorMsg.textContent = data.detail || 'Error de login';
        }
    } catch (error) {
        console.error('Error:', error);
        errorMsg.textContent = 'Error de conexión: ' + error.message;
    }
}

// Evento del botón login
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
            errorMsg.textContent = 'Completa email y contraseña';
            return;
        }
        
        await hacerLogin(email, password);
    });
}

// Evento: seleccionar usuario del desplegable
if (usuarioSelect) {
    usuarioSelect.addEventListener('change', (e) => {
        const email = e.target.value;
        if (email) {
            emailInput.value = email;
            passwordInput.focus();
        }
    });
}

// Cargar usuario recordado al iniciar
cargarUsuarioRecordado();

// Cargar lista de usuarios (si hay token guardado)
if (localStorage.getItem('token')) {
    cargarUsuarios();
}

// ========== DASHBOARD ==========
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
        console.error('Error:', error);
    }
}

// ========== PUNTO DE VENTA ==========
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
            if (typeof loadDashboard === 'function') loadDashboard();
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

// ========== INICIALIZAR SEGÚN LA PÁGINA ==========
if (document.getElementById('dashboardContent')) {
    loadDashboard();
}

if (document.getElementById('productosContainer')) {
    fetch(`${API_URL}/productos/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(r => r.json())
    .then(data => {
        productos = data;
        cargarProductosPOS();
    });
}

if (document.getElementById('pagarBtn')) {
    document.getElementById('pagarBtn').addEventListener('click', registrarVenta);
}

if (document.getElementById('logoutBtn')) {
    document.getElementById('logoutBtn').addEventListener('click', logout);
}