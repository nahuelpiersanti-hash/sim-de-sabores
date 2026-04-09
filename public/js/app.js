const productsGrid = document.getElementById('products-grid');
const statusMessage = document.getElementById('status-message');
const searchInput = document.getElementById('search-input');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const clearFiltersButton = document.getElementById('clear-filters');
const categoryButtons = document.getElementById('category-buttons');
const cartItemsContainer = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartNotice = document.getElementById('cart-notice');
const cartCounter = document.getElementById('cart-counter');
const topCartCount = document.getElementById('top-cart-count');
const cartTotal = document.getElementById('cart-total');
const checkoutButton = document.getElementById('checkout-button');
const heroCount = document.getElementById('hero-count');
const productTemplate = document.getElementById('product-card-template');
const paymentMethodSelect = document.getElementById('payment-method');

const cartStorageKey = 'sim-de-sabores-cart';

let allProducts = [];
let cart = loadCart();
let activeCategory = 'all';
let isCatalogLoaded = false;
let lastCartNotice = '';

async function init() {
  bindEvents();
  renderCart();
  await loadProducts();
}

function bindEvents() {
  searchInput.addEventListener('input', renderProducts);
  minPriceInput.addEventListener('input', renderProducts);
  maxPriceInput.addEventListener('input', renderProducts);
  clearFiltersButton.addEventListener('click', clearFilters);
  checkoutButton.addEventListener('click', handleCheckout);
}

async function loadProducts() {
  statusMessage.textContent = 'Carregando produtos...';

  try {
    const response = await fetch('/products');

    if (!response.ok) {
      throw new Error('Nao foi possivel consultar o catalogo.');
    }

    allProducts = await response.json();
    isCatalogLoaded = true;

    const { notice } = reconcileCart(allProducts);
    updateCategoryOptions();
    renderProducts();
    renderCart(notice);
  } catch (error) {
    isCatalogLoaded = false;
    statusMessage.textContent = 'Nao foi possivel carregar os produtos.';
    renderCart(cart.length ? 'Nao foi possivel validar o carrinho com o catalogo atual.' : '');
    console.error(error);
  }
}

function updateCategoryOptions() {
  const categories = [...new Set(allProducts.filter((product) => product.available).map((product) => product.category))];
  categoryButtons.innerHTML = '';

  categoryButtons.appendChild(createCategoryButton('all', 'Todas'));

  for (const category of categories) {
    categoryButtons.appendChild(createCategoryButton(category, category));
  }
}

function renderProducts() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const minPrice = Number(minPriceInput.value);
  const maxPrice = Number(maxPriceInput.value);

  const visibleProducts = allProducts.filter((product) => {
    if (!product.available) {
      return false;
    }

    const matchesCategory = activeCategory === 'all' || product.category === activeCategory;
    const matchesSearch = !searchTerm
      || product.name.toLowerCase().includes(searchTerm)
      || product.category.toLowerCase().includes(searchTerm)
      || product.description.toLowerCase().includes(searchTerm);
    const matchesMinPrice = !Number.isFinite(minPrice) || product.price >= minPrice;
    const matchesMaxPrice = !Number.isFinite(maxPrice) || maxPrice <= 0 || product.price <= maxPrice;

    return matchesCategory && matchesSearch && matchesMinPrice && matchesMaxPrice;
  });

  heroCount.textContent = `${visibleProducts.length} produtos disponiveis`;
  statusMessage.textContent = visibleProducts.length ? '' : 'Nao ha produtos para mostrar com esses filtros.';
  productsGrid.innerHTML = '';

  for (const product of visibleProducts) {
    const fragment = productTemplate.content.cloneNode(true);
    const image = fragment.querySelector('.product-image');
    const categoryElement = fragment.querySelector('.product-category');
    const priceElement = fragment.querySelector('.product-price');
    const nameElement = fragment.querySelector('.product-name');
    const descriptionElement = fragment.querySelector('.product-description');
    const button = fragment.querySelector('.add-product-button');

    image.src = product.image || buildPlaceholder(product.name);
    image.alt = product.name;
    image.loading = 'lazy';
    categoryElement.textContent = product.category;
    priceElement.textContent = formatCurrency(product.price);
    nameElement.textContent = product.name;
    descriptionElement.textContent = product.description || 'Sem descricao.';
    button.addEventListener('click', () => addToCart(product));

    productsGrid.appendChild(fragment);
  }
}

function addToCart(product) {
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: 1,
    });
  }

  persistCart();
  lastCartNotice = '';
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((item) => item.id !== productId);
  persistCart();
  lastCartNotice = '';
  renderCart();
}

function changeQuantity(productId, delta) {
  const item = cart.find((entry) => entry.id === productId);

  if (!item) {
    return;
  }

  item.quantity += delta;

  if (item.quantity <= 0) {
    removeFromCart(productId);
    return;
  }

  persistCart();
  lastCartNotice = '';
  renderCart();
}

function renderCart(notice = lastCartNotice) {
  lastCartNotice = notice;
  cartItemsContainer.innerHTML = '';

  if (!cart.length) {
    cartEmpty.style.display = 'block';
  } else {
    cartEmpty.style.display = 'none';
  }

  cartNotice.hidden = !lastCartNotice;
  cartNotice.textContent = lastCartNotice;

  let totalItems = 0;
  let totalPrice = 0;

  for (const item of cart) {
    totalItems += item.quantity;
    totalPrice += item.quantity * item.price;

    const row = document.createElement('article');
    row.className = 'cart-item';
    row.innerHTML = `
      <div>
        <h4>${escapeHtml(item.name)}</h4>
        <p>${formatCurrency(item.price)} cada</p>
        <span>Quantidade: ${item.quantity}</span>
      </div>
      <div class="cart-item-actions">
        <button class="btn btn-secondary" type="button" aria-label="Diminuir unidade">-</button>
        <button class="btn btn-secondary" type="button" aria-label="Aumentar unidade">+</button>
        <button class="btn btn-secondary" type="button">Remover</button>
      </div>
    `;

    const [minusButton, plusButton, removeButton] = row.querySelectorAll('button');
    minusButton.addEventListener('click', () => changeQuantity(item.id, -1));
    plusButton.addEventListener('click', () => changeQuantity(item.id, 1));
    removeButton.addEventListener('click', () => removeFromCart(item.id));
    cartItemsContainer.appendChild(row);
  }

  cartCounter.textContent = `${totalItems} itens`;
  topCartCount.textContent = String(totalItems);
  cartTotal.textContent = formatCurrency(totalPrice);
  checkoutButton.disabled = totalItems === 0 || !isCatalogLoaded;
  checkoutButton.textContent = isCatalogLoaded
    ? 'Enviar pedido pelo WhatsApp'
    : 'Catalogo indisponivel';
}

function createCategoryButton(value, label) {
  const button = document.createElement('button');
  button.className = `category-button${activeCategory === value ? ' active' : ''}`;
  button.type = 'button';
  button.textContent = label;
  button.addEventListener('click', () => {
    activeCategory = value;
    updateCategoryOptions();
    renderProducts();
  });
  return button;
}

function clearFilters() {
  activeCategory = 'all';
  searchInput.value = '';
  minPriceInput.value = '';
  maxPriceInput.value = '';
  updateCategoryOptions();
  renderProducts();
}

function handleCheckout() {
  if (!isCatalogLoaded) {
    renderCart('Nao foi possivel validar o catalogo antes do checkout. Recarregue a pagina.');
    return;
  }

  const { notice } = reconcileCart(allProducts);
  renderCart(notice);

  if (!cart.length) {
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const paymentMethod = paymentMethodSelect?.value || 'Pix';
  const lines = cart.map((item) => `- ${item.name} x${item.quantity} = ${formatCurrency(item.price * item.quantity)}`);
  const message = [
    'Ola, quero fazer este pedido:',
    '',
    ...lines,
    '',
    `Forma de pagamento: ${paymentMethod}`,
    `Total: ${formatCurrency(total)}`,
    '',
    'Se precisar, posso receber os dados para Pix, Mercado Pago ou outro meio de pagamento.',
  ].join('\n');

  const phone = '5500000000000';
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener');
}

function persistCart() {
  localStorage.setItem(cartStorageKey, JSON.stringify(cart));
}

function reconcileCart(products) {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const nextCart = [];
  const previousCart = JSON.stringify(cart);
  let removedItems = 0;
  let updatedItems = 0;

  for (const item of cart) {
    const product = productMap.get(item.id);

    if (!product || !product.available) {
      removedItems += Number(item.quantity) || 1;
      continue;
    }

    const normalizedItem = {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      quantity: Math.max(1, Number(item.quantity) || 1),
    };

    if (normalizedItem.name !== item.name || normalizedItem.price !== Number(item.price)) {
      updatedItems += 1;
    }

    nextCart.push(normalizedItem);
  }

  cart = nextCart;

  if (JSON.stringify(cart) !== previousCart) {
    persistCart();
  }

  if (removedItems > 0 && updatedItems > 0) {
    return {
      notice: 'Seu carrinho foi atualizado: removemos itens indisponiveis e sincronizamos os valores atuais.',
    };
  }

  if (removedItems > 0) {
    return {
      notice: `Seu carrinho foi atualizado: ${removedItems} item(ns) indisponivel(is) foram removido(s).`,
    };
  }

  if (updatedItems > 0) {
    return {
      notice: 'Seu carrinho foi sincronizado com os dados atuais do catalogo.',
    };
  }

  return { notice: '' };
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(cartStorageKey)) || [];
  } catch (_error) {
    return [];
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

function buildPlaceholder(label) {
  return `https://placehold.co/900x700/131313/D4A017?text=${encodeURIComponent(label)}`;
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