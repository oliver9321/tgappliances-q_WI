# Documento de Requisitos

## Introducción

Se requiere desarrollar un módulo de administración para el sitio web de **TG Pre-Owned Appliances**. Este módulo estará accesible únicamente para usuarios con rol administrador y permitirá gestionar de forma centralizada las categorías del catálogo, los productos disponibles y los usuarios del sistema.

El módulo se integrará como una sección protegida dentro del SPA existente (Vanilla JS + Vite), con navegación hacia tres submódulos: **Categories**, **Products** y **Users**. Cada submódulo expone formularios para crear y editar registros. Los datos se persisten en MongoDB y las imágenes de productos se almacenan en un bucket externo (URL guardada en MongoDB).

---

## Glosario

- **Admin_Panel**: El módulo de administración completo, accesible solo para usuarios con rol `admin`.
- **Auth_Guard**: Mecanismo de verificación de sesión y rol que protege el acceso al Admin_Panel.
- **Category_Form**: Formulario para crear o editar una categoría.
- **Product_Form**: Formulario para crear o editar un producto.
- **User_Form**: Formulario para crear o editar un usuario del sistema.
- **Category**: Documento MongoDB con los campos: `_id` (ObjectId), `name` (string), `description` (string), `active` (boolean), `dateCreation` (ISO string), `createdBy` (string — username del creador).
- **Product**: Documento MongoDB con los campos: `_id` (ObjectId), `category` (string — `_id` de la Category referenciada), `title` (string), `description` (string), `price` (float, puede ser null), `discount` (entero 0–100), `image` (string URL), `gallery` (array de strings URL), `quantity` (entero no negativo), `priority` (entero), `dateEndPublish` (ISO string o null), `active` (boolean), `dateCreation` (ISO string), `createdBy` (string — username del creador).
- **User**: Documento MongoDB con los campos: `_id` (ObjectId), `name` (string), `username` (string — identificador único de login), `role` (string), `password` (string — hash bcrypt), `active` (boolean), `dateCreation` (objeto `{ $date: ISO string }`), `createdBy` (string — username del creador o `"system"`).
- **Image_Service**: Servicio responsable de subir imágenes al bucket externo y retornar la URL resultante.
- **API**: Backend REST que expone endpoints para operaciones CRUD sobre Categories, Products y Users en MongoDB.
- **Notification**: Mensaje visual de éxito o error mostrado al usuario tras una operación.
- **Session**: Estado de autenticación del usuario activo, que incluye su `username` y `role`.

---

## Requisitos

### Requisito 1: Control de Acceso al Módulo de Administración

**User Story:** Como administrador del sistema, quiero que el panel de administración sea accesible únicamente para usuarios con rol `admin`, para que la información del catálogo y los usuarios del sistema estén protegidos de accesos no autorizados.

#### Criterios de Aceptación

1. WHEN un usuario intenta acceder al Admin_Panel, THE Auth_Guard SHALL verificar que existe una Session activa con campo `role` igual a `"admin"`.
2. IF la Session no existe o el campo `role` no es `"admin"`, THEN THE Auth_Guard SHALL redirigir al usuario a la página de inicio de sesión.
3. WHILE una Session con `role` igual a `"admin"` está activa, THE Admin_Panel SHALL permanecer accesible sin requerir nueva autenticación.
4. WHEN la Session expira, THE Auth_Guard SHALL cerrar el Admin_Panel y redirigir al usuario a la página de inicio de sesión.
5. THE Admin_Panel SHALL mostrar el campo `username` del User autenticado en la interfaz de navegación.

---

### Requisito 2: Autenticación de Usuarios

**User Story:** Como administrador del sistema, quiero iniciar sesión con mi `username` y contraseña, para acceder al panel de administración de forma segura.

#### Criterios de Aceptación

1. THE Admin_Panel SHALL presentar un formulario de inicio de sesión con los campos `username` (texto, obligatorio) y `password` (texto enmascarado, obligatorio).
2. WHEN el administrador envía el formulario de inicio de sesión, THE API SHALL buscar en la colección `users` un documento cuyo campo `username` coincida con el valor ingresado.
3. IF no existe un User con el `username` proporcionado, THEN THE API SHALL retornar un error de autenticación sin revelar si el `username` o la contraseña son incorrectos.
4. WHEN el User es encontrado, THE API SHALL comparar la contraseña ingresada contra el campo `password` (hash bcrypt) del documento usando bcrypt con factor de costo mínimo de 10.
5. IF la contraseña no coincide con el hash almacenado, THEN THE API SHALL retornar un error de autenticación.
6. IF el User encontrado tiene el campo `active` igual a `false`, THEN THE API SHALL rechazar el inicio de sesión con un mensaje indicando que la cuenta está inactiva.
7. WHEN la autenticación es exitosa, THE API SHALL retornar los campos `username`, `name` y `role` del User para inicializar la Session.

---

### Requisito 3: Navegación del Panel de Administración

**User Story:** Como administrador del sistema, quiero una interfaz de navegación clara dentro del panel de administración, para poder acceder rápidamente a cada submódulo (Categories, Products, Users).

#### Criterios de Aceptación

1. THE Admin_Panel SHALL presentar un menú de navegación con las opciones: Categories, Products y Users.
2. WHEN el administrador selecciona una opción del menú, THE Admin_Panel SHALL mostrar el submódulo correspondiente sin recargar la página.
3. THE Admin_Panel SHALL indicar visualmente cuál es el submódulo activo en el menú de navegación.
4. THE Admin_Panel SHALL incluir un botón de cierre de sesión que, al ser activado, destruya la Session y redirija al usuario a la página principal del sitio.

---

### Requisito 4: Gestión de Categorías

**User Story:** Como administrador del sistema, quiero crear y editar categorías del catálogo, para mantener organizada la clasificación de los productos disponibles.

#### Criterios de Aceptación

1. THE Admin_Panel SHALL mostrar una lista de todas las Categories existentes con sus campos `name`, `active` y `dateCreation`.
2. WHEN el administrador activa la opción de crear una nueva categoría, THE Category_Form SHALL presentarse vacío y listo para capturar datos.
3. WHEN el administrador activa la opción de editar una categoría existente, THE Category_Form SHALL pre-cargar los datos actuales de la Category seleccionada.
4. THE Category_Form SHALL incluir los campos: `name` (texto, obligatorio), `description` (texto largo, opcional), `active` (booleano, obligatorio).
5. IF el administrador intenta guardar una Category sin completar el campo `name`, THEN THE Category_Form SHALL mostrar un mensaje de validación indicando que el campo es obligatorio y SHALL impedir el envío del formulario.
6. WHEN el administrador guarda una Category nueva, THE API SHALL asignar automáticamente el campo `dateCreation` (ISO string de la fecha y hora actual) y el campo `createdBy` con el `username` del User de la Session activa.
7. WHEN el administrador guarda una Category exitosamente, THE Admin_Panel SHALL mostrar una Notification de éxito y SHALL actualizar la lista de Categories.
8. IF la operación de guardado de una Category falla, THEN THE Admin_Panel SHALL mostrar una Notification de error con una descripción del problema.
9. THE Category_Form SHALL impedir la edición manual de los campos `dateCreation` y `createdBy`.

---

### Requisito 5: Gestión de Productos

**User Story:** Como administrador del sistema, quiero crear y editar productos del catálogo, para mantener actualizada la información de los electrodomésticos disponibles para la venta.

#### Criterios de Aceptación

1. THE Admin_Panel SHALL mostrar una lista de todos los Products existentes con sus campos `title`, `category` (nombre resuelto de la Category referenciada), `price`, `active` y `dateCreation`.
2. WHEN el administrador activa la opción de crear un nuevo producto, THE Product_Form SHALL presentarse vacío y listo para capturar datos.
3. WHEN el administrador activa la opción de editar un producto existente, THE Product_Form SHALL pre-cargar los datos actuales del Product seleccionado.
4. THE Product_Form SHALL incluir los campos: `category` (selector que lista Categories activas mostrando su `name` y almacenando su `_id` como string, obligatorio), `title` (texto, obligatorio), `description` (texto largo, opcional), `price` (número decimal positivo o null, opcional), `discount` (número entero entre 0 y 100, por defecto 0), `image` (archivo de imagen, opcional — se almacena como URL string), `gallery` (múltiples archivos de imagen, opcional — se almacena como array de strings URL), `quantity` (número entero no negativo, opcional), `priority` (número entero, opcional), `dateEndPublish` (fecha ISO string o null, opcional), `active` (booleano, obligatorio).
5. IF el administrador intenta guardar un Product sin completar los campos `title` o `category`, THEN THE Product_Form SHALL mostrar mensajes de validación indicando los campos obligatorios faltantes y SHALL impedir el envío del formulario.
6. WHEN el administrador selecciona un archivo de imagen para el campo `image`, THE Image_Service SHALL subir el archivo al bucket externo y SHALL retornar la URL resultante para ser almacenada como string en el campo `image` del Product.
7. WHEN el administrador selecciona archivos para el campo `gallery`, THE Image_Service SHALL subir cada archivo al bucket externo y SHALL retornar las URLs resultantes para ser almacenadas como array de strings en el campo `gallery` del Product.
8. IF la subida de una imagen al bucket falla, THEN THE Product_Form SHALL mostrar una Notification de error indicando que la imagen no pudo ser procesada y SHALL permitir al administrador reintentar la operación.
9. WHEN el administrador guarda un Product nuevo, THE API SHALL asignar automáticamente el campo `dateCreation` (ISO string) y el campo `createdBy` con el `username` del User de la Session activa.
10. WHEN el administrador guarda un Product exitosamente, THE Admin_Panel SHALL mostrar una Notification de éxito y SHALL actualizar la lista de Products.
11. IF la operación de guardado de un Product falla, THEN THE Admin_Panel SHALL mostrar una Notification de error con una descripción del problema.
12. THE Product_Form SHALL impedir la edición manual de los campos `dateCreation` y `createdBy`.

---

### Requisito 6: Gestión de Usuarios

**User Story:** Como administrador del sistema, quiero crear y editar usuarios del sistema, para controlar quién tiene acceso al panel de administración y con qué rol.

#### Criterios de Aceptación

1. THE Admin_Panel SHALL mostrar una lista de todos los Users existentes con sus campos `name`, `username`, `role`, `active` y `dateCreation`.
2. WHEN el administrador activa la opción de crear un nuevo usuario, THE User_Form SHALL presentarse vacío y listo para capturar datos.
3. WHEN el administrador activa la opción de editar un usuario existente, THE User_Form SHALL pre-cargar los campos `name`, `username`, `role` y `active` del User seleccionado, con el campo `password` vacío.
4. THE User_Form SHALL incluir los campos: `name` (texto, obligatorio), `username` (texto sin espacios, obligatorio), `role` (selector con valores predefinidos, obligatorio), `password` (texto enmascarado, obligatorio al crear, opcional al editar), `active` (booleano, obligatorio).
5. IF el administrador intenta guardar un User nuevo sin completar los campos `name`, `username`, `role` o `password`, THEN THE User_Form SHALL mostrar mensajes de validación indicando los campos obligatorios faltantes y SHALL impedir el envío del formulario.
6. IF el administrador intenta guardar un User con un `username` que ya existe en la colección `users`, THEN THE API SHALL retornar un error de conflicto y THE User_Form SHALL mostrar un mensaje indicando que el `username` ya está en uso.
7. WHEN el administrador guarda un User existente sin ingresar un valor en el campo `password`, THE API SHALL conservar el hash `password` actual del User sin modificarlo.
8. WHEN el administrador ingresa un valor en el campo `password` al editar un User, THE API SHALL reemplazar el campo `password` del User con el nuevo valor procesado mediante bcrypt con factor de costo mínimo de 10.
9. THE API SHALL almacenar el campo `password` de los Users utilizando bcrypt con factor de costo mínimo de 10 antes de persistirlo en MongoDB.
10. WHEN el administrador guarda un User nuevo, THE API SHALL asignar automáticamente el campo `dateCreation` (objeto `{ $date: ISO string }`) y el campo `createdBy` con el `username` del User de la Session activa.
11. WHEN el administrador guarda un User exitosamente, THE Admin_Panel SHALL mostrar una Notification de éxito y SHALL actualizar la lista de Users.
12. IF la operación de guardado de un User falla, THEN THE Admin_Panel SHALL mostrar una Notification de error con una descripción del problema.
13. THE User_Form SHALL impedir la edición manual de los campos `dateCreation` y `createdBy`.
14. THE Admin_Panel SHALL ocultar el valor del campo `password` en la lista de Users en todo momento.

---

### Requisito 7: Validación de Formularios

**User Story:** Como administrador del sistema, quiero que los formularios validen los datos antes de enviarlos, para evitar guardar información incompleta o incorrecta en la base de datos.

#### Criterios de Aceptación

1. WHEN el administrador intenta guardar un formulario, THE Admin_Panel SHALL ejecutar la validación de todos los campos obligatorios antes de realizar cualquier llamada a la API.
2. IF un campo obligatorio está vacío al momento del envío, THEN THE Admin_Panel SHALL resaltar visualmente el campo con error y SHALL mostrar un mensaje descriptivo junto al campo afectado.
3. IF el campo `price` contiene un valor no numérico o negativo, THEN THE Product_Form SHALL mostrar un mensaje de validación indicando que el valor debe ser un número decimal positivo o dejarse vacío (null).
4. IF el campo `discount` contiene un valor fuera del rango 0–100 o no es un número entero, THEN THE Product_Form SHALL mostrar un mensaje de validación indicando que el valor debe ser un entero entre 0 y 100.
5. IF el campo `quantity` contiene un valor no entero o negativo, THEN THE Product_Form SHALL mostrar un mensaje de validación indicando que el valor debe ser un número entero no negativo.
6. IF el campo `username` contiene espacios o caracteres no permitidos, THEN THE User_Form SHALL mostrar un mensaje de validación indicando el formato requerido.
7. WHEN todos los campos obligatorios son válidos, THE Admin_Panel SHALL habilitar el envío del formulario a la API.

---

### Requisito 8: Persistencia y Consistencia de Datos

**User Story:** Como administrador del sistema, quiero que todos los cambios realizados en el panel se persistan correctamente en MongoDB, para garantizar la integridad del catálogo y los datos de usuarios.

#### Criterios de Aceptación

1. WHEN el administrador guarda un registro nuevo o editado, THE API SHALL persistir los datos en MongoDB antes de retornar una respuesta al Admin_Panel.
2. WHEN la API retorna una respuesta exitosa, THE Admin_Panel SHALL reflejar los cambios en la lista del submódulo correspondiente sin requerir recarga completa de la página.
3. IF la conexión con MongoDB falla durante una operación de guardado, THEN THE API SHALL retornar un código de error HTTP 500 y THE Admin_Panel SHALL mostrar una Notification de error al administrador.
4. THE API SHALL retornar los datos actualizados del registro guardado en la respuesta exitosa, para que THE Admin_Panel pueda actualizar la lista local sin una consulta adicional.
5. WHEN el Admin_Panel resuelve el nombre de una Category para mostrarlo en la lista de Products, THE Admin_Panel SHALL utilizar el campo `_id` almacenado en `product.category` para buscar el documento Category correspondiente.
6. THE API SHALL garantizar que el campo `createdBy` de cualquier documento nuevo almacene el `username` (string) del User que realizó la operación, no su `_id`.
