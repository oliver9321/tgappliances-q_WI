# Design Document — Project Folder Structure Reorganization

## Overview

Este documento describe el diseño técnico para reorganizar la estructura de carpetas del proyecto TG Pre-Owned Appliances. El objetivo es agrupar los archivos por dominio (frontend público, panel admin, configuración) sin romper el build de Vite ni las rutas de importación existentes.

La reorganización es puramente estructural: no se modifica ninguna lógica de negocio, no se añaden dependencias y no se cambia el comportamiento en runtime. El riesgo principal es romper rutas de importación, por lo que el diseño documenta cada cambio de ruta con precisión quirúrgica.

---

## Architecture

El proyecto usa Vite 6 como build system con múltiples entry points HTML definidos en `rollupOptions.input`. Vite resuelve los assets de dos maneras:

- **Rutas relativas** (`./style.css`, `../layout.js`): relativas al archivo que las contiene. Se actualizan automáticamente al mover el archivo que las declara.
- **Rutas absolutas** (`/logo2.png`, `/admin.css`): relativas a la raíz del servidor Vite (la raíz del proyecto). No cambian al mover archivos, pero sí cuando cambia la ubicación del archivo referenciado.
- **`public/`**: Vite sirve este directorio en `/`. Sus contenidos nunca se mueven.

La estrategia de migración se basa en este principio: los archivos JS en `src/admin/` **no se mueven**, por lo que todas sus importaciones relativas entre sí permanecen válidas. Solo se mueven los archivos HTML y CSS de la raíz, y se actualizan sus referencias internas.

```
Antes:                          Después:
/                               /
├── index.html          →       src/frontend/index.html
├── main.js             →       src/frontend/main.js
├── style.css           →       src/frontend/style.css
├── admin.html          →       src/admin/index.html
├── admin-categories.html →     src/admin/categories.html
├── admin-products.html →       src/admin/products.html
├── admin-users.html    →       src/admin/users.html
├── admin.css           →       src/admin/admin.css
└── admin.js            →       ELIMINAR (código legacy sin uso)
```

---

## Components and Interfaces

### Componentes afectados

| Componente | Acción | Razón |
|---|---|---|
| `index.html` | Mover a `src/frontend/index.html` | Agrupar frontend público |
| `main.js` | Mover a `src/frontend/main.js` | Agrupar frontend público |
| `style.css` | Mover a `src/frontend/style.css` | Agrupar frontend público |
| `admin.html` | Mover a `src/admin/index.html` | Consolidar admin en su carpeta |
| `admin-categories.html` | Mover a `src/admin/categories.html` | Consolidar admin |
| `admin-products.html` | Mover a `src/admin/products.html` | Consolidar admin |
| `admin-users.html` | Mover a `src/admin/users.html` | Consolidar admin |
| `admin.css` | Mover a `src/admin/admin.css` | Consolidar admin |
| `admin.js` | Eliminar | Código legacy; los HTML ya usan `src/admin/pages/*.js` directamente |
| `vite.config.ts` | Actualizar `rollupOptions.input` | Apuntar a nuevas rutas de entry points |
| `src/admin/auth.js` | Actualizar `window.location.href` | Apunta a `/admin.html` (ruta vieja) |
| `src/admin/layout.js` | Actualizar `window.location.href` | Apunta a `/admin.html` (ruta vieja) |
| `src/admin/**/*.js` | Sin cambios | No se mueven; sus imports relativos siguen válidos |
| `backend/` | Sin cambios | Fuera del scope |
| `public/` | Sin cambios | Assets estáticos, Vite los sirve desde `/` |
| `tsconfig*.json`, `package.json`, etc. | Sin cambios | Permanecen en raíz por convención de herramientas |

### Interfaces entre componentes (flujo de navegación admin)

```
Browser
  └─► src/admin/index.html          (login)
        └─► ./auth-login.js          (import inline script)
              └─► ./auth.js
        └─► window.location → /admin/products.html

  └─► src/admin/products.html
        └─► ./admin.css              (stylesheet)
        └─► ./pages/products-page.js (module script)
              └─► ../layout.js
                    └─► ./auth.js
                          └─► window.location → /admin/index.html  (logout/guard)
              └─► ../modules/products.js
                    └─► ../api.js, ../state.js, ../validators.js,
                        ../notifications.js, ../imageService.js, ../modal.js

  (mismo patrón para categories.html y users.html)
```

---

## Data Models

No hay modelos de datos nuevos. La reorganización no introduce ni modifica estructuras de datos.

La única "estructura de datos" relevante es el objeto `rollupOptions.input` en `vite.config.ts`, que mapea nombres de bundle a rutas de entry point:

```typescript
// Antes
input: {
  main:       'index.html',
  admin:      'admin.html',
  adminCats:  'admin-categories.html',
  adminProds: 'admin-products.html',
  adminUsers: 'admin-users.html',
}

// Después
input: {
  main:       'src/frontend/index.html',
  admin:      'src/admin/index.html',
  adminCats:  'src/admin/categories.html',
  adminProds: 'src/admin/products.html',
  adminUsers: 'src/admin/users.html',
}
```

Los nombres de clave (`main`, `admin`, `adminCats`, `adminProds`, `adminUsers`) se preservan para no alterar los nombres de los bundles de salida en `dist/`.

---

## Detailed Change Specification

Esta sección es el núcleo del diseño. Documenta cada cambio de ruta con el valor exacto antes y después.

### 1. `vite.config.ts`

```typescript
// rollupOptions.input — actualizar las 5 rutas:
main:       'src/frontend/index.html',   // era 'index.html'
admin:      'src/admin/index.html',      // era 'admin.html'
adminCats:  'src/admin/categories.html', // era 'admin-categories.html'
adminProds: 'src/admin/products.html',   // era 'admin-products.html'
adminUsers: 'src/admin/users.html',      // era 'admin-users.html'
```

### 2. `src/frontend/index.html` (era `index.html`)

El archivo se mueve de la raíz a `src/frontend/`. Las referencias a assets en `public/` usan rutas absolutas y no cambian. Solo cambian las referencias a archivos que también se mueven:

| Atributo | Valor anterior | Valor nuevo | Razón |
|---|---|---|---|
| `<link rel="preload" href="...">` | `/styles.css` | `./style.css` | El archivo se llama `style.css` (sin 's'), ahora en el mismo directorio |
| `<link rel="stylesheet" href="...">` | `/styles.css` | `./style.css` | Ídem |
| `<script type="module" src="...">` | `/main.js` | `./main.js` | `main.js` ahora está en el mismo directorio |

> Nota: todas las rutas de assets (`/logo2.png`, `/favicon.png`, `/banner2.jpeg`, etc.) usan rutas absolutas y permanecen sin cambios.

### 3. `src/frontend/main.js` (era `main.js`)

```javascript
// Antes:
import "./style.css";

// Después:
import "./style.css";  // sin cambio — style.css está en el mismo directorio
```

No requiere modificación.

### 4. `src/admin/index.html` (era `admin.html`)

| Atributo | Valor anterior | Valor nuevo |
|---|---|---|
| `<link rel="stylesheet" href="...">` | `/admin.css` | `./admin.css` |
| `import { ... } from '...'` (inline script) | `/src/admin/auth-login.js` | `./auth-login.js` |
| `window.location.href = '...'` (post-login redirect) | `/admin-products.html` | `/admin/products.html` |
| `window.location.href = '...'` (ya-logueado redirect) | `/admin-products.html` | `/admin/products.html` |

> Nota: `/logo2.png` en el `<img>` permanece sin cambio (asset público).

### 5. `src/admin/categories.html` (era `admin-categories.html`)

| Atributo | Valor anterior | Valor nuevo |
|---|---|---|
| `<link rel="stylesheet" href="...">` | `/admin.css` | `./admin.css` |
| `<script type="module" src="...">` | `/src/admin/pages/categories-page.js` | `./pages/categories-page.js` |
| Nav link — categorías | `/admin-categories.html` | `/admin/categories.html` |
| Nav link — productos | `/admin-products.html` | `/admin/products.html` |
| Nav link — usuarios | `/admin-users.html` | `/admin/users.html` |
| Header logo `href` | `/admin-products.html` | `/admin/products.html` |

### 6. `src/admin/products.html` (era `admin-products.html`)

| Atributo | Valor anterior | Valor nuevo |
|---|---|---|
| `<link rel="stylesheet" href="...">` | `/admin.css` | `./admin.css` |
| `<script type="module" src="...">` | `/src/admin/pages/products-page.js` | `./pages/products-page.js` |
| Nav link — categorías | `/admin-categories.html` | `/admin/categories.html` |
| Nav link — productos | `/admin-products.html` | `/admin/products.html` |
| Nav link — usuarios | `/admin-users.html` | `/admin/users.html` |
| Header logo `href` | `/admin-products.html` | `/admin/products.html` |

### 7. `src/admin/users.html` (era `admin-users.html`)

| Atributo | Valor anterior | Valor nuevo |
|---|---|---|
| `<link rel="stylesheet" href="...">` | `/admin.css` | `./admin.css` |
| `<script type="module" src="...">` | `/src/admin/pages/users-page.js` | `./pages/users-page.js` |
| Nav link — categorías | `/admin-categories.html` | `/admin/categories.html` |
| Nav link — productos | `/admin-products.html` | `/admin/products.html` |
| Nav link — usuarios | `/admin-users.html` | `/admin/users.html` |
| Header logo `href` | `/admin-products.html` | `/admin/products.html` |

### 8. `src/admin/auth.js`

```javascript
// clearSession() — línea con window.location.href:
// Antes:
window.location.href = '/admin.html'

// Después:
window.location.href = '/admin/index.html'
```

### 9. `src/admin/layout.js`

```javascript
// initLayout() — guard de sesión:
// Antes:
window.location.href = '/admin.html'

// Después:
window.location.href = '/admin/index.html'
```

### 10. `admin.js` (raíz)

Eliminar. Este archivo es código legacy que importa módulos de `src/admin/` pero ningún HTML lo referencia actualmente (los HTML usan `src/admin/pages/*.js` directamente). Su eliminación no afecta ningún flujo activo.

---

## Error Handling

### Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ruta de import no actualizada | Build falla con "module not found" | Vite reporta el archivo y línea exacta; la tabla de cambios de este documento cubre todos los casos |
| Ruta de navegación JS no actualizada (`window.location.href`) | Redirección a 404 en runtime | Cambios en `auth.js` y `layout.js` documentados explícitamente |
| `admin.js` eliminado pero referenciado en algún HTML | Build falla | Verificado: ningún HTML actual lo referencia |
| `style.css` vs `styles.css` (typo histórico) | 404 en dev/prod | `index.html` usaba `/styles.css` (con 's') pero el archivo real es `style.css` (sin 's'). Al mover, se corrige a `./style.css` |
| Vite base URL en producción | Assets con rutas absolutas rotas | `public/` permanece en raíz; Vite copia su contenido a `dist/` automáticamente. Las rutas absolutas siguen funcionando |

### Orden de ejecución seguro

Para evitar un estado intermedio roto, los cambios deben aplicarse en este orden:

1. Actualizar `vite.config.ts` (los entry points aún no existen en las nuevas rutas, pero el build no se ejecuta hasta el final)
2. Crear `src/frontend/` y mover `index.html`, `main.js`, `style.css` con sus rutas actualizadas
3. Mover `admin.html` → `src/admin/index.html` con sus rutas actualizadas
4. Mover `admin-categories.html`, `admin-products.html`, `admin-users.html` con sus rutas actualizadas
5. Mover `admin.css` → `src/admin/admin.css`
6. Actualizar `src/admin/auth.js` y `src/admin/layout.js`
7. Eliminar `admin.js` de la raíz
8. Ejecutar `npm run build` para verificar que no hay errores

---

## Testing Strategy

Este feature es una reorganización de archivos y configuración. No contiene lógica de negocio nueva ni funciones puras con espacio de entrada variable. Por esta razón, **property-based testing no aplica**.

El análisis de criterios de aceptación (prework) clasificó todos los criterios como SMOKE, EXAMPLE o INTEGRATION — ninguno como PROPERTY. La verificación correcta para este tipo de cambio es:

### Smoke Tests (verificación de estructura)

Ejecutar después de la reorganización para confirmar que los archivos están en los lugares correctos:

```bash
# Verificar que los archivos nuevos existen
test -f src/frontend/index.html
test -f src/frontend/main.js
test -f src/frontend/style.css
test -f src/admin/index.html
test -f src/admin/categories.html
test -f src/admin/products.html
test -f src/admin/users.html
test -f src/admin/admin.css

# Verificar que los archivos viejos ya no existen en la raíz
test ! -f index.html
test ! -f main.js
test ! -f style.css
test ! -f admin.html
test ! -f admin-categories.html
test ! -f admin-products.html
test ! -f admin-users.html
test ! -f admin.css
test ! -f admin.js
```

### Build Test (verificación de imports)

```bash
npm run build
```

Un build exitoso (exit code 0) valida simultáneamente:
- Todos los entry points en `vite.config.ts` son accesibles
- Todos los imports en los archivos HTML son resolvibles
- Todos los imports ES module entre archivos JS son válidos

Cualquier ruta rota produce un error explícito con el archivo y línea afectados.

### Example Tests (verificación de contenido)

Inspección manual o con `grep` de los archivos clave:

```bash
# vite.config.ts apunta a las nuevas rutas
grep "src/frontend/index.html" vite.config.ts
grep "src/admin/index.html" vite.config.ts

# index.html usa rutas relativas para sus propios assets
grep '"\./style.css"' src/frontend/index.html
grep '"./main.js"' src/frontend/index.html

# admin/index.html usa rutas relativas para sus propios assets
grep '"./admin.css"' src/admin/index.html
grep '"./auth-login.js"' src/admin/index.html

# auth.js y layout.js apuntan a la nueva ruta de login
grep "/admin/index.html" src/admin/auth.js
grep "/admin/index.html" src/admin/layout.js
```

### Integration Test (verificación en dev server)

Iniciar el servidor de desarrollo manualmente y verificar que cada URL responde:

```bash
npm run dev
# Luego verificar en el browser:
# http://localhost:5173/src/frontend/index.html  → sitio público
# http://localhost:5173/src/admin/index.html     → login admin
# http://localhost:5173/src/admin/products.html  → productos (requiere sesión)
# http://localhost:5173/src/admin/categories.html
# http://localhost:5173/src/admin/users.html
```

### Actualización de documentación

Después de la reorganización, actualizar `.kiro/steering/structure.md` para reflejar la nueva estructura de carpetas, documentando la ubicación de cada tipo de archivo (HTML, CSS, JS, assets, config).
