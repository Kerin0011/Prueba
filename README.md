# FleetCore API — Sistema de Gestión de Mantenimiento de Flota de Vehículos

> **Prueba de Desempeño – Módulo 6.2 NestJS**  
> **Coder:** Kerin Barranco  
> **Clan:** Backend Developers  
> **Repositorio GitHub:** [https://github.com/Kerin0011/Prueba](https://github.com/Kerin0011/Prueba)

---

## 1. Descripción del Caso de Uso

La empresa de transporte **FleetCore** requiere un sistema robusto para administrar el ciclo de vida de los mantenimientos de su flota de vehículos. Esta solución elimina los registros manuales y hojas de cálculo mediante una API REST en **NestJS 12**, **TypeORM**, **PostgreSQL 17**, autenticación **JWT** con **bcryptjs**, validación mediante **Zod** y **class-validator**, control de acceso basado en roles (**RBAC** con roles `ADMIN` y `TECHNICIAN`), integración externa protegida por **API Key**, y tests automatizados con **Vitest**.

---

## 2. Tecnologías Utilizadas

- **Backend:** NestJS 12 (Arquitectura modular ESM con TypeScript modo estricto).
- **Persistencia:** PostgreSQL 17 con TypeORM.
- **Autenticación & Seguridad:**
  - JWT con `@nestjs/jwt`.
  - Hashing seguro de contraseñas con **bcryptjs**.
  - Roles soportados: **ADMIN** y **TECHNICIAN**.
  - Guards globales (`JwtAuthGuard`, `RolesGuard`) y decoradores personalizados (`@Public()`, `@Roles()`, `@CurrentUser()`).
  - Autenticación con cabecera `x-api-key` para sistemas externos (`ApiKeyGuard`).
  - `helmet` y CORS configurados.
- **Validación y Configuración:**
  - Validación de `.env` en tiempo de arranque con **Zod** (`envSchema`).
  - DTOs tipados y validados con `class-validator` y `class-transformer`.
- **Documentación:** Swagger UI interactivo en `/docs`.
- **Testing:** Vitest con reporte de cobertura (`npm run test:cov`).
- **Contenedores:** Docker Compose con dos bases de datos (desarrollo y pruebas).

---

## 3. Requisitos Previos

- **Node.js**: v24.15+ LTS (o Node 26)
- **Docker Desktop**: En ejecución para PostgreSQL
- **Git**

---

## 4. Instalación y Puesta en Marcha

### Paso 1: Clonar el repositorio
```bash
git clone https://github.com/Kerin0011/Prueba.git
cd Prueba
```

### Paso 2: Configurar variables de entorno
```bash
cp .env.example .env
```

### Paso 3: Iniciar las bases de datos con Docker
```bash
docker compose up -d db db_test
```
- Base de datos principal (`db`): Puerto `5433` -> `prueba_db`
- Base de datos de pruebas (`db_test`): Puerto `5434` -> `prueba_db_test`

### Paso 4: Instalar dependencias
```bash
npm install
```

### Paso 5: Ejecutar el Seeder de datos iniciales
```bash
npm run seed
```

### Paso 6: Iniciar la aplicación
```bash
npm run start:dev
```

- **API Base:** `http://localhost:3000/api`
- **Documentación Swagger:** `http://localhost:3000/docs`

---

## 5. Credenciales de Prueba (Seed Data)

El sistema viene poblado con usuarios, mecánicos, talleres y vehículos iniciales (idempotente):

| Rol | Correo Electrónico | Contraseña | Descripción |
|---|---|---|---|
| **ADMIN** | `admin@fleetcore.com` | `Admin12345!` | Administrador con control total |
| **TECHNICIAN** | `tech1@fleetcore.com` | `Tech12345!` | Técnico Carlos Gómez (vinculado a Mecánico 1) |
| **TECHNICIAN** | `tech2@fleetcore.com` | `Tech12345!` | Técnico Jorge Rivas (vinculado a Mecánico 2) |

### Clave de Integración Externa (API Key)
- **Header:** `x-api-key: fleetcore-secret-api-key-2026`
- **Endpoints:** `/api/integrations/fleet-status` y `/api/integrations/active-maintenances`

### Datos Iniciales Poblados
- **Mecánicos (3):**
  - Carlos Gómez (`ACTIVE`, vinculado a `tech1@fleetcore.com`, Esp: Motores Diésel).
  - Jorge Rivas (`ACTIVE`, vinculado a `tech2@fleetcore.com`, Esp: Frenos y Suspensión).
  - Pedro Méndez (`INACTIVE`, Esp: Electricidad Automotriz).
- **Talleres (2):**
  - Taller Central FleetCore (`ACTIVE`).
  - Taller Norte FleetCore (`INACTIVE`).
- **Vehículos (4):**
  - `AAA111` (Toyota Hilux, 45.000 km, `AVAILABLE`).
  - `BBB222` (Kenworth T680, 120.000 km, `AVAILABLE`).
  - `CCC333` (Chevrolet FVR, 85.000 km, `IN_MAINTENANCE` con mantenimiento `IN_PROGRESS`).
  - `DDD444` (Volvo FH, 250.000 km, `INACTIVE`).
- **Mantenimientos:**
  - 1 en estado `IN_PROGRESS` para el vehículo `CCC333`.
  - 1 en estado `COMPLETED` para el vehículo `AAA111` con información completa de cierre (historial).

---

## 6. Pruebas Automatizadas (Vitest)

```bash
# Pruebas unitarias
npm run test

# Pruebas con reporte de cobertura
npm run test:cov

# Pruebas e2e (con base de datos de test en puerto 5434)
npm run test:e2e
```
