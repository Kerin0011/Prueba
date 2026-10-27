# Proyecto Base NestJS 12 — Guía para Prueba de Desempeño

Plantilla base y robusta construida con **NestJS 12**, **TypeORM**, **PostgreSQL**, **Docker**, autenticación **JWT** con roles, validación con **Zod** y **class-validator**, y tests con **Vitest**.

---

## 1. Stack Tecnológico

- **Framework**: NestJS 12 (ESM, TypeScript strict mode).
- **Base de Datos**: PostgreSQL 17 (vía Docker Compose) con TypeORM.
- **Autenticación**: JWT con `@nestjs/jwt`, hashing seguro con `bcryptjs` y control de acceso basado en roles (RBAC).
- **Validación y Configuración**: Zod para variables de entorno (`ConfigModule`), `class-validator` y `class-transformer` para DTOs.
- **Documentación de API**: Swagger UI integrado en `/docs`.
- **Testing**: Vitest (unitarios con mocks) y Vitest e2e (con Supertest).
- **Seguridad**: `helmet`, CORS habilitado, `ValidationPipe` estricto con `whitelist: true` y `forbidNonWhitelisted: true`.

---

## 2. Requisitos Previos

- **Node.js**: v24.15+ LTS (o Node 26)
- **Docker Desktop**: En ejecución para los contenedores PostgreSQL
- **Git**

---

## 3. Instalación y Puesta en Marcha

1. **Clonar el repositorio y entrar al proyecto**:
   ```bash
   git clone <url-del-repo>
   cd simulacro
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   ```

3. **Iniciar las bases de datos con Docker**:
   ```bash
   # Inicia db en puerto 5433 y db_test en puerto 5434
   docker compose up -d db db_test
   ```

4. **Instalar dependencias**:
   ```bash
   npm install
   ```

5. **Iniciar en modo desarrollo**:
   ```bash
   npm run start:dev
   ```

La API estará disponible en: `http://localhost:3000/api`  
Documentación Swagger en: `http://localhost:3000/docs`

---

## 4. Documentación de la API (Swagger)

Abre tu navegador en:
```
http://localhost:3000/docs
```
Incluye botón **Authorize** para probar endpoints protegidos usando el token JWT generado en el login.

---

## 5. Credenciales Iniciales (Seed Admin)

Al arrancar la aplicación por primera vez, `SeedService` registra automáticamente el usuario administrador si no existe:

- **Email**: `admin@prueba.com`
- **Contraseña**: `Admin12345`
- **Rol**: `admin`

---

## 6. Pruebas Automatizadas (Vitest)

- **Pruebas unitarias**:
  ```bash
  npm run test
  ```
- **Pruebas unitarias en modo escucha (watch)**:
  ```bash
  npm run test:watch
  ```
- **Cobertura de código**:
  ```bash
  npm run test:cov
  ```
- **Pruebas de integración E2E** (requiere contenedor `db_test` corriendo en puerto 5434):
  ```bash
  npm run test:e2e
  ```

---

## 7. Estructura de Carpetas y Decisiones de Arquitectura

```text
src/
  common/
    decorators/     # @Public(), @Roles(), @CurrentUser(), @Auth()
    dto/            # pagination.dto.ts
    entities/       # base.entity.ts (UUID, createdAt, updatedAt, deletedAt)
    enums/          # role.enum.ts (ADMIN, USER)
    filters/        # all-exceptions.filter.ts (manejo unificado de excepciones y Postgres)
    guards/         # jwt-auth.guard.ts (global), roles.guard.ts (global)
    interceptors/   # transform.interceptor.ts (formato unificado { success, statusCode, data, timestamp })
    interfaces/     # jwt-payload.interface.ts
    middleware/     # logger.middleware.ts (registro HTTP con {*splat})
    pipes/          # zod-validation.pipe.ts
  config/           # env.schema.ts (validación estricta de .env con Zod)
  database/         # seed.service.ts y database.module.ts
  auth/             # Módulo de autenticación (register, login, JWT)
  users/            # Módulo de usuarios (entidad User, perfil 'me', administración)
  products/         # Módulo CRUD plantilla (relación con User, paginación, búsqueda, control de dueño)
  app.module.ts     # Módulo raíz con orquestación global
  app.setup.ts      # Configuración desacoplada reutilizable para app y tests e2e
  main.ts           # Punto de entrada bootstrap
test/
  auth.e2e-spec.ts  # Pruebas e2e completas de autenticación
```

### Decisiones de Diseño Clave

1. **Guards Globales + `@Public()`**:
   Todo endpoint requiere autenticación JWT por defecto mediante `JwtAuthGuard` y `RolesGuard` registrados como `APP_GUARD`. Los endpoints abiertos explícitamente usan `@Public()`.
2. **Formato de Respuesta Uniforme**:
   `TransformInterceptor` estandariza las respuestas exitosas y `AllExceptionsFilter` formatea errores con códigos HTTP adecuados (traduciendo errores de unicidad `23505` a `409 Conflict`).
3. **Soft Delete**:
   Todas las entidades heredan de `AppBaseEntity` con `@DeleteDateColumn`. Los registros no se borran físicamente sino que se marca `deleted_at`.
4. **Módulo Plantilla `products`**:
   Sirve como molde para crear rápidamente cualquier nueva entidad requerida en la prueba de desempeño (relación `ManyToOne`, validación de dueño o rol admin, transacción de stock, paginación con `findAndCount`).
