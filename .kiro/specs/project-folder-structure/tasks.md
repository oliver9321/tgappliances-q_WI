# Implementation Plan: Project Folder Structure Reorganization

## Overview

Reorganización estructural del proyecto: mover archivos HTML/CSS/JS de la raíz a carpetas por dominio (`src/frontend/`, `src/admin/`) y actualizar todas las referencias internas. No se modifica lógica de negocio.

## Tasks

- [x] 1. Actualizar `vite.config.ts` con las nuevas rutas de entry points
  - Cambiar `rollupOptions.input` para apuntar a las nuevas ubicaciones de los 5 HTML
  - `main` → `'src/frontend/index.html'`
  - `admin` → `'src/admin/index.html'`
  - `adminCats` → `'src/admin/categories.html'`
  - `adminProds` → `'src/admin/products.html'`
  - `adminUsers` → `'src/admin/users.html'`
  - Preservar los mismos nombres de clave para no alterar los bundles de salida
  - _Requirements: 3.1, 3.2_

- [x] 2. Crear `src/frontend/` y mover los archivos del frontend público
  - [x] 2.1 Mover `index.html` → `src/frontend/index.html`
    - Actualizar `<link rel="preload" href="...">` de `/styles.css` a `./style.css`
    - Actualizar `<link rel="stylesheet" href="...">` de `/styles.css` a `./style.css`
    - Actualizar `<script type="module" src="...">` de `/main.js` a `./main.js`
    - Dejar sin cambios todas las rutas absolutas de assets (`/logo2.png`, `/favicon.png`, etc.)
    - _Requirements: 1.3, 2.1, 2.4, 2.5, 4.2_
  - [x] 2.2 Mover `main.js` → `src/frontend/main.js`
    - No requiere modificación de contenido (`import "./style.css"` sigue válido)
    - _Requirements: 1.3, 2.1_
  - [x] 2.3 Mover `style.css` → `src/frontend/style.css`
    - No requiere modificación de contenido
    - _Requirements: 1.3, 2.1_

- [x] 3. Mover los archivos HTML del admin a `src/admin/`
  - [x] 3.1 Mover `admin.html` → `src/admin/index.html`
    - Actualizar `<link rel="stylesheet">` de `/admin.css` a `./admin.css`
    - Actualizar import inline script de `/src/admin/auth-login.js` a `./auth-login.js`
    - Actualizar redirects post-login de `/admin-products.html` a `/admin/products.html`
    - _Requirements: 1.4, 2.1, 2.2_
  - [x] 3.2 Mover `admin-categories.html` → `src/admin/categories.html`
    - Actualizar `<link rel="stylesheet">` de `/admin.css` a `./admin.css`
    - Actualizar `<script type="module" src="...">` de `/src/admin/pages/categories-page.js` a `./pages/categories-page.js`
    - Actualizar los 3 nav links y el header logo href a `/admin/categories.html`, `/admin/products.html`, `/admin/users.html`
    - _Requirements: 1.4, 2.1_
  - [x] 3.3 Mover `admin-products.html` → `src/admin/products.html`
    - Actualizar `<link rel="stylesheet">` de `/admin.css` a `./admin.css`
    - Actualizar `<script type="module" src="...">` de `/src/admin/pages/products-page.js` a `./pages/products-page.js`
    - Actualizar los 3 nav links y el header logo href a `/admin/categories.html`, `/admin/products.html`, `/admin/users.html`
    - _Requirements: 1.4, 2.1_
  - [x] 3.4 Mover `admin-users.html` → `src/admin/users.html`
    - Actualizar `<link rel="stylesheet">` de `/admin.css` a `./admin.css`
    - Actualizar `<script type="module" src="...">` de `/src/admin/pages/users-page.js` a `./pages/users-page.js`
    - Actualizar los 3 nav links y el header logo href a `/admin/categories.html`, `/admin/products.html`, `/admin/users.html`
    - _Requirements: 1.4, 2.1_

- [x] 4. Mover `admin.css` → `src/admin/admin.css`
  - No requiere modificación de contenido
  - _Requirements: 1.4, 2.1_

- [x] 5. Actualizar rutas de navegación en `src/admin/auth.js` y `src/admin/layout.js`
  - [x] 5.1 Actualizar `src/admin/auth.js`
    - En `clearSession()`: cambiar `window.location.href = '/admin.html'` → `'/admin/index.html'`
    - _Requirements: 2.1_
  - [x] 5.2 Actualizar `src/admin/layout.js`
    - En el guard de sesión de `initLayout()`: cambiar `window.location.href = '/admin.html'` → `'/admin/index.html'`
    - _Requirements: 2.1_

- [x] 6. Eliminar `admin.js` de la raíz
  - Verificar que ningún HTML lo referencia antes de eliminar
  - Eliminar el archivo `admin.js` de la raíz del proyecto
  - _Requirements: 1.4_

- [x] 7. Checkpoint — Verificar estructura y build
  - Confirmar que los archivos nuevos existen en sus rutas destino
  - Confirmar que los archivos viejos ya no existen en la raíz (`index.html`, `main.js`, `style.css`, `admin.html`, `admin-categories.html`, `admin-products.html`, `admin-users.html`, `admin.css`, `admin.js`)
  - Ejecutar `npm run build` y confirmar exit code 0 sin errores de módulo no encontrado
  - _Requirements: 1.1, 1.2, 2.6, 3.1, 3.4_

- [x] 8. Actualizar `structure.md` en `.kiro/steering/`
  - Reescribir el árbol de carpetas para reflejar la nueva estructura (`src/frontend/`, `src/admin/`)
  - Documentar la ubicación de cada tipo de archivo: HTML, CSS, JS, assets, config
  - _Requirements: 6.1, 6.2, 6.3_

## Notes

- Las tareas deben ejecutarse en orden: `vite.config.ts` primero, luego frontend, luego admin, luego JS, luego eliminar legacy
- `public/` y `backend/` no se tocan en ninguna tarea
- Los archivos en `src/admin/**/*.js` (módulos JS) no se mueven; solo se mueven los HTML y CSS
- Un build exitoso (`npm run build`) es la validación definitiva de que todas las rutas están correctas
