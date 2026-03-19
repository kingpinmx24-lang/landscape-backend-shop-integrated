# Reporte de Análisis: Despliegue en Railway

## 1. Estructura Actual vs Especificación

### 1.1 Entrypoint del Servidor
- **Especificación:** Requiere `server/index.ts` con Express, tRPC y servir estáticos.
- **Actual:** Existe `server/_core/index.ts` que ya implementa Express, tRPC y sirve estáticos usando `serveStatic` de `server/_core/vite.ts`. Sin embargo, la especificación pide explícitamente `server/index.ts`.

### 1.2 Salidas de Construcción (Build Outputs)
- **Especificación:** Vite a `dist/client`, TypeScript a `dist/server`.
- **Actual:** Vite va a `dist/public` (según `vite.config.ts`), y el backend se compila con esbuild a `dist` (según `package.json`).

### 1.3 Fuga del Servidor de Desarrollo
- **Especificación:** `server/vite.ts` no debe usarse en producción.
- **Actual:** `server/_core/index.ts` tiene una condición `if (process.env.NODE_ENV === "development") { await setupVite(app, server); } else { serveStatic(app); }`. Esto es seguro si `NODE_ENV` es `production`, pero la especificación es estricta sobre la estructura.

### 1.4 Configuración de Vite (`vite.config.ts`)
- **Especificación:** `outDir: "dist/client"`, `emptyOutDir: false`.
- **Actual:** `outDir: path.resolve(import.meta.dirname, "dist/public")`, `emptyOutDir: true`.

### 1.5 Configuración de TypeScript (`tsconfig.json`)
- **Especificación:** `"outDir": "dist/server"`, `"rootDir": "."`, `"module": "commonjs"` o `"node16"`.
- **Actual:** No tiene `outDir` ni `rootDir`, `"module": "ESNext"`, `"noEmit": true`.

### 1.6 Scripts de `package.json`
- **Especificación:** `"build": "rimraf dist && vite build && tsc"`, `"start": "node dist/server/index.js"`.
- **Actual:** `"build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"`, `"start": "NODE_ENV=production node dist/index.js"`.

### 1.7 Base de Datos (Drizzle)
- **Especificación:** PostgreSQL.
- **Actual:** El proyecto está configurado para MySQL/TiDB (`drizzle-orm/mysql2`, `mysql2/promise` en `server/db.ts` y `dialect: "mysql"` en `drizzle.config.ts`). Esto es un conflicto crítico con la especificación que pide PostgreSQL.

## 2. Plan de Acción (Correcciones)

1. **Migrar Base de Datos a PostgreSQL:**
   - Cambiar dependencias: eliminar `mysql2`, instalar `pg` y `postgres`.
   - Actualizar `server/db.ts` para usar `drizzle-orm/node-postgres` o `drizzle-orm/postgres-js`.
   - Actualizar `drizzle.config.ts` a `dialect: "postgresql"`.
   - Actualizar esquemas en `drizzle/schema.ts` si usan tipos específicos de MySQL.

2. **Reestructurar Entrypoint:**
   - Crear `server/index.ts` moviendo la lógica de `server/_core/index.ts`.
   - Ajustar importaciones.

3. **Ajustar Configuraciones de Build:**
   - Modificar `vite.config.ts` para usar `dist/client`.
   - Modificar `tsconfig.json` para permitir emisión (`"noEmit": false`) y usar `dist/server`.
   - Actualizar `package.json` con los scripts exactos requeridos (añadiendo `rimraf`).

4. **Ajustar Servidor de Estáticos:**
   - Modificar la lógica en `server/index.ts` para servir desde `../client` como pide la especificación.

5. **Preparar para Railway:**
   - Asegurar que `DATABASE_URL` y `PORT` se manejen correctamente.
   - Añadir script de migración en el build si es necesario.
