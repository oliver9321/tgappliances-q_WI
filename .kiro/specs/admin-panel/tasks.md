# Plan de Implementación: Admin Panel

## Visión General

Implementación del módulo de administración para TG Pre-Owned Appliances. El panel es una página HTML independiente (`admin.html`) con backend Node.js/Express, MongoDB (Mongoose) y bucket Railway S3-compatible para imágenes. El frontend usa Vanilla JS con ES modules, procesado por Vite.

## Tareas

- [x] 1. Configurar el proyecto backend (Express + MongoDB + estructura base)
  - [x] 1.1 Crear `backend/package.json` con dependencias: `express`, `mongoose`, `bcryptjs`, `jsonwebtoken`, `multer`, `@aws-sdk/client-s3`, `uuid`, `cors`, `dotenv`
    - Usar `"type": "module"` para ES modules
    - Agregar script `"start": "node server.js"` y `"dev": "node --watch server.js"`
    - _Requisitos: 2.4, 6.9, 5.6_
  - [x] 1.2 Crear `backend/server.js` con Express configurado: CORS, JSON body parser, rutas montadas en `/api/v1`, conexión a MongoDB con Mongoose
    - Leer `MONGO_URL` (Railway) o `MONGO_PUBLIC_URL` (local) con fallback
    - Conectar con `dbName: 'tg_admin'`
    - Exportar `app` para tests
    - _Requisitos: 8.1, 8.3_
  - [x] 1.3 Crear `backend/middleware/auth.middleware.js` que verifica el JWT del header `Authorization: Bearer <token>` y adjunta `req.user` con `{ username, role }`
    - Retornar `401` si el token falta o es inválido
    - Retornar `403` si el rol no es `admin`
    - _Requisitos: 1.1, 1.2, 1.4_

- [x] 2. Crear modelos Mongoose
  - [x] 2.1 Crear `backend/models/Category.js` con esquema: `name` (String, required), `description` (String), `active` (Boolean, default true), `dateCreation` (String), `createdBy` (String)
    - _Requisitos: 4.6, 8.1_
  - [x] 2.2 Crear `backend/models/Product.js` con esquema completo: `category` (String, required), `title` (String, required), `description` (String), `price` (Number, default null), `discount` (Number, default 0), `image` (String), `gallery` ([String]), `quantity` (Number, default 0), `priority` (Number, default 0), `dateEndPublish` (String, default null), `active` (Boolean, default true), `dateCreation` (String), `createdBy` (String)
    - _Requisitos: 5.9, 8.1_
  - [x] 2.3 Crear `backend/models/User.js` con esquema: `name` (String, required), `username` (String, required, unique), `role` (String, required), `password` (String, required), `active` (Boolean, default true), `dateCreation` (Object), `createdBy` (String)
    - Índice único en `username`
    - _Requisitos: 6.6, 6.9, 6.10_

- [x] 3. Implementar endpoints de autenticación
  - [x] 3.1 Crear `backend/routes/auth.routes.js` y `backend/controllers/auth.controller.js` con `POST /auth/login`
    - Buscar usuario por `username`, verificar `active`, comparar password con `bcryptjs.compare`
    - Si válido: firmar JWT con `{ username, name, role }` y retornar `{ username, name, role, token }`
    - Si inválido: retornar `401` con mensaje genérico (no revelar cuál campo falló)
    - _Requisitos: 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  - [ ]* 3.2 Escribir test de propiedad para autenticación — Propiedad 3
    - **Propiedad 3: El error de autenticación no revela información**
    - **Valida: Requisitos 2.3, 2.5**
  - [ ]* 3.3 Escribir test de propiedad para bcrypt — Propiedad 4
    - **Propiedad 4: Comparación bcrypt es correcta**
    - **Valida: Requisito 2.4**
  - [ ]* 3.4 Escribir test de propiedad para respuesta de login — Propiedad 5
    - **Propiedad 5: La respuesta de login exitoso contiene los campos requeridos**
    - **Valida: Requisito 2.7**

- [x] 4. Implementar endpoints CRUD de Categories
  - [x] 4.1 Crear `backend/routes/categories.routes.js` y `backend/controllers/categories.controller.js`
    - `GET /categories` — retorna todos los documentos (requiere auth middleware)
    - `POST /categories` — asigna `dateCreation` (ISO string) y `createdBy` desde `req.user.username`; no acepta esos campos del body
    - `PUT /categories/:id` — actualiza campos permitidos; no modifica `dateCreation` ni `createdBy`
    - Retornar el documento guardado en la respuesta
    - _Requisitos: 4.6, 4.7, 4.8, 8.1, 8.4, 8.6_

- [x] 5. Implementar endpoints CRUD de Products
  - [x] 5.1 Crear `backend/routes/products.routes.js` y `backend/controllers/products.controller.js`
    - `GET /products` — retorna todos los documentos
    - `POST /products` — asigna `dateCreation` y `createdBy`; valida `title` y `category` requeridos
    - `PUT /products/:id` — actualiza campos permitidos
    - Retornar el documento guardado en la respuesta
    - _Requisitos: 5.9, 5.10, 5.11, 8.1, 8.4, 8.6_

- [x] 6. Implementar endpoints CRUD de Users
  - [x] 6.1 Crear `backend/routes/users.routes.js` y `backend/controllers/users.controller.js`
    - `GET /users` — retorna usuarios sin el campo `password` (usar `.select('-password')`)
    - `POST /users` — hashear password con bcrypt (cost 10), asignar `dateCreation: { $date: new Date().toISOString() }` y `createdBy`; retornar `409` si username duplicado
    - `PUT /users/:id` — si `password` presente en body: hashear y reemplazar; si ausente: no modificar el hash existente
    - Retornar usuario sin campo `password` en la respuesta
    - _Requisitos: 6.6, 6.7, 6.8, 6.9, 6.10, 6.14_
  - [ ]* 6.2 Escribir test de propiedad para username duplicado — Propiedad 15
    - **Propiedad 15: Username duplicado retorna error de conflicto**
    - **Valida: Requisito 6.6**
  - [ ]* 6.3 Escribir test de propiedad para conservar hash — Propiedad 16
    - **Propiedad 16: Editar usuario sin password conserva el hash**
    - **Valida: Requisito 6.7**
  - [ ]* 6.4 Escribir test de propiedad para almacenamiento de contraseñas — Propiedad 17
    - **Propiedad 17: Las contraseñas se almacenan como hash bcrypt válido**
    - **Valida: Requisito 6.9**
  - [ ]* 6.5 Escribir test de propiedad para exposición de password — Propiedad 18
    - **Propiedad 18: La lista de usuarios nunca expone el campo password**
    - **Valida: Requisito 6.14**

- [x] 7. Implementar endpoint de upload de imágenes
  - [x] 7.1 Crear `backend/routes/upload.routes.js` y `backend/controllers/upload.controller.js`
    - Configurar `multer` con `memoryStorage` para recibir archivos en memoria
    - `POST /upload/image` — recibe `file`, sube a Railway S3 con key `products/{uuid}-{originalname}`, retorna `{ url }`
    - `POST /upload/gallery` — recibe `files[]`, sube cada archivo, retorna `{ urls: string[] }`
    - Configurar `S3Client` con `endpoint`, `region`, `credentials` y `forcePathStyle: true`
    - URL pública: `${AWS_ENDPOINT_URL}/${AWS_S3_BUCKET_NAME}/${key}`
    - _Requisitos: 5.6, 5.7, 5.8_
  - [ ]* 7.2 Escribir test de propiedad para galería — Propiedad 13
    - **Propiedad 13: La galería almacena todas las URLs subidas**
    - **Valida: Requisito 5.7**

- [x] 8. Checkpoint — Backend completo
  - Verificar que todos los endpoints responden correctamente con un cliente HTTP (ej. curl o Thunder Client)
  - Asegurarse de que los tests del backend pasan. Consultar al usuario si hay dudas.

- [x] 9. Crear `admin.html` y `admin.css`
  - [x] 9.1 Crear `admin.html` con estructura completa: `<header>` (logo, título, username, botón logout), `<aside>` (sidebar con nav: Categories, Products, Users), `<main>` (contenedor de secciones), sección de login (`#login-section`), secciones de cada submódulo (`#categories-section`, `#products-section`, `#users-section`)
    - Importar `admin.js` como `type="module"`
    - Importar `admin.css`
    - Incluir Font Awesome desde CDN (consistente con `index.html`)
    - _Requisitos: 2.1, 3.1, 3.4_
  - [x] 9.2 Crear `admin.css` con estilos del panel: variables CSS heredadas de `style.css`, layout sidebar + main con CSS Grid, estilos de header, nav activo, formularios, tablas de lista, toast notifications, clases `.input-error` y `.field-error`, responsive mobile (≤768px con menú hamburguesa)
    - _Requisitos: 3.3, 7.2_

- [x] 10. Implementar `src/admin/auth.js`
  - Implementar `getSession()`, `setSession(data)`, `clearSession()`, `guardAdmin()`, `isAdmin(session)`
  - `getSession()` lee de `sessionStorage` bajo clave `"admin_session"`
  - `guardAdmin()` llama `clearSession()` si no hay sesión con `role === "admin"`
  - `clearSession()` elimina la clave de `sessionStorage` y redirige a `admin.html#login`
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5_
  - [x]* 10.1 Escribir test de propiedad para Auth_Guard — Propiedad 1
    - **Propiedad 1: Auth_Guard acepta solo sesiones admin válidas**
    - **Valida: Requisitos 1.1, 1.2**
  - [ ]* 10.2 Escribir test de propiedad para username en navegación — Propiedad 2
    - **Propiedad 2: El username de la sesión se muestra en la navegación**
    - **Valida: Requisito 1.5**

- [x] 11. Implementar `src/admin/api.js`
  - Implementar función interna `apiFetch(path, options)` con header `Authorization: Bearer <token>`, manejo de `401` (llama `clearSession()`), y lanzamiento de `Error` con mensaje del servidor para otros errores
  - Implementar todas las funciones públicas: `login`, `fetchCategories`, `createCategory`, `updateCategory`, `fetchProducts`, `createProduct`, `updateProduct`, `fetchUsers`, `createUser`, `updateUser`
  - `login` no usa `apiFetch` (no requiere token); guarda la sesión con `setSession`
  - _Requisitos: 2.2, 4.7, 5.10, 6.11, 8.1, 8.3_

- [x] 12. Implementar `src/admin/state.js`
  - Implementar estado global `{ categories: [], products: [], users: [] }`
  - Implementar `getState()`, `setCategories(list)`, `upsertCategory(item)`, `setProducts(list)`, `upsertProduct(item)`, `setUsers(list)`, `upsertUser(item)`
  - `upsertX(item)` busca por `_id` y reemplaza si existe, o inserta al inicio si no existe
  - _Requisitos: 8.2, 8.4_
  - [x]* 12.1 Escribir test de propiedad para actualización de estado — Propiedad 11
    - **Propiedad 11: La lista se actualiza con los datos retornados por la API**
    - **Valida: Requisitos 4.7, 5.10, 6.11, 8.2, 8.4**

- [x] 13. Implementar `src/admin/validators.js`
  - Implementar `validateCategory(data)` — valida `name` no vacío/solo espacios, `active` presente
  - Implementar `validateProduct(data)` — valida `title` y `category` requeridos, `price` (decimal positivo o null), `discount` (entero 0–100), `quantity` (entero no negativo)
  - Implementar `validateUser(data, isEdit)` — valida `name`, `username`, `role` requeridos; `password` requerido solo si `!isEdit`; si `isEdit` y password presente, mínimo 6 chars
  - Implementar helpers: `validatePrice(value)`, `validateDiscount(value)`, `validateQuantity(value)`, `validateUsername(value)` (solo `[a-zA-Z0-9_-]`)
  - Retornar `{ valid: boolean, errors: Record<string,string> }`
  - _Requisitos: 4.5, 5.5, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [x]* 13.1 Escribir test de propiedad para nombres vacíos — Propiedad 9
    - **Propiedad 9: La validación rechaza nombres vacíos o solo espacios**
    - **Valida: Requisitos 4.5, 5.5**
  - [x]* 13.2 Escribir test de propiedad para campos numéricos — Propiedad 20
    - **Propiedad 20: Validación de campos numéricos del producto**
    - **Valida: Requisitos 7.3, 7.4, 7.5**
  - [x]* 13.3 Escribir test de propiedad para formato de username — Propiedad 21
    - **Propiedad 21: Validación de formato de username**
    - **Valida: Requisito 7.6**
  - [ ]* 13.4 Escribir test de propiedad para validación previa a API — Propiedad 19
    - **Propiedad 19: La validación corre antes de cualquier llamada a la API**
    - **Valida: Requisito 7.1**

- [x] 14. Implementar `src/admin/notifications.js` y `src/admin/router.js`
  - [x] 14.1 Implementar `notifications.js`: `showSuccess(message)`, `showError(message)`, `showInfo(message)` — inyectar toast en el DOM con clase CSS correspondiente y auto-dismiss a los 4 segundos
    - _Requisitos: 4.7, 4.8, 5.10, 5.11, 6.11, 6.12_
  - [x] 14.2 Implementar `router.js`: `initRouter()`, `navigateTo(section)`, `getActiveSection()`
    - `navigateTo` muestra la sección correspondiente (categories/products/users), oculta las demás, actualiza clase activa en el nav
    - `initRouter` enlaza los clicks del nav al router
    - _Requisitos: 3.1, 3.2, 3.3_
  - [ ]* 14.3 Escribir test de propiedad para navegación activa — Propiedad 6
    - **Propiedad 6: La navegación activa refleja la sección actual**
    - **Valida: Requisitos 3.2, 3.3**

- [x] 15. Implementar `src/admin/imageService.js`
  - Implementar `uploadImage(file)` — `POST /api/v1/upload/image` con `FormData`, retorna URL string
  - Implementar `uploadGallery(files)` — `POST /api/v1/upload/gallery` con `FormData` (múltiples archivos), retorna array de URLs
  - Lanzar `Error` si la respuesta no es ok, para que el módulo de productos pueda capturarlo
  - _Requisitos: 5.6, 5.7, 5.8_

- [x] 16. Implementar `admin.js` (entry point)
  - Importar y llamar `guardAdmin()` al cargar la página
  - Si hay sesión válida: mostrar el panel, inyectar `username` en el header, inicializar `initRouter()`, navegar a `categories` por defecto
  - Si no hay sesión: mostrar `#login-section`
  - Manejar submit del formulario de login: llamar `api.login()`, guardar sesión, renderizar panel
  - Manejar click en botón logout: llamar `clearSession()`
  - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.4_

- [x] 17. Implementar `src/admin/modules/categories.js`
  - [x] 17.1 Implementar `init(containerEl)` — llama `fetchCategories()`, guarda en state, llama `renderList()`; agrega botón "Nueva Categoría" que llama `openForm()`
    - _Requisitos: 4.1, 4.2_
  - [x] 17.2 Implementar `renderList()` — genera tabla HTML con columnas `name`, `active`, `dateCreation` y botón "Editar" por fila; lee de `state.categories`
    - _Requisitos: 4.1_
  - [x] 17.3 Implementar `openForm(item?)` — renderiza `Category_Form` vacío (crear) o pre-cargado (editar); incluye campos `name`, `description`, `active`; campos `dateCreation` y `createdBy` no son editables
    - _Requisitos: 4.2, 4.3, 4.4, 4.9_
  - [x] 17.4 Implementar submit del formulario: ejecutar `validateCategory()`, aplicar errores inline con `applyErrors()`, si válido llamar `createCategory` o `updateCategory`, hacer `upsertCategory` con el resultado, llamar `renderList()`, mostrar notificación
    - _Requisitos: 4.5, 4.6, 4.7, 4.8, 7.1, 7.2, 8.2, 8.4_
  - [ ]* 17.5 Escribir test de propiedad para lista de categorías — Propiedad 7
    - **Propiedad 7: La lista de categorías muestra todos los registros con los campos requeridos**
    - **Valida: Requisito 4.1**
  - [ ]* 17.6 Escribir test de propiedad para pre-carga de formulario — Propiedad 8
    - **Propiedad 8: El formulario de categoría pre-carga los datos correctamente**
    - **Valida: Requisitos 4.3, 5.3, 6.3**
  - [ ]* 17.7 Escribir test de propiedad para campos automáticos — Propiedad 10
    - **Propiedad 10: Los campos automáticos se asignan correctamente al crear**
    - **Valida: Requisitos 4.6, 5.9, 6.10**

- [x] 18. Checkpoint — Frontend base + Categories funcional
  - Verificar que el login funciona, la navegación entre secciones opera correctamente y el CRUD de categorías completa el ciclo. Consultar al usuario si hay dudas.

- [x] 19. Implementar `src/admin/modules/products.js`
  - [x] 19.1 Implementar `init(containerEl)` — carga categories y products en paralelo (`Promise.all`), guarda en state, llama `renderList()`
    - _Requisitos: 5.1, 5.2_
  - [x] 19.2 Implementar `renderList()` — tabla con columnas `title`, nombre de categoría resuelto (usando `state.categories`), `price`, `active`, `dateCreation` y botón "Editar"
    - Usar `resolveCategoryName(categoryId)` que busca en `state.categories` por `_id`
    - _Requisitos: 5.1, 8.5_
  - [x] 19.3 Implementar `openForm(item?)` — renderiza `Product_Form` con todos los campos del diseño; selector `category` lista solo categories activas; campos `dateCreation` y `createdBy` no editables
    - _Requisitos: 5.2, 5.3, 5.4, 5.12_
  - [x] 19.4 Implementar manejo de upload de imagen: al cambiar el input `image`, llamar `imageService.uploadImage(file)`, almacenar URL resultante; al cambiar `gallery`, llamar `imageService.uploadGallery(files)`, almacenar URLs; mostrar error si falla
    - _Requisitos: 5.6, 5.7, 5.8_
  - [x] 19.5 Implementar submit del formulario: ejecutar `validateProduct()`, aplicar errores inline, si válido llamar `createProduct` o `updateProduct`, hacer `upsertProduct`, llamar `renderList()`, mostrar notificación
    - _Requisitos: 5.5, 5.9, 5.10, 5.11, 7.1, 7.2, 8.2, 8.4_
  - [ ]* 19.6 Escribir test de propiedad para resolución de categoría — Propiedad 12
    - **Propiedad 12: La lista de productos resuelve el nombre de la categoría**
    - **Valida: Requisitos 5.1, 8.5**

- [x] 20. Implementar `src/admin/modules/users.js`
  - [x] 20.1 Implementar `init(containerEl)` — carga users, guarda en state, llama `renderList()`
    - _Requisitos: 6.1, 6.2_
  - [x] 20.2 Implementar `renderList()` — tabla con columnas `name`, `username`, `role`, `active`, `dateCreation` y botón "Editar"; nunca mostrar el campo `password`
    - _Requisitos: 6.1, 6.14_
  - [x] 20.3 Implementar `openForm(item?)` — renderiza `User_Form`; en modo edición pre-cargar `name`, `username`, `role`, `active` con campo `password` vacío; campos `dateCreation` y `createdBy` no editables
    - _Requisitos: 6.2, 6.3, 6.4, 6.13_
  - [x] 20.4 Implementar submit del formulario: ejecutar `validateUser(data, isEdit)`, aplicar errores inline, si válido llamar `createUser` o `updateUser`, hacer `upsertUser`, llamar `renderList()`, mostrar notificación; manejar error `409` mostrando mensaje de username duplicado
    - _Requisitos: 6.5, 6.6, 6.10, 6.11, 6.12, 7.1, 7.2, 8.2, 8.4_
  - [ ]* 20.5 Escribir test de propiedad para pre-carga de password vacío — Propiedad 14
    - **Propiedad 14: El formulario de usuario pre-carga con password vacío**
    - **Valida: Requisito 6.3**

- [x] 21. Configurar Vite para servir `admin.html` y el backend
  - Actualizar `vite.config.ts` para incluir `admin.html` como entry point adicional (build multi-page)
  - Configurar proxy en Vite dev server: `'/api': { target: 'http://localhost:3000', changeOrigin: true }`
  - _Requisitos: 1.1, 2.2_

- [x] 22. Checkpoint final — Integración completa
  - Verificar que todos los submódulos (Categories, Products, Users) completan el ciclo CRUD end-to-end
  - Verificar que el upload de imágenes funciona y las URLs se almacenan en MongoDB
  - Verificar que el Auth_Guard redirige correctamente al login cuando no hay sesión
  - Asegurarse de que todos los tests pasan. Consultar al usuario si hay dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia requisitos específicos para trazabilidad
- Los tests de propiedades usan `fast-check` con Vitest (`vitest --run` para ejecución única)
- El backend corre en un proceso separado; Vite actúa como proxy en desarrollo
- Las credenciales de MongoDB y S3 van exclusivamente en variables de entorno del backend (nunca en el frontend)
- En Railway, el backend usa `MONGO_URL` (red interna); en desarrollo local, `MONGO_PUBLIC_URL`
