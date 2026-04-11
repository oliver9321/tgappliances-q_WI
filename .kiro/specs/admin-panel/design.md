# Diseño Técnico: Admin Panel

## Visión General

El Admin Panel es un módulo de administración protegido para el sitio de **TG Pre-Owned Appliances**. Se implementa como una página HTML independiente (`admin.html`) con sus propios archivos JS y CSS, separada del sitio público (`index.html`). Esto evita contaminar el bundle del sitio público con código de administración y simplifica el Auth_Guard.

El panel expone tres submódulos: **Categories**, **Products** y **Users**, cada uno con listado y formulario de creación/edición. Los datos se persisten en MongoDB a través de una API REST en el backend. Las imágenes se suben a un bucket S3-compatible en Railway (t3.storageapi.dev) y solo la URL resultante se almacena en MongoDB.

### Decisiones de diseño clave

- **Página separada** (`admin.html`) en lugar de sección oculta en `index.html` — evita cargar código admin en el sitio público y simplifica el routing.
- **sessionStorage** para la sesión — se limpia automáticamente al cerrar la pestaña, reduciendo el riesgo de sesiones huérfanas.
- **ES modules nativos** — consistente con `main.js` existente; sin bundler adicional para el admin (Vite lo procesa igual).
- **Estado en memoria** — las listas se mantienen en arrays JS en memoria y se actualizan con los datos que retorna la API tras cada operación, sin re-fetch completo.
- **Validación client-side primero** — toda validación corre en el cliente antes de llamar a la API; la API también valida como segunda línea de defensa.

---

## Arquitectura

### Estructura de archivos nuevos

```
/
├── admin.html                  # Página del panel de administración
├── admin.js                    # Entry point JS del admin (ES module)
├── admin.css                   # Estilos del admin (extiende variables de style.css)
└── src/
    └── admin/
        ├── auth.js             # Auth_Guard + manejo de sesión
        ├── api.js              # Capa de comunicación con la API REST
        ├── imageService.js     # Subida de imágenes al bucket
        ├── notifications.js    # Sistema de notificaciones toast
        ├── router.js           # Navegación entre submódulos (sin recarga)
        ├── state.js            # Estado local en memoria (listas)
        ├── validators.js       # Funciones de validación de formularios
        └── modules/
            ├── categories.js   # Submódulo Categories (lista + formulario)
            ├── products.js     # Submódulo Products (lista + formulario)
            └── users.js        # Submódulo Users (lista + formulario)
```

El backend (Node.js/Express) vive en un repositorio o directorio separado y no se detalla en este documento más allá de los contratos de API.

### Diagrama de arquitectura

```mermaid
graph TD
    Browser["Browser\nadmin.html"]
    Auth["auth.js\nAuth_Guard"]
    Router["router.js\nNavegación"]
    State["state.js\nEstado en memoria"]
    API["api.js\nHTTP Client"]
    ImgSvc["imageService.js\nUpload"]
    Backend["API REST\n(Node/Express)"]
    MongoDB[("MongoDB")]
    Bucket["Railway Bucket\n(t3.storageapi.dev)"]

    Browser --> Auth
    Auth -->|sesión válida| Router
    Auth -->|sin sesión| Browser
    Router --> State
    State --> API
    API --> Backend
    Backend --> MongoDB
    ImgSvc --> Bucket
    ImgSvc -->|URL| State
```

---

## Componentes e Interfaces

### `auth.js` — Auth_Guard y sesión

```js
// Interfaz pública
export function getSession()           // → { username, name, role } | null
export function setSession(data)       // Persiste en sessionStorage
export function clearSession()         // Elimina sesión y redirige a /admin.html
export function guardAdmin()           // Llama clearSession() si no hay sesión admin válida
export function isAdmin()              // → boolean
```

La sesión se almacena en `sessionStorage` bajo la clave `"admin_session"` como JSON.

### `api.js` — HTTP Client

```js
// Interfaz pública
export async function login(username, password)          // → { username, name, role }
export async function fetchCategories()                  // → Category[]
export async function createCategory(data)               // → Category
export async function updateCategory(id, data)           // → Category
export async function fetchProducts()                    // → Product[]
export async function createProduct(data)                // → Product
export async function updateProduct(id, data)            // → Product
export async function fetchUsers()                       // → User[]
export async function createUser(data)                   // → User
export async function updateUser(id, data)               // → User
```

Todas las funciones incluyen el token de sesión en el header `Authorization: Bearer <token>` (o cookie httpOnly según implementación del backend). Los errores HTTP se lanzan como `Error` con el mensaje del servidor.

### `state.js` — Estado en memoria

```js
// Estado global del panel
const state = {
  categories: [],   // Category[]
  products: [],     // Product[]
  users: [],        // User[]
}

export function getState()
export function setCategories(list)
export function upsertCategory(item)   // Inserta o reemplaza por _id
export function setProducts(list)
export function upsertProduct(item)
export function setUsers(list)
export function upsertUser(item)
```

`upsertCategory/Product/User` recibe el objeto retornado por la API y actualiza el array en memoria sin re-fetch.

### `validators.js` — Validación de formularios

```js
export function validateCategory(data)   // → { valid: boolean, errors: Record<string,string> }
export function validateProduct(data)    // → { valid: boolean, errors: Record<string,string> }
export function validateUser(data, isEdit) // → { valid: boolean, errors: Record<string,string> }
export function validatePrice(value)     // → boolean
export function validateDiscount(value)  // → boolean
export function validateQuantity(value)  // → boolean
export function validateUsername(value)  // → boolean
```

### `router.js` — Navegación sin recarga

```js
export function initRouter()
export function navigateTo(section)   // 'categories' | 'products' | 'users'
export function getActiveSection()    // → string
```

Muestra/oculta secciones del DOM mediante clases CSS; actualiza el estado activo del menú.

### `notifications.js` — Toast notifications

```js
export function showSuccess(message)
export function showError(message)
export function showInfo(message)
```

Inyecta un elemento toast en el DOM con auto-dismiss a los 4 segundos.

### `imageService.js` — Subida de imágenes

```js
export async function uploadImage(file)         // → string (URL)
export async function uploadGallery(files)      // → string[] (URLs)
```

Hace `POST` al endpoint de upload del backend, que a su vez sube al bucket y retorna la URL.

### Módulos de submódulo (`modules/*.js`)

Cada módulo exporta:
```js
export function init(containerEl)   // Renderiza lista + botón crear
export function renderList()        // Actualiza la lista desde state
export function openForm(item?)     // Abre formulario (vacío o pre-cargado)
export function closeForm()
```

---

## Modelos de Datos

### Tipos JS (interfaces de referencia)

```js
// Session (sessionStorage)
{
  username: string,
  name: string,
  role: string,        // "admin"
  token: string        // JWT o token de sesión
}

// Category
{
  _id: string,
  name: string,
  description: string,
  active: boolean,
  dateCreation: string,  // ISO string
  createdBy: string      // username
}

// Product
{
  _id: string,
  category: string,      // _id de Category como string
  title: string,
  description: string,
  price: number | null,
  discount: number,      // 0-100
  image: string,         // URL
  gallery: string[],     // URLs
  quantity: number,      // >= 0
  priority: number,
  dateEndPublish: string | null,
  active: boolean,
  dateCreation: string,
  createdBy: string
}

// User (nunca incluye password en el cliente)
{
  _id: string,
  name: string,
  username: string,
  role: string,
  active: boolean,
  dateCreation: string,
  createdBy: string
}
```

### Resolución de Category en Products

El campo `product.category` almacena el `_id` de la categoría como string. Para mostrar el nombre en la lista de productos, el módulo `products.js` busca en `state.categories` el objeto cuyo `_id` coincide:

```js
function resolveCategoryName(categoryId) {
  const cat = state.categories.find(c => c._id === categoryId)
  return cat ? cat.name : '—'
}
```

---

## Diseño de la API REST

Base URL: `/api/v1`

### Autenticación

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| `POST` | `/auth/login` | `{ username, password }` | `200: { username, name, role, token }` |

Errores: `401` (credenciales inválidas o cuenta inactiva).

### Categories

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| `GET` | `/categories` | — | `200: Category[]` |
| `POST` | `/categories` | `{ name, description?, active }` | `201: Category` |
| `PUT` | `/categories/:id` | `{ name?, description?, active? }` | `200: Category` |

El backend asigna `dateCreation` y `createdBy` (del token) en `POST`. No se aceptan esos campos en el body del cliente.

### Products

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| `GET` | `/products` | — | `200: Product[]` |
| `POST` | `/products` | `{ category, title, description?, price?, discount?, image?, gallery?, quantity?, priority?, dateEndPublish?, active }` | `201: Product` |
| `PUT` | `/products/:id` | campos a actualizar | `200: Product` |

### Users

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| `GET` | `/users` | — | `200: User[]` (sin campo `password`) |
| `POST` | `/users` | `{ name, username, role, password, active }` | `201: User` |
| `PUT` | `/users/:id` | `{ name?, username?, role?, password?, active? }` | `200: User` |

En `PUT /users/:id`, si `password` no está presente en el body, el backend conserva el hash existente. Si está presente, lo hashea con bcrypt (cost ≥ 10).

Errores comunes: `400` (validación), `401` (no autenticado), `403` (no autorizado), `409` (username duplicado), `500` (error de servidor).

### Upload de imágenes

| Método | Endpoint | Body | Respuesta |
|--------|----------|------|-----------|
| `POST` | `/upload/image` | `FormData { file }` | `200: { url: string }` |
| `POST` | `/upload/gallery` | `FormData { files[] }` | `200: { urls: string[] }` |

> **Nota:** El backend usa `@aws-sdk/client-s3` configurado con el endpoint de Railway (`https://t3.storageapi.dev`). Ver sección [Configuración del Bucket de Imágenes](#configuración-del-bucket-de-imágenes).

---

## Manejo de Imágenes

```mermaid
sequenceDiagram
    actor Admin
    participant Form as Product_Form
    participant ImgSvc as imageService.js
    participant Backend as API /upload
    participant Bucket as Railway Bucket

    Admin->>Form: Selecciona archivo(s)
    Form->>ImgSvc: uploadImage(file)
    ImgSvc->>Backend: POST /upload/image (FormData)
    Backend->>Bucket: PUT objeto
    Bucket-->>Backend: URL pública
    Backend-->>ImgSvc: { url }
    ImgSvc-->>Form: URL string
    Form->>Form: Almacena URL en campo image/gallery
    Note over Form: La URL se envía junto al resto del formulario al guardar
```

Si la subida falla, `imageService.js` lanza un error que el módulo captura para mostrar una notificación de error. El formulario permanece abierto para reintentar.

---

## Configuración del Bucket de Imágenes

| Parámetro | Valor |
|-----------|-------|
| Proveedor | Railway Object Storage (S3-compatible) |
| Endpoint | `https://t3.storageapi.dev` |
| Región | `iad` |
| Bucket | `recorded-chest-3ailh9qdqx` |

**Seguridad de credenciales:** `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` se almacenan exclusivamente como variables de entorno en el backend. Nunca deben incluirse en el frontend ni en el repositorio.

**URL pública de objetos:** `https://t3.storageapi.dev/recorded-chest-3ailh9qdqx/{key}`

**SDK:** El backend usa `@aws-sdk/client-s3` (v3) configurado con el endpoint personalizado:

```js
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,           // 'iad'
  endpoint: process.env.AWS_ENDPOINT_URL,           // 'https://t3.storageapi.dev'
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,   // requerido para endpoints S3-compatible no-AWS
})
```

**Generación del key:** `products/{uuid}-{originalFilename}` — evita colisiones entre archivos con el mismo nombre.

**Subida del objeto:** se especifica `ContentType` del archivo y `ACL: 'public-read'` para que la URL sea accesible públicamente sin autenticación.

**URL almacenada en MongoDB:** `${AWS_ENDPOINT_URL}/${AWS_S3_BUCKET_NAME}/${key}`

---

## Configuración de MongoDB

| Parámetro | Valor |
|-----------|-------|
| Proveedor | Railway MongoDB |
| Host interno (Railway) | `mongodb.railway.internal:27017` |
| Host público (desarrollo local) | `caboose.proxy.rlwy.net:53299` |
| Usuario | `mongo` |
| Base de datos | `tg_admin` (a definir en el backend) |

**Seguridad de credenciales:** Todas las variables de conexión se almacenan exclusivamente como variables de entorno en el backend. Nunca deben incluirse en el frontend ni en el repositorio.

**Variables de entorno del backend:**

```env
# MongoDB - Railway
MONGO_URL=mongodb://mongo:QFrBZVtUZkndgWLkJRaMaQlkvzParrnX@mongodb.railway.internal:27017
MONGO_PUBLIC_URL=mongodb://mongo:QFrBZVtUZkndgWLkJRaMaQlkvzParrnX@caboose.proxy.rlwy.net:53299
MONGOHOST=mongodb.railway.internal
MONGOPORT=27017
MONGOUSER=mongo
MONGOPASSWORD=QFrBZVtUZkndgWLkJRaMaQlkvzParrnX
MONGO_INITDB_ROOT_USERNAME=mongo
MONGO_INITDB_ROOT_PASSWORD=QFrBZVtUZkndgWLkJRaMaQlkvzParrnX

# Railway Object Storage (S3-compatible)
AWS_ACCESS_KEY_ID=tid_GdZJjZJdBAjmphLiJPYCcBPaFjKWzlLofigHYayunaOoiZONLR
AWS_SECRET_ACCESS_KEY=tsec_+6m1PWVwFOq8FgDWT1oW+9bFVVFVt8Ybay+a5216Ju3DEjlrc0f2mnovLT0JZ-p_mOcBUv
AWS_DEFAULT_REGION=iad
AWS_ENDPOINT_URL=https://t3.storageapi.dev
AWS_S3_BUCKET_NAME=recorded-chest-3ailh9qdqx
```

**Conexión en el backend (Node.js/Mongoose):**

```js
import mongoose from 'mongoose'

// Usa MONGO_URL en Railway (red interna), MONGO_PUBLIC_URL en desarrollo local
const uri = process.env.MONGO_URL || process.env.MONGO_PUBLIC_URL

await mongoose.connect(uri, { dbName: 'tg_admin' })
```

**Nota:** En Railway, el servicio backend debe usar `MONGO_URL` (red interna) para menor latencia. En desarrollo local, usar `MONGO_PUBLIC_URL` con el proxy público.

**Conexión recomendada en Node.js con Mongoose:**

```js
import mongoose from 'mongoose'

await mongoose.connect(process.env.MONGO_URL, {
  dbName: 'tg_admin',
})
```

**Nota sobre URLs de conexión:**
- En **producción (Railway):** usar `MONGO_URL` (`mongodb://mongo:...@mongodb.railway.internal:27017`) — red interna, más rápida y sin costo de egress.
- En **desarrollo local:** usar `MONGO_PUBLIC_URL` (`mongodb://mongo:...@caboose.proxy.rlwy.net:53299`) — acceso externo vía proxy.

**Colecciones utilizadas:** `users`, `products`, `categories` — nombres en minúsculas y plural, consistentes con los esquemas MongoDB definidos en el documento de requisitos.

---

## Estructura de Navegación del Panel

### Layout HTML (`admin.html`)

```
┌─────────────────────────────────────────────────────┐
│  HEADER: Logo TG | "Admin Panel" | username | Logout │
├──────────────┬──────────────────────────────────────┤
│   SIDEBAR    │           MAIN CONTENT               │
│              │                                      │
│ > Categories │  [Lista / Formulario del submódulo]  │
│   Products   │                                      │
│   Users      │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

En mobile (≤ 768px) el sidebar colapsa a un menú hamburguesa en el header.

### Flujo de navegación

```mermaid
flowchart LR
    Login["Login\n/admin.html"] -->|auth OK| Panel["Admin Panel"]
    Panel --> Cat["Categories"]
    Panel --> Prod["Products"]
    Panel --> Users["Users"]
    Cat -->|click crear| CatForm["Category_Form\n(vacío)"]
    Cat -->|click editar| CatFormEdit["Category_Form\n(pre-cargado)"]
    Prod -->|click crear| ProdForm["Product_Form\n(vacío)"]
    Prod -->|click editar| ProdFormEdit["Product_Form\n(pre-cargado)"]
    Users -->|click crear| UserForm["User_Form\n(vacío)"]
    Users -->|click editar| UserFormEdit["User_Form\n(pre-cargado)"]
    Panel -->|logout| Login
```

---

## Flujo de Autenticación

```mermaid
sequenceDiagram
    actor Admin
    participant Page as admin.html
    participant Guard as auth.js
    participant API as api.js
    participant SS as sessionStorage

    Admin->>Page: Navega a /admin.html
    Page->>Guard: guardAdmin()
    Guard->>SS: getItem("admin_session")
    alt Sesión válida con role=admin
        Guard-->>Page: OK — renderiza panel
    else Sin sesión o role != admin
        Guard-->>Page: Redirige a /admin.html#login
    end

    Admin->>Page: Envía formulario de login
    Page->>API: login(username, password)
    API->>Backend: POST /auth/login
    alt Credenciales válidas + active=true
        Backend-->>API: { username, name, role, token }
        API-->>Page: datos de sesión
        Page->>SS: setItem("admin_session", JSON)
        Page->>Guard: guardAdmin() — renderiza panel
    else Error
        Backend-->>API: 401
        API-->>Page: Error
        Page->>Page: Muestra mensaje de error genérico
    end
```

**Expiración de sesión:** El token JWT tiene TTL configurado en el backend. Cada llamada a `api.js` verifica si la respuesta es `401`; si lo es, llama a `clearSession()` que limpia `sessionStorage` y redirige al login.

---

## Patrones de Validación de Formularios

Todas las validaciones corren en `validators.js` antes de cualquier llamada a la API.

### Reglas por campo

| Campo | Regla |
|-------|-------|
| `name` (Category/User) | No vacío, no solo espacios |
| `username` | No vacío, solo `[a-zA-Z0-9_-]`, sin espacios |
| `password` (crear) | Obligatorio, mínimo 6 caracteres |
| `password` (editar) | Opcional; si se provee, mínimo 6 caracteres |
| `role` | Debe ser uno de los valores predefinidos |
| `title` (Product) | No vacío |
| `category` (Product) | Debe seleccionarse un `_id` válido |
| `price` | Número decimal positivo o vacío (null) |
| `discount` | Entero en [0, 100] |
| `quantity` | Entero no negativo |

### Patrón de feedback visual

```js
// Ejemplo de aplicación de errores al DOM
function applyErrors(form, errors) {
  // Limpiar errores previos
  form.querySelectorAll('.field-error').forEach(el => el.remove())
  form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'))

  Object.entries(errors).forEach(([field, message]) => {
    const input = form.querySelector(`[name="${field}"]`)
    if (!input) return
    input.classList.add('input-error')
    const errorEl = document.createElement('span')
    errorEl.className = 'field-error'
    errorEl.textContent = message
    input.insertAdjacentElement('afterend', errorEl)
  })
}
```

---

## Manejo de Estado Local

Las listas se cargan una vez al inicializar cada submódulo y se actualizan en memoria con los datos que retorna la API tras cada operación exitosa.

```mermaid
sequenceDiagram
    participant Module as categories.js
    participant State as state.js
    participant API as api.js

    Module->>API: fetchCategories()
    API-->>Module: Category[]
    Module->>State: setCategories(list)
    Module->>Module: renderList()

    Note over Module: Usuario crea/edita categoría

    Module->>API: createCategory(data) / updateCategory(id, data)
    API-->>Module: Category (documento guardado)
    Module->>State: upsertCategory(item)
    Module->>Module: renderList()
    Module->>Notifications: showSuccess(...)
```

Este patrón garantiza que la lista siempre refleja el estado real de MongoDB (usando los datos que el backend confirma haber guardado) sin necesidad de un re-fetch completo.

---

## Propiedades de Corrección

*Una propiedad es una característica o comportamiento que debe mantenerse verdadero en todas las ejecuciones válidas del sistema — esencialmente, una declaración formal sobre lo que el sistema debe hacer. Las propiedades sirven como puente entre especificaciones legibles por humanos y garantías de corrección verificables por máquinas.*

Se usa **fast-check** (JavaScript) como librería de property-based testing. Cada test se configura con mínimo 100 iteraciones.

### Propiedad 1: Auth_Guard acepta solo sesiones admin válidas

*Para cualquier* objeto de sesión, `isAdmin()` debe retornar `true` si y solo si el objeto tiene `role === "admin"` y existe en sessionStorage; para cualquier otro valor (null, undefined, role distinto), debe retornar `false`.

**Valida: Requisitos 1.1, 1.2**

---

### Propiedad 2: El username de la sesión se muestra en la navegación

*Para cualquier* sesión válida con un `username` arbitrario, el elemento de navegación del panel debe contener exactamente ese `username` como texto visible.

**Valida: Requisito 1.5**

---

### Propiedad 3: El error de autenticación no revela información

*Para cualquier* combinación de username/password incorrectos (username inexistente o password incorrecto), la respuesta de error de la API debe ser siempre el mismo mensaje genérico, sin distinguir cuál de los dos campos es incorrecto.

**Valida: Requisitos 2.3, 2.5**

---

### Propiedad 4: Comparación bcrypt es correcta

*Para cualquier* string de contraseña, hashear con bcrypt y luego comparar el mismo string debe retornar `true`; comparar cualquier string diferente debe retornar `false`.

**Valida: Requisito 2.4**

---

### Propiedad 5: La respuesta de login exitoso contiene los campos requeridos

*Para cualquier* usuario válido y activo, la respuesta de autenticación exitosa debe contener exactamente los campos `username`, `name` y `role`, sin incluir el campo `password`.

**Valida: Requisito 2.7**

---

### Propiedad 6: La navegación activa refleja la sección actual

*Para cualquier* sección válida del panel (`categories`, `products`, `users`), después de navegar a ella, el ítem de menú correspondiente debe tener la clase CSS activa y los demás no deben tenerla.

**Valida: Requisitos 3.2, 3.3**

---

### Propiedad 7: La lista de categorías muestra todos los registros con los campos requeridos

*Para cualquier* array de objetos Category, la lista renderizada debe contener exactamente tantos ítems como el array, y cada ítem debe mostrar los campos `name`, `active` y `dateCreation`.

**Valida: Requisito 4.1**

---

### Propiedad 8: El formulario de categoría pre-carga los datos correctamente

*Para cualquier* objeto Category, al abrir el formulario en modo edición, cada campo del formulario debe contener el valor correspondiente del objeto Category.

**Valida: Requisitos 4.3, 5.3, 6.3**

---

### Propiedad 9: La validación rechaza nombres vacíos o solo espacios

*Para cualquier* string compuesto únicamente de espacios en blanco (incluyendo el string vacío), la validación del campo `name` en Category_Form y User_Form debe rechazarlo y retornar un error.

**Valida: Requisitos 4.5, 5.5**

---

### Propiedad 10: Los campos automáticos se asignan correctamente al crear

*Para cualquier* dato de categoría, producto o usuario nuevo enviado a la API, el documento guardado debe contener `dateCreation` como ISO string válido y `createdBy` igual al `username` de la sesión activa.

**Valida: Requisitos 4.6, 5.9, 6.10**

---

### Propiedad 11: La lista se actualiza con los datos retornados por la API

*Para cualquier* objeto retornado por la API tras una operación de guardado exitosa, el estado local debe contener ese objeto (identificado por `_id`) con todos sus campos actualizados.

**Valida: Requisitos 4.7, 5.10, 6.11, 8.2, 8.4**

---

### Propiedad 12: La lista de productos resuelve el nombre de la categoría

*Para cualquier* array de productos y mapa de categorías, la lista renderizada debe mostrar el `name` de la categoría cuyo `_id` coincide con `product.category`, nunca el `_id` crudo.

**Valida: Requisitos 5.1, 8.5**

---

### Propiedad 13: La galería almacena todas las URLs subidas

*Para cualquier* array de archivos de imagen, `uploadGallery` debe retornar un array de URLs con la misma longitud, donde cada URL corresponde a un archivo subido.

**Valida: Requisito 5.7**

---

### Propiedad 14: El formulario de usuario pre-carga con password vacío

*Para cualquier* objeto User, al abrir el formulario en modo edición, el campo `password` debe estar siempre vacío, independientemente del contenido del objeto.

**Valida: Requisito 6.3**

---

### Propiedad 15: Username duplicado retorna error de conflicto

*Para cualquier* username que ya existe en la colección, intentar crear un nuevo usuario con ese mismo username debe retornar un error HTTP 409.

**Valida: Requisito 6.6**

---

### Propiedad 16: Editar usuario sin password conserva el hash

*Para cualquier* usuario existente, si se envía una actualización sin el campo `password`, el hash almacenado en MongoDB debe ser idéntico al hash previo a la operación.

**Valida: Requisito 6.7**

---

### Propiedad 17: Las contraseñas se almacenan como hash bcrypt válido

*Para cualquier* string de contraseña, el valor almacenado en MongoDB debe ser un hash bcrypt válido con factor de costo ≥ 10, nunca el texto plano.

**Valida: Requisito 6.9**

---

### Propiedad 18: La lista de usuarios nunca expone el campo password

*Para cualquier* array de usuarios retornado por la API o renderizado en la lista, ningún elemento debe contener o mostrar el campo `password`.

**Valida: Requisito 6.14**

---

### Propiedad 19: La validación corre antes de cualquier llamada a la API

*Para cualquier* formulario con datos inválidos, al intentar guardar, no debe realizarse ninguna llamada HTTP a la API; la validación debe interceptar el envío.

**Valida: Requisito 7.1**

---

### Propiedad 20: Validación de campos numéricos del producto

*Para cualquier* valor de `price` negativo o no numérico, `discount` fuera de [0,100], o `quantity` no entero o negativo, las funciones de validación correspondientes deben retornar `false`.

**Valida: Requisitos 7.3, 7.4, 7.5**

---

### Propiedad 21: Validación de formato de username

*Para cualquier* string que contenga espacios o caracteres fuera de `[a-zA-Z0-9_-]`, `validateUsername` debe retornar `false`.

**Valida: Requisito 7.6**

---

## Manejo de Errores

### Errores de red / API

Todos los errores HTTP se capturan en `api.js` y se lanzan como instancias de `Error` con el mensaje del servidor. Los módulos los capturan con `try/catch` y llaman a `showError()`.

```js
// Patrón en api.js
async function apiFetch(path, options = {}) {
  const session = getSession()
  const res = await fetch(`/api/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.token}`,
      ...options.headers,
    },
  })
  if (res.status === 401) {
    clearSession()   // Sesión expirada → redirige al login
    return
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Error ${res.status}`)
  }
  return res.json()
}
```

### Errores de subida de imágenes

Si `uploadImage` falla, el módulo de productos muestra una notificación de error y mantiene el formulario abierto. El campo de imagen queda vacío para que el usuario pueda reintentar.

### Errores de validación

Los errores de validación se muestran inline junto al campo afectado (clase `.field-error`) y el campo se resalta con `.input-error`. No se muestra toast para errores de validación — el feedback es directamente en el formulario.

### Errores de servidor (500)

Se muestra una notificación de error genérica: "Error del servidor. Por favor intenta de nuevo."

---

## Estrategia de Testing

### Enfoque dual

Se combinan tests de ejemplo (unit tests) y tests de propiedades (property-based tests) para cobertura completa.

**Librería PBT:** `fast-check` (npm) — compatible con Vitest/Jest, sin dependencias adicionales.

**Test runner:** Vitest (ya disponible con Vite).

### Tests de propiedades

Cada propiedad del documento se implementa como un test de propiedad con `fc.assert(fc.property(...))`, mínimo 100 iteraciones. Los tests de API usan mocks (no llaman al backend real).

Formato de tag en cada test:
```js
// Feature: admin-panel, Property N: <texto de la propiedad>
```

Ejemplo:
```js
import fc from 'fast-check'
import { isAdmin } from '../src/admin/auth.js'

// Feature: admin-panel, Property 1: Auth_Guard acepta solo sesiones admin válidas
test('isAdmin retorna true solo para role=admin', () => {
  fc.assert(fc.property(
    fc.record({
      username: fc.string(),
      name: fc.string(),
      role: fc.string(),
    }),
    (session) => {
      const result = isAdmin(session)
      return result === (session.role === 'admin')
    }
  ), { numRuns: 100 })
})
```

### Tests de ejemplo (unit tests)

- Login form tiene campos `username` y `password` (Requisito 2.1)
- Menú de navegación contiene las tres opciones (Requisito 3.1)
- Botón de logout limpia la sesión y redirige (Requisito 3.4)
- Category_Form vacío al crear (Requisito 4.2)
- Category_Form tiene los campos requeridos (Requisito 4.4)
- Usuario inactivo es rechazado en login (Requisito 2.6)
- Campos `dateCreation` y `createdBy` no son editables en formularios (Requisitos 4.9, 5.12, 6.13)

### Tests de integración

- `POST /auth/login` con credenciales válidas retorna token y datos de usuario
- `GET /categories` retorna lista de categorías desde MongoDB
- `POST /upload/image` sube archivo y retorna URL válida
- `PUT /users/:id` sin campo `password` conserva el hash en MongoDB
- `POST /users` con username duplicado retorna HTTP 409

### Cobertura objetivo

- `validators.js`: 100% — es lógica pura, ideal para PBT
- `auth.js` (funciones puras): 100%
- `state.js`: 100%
- `api.js`: 80%+ con mocks
- Módulos UI: 60%+ con tests de ejemplo
