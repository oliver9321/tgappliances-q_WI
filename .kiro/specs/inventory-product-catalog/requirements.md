# Requirements Document

## Introduction

Esta funcionalidad agrega un catálogo de productos dinámico a la sección de Inventario del sitio público (`index.html`). Actualmente, la sección "Shop/Inventory" muestra tarjetas estáticas de categorías que enlazan a Facebook. El objetivo es reemplazar ese contenido estático con datos reales provenientes de la API del backend: mostrar las categorías activas, agrupar los productos activos por categoría en formato de tarjetas visuales, y permitir al usuario navegar al detalle completo de cada producto en una pantalla de Product Details renderizada en la misma página (SPA-style, sin navegación a otra URL).

El stack es Vanilla JavaScript (ES modules), HTML5, CSS3 y Vite 6. El backend expone `/api/v1/categories` y `/api/v1/products` sobre Node.js/Express con MongoDB.

---

## Glossary

- **Catalog**: La vista de la sección Inventario que muestra categorías activas con sus productos agrupados.
- **Category**: Entidad del backend con campos `_id`, `name`, `description`, `active`.
- **Product**: Entidad del backend con campos `_id`, `category`, `title`, `description`, `price`, `discount`, `image`, `gallery`, `quantity`, `priority`, `dateEndPublish`, `active`, `dateCreation`, `createdBy`.
- **Product_Card**: Tarjeta visual que representa un producto dentro del Catalog.
- **Product_Details_View**: Pantalla de detalle completo de un producto, renderizada dinámicamente en el DOM de `index.html`.
- **Catalog_Module**: Módulo JavaScript (`catalog.js`) responsable de obtener datos, renderizar el Catalog y gestionar la navegación al Product_Details_View.
- **API_Client**: Capa de fetch que realiza las llamadas HTTP al backend.
- **Published_Product**: Producto cuyo campo `active` es `true` y cuyo `dateEndPublish` es nulo o es una fecha futura respecto a la fecha actual del cliente.
- **Category_Filter_Bar**: Barra de botones/tabs ubicada en la parte superior del Catalog que lista las categorías activas y permite filtrar los productos mostrados.
- **Active_Category_Filter**: La categoría actualmente seleccionada en la Category_Filter_Bar, cuyo valor determina qué productos se muestran en la grilla.

---

## Requirements

### Requirement 1: Carga de categorías activas

**User Story:** Como usuario de la página web, quiero ver únicamente las categorías activas en la sección de Inventario, para que el catálogo refleje solo las categorías disponibles actualmente.

#### Acceptance Criteria

1. WHEN el usuario navega a la sección `#shop`, THE Catalog_Module SHALL realizar una petición GET a `/api/v1/categories` para obtener la lista de categorías.
2. WHEN la respuesta de `/api/v1/categories` es recibida, THE Catalog_Module SHALL filtrar y mostrar únicamente las categorías cuyo campo `active` sea `true`.
3. IF la petición a `/api/v1/categories` falla con un error de red o respuesta HTTP con código distinto de 200, THEN THE Catalog_Module SHALL mostrar un mensaje de error visible al usuario en la sección `#shop` indicando que no fue posible cargar el inventario.
4. IF no existen categorías activas en la respuesta, THEN THE Catalog_Module SHALL mostrar un mensaje informativo al usuario indicando que no hay categorías disponibles en este momento.

---

### Requirement 2: Carga y filtrado de productos activos y publicados

**User Story:** Como usuario de la página web, quiero ver únicamente los productos activos y vigentes dentro de cada categoría, para no ver productos descontinuados o con publicación vencida.

#### Acceptance Criteria

1. WHEN el Catalog_Module obtiene las categorías activas, THE Catalog_Module SHALL realizar una petición GET a `/api/v1/products?active=true` para obtener los productos.
2. WHEN la lista de productos es recibida, THE Catalog_Module SHALL incluir en el Catalog únicamente los productos que cumplan todas las condiciones: campo `active` igual a `true`, y campo `dateEndPublish` nulo o con valor de fecha posterior a la fecha y hora actuales del cliente.
3. WHEN la lista de productos es recibida, THE Catalog_Module SHALL asociar cada producto a su categoría usando el campo `category` del producto, que corresponde al `name` de la categoría.
4. IF un producto tiene `dateEndPublish` con una fecha igual o anterior a la fecha y hora actuales del cliente, THEN THE Catalog_Module SHALL excluir ese producto del Catalog sin mostrar ningún mensaje de error.
5. IF la petición a `/api/v1/products` falla con un error de red o respuesta HTTP con código distinto de 200, THEN THE Catalog_Module SHALL mostrar un mensaje de error visible al usuario en la sección `#shop`.

---

### Requirement 3: Renderizado del Catalog con navegación por categorías

**User Story:** Como usuario de la página web, quiero ver una barra de filtros por categoría en la parte superior del Inventario y poder hacer clic en una categoría para ver únicamente sus productos, para navegar fácilmente entre los tipos de productos disponibles.

#### Acceptance Criteria

1. WHEN los datos del Catalog son cargados, THE Catalog_Module SHALL renderizar una Category_Filter_Bar en la parte superior de la sección `#shop`, con un botón por cada categoría activa que tenga al menos un Published_Product asociado.
2. THE Catalog_Module SHALL incluir un botón "Todos" (o equivalente) como primera opción en la Category_Filter_Bar, que al estar seleccionado muestra los productos de todas las categorías activas.
3. WHEN el Catalog se carga por primera vez, THE Catalog_Module SHALL establecer el botón "Todos" como el Active_Category_Filter y mostrar los Published_Products de todas las categorías en la grilla.
4. WHEN el usuario hace clic en un botón de categoría en la Category_Filter_Bar, THE Catalog_Module SHALL actualizar el Active_Category_Filter a la categoría seleccionada y renderizar en la grilla únicamente los Published_Products asociados a esa categoría.
5. WHEN el usuario hace clic en un botón de categoría, THE Catalog_Module SHALL aplicar un estilo visual diferenciado al botón del Active_Category_Filter para indicar cuál categoría está seleccionada.
6. WHEN el usuario hace clic en el botón "Todos", THE Catalog_Module SHALL mostrar los Published_Products de todas las categorías activas en la grilla.
7. THE Catalog_Module SHALL renderizar los productos de la categoría activa en formato de grilla de Product_Cards, ordenados por el campo `priority` de mayor a menor.
8. WHEN una categoría activa no tiene ningún Published_Product asociado, THE Catalog_Module SHALL omitir el botón de esa categoría en la Category_Filter_Bar sin mostrar un mensaje de error.
9. WHILE los datos del Catalog están siendo cargados desde la API, THE Catalog_Module SHALL mostrar un indicador visual de carga (skeleton o spinner) en la sección `#shop`.

---

### Requirement 4: Tarjeta de producto (Product_Card)

**User Story:** Como usuario de la página web, quiero ver una tarjeta visual por cada producto con su información esencial, para evaluar rápidamente si me interesa ver el detalle.

#### Acceptance Criteria

1. THE Catalog_Module SHALL renderizar cada Product_Card con los siguientes elementos: imagen principal (`image`), título (`title`), precio, e indicador visual del nombre de la categoría.
2. WHEN el campo `price` de un producto es nulo, THE Catalog_Module SHALL mostrar el texto "Consultar precio" en lugar de un valor numérico en la Product_Card.
3. WHEN el campo `price` de un producto tiene un valor numérico mayor que cero, THE Catalog_Module SHALL mostrar el precio formateado como moneda USD (por ejemplo, `$299.00`) en la Product_Card.
4. WHEN el campo `discount` de un producto es mayor que cero, THE Catalog_Module SHALL mostrar el descuento de forma visible en la Product_Card (por ejemplo, como badge o etiqueta).
5. WHEN el campo `image` de un producto está vacío o es nulo, THE Catalog_Module SHALL mostrar una imagen de marcador de posición en la Product_Card.
6. WHEN el usuario hace clic en una Product_Card, THE Catalog_Module SHALL navegar a la vista Product_Details_View del producto correspondiente.

---

### Requirement 5: Pantalla de detalle del producto (Product_Details_View)

**User Story:** Como usuario de la página web, quiero ver el detalle completo de un producto al hacer clic en su tarjeta, para obtener toda la información necesaria antes de contactar a la tienda.

#### Acceptance Criteria

1. WHEN el usuario hace clic en una Product_Card, THE Catalog_Module SHALL realizar una petición GET a `/api/v1/products/{id}` usando el `_id` del producto para obtener los datos actualizados desde la base de datos.
2. WHEN los datos del producto son recibidos, THE Catalog_Module SHALL renderizar el Product_Details_View con los siguientes campos: imagen principal en tamaño destacado, galería de imágenes secundarias (si existen), título, descripción, categoría, precio, descuento, cantidad disponible (`quantity`), estado activo/inactivo, fecha de creación (`dateCreation`), usuario creador (`createdBy`, si existe), y fecha fin de publicación (`dateEndPublish`, si existe).
3. WHEN el campo `price` en el Product_Details_View es nulo, THE Catalog_Module SHALL mostrar el texto "Consultar precio".
4. WHEN el campo `discount` en el Product_Details_View es mayor que cero, THE Catalog_Module SHALL mostrar el descuento de forma destacada junto al precio.
5. WHEN el campo `gallery` del producto contiene una o más URLs de imágenes, THE Catalog_Module SHALL renderizar una galería de miniaturas seleccionables; al hacer clic en una miniatura, THE Catalog_Module SHALL reemplazar la imagen principal por la imagen seleccionada.
6. WHEN el campo `gallery` del producto está vacío o es nulo, THE Catalog_Module SHALL mostrar únicamente la imagen principal sin sección de galería.
7. WHEN el usuario hace clic en el botón de retorno dentro del Product_Details_View, THE Catalog_Module SHALL ocultar el Product_Details_View y restaurar la vista del Catalog en la sección `#shop`.
8. IF la petición GET a `/api/v1/products/{id}` falla con un error de red o respuesta HTTP con código distinto de 200, THEN THE Catalog_Module SHALL mostrar un mensaje de error en el Product_Details_View indicando que no fue posible cargar el detalle del producto.
9. WHEN el campo `priority` del producto tiene un valor mayor que cero, THE Catalog_Module SHALL mostrar un indicador visual de prioridad en el Product_Details_View.

---

### Requirement 6: Integración con el sitio existente (index.html / main.js)

**User Story:** Como desarrollador, quiero que el Catalog_Module se integre limpiamente con el sitio existente, para no romper ninguna funcionalidad actual.

#### Acceptance Criteria

1. THE Catalog_Module SHALL ser implementado como un módulo ES (`catalog.js`) importado desde `main.js` e inicializado dentro del listener `DOMContentLoaded` existente.
2. THE Catalog_Module SHALL reemplazar el contenido estático actual de la sección `#shop` (las tarjetas de categorías hardcodeadas) con el Catalog dinámico, manteniendo el título "Inventory" y el subtítulo existentes.
3. THE Catalog_Module SHALL utilizar únicamente las variables CSS definidas en `:root` de `style.css` (`--primary-color`, `--accent-color`, `--wine-red`, `--text-dark`, `--text-light`, `--transition`, etc.) para todos los estilos nuevos.
4. THE Catalog_Module SHALL agregar los estilos CSS necesarios para el Catalog y el Product_Details_View en `style.css`, siguiendo los breakpoints existentes (`@media (max-width: 768px)` y `@media (max-width: 480px)`).
5. WHEN el Product_Details_View está activo, THE Catalog_Module SHALL actualizar el hash de la URL del navegador a `#product-details` para permitir navegación con el botón "atrás" del navegador.
6. WHEN el usuario presiona el botón "atrás" del navegador mientras el Product_Details_View está activo, THE Catalog_Module SHALL detectar el evento `popstate` y restaurar la vista del Catalog.

---

### Requirement 7: Endpoint de producto por ID en el backend

**User Story:** Como desarrollador, quiero que el backend exponga un endpoint para obtener un producto por su ID, para que el frontend pueda cargar el detalle actualizado desde la base de datos.

#### Acceptance Criteria

1. THE API_Client SHALL realizar peticiones GET a `/api/v1/products/{id}` donde `{id}` es el `_id` de MongoDB del producto.
2. WHEN el endpoint `/api/v1/products/{id}` recibe una petición con un `{id}` válido existente en la base de datos, THE API_Client SHALL recibir una respuesta HTTP 200 con el objeto completo del producto en formato JSON.
3. IF el endpoint `/api/v1/products/{id}` recibe una petición con un `{id}` que no existe en la base de datos, THEN THE API_Client SHALL recibir una respuesta HTTP 404.
4. IF el endpoint `/api/v1/products/{id}` recibe una petición con un `{id}` con formato inválido para MongoDB ObjectId, THEN THE API_Client SHALL recibir una respuesta HTTP 400.
