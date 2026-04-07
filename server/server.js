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

app.use(express.json());
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

app.post('/products', async (request, response, next) => {
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

app.put('/products/:id', async (request, response, next) => {
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

app.delete('/products/:id', async (request, response, next) => {
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
  response.status(500).json({ error: 'Error interno del servidor.' });
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
  const available = Boolean(input?.available);

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