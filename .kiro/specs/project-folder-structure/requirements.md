# Requirements Document

## Introduction

El proyecto TG Pre-Owned Appliances actualmente tiene múltiples archivos mezclados en la raíz: páginas HTML del admin, archivos CSS y JS del frontend, configuraciones de build y archivos de entorno. Esta mezcla dificulta la navegación, el mantenimiento y la incorporación de nuevos colaboradores. El objetivo es reorganizar la estructura de carpetas agrupando los archivos por dominio/lógica (frontend público, panel admin, configuración de build) sin romper el build de Vite ni las rutas de importación existentes.

## Glossary

- **Build_System**: Vite 6 configurado en `vite.config.ts`, responsable de compilar y empaquetar todos los entry points HTML.
- **Frontend_Public**: Archivos que conforman el sitio público visible al usuario (`index.html`, `main.js`, `style.css`).
- **Admin_Panel**: Conjunto de archivos HTML, CSS y JS que conforman el panel de administración (`admin*.html`, `admin.css`, `admin.js`, `src/admin/`).
- **Config_Files**: Archivos de configuración de herramientas de desarrollo (`vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `package.json`, `railway.json`, `vite-env.d.ts`).
- **Reorganization**: El proceso de mover archivos a carpetas organizadas por dominio y actualizar todas las referencias internas para que el proyecto siga funcionando.
- **Entry_Point**: Archivo HTML que Vite usa como punto de entrada en `rollupOptions.input`.
- **Import_Path**: Ruta relativa o absoluta usada en `import` de ES modules o en atributos `src`/`href` de HTML.

---

## Requirements

### Requirement 1: Estructura de carpetas por dominio

**User Story:** Como desarrollador, quiero que los archivos del proyecto estén organizados en carpetas por dominio/lógica, para que sea fácil encontrar y mantener cada parte del sistema.

#### Acceptance Criteria

1. THE Build_System SHALL reconocer la nueva estructura de carpetas sin cambios en el comportamiento del build.
2. WHEN se ejecuta `npm run build`, THE Build_System SHALL compilar todos los Entry_Points correctamente desde sus nuevas ubicaciones.
3. THE Frontend_Public SHALL residir bajo una carpeta dedicada (por ejemplo `src/frontend/` o `src/`) separada de los archivos del Admin_Panel.
4. THE Admin_Panel SHALL agrupar todos sus archivos HTML, CSS y JS de entrada bajo una carpeta dedicada (por ejemplo `src/admin/`), consolidando los que actualmente están en la raíz con los que ya están en `src/admin/`.
5. THE Config_Files SHALL permanecer en la raíz del proyecto, ya que herramientas como Vite, TypeScript y ESLint los requieren en esa ubicación por convención.

---

### Requirement 2: Actualización de rutas de importación

**User Story:** Como desarrollador, quiero que todas las rutas de importación y referencias entre archivos se actualicen automáticamente al mover los archivos, para que el proyecto no tenga errores de módulo no encontrado.

#### Acceptance Criteria

1. WHEN un archivo es movido a una nueva carpeta, THE Reorganization SHALL actualizar todos los Import_Path que referencian ese archivo en el resto del proyecto.
2. WHEN `admin.html` es movido, THE Admin_Panel SHALL actualizar la ruta del `<link rel="stylesheet">` que apunta a `admin.css`.
3. WHEN `admin.js` es movido, THE Admin_Panel SHALL actualizar todos los `import` relativos que apuntan a módulos en `src/admin/`.
4. WHEN `main.js` es movido, THE Frontend_Public SHALL actualizar la referencia `<script type="module" src="...">` en `index.html`.
5. WHEN `style.css` es movido, THE Frontend_Public SHALL actualizar la referencia `<link rel="stylesheet">` en `index.html`.
6. IF algún Import_Path no es actualizado durante la Reorganization, THEN THE Build_System SHALL emitir un error de módulo no encontrado que identifique el archivo faltante.

---

### Requirement 3: Actualización de la configuración de Vite

**User Story:** Como desarrollador, quiero que `vite.config.ts` apunte a los nuevos Entry_Points HTML, para que el build de producción siga generando todos los bundles correctamente.

#### Acceptance Criteria

1. WHEN los archivos HTML son movidos, THE Build_System SHALL tener `rollupOptions.input` actualizado con las nuevas rutas de cada Entry_Point.
2. THE Build_System SHALL mantener los mismos nombres de entrada (`main`, `admin`, `adminCats`, `adminProds`, `adminUsers`) en `rollupOptions.input` para no alterar los nombres de los bundles de salida.
3. WHEN se ejecuta `npm run dev`, THE Build_System SHALL servir correctamente todos los Entry_Points desde sus nuevas rutas.
4. IF un Entry_Point es referenciado con una ruta incorrecta en `vite.config.ts`, THEN THE Build_System SHALL fallar el build con un error que indique el archivo no encontrado.

---

### Requirement 4: Preservación de rutas públicas de assets

**User Story:** Como desarrollador, quiero que los assets estáticos en `/public` no sean movidos, para que las URLs absolutas usadas en HTML y CSS (`/logo2.png`, `/banner2.jpeg`, etc.) sigan funcionando sin cambios.

#### Acceptance Criteria

1. THE Reorganization SHALL dejar la carpeta `public/` en la raíz del proyecto sin modificaciones.
2. THE Frontend_Public SHALL continuar referenciando assets con rutas absolutas desde `/` (por ejemplo `/logo2.png`, `/favicon.png`).
3. THE Admin_Panel SHALL continuar referenciando assets con rutas absolutas desde `/` (por ejemplo `/logo2.png`).
4. WHEN se ejecuta el build, THE Build_System SHALL copiar el contenido de `public/` al directorio de salida sin alteraciones.

---

### Requirement 5: Preservación del backend

**User Story:** Como desarrollador, quiero que la carpeta `/backend` no sea modificada durante la reorganización, para que el servidor Node.js/Express siga funcionando sin cambios.

#### Acceptance Criteria

1. THE Reorganization SHALL dejar la carpeta `backend/` y todos sus archivos en su ubicación actual sin modificaciones.
2. THE Build_System SHALL no incluir archivos de `backend/` en el bundle del frontend.

---

### Requirement 6: Estructura final documentada

**User Story:** Como desarrollador, quiero tener documentada la nueva estructura de carpetas, para que cualquier colaborador pueda entender la organización del proyecto de un vistazo.

#### Acceptance Criteria

1. THE Reorganization SHALL producir una estructura de carpetas donde cada dominio (frontend público, admin, configuración) tenga su propia carpeta claramente nombrada.
2. THE Reorganization SHALL actualizar el archivo de steering `structure.md` en `.kiro/steering/` para reflejar la nueva estructura de carpetas.
3. WHEN un nuevo desarrollador lee `structure.md`, THE Reorganization SHALL haber documentado la ubicación de cada tipo de archivo (HTML, CSS, JS, assets, config).
