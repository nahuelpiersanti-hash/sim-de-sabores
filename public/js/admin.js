const form = document.getElementById('product-form');
const productsTableBody = document.getElementById('products-table-body');
const adminMessage = document.getElementById('admin-message');
const adminSearch = document.getElementById('admin-search');
const formTitle = document.getElementById('form-title');
const resetFormButton = document.getElementById('reset-form-button');
const cancelEditButton = document.getElementById('cancel-edit-button');
const statTotal = document.getElementById('stat-total');
const statAvailable = document.getElementById('stat-available');
const statCategories = document.getElementById('stat-categories');

let products = [];

async function init() {
  bindEvents();
  await loadProducts();
}

function bindEvents() {
  form.addEventListener('submit', handleSubmit);
  adminSearch.addEventListener('input', renderTable);
  resetFormButton.addEventListener('click', resetForm);
  cancelEditButton.addEventListener('click', resetForm);
}

async function loadProducts() {
  adminMessage.textContent = 'Cargando productos...';

  try {
    const response = await fetch('/products');

    if (!response.ok) {
      throw new Error('No se pudo consultar la API.');
    }

    products = await response.json();
    updateStats();
    renderTable();
    adminMessage.textContent = products.length ? '' : 'No hay productos cargados.';
  } catch (error) {
    adminMessage.textContent = 'No se pudieron cargar los productos.';
    console.error(error);
  }
}

function updateStats() {
  statTotal.textContent = String(products.length);
  statAvailable.textContent = String(products.filter((product) => product.available).length);
  statCategories.textContent = String(new Set(products.map((product) => product.category)).size);
}

function renderTable() {
  const searchTerm = adminSearch.value.trim().toLowerCase();
  const visibleProducts = products.filter((product) => {
    return !searchTerm
      || product.name.toLowerCase().includes(searchTerm)
      || product.category.toLowerCase().includes(searchTerm)
      || product.description.toLowerCase().includes(searchTerm);
  });

  productsTableBody.innerHTML = '';

  if (!visibleProducts.length) {
    productsTableBody.innerHTML = '<tr><td colspan="5">No hay coincidencias.</td></tr>';
    return;
  }

  for (const product of visibleProducts) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="product-cell">
        <strong>${escapeHtml(product.name)}</strong>
        <p>${escapeHtml(product.description || 'Sin descripcion.')}</p>
      </td>
      <td>${escapeHtml(product.category)}</td>
      <td>${formatCurrency(product.price)}</td>
      <td><span class="availability-pill ${product.available ? 'on' : 'off'}">${product.available ? 'Disponible' : 'Oculto'}</span></td>
      <td>
        <div class="actions-row">
          <button class="table-action" type="button">Editar</button>
          <button class="delete-button" type="button">Eliminar</button>
        </div>
      </td>
    `;

    const [editButton, deleteButton] = row.querySelectorAll('button');
    editButton.addEventListener('click', () => populateForm(product));
    deleteButton.addEventListener('click', () => handleDelete(product.id));
    productsTableBody.appendChild(row);
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  const payload = {
    name: form.name.value.trim(),
    description: form.description.value.trim(),
    price: Number(form.price.value),
    image: form.image.value.trim(),
    category: form.category.value.trim(),
    available: form.available.checked,
  };

  const productId = form.querySelector('#product-id').value;
  const url = productId ? `/products/${productId}` : '/products';
  const method = productId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'No se pudo guardar el producto.');
    }

    resetForm();
    await loadProducts();
    adminMessage.textContent = productId ? 'Producto actualizado.' : 'Producto creado.';
  } catch (error) {
    adminMessage.textContent = error.message;
  }
}

function populateForm(product) {
  form.querySelector('#product-id').value = product.id;
  form.name.value = product.name;
  form.description.value = product.description || '';
  form.price.value = product.price;
  form.image.value = product.image || '';
  form.category.value = product.category;
  form.available.checked = product.available;
  formTitle.textContent = `Editar producto #${product.id}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  form.reset();
  form.querySelector('#product-id').value = '';
  form.available.checked = true;
  formTitle.textContent = 'Crear producto';
}

async function handleDelete(productId) {
  const confirmed = window.confirm('Esta accion elimina el producto. Continuar?');

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/products/${productId}`, { method: 'DELETE' });

    if (!response.ok) {
      throw new Error('No se pudo eliminar el producto.');
    }

    if (String(form.querySelector('#product-id').value) === String(productId)) {
      resetForm();
    }

    await loadProducts();
    adminMessage.textContent = 'Producto eliminado.';
  } catch (error) {
    adminMessage.textContent = error.message;
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

init();