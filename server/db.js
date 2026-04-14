const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'sim-de-sabores.sqlite');
const catalogSeedVersion = 'catalog-v1';

const legacySeedNames = new Set([
  'Flat White da Casa',
  'Croissant de Pistacho',
  'Bruschetta Caprese',
  'Limonada de Jengibre',
]);

const seedProducts = [
  {
    name: 'Fernet Branca 750 ml',
    description: 'Clássico argentino para tomar bem gelado, com cola ou em drinks. Sucesso garantido entre brasileiros e turistas.',
    price: 26.5,
    image: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?auto=format&fit=crop&w=900&q=80',
    category: 'Bebidas & Aperitivos',
    available: 1,
  },
  {
    name: 'Yerba Mate Canarias 1 kg',
    description: 'A tradicional yerba mate do sul, importada da Argentina. Sabor autêntico para quem não abre mão do mate bem feito.',
    price: 18.9,
    image: 'https://images.unsplash.com/photo-1515823662972-da6a2e4d3002?auto=format&fit=crop&w=900&q=80',
    category: 'Yerbas & Mate',
    available: 1,
  },
  {
    name: 'Dulce de Leche Colonial 450 g',
    description: 'Doce de leite argentino cremoso e irresistível. Ideal para café da manhã, sobremesas ou comer de colher.',
    price: 14.9,
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=80',
    category: 'Doces',
    available: 1,
  },
  {
    name: 'Mate Cocido 25 saquitos',
    description: 'Opção prática e rápida para quem quer provar o mate sem preparar a cuia tradicional. Perfeito para o dia a dia.',
    price: 5.4,
    image: '',
    category: 'Te & Infusoes',
    available: 1,
  },
  {
    name: 'Alfajor Havanna 6 unidades',
    description: 'Caixa com alfajores importados, ideal para presentear, lanche da tarde ou revenda. Um clássico que todo mundo ama!',
    price: 22.9,
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=900&q=80',
    category: 'Doces',
    available: 1,
  },
  {
    name: 'Chimichurri Premium 240 g',
    description: 'Tempero argentino clássico, perfeito para carnes, legumes e churrasco. Feito com ingredientes selecionados e muito carinho.',
    price: 8.9,
    image: '',
    category: 'Aceites & Vinagres',
    available: 1,
  },
];

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function run(sql, params = []) {
  const statement = db.prepare(sql);
  const result = statement.run(params);

  return Promise.resolve({
    id: result.lastInsertRowid,
    changes: result.changes,
  });
}

function get(sql, params = []) {
  const statement = db.prepare(sql);
  return Promise.resolve(statement.get(params));
}

function all(sql, params = []) {
  const statement = db.prepare(sql);
  return Promise.resolve(statement.all(params));
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL,
      image TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL,
      available INTEGER NOT NULL DEFAULT 1
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  const rows = await all('SELECT id, name FROM products ORDER BY id ASC');
  const seedState = await get('SELECT value FROM app_meta WHERE key = ?', ['catalogSeedVersion']);
  const shouldResetLegacyCatalog = rows.length > 0 && rows.every((row) => legacySeedNames.has(row.name));

  if (shouldResetLegacyCatalog) {
    await run('DELETE FROM products');
    await insertSeedProducts(seedProducts);
    await setMeta('catalogSeedVersion', catalogSeedVersion);
    return;
  }

  if (!seedState && rows.length === 0) {
    await insertSeedProducts(seedProducts);
    await setMeta('catalogSeedVersion', catalogSeedVersion);
    return;
  }

  if (!seedState) {
    await setMeta('catalogSeedVersion', catalogSeedVersion);
  }
}

async function insertSeedProducts(products) {
  for (const product of products) {
    await run(
      `INSERT INTO products (name, description, price, image, category, available)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        product.name,
        product.description,
        product.price,
        product.image,
        product.category,
        product.available,
      ]
    );
  }
}

async function setMeta(key, value) {
  await run('INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)', [key, value]);
}

async function listProducts() {
  const rows = await all('SELECT * FROM products ORDER BY id DESC');
  return rows.map(mapProductRow);
}

async function getProductById(id) {
  const row = await get('SELECT * FROM products WHERE id = ?', [id]);
  return row ? mapProductRow(row) : null;
}

async function createProduct(product) {
  const result = await run(
    `INSERT INTO products (name, description, price, image, category, available)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      product.name,
      product.description,
      product.price,
      product.image,
      product.category,
      product.available ? 1 : 0,
    ]
  );

  return getProductById(result.id);
}

async function updateProduct(id, product) {
  await run(
    `UPDATE products
     SET name = ?, description = ?, price = ?, image = ?, category = ?, available = ?
     WHERE id = ?`,
    [
      product.name,
      product.description,
      product.price,
      product.image,
      product.category,
      product.available ? 1 : 0,
      id,
    ]
  );

  return getProductById(id);
}

async function deleteProduct(id) {
  return run('DELETE FROM products WHERE id = ?', [id]);
}

function mapProductRow(row) {
  return {
    ...row,
    price: Number(row.price),
    available: Boolean(row.available),
  };
}

module.exports = {
  initDb,
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};