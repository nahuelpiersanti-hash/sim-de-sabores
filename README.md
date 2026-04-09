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

Opcional: definir credenciales del panel antes de iniciar.

```bash
$env:ADMIN_USERNAME="admin"
$env:ADMIN_PASSWORD="cambiar-esto"
```

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

Si no defines variables de entorno, el panel usa Basic Auth con credenciales por defecto:

- Usuario: admin
- Password: sim-de-sabores

## API

- GET /products
- POST /products (requiere Basic Auth)
- PUT /products/:id (requiere Basic Auth)
- DELETE /products/:id (requiere Basic Auth)

## Notas

- La base SQLite se crea automaticamente en server/data/sim-de-sabores.sqlite.
- El seed inicial del catalogo se inserta una sola vez y no reaparece despues de borrar productos manualmente.
- El frontend solo muestra productos disponibles.
- El carrito se guarda en localStorage y se reconcilia contra el catalogo actual antes del checkout.
- El checkout genera un mensaje para WhatsApp. Cambia el telefono en public/js/app.js.
- Los precios del frontend y del admin se muestran en BRL.