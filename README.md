# Sim de Sabores

Proyecto completo con backend propio en Node.js + Express, base SQLite y frontend estatico servido desde el mismo servidor.

El panel esta pensado para operadores argentinos y la tienda publica para clientes de Brasil: el admin carga y gestiona productos, mientras el frontend muestra precios en BRL y arma el checkout por WhatsApp con medios como Pix, Mercado Pago, tarjetas o efectivo.

## Estructura

```text
sim-de-sabores/
|-- server/
|   |-- db.js
|   |-- server.js
|   `-- data/
|-- public/
|   |-- index.html
|   |-- admin.html
|   |-- css/
|   |   |-- styles.css
|   |   `-- admin.css
|   `-- js/
|       |-- app.js
|       `-- admin.js
|-- package.json
`-- README.md
```

## Correr localmente

1. Instalar dependencias:

```bash
npm install
```

2. Levantar el servidor:

```bash
npm run dev
```

3. Abrir:

- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin.html

## API

- GET /products
- POST /products
- PUT /products/:id
- DELETE /products/:id

## Notas

- La base SQLite se crea automaticamente en server/data/sim-de-sabores.sqlite.
- El frontend solo muestra productos disponibles.
- El carrito se guarda en localStorage.
- El checkout genera un mensaje para WhatsApp. Cambia el telefono en public/js/app.js.
- Los precios del frontend y del admin se muestran en BRL.