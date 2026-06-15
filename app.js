// Configuración
const API_URL = 'https://lumire-erp-docker.onrender.com/api';
let token = null;
let productos = [];

// Elementos del DOM
const loginBtn = document.getElementById('loginBtn');
const errorMsg = document.getElementById('errorMsg');

// Login
if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                token = data.access_token;
                localStorage.setItem('token', token);
                window.location.href = 'dashboard.html';
            } else {
                errorMsg.textContent = data.detail || 'Error de login';
            }
        } catch (error) {
            errorMsg.textContent = 'Error de conexión';
        }
    });
}

// Dashboard - Cargar datos
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
        document.getElementById('totalProductos').textContent = productos.length;
        
        // Cargar ventas
        const ventasResponse = await fetch(`${API_URL}/ventas/`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const ventas = await ventasResponse.json();
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        document.getElementById('totalVentas').textContent = `$${totalVentas}`;
        
    } catch (error) {
        console.error('Error:', error);
    }
}

// Punto de Venta
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
    
    totalSpan.textContent = `$${total}`;
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
        const response = await fetch('http://localhost:8000/api/ventas/', {
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
            alert('Venta registrada');
            carrito = [];
            actualizarCarrito();
            // Recargar dashboard si es necesario
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
    window.location.href = 'index.html';
}

// Ejecutar según la página
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