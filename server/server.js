const path = require('path');
const express = require('express');
const {
  initDb,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'sim-de-sabores';
const adminAssetPaths = new Set(['/admin.html', '/css/admin.css', '/js/admin.js']);
const parseJsonBody = express.json();

app.use((request, response, next) => {
  if (adminAssetPaths.has(request.path)) {
    requireAdminAuth(request, response, next);
    return;
  }

  next();
});
app.use(express.static(publicDir));

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.get('/products', async (_request, response, next) => {
  try {
    const products = await listProducts();
    response.json(products);
  } catch (error) {
    next(error);
  }
});

app.post('/products', requireAdminAuth, parseJsonBody, async (request, response, next) => {
  try {
    const payload = sanitizeProduct(request.body);

    if (!payload.valid) {
      response.status(400).json({ error: payload.error });
      return;
    }

    const product = await createProduct(payload.data);
    response.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

app.put('/products/:id', requireAdminAuth, parseJsonBody, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const existing = await getProductById(id);

    if (!existing) {
      response.status(404).json({ error: 'Producto no encontrado.' });
      return;
    }

    const payload = sanitizeProduct(request.body);

    if (!payload.valid) {
      response.status(400).json({ error: payload.error });
      return;
    }

    const product = await updateProduct(id, payload.data);
    response.json(product);
  } catch (error) {
    next(error);
  }
});

app.delete('/products/:id', requireAdminAuth, async (request, response, next) => {
  try {
    const id = Number(request.params.id);
    const existing = await getProductById(id);

    if (!existing) {
      response.status(404).json({ error: 'Producto no encontrado.' });
      return;
    }

    await deleteProduct(id);
    response.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.get(/.*/, (_request, response) => {
  response.sendFile(path.join(publicDir, 'index.html'));
});

app.use((error, _request, response, _next) => {
  console.error(error);

  if (error.type === 'entity.parse.failed') {
    response.status(400).json({ error: 'JSON invalido.' });
    return;
  }

  const statusCode = Number(error.statusCode || error.status);
  const isValidStatus = Number.isInteger(statusCode) && statusCode >= 400 && statusCode < 600;

  response.status(isValidStatus ? statusCode : 500).json({
    error: isValidStatus && error.expose && error.message
      ? error.message
      : 'Error interno del servidor.',
  });
});

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('No se pudo inicializar la base de datos.', error);
    process.exit(1);
  });

function sanitizeProduct(input) {
  const name = String(input?.name || '').trim();
  const description = String(input?.description || '').trim();
  const image = String(input?.image || '').trim();
  const category = String(input?.category || '').trim();
  const price = Number(input?.price);
  const available = normalizeBoolean(input?.available);

  if (!name) {
    return { valid: false, error: 'El nombre es obligatorio.' };
  }

  if (!category) {
    return { valid: false, error: 'La categoria es obligatoria.' };
  }

  if (!Number.isFinite(price) || price < 0) {
    return { valid: false, error: 'El precio debe ser un numero valido.' };
  }

  return {
    valid: true,
    data: {
      name,
      description,
      price,
      image,
      category,
      available,
    },
  };
}

function requireAdminAuth(request, response, next) {
  const credentials = parseBasicAuth(request.headers.authorization);

  if (credentials && credentials.username === ADMIN_USERNAME && credentials.password === ADMIN_PASSWORD) {
    next();
    return;
  }

  response.set('WWW-Authenticate', 'Basic realm="Sim de Sabores Admin"');

  if (request.path.startsWith('/products')) {
    response.status(401).json({ error: 'Autenticacion requerida.' });
    return;
  }

  response.status(401).send('Autenticacion requerida.');
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }

  try {
    const encoded = header.slice(6);
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch (_error) {
    return null;
  }
}

function normalizeBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value !== 0;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (['true', '1', 'yes', 'si', 'on'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'no', 'off', ''].includes(normalized)) {
      return false;
    }
  }

  return Boolean(value);
}