Proyecto base NestJS — Guía para la prueba de desempeño
25 de oct de 2026 · @Someone
Resumen: el orden de todo
Arma el proyecto base en 10 fases y no pases a la siguiente hasta que la anterior corra sin errores. La meta: que el martes solo crees entidades, DTOs, servicios, controladores y tests del caso que te den.
1. Fase 0-1 — Node LTS, Nest CLI 12, crear proyecto, instalar dependencias.
2. Fase 2 — Docker Compose con PostgreSQL + .env / .env.example.
3. Fase 3 — ConfigModule global con validación del .env usando Zod.
4. Fase 4 — TypeORM conectado, entidad base abstracta, enums.
5. Fase 5 — Carpeta common/: decoradores personalizados, guards, interceptors, filtro de excepciones, middleware, pipes.
6. Fase 6 — main.ts + app.setup.ts: pipes, interceptors y filtros globales, prefijo /api, CORS, Swagger.
7. Fase 7 — Módulos users y auth: register, login, JWT, roles.
8. Fase 8 — Un módulo CRUD plantilla (con relación, paginación y dueño) para copiar el día de la prueba.
9. Fase 9 — Vitest: tests unitarios de servicios y e2e de auth.
10. Fase 10 — Seed de admin, README, colección de Postman, push a GitHub y prueba de clonado limpio.
Temas que te faltaban en la lista
"Pipelines" en Nest se llaman pipes (ValidationPipe, ParseUUIDPipe, etc.); los cubro en la Fase 5. Estos son los que no mencionaste y es muy probable que evalúen:
Tema
Por qué importa
Fase
@nestjs/config (ConfigModule)
Es como Nest lee el .env; sin esto el .env no sirve
3
Exception filters
Respuestas de error con formato uniforme y errores de BD traducidos (email duplicado → 409)
5
Hash de contraseñas (bcryptjs)
Nunca guardar contraseñas en texto plano
7
Roles / autorización (RBAC)
Casi todo caso trae "solo el admin puede..."
5 y 7
Relaciones TypeORM
ManyToOne, OneToMany, ManyToMany salen en cualquier caso real
8
Paginación y filtros con query DTOs
Listados con ?page=&limit=
8
Serialización (@Exclude, ClassSerializerInterceptor)
No devolver el password en las respuestas
5 y 6
Swagger (@nestjs/swagger)
Documentar y probar la API; suele dar puntos
6
PartialType (mapped types)
UpdateDto a partir del CreateDto sin repetir código
8
Soft delete
Borrado lógico con @DeleteDateColumn
4
Transacciones
Operaciones que tocan varias tablas (ej. una compra que descuenta stock)
8
Migraciones y seeds
Crear un admin inicial; migraciones si te las piden
4 y 10
CORS, helmet, rate limiting
Seguridad básica; opcional pero suma
6
Ojo con la versión: NestJS 12 salió en agosto de 2026 y cambió cosas que te afectan (ESM, Vitest por defecto, validación nativa con Zod). Confirma mañana en clase qué versión usan los ejemplos del módulo; esta guía está hecha para Nest 12.
Fase 0 y 1 — Requisitos y creación del proyecto
Usa Node 24 LTS y genera el proyecto como ESM: así Vitest ya viene configurado y no pierdes tiempo instalándolo.
Requisitos
[x] Node.js 24 LTS (v24.15 o superior) o Node 26. El CLI de Nest 12 no genera código con versiones más viejas. Verifica con node -v.
[x] Docker Desktop instalado y corriendo.
[x] Nest CLI 12: npm i -g @nestjs/cli@latest y luego nest -v.
[ ] Git configurado y un repo vacío en GitHub.
Espacio en disco: deja al menos 5 GB libres (df -h /). Si nest new falla con ENOSPC: no space left on device, el disco está lleno: libera con npm cache clean --force, docker image prune -a (no borra volúmenes) y borrando los node_modules de proyectos que no uses; luego borra la carpeta a medias y vuelve a correr nest new.
Crear el proyecto
nest new prueba-base --strict
Cuando pregunte, elige npm y ESM (with vitest).
--strict activa el modo estricto de TypeScript (null y any implícito se vuelven errores). En Nest 12 el tsconfig ESM ya trae "strict": true; comprueba con grep -n strict tsconfig.json. Déjalo puesto: Zod lo necesita y evita errores con null. Cuando TypeScript se queje de un tipo, arregla el tipo; no apagues el modo estricto.
Opción
Test runner
Lo que implica
ESM (recomendado)
Vitest ya configurado
Imports relativos con .js
CommonJS
Jest
Tendrías que instalar Vitest a mano con unplugin-swc
Si en clase trabajaron con CommonJS, quédate con lo de clase: el resto de la guía funciona igual quitando los .js de los imports.
Las 4 reglas de ESM que te pueden tumbar el martes
1. Todo import relativo termina en .js aunque el archivo sea .ts: import { UsersService } from './users.service.js';. nest g ya los genera así.
2. Una interface o tipo usado en un parámetro con decorador se importa con import type: import type { Request } from 'express';. Si no, TypeScript da error TS1272.
3. En relaciones bidireccionales de TypeORM, envuelve el tipo en Relation<T> para evitar el error "Cannot access before initialization" (ejemplo en la Fase 8).
4. __dirname no existe; usa import.meta.dirname.
Dependencias
npm i @nestjs/config @nestjs/typeorm typeorm pg
npm i @nestjs/jwt bcryptjs
npm i class-validator class-transformer zod
npm i @nestjs/swagger helmet
npm i -D supertest @types/supertest
Después corre npm run test y npm run start:dev para confirmar que lo generado funciona antes de tocar nada.
Estructura de carpetas objetivo
src/
  common/
    decorators/     public, roles, current-user, auth
    dto/            pagination.dto.ts
    entities/       base.entity.ts
    enums/          role.enum.ts
    filters/        all-exceptions.filter.ts
    guards/         jwt-auth.guard.ts, roles.guard.ts
    interceptors/   transform.interceptor.ts, logging.interceptor.ts
    interfaces/     jwt-payload.interface.ts
    middleware/     logger.middleware.ts
    pipes/          zod-validation.pipe.ts
  config/           env.schema.ts
  database/         seed.service.ts
  auth/
  users/
  products/         módulo plantilla
  app.module.ts
  app.setup.ts
  main.ts
test/
  auth.e2e-spec.ts
[x] Commit: git add . y git commit -m "chore: proyecto inicial".
Fase 2 — Docker Compose y .env
Levanta dos Postgres: uno para desarrollo (con volumen) y otro para los tests e2e (en memoria, se borra solo). Usa el puerto 5433 para no chocar con un Postgres instalado en tu PC.
docker-compose.yml (raíz del proyecto)
services:
  db:
    image: postgres:17-alpine
    container_name: prueba_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "${DB_PORT}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      retries: 5

  db_test:
    image: postgres:17-alpine
    container_name: prueba_db_test
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: prueba_db_test
    ports:
      - "5434:5432"
    tmpfs:
      - /var/lib/postgresql/data

  # Opcional: API dockerizada. Solo se levanta con --profile full
  api:
    build: .
    profiles: ["full"]
    env_file: .env
    ports:
      - "${PORT}:3000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      PORT: 3000
      DB_HOST: db
      DB_PORT: 5432

volumes:
  pgdata:
Docker Compose lee el .env de la raíz solo, por eso funcionan los ${DB_USER}. Fija la imagen en 17: la 18 cambió la ruta del volumen.
.env
NODE_ENV=development
PORT=3000

DB_HOST=localhost
DB_PORT=5433
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=prueba_db
DB_SYNC=true

JWT_SECRET=pon-aqui-un-secreto-largo-de-32-caracteres-o-mas
JWT_EXPIRES_IN=3600

ADMIN_EMAIL=admin@prueba.com
ADMIN_PASSWORD=Admin12345
.env.test
Igual que el .env, cambiando solo esto:
NODE_ENV=test
DB_PORT=5434
DB_NAME=prueba_db_test
JWT_SECRET=secreto-solo-para-tests-de-32-caracteres
Checklist
[x] Crea .env.example con las mismas claves y valores de ejemplo (este sí se sube a GitHub).
[x] Verifica que .env esté en .gitignore.
[x] docker compose up -d y luego docker compose ps: los dos contenedores deben decir running.
[x] Si falla: docker compose logs db.
[x] Para apagar: docker compose down. Para borrar también los datos: docker compose down -v.
Opcional: dockerizar también la API
Si la prueba pide que todo corra con Docker, agrega un Dockerfile:
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
El servicio api del compose ya está incluido arriba con profiles: ["full"]: por defecto docker compose up -d solo levanta las dos bases, y la API solo se construye cuando la pides:
docker compose up -d db db_test                 # día a día: solo las bases
docker compose --profile full up -d --build     # además construye y levanta la API
docker compose stop api                         # apaga la API
Para trabajar, corre la API con npm run start:dev y deja Docker solo para las bases. Si la API de Docker está arriba, ocupa el puerto 3000 y npm run start:dev falla con EADDRINUSE: apágala antes.
Dentro de la red de Docker la base se llama db y usa el puerto interno 5432, no 5433; por eso el servicio fija DB_HOST: db y DB_PORT: 5432 en environment, que pesa más que tu .env (que sigue con localhost y 5433 para cuando corres la API en tu máquina).
Crea también un .dockerignore en la raíz (sin él, Docker copia tu node_modules al build):
node_modules
dist
.env
.git
coverage
Verifica que la API responde: docker compose logs api --tail 20 y curl http://localhost:3000. El script start:prod de tu package.json es el que usa el Dockerfile.
Fase 3 — ConfigModule con validación Zod
El .env se valida con Zod al arrancar: si falta una variable o está mal, la app no levanta y te dice cuál. Aquí ya usas Zod una vez, y cuenta como tema visto.
src/config/env.schema.ts
import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string(),
  DB_PORT: z.coerce.number(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_SYNC: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.coerce.number().default(3600),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8),
});

export type Env = z.infer<typeof envSchema>;
DB_SYNC no usa z.coerce.boolean() a propósito: ese convierte el texto "false" en true.
En app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { envSchema } from './config/env.schema.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: (config) => envSchema.parse(config),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
Ojo con los imports: ConfigModule y envSchema hay que importarlos arriba, y ./config/env.schema.js lleva .js al final aunque el archivo sea .ts (obligatorio en ESM).
validate devuelve el objeto ya convertido, así DB_PORT llega como número y DB_SYNC como booleano. En Nest 12 también existe validationSchema: envSchema; uso validate porque garantiza los valores convertidos.
Cómo leer variables con tipos
constructor(private readonly config: ConfigService<Env, true>) {}

const port = this.config.get('DB_PORT', { infer: true }); // number
Este bloque es solo un ejemplo de uso: no va en ningún archivo de la Fase 3. Lo usarás en las Fases 4, 7 y 10. ConfigService<Env, true> le dice a TypeScript qué variables existen y de qué tipo son, y { infer: true } hace que get('DB_PORT') devuelva number. Como ConfigModule es global (isGlobal: true), no hay que importarlo en cada módulo.
[x] Prueba: borra JWT_SECRET del .env, corre npm run start:dev y confirma que falla con un mensaje claro. Luego vuélvelo a poner.
Fase 4 — TypeORM, entidad base y enums
Conecta TypeORM leyendo el .env con forRootAsync y crea una entidad base para que todas tus tablas tengan id UUID, fechas y borrado lógico sin repetir código.
En app.module.ts (después del ConfigModule)
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => ({
    type: 'postgres',
    host: config.get('DB_HOST', { infer: true }),
    port: config.get('DB_PORT', { infer: true }),
    username: config.get('DB_USER', { infer: true }),
    password: config.get('DB_PASSWORD', { infer: true }),
    database: config.get('DB_NAME', { infer: true }),
    autoLoadEntities: true,
    synchronize: config.get('DB_SYNC', { infer: true }),
    dropSchema: config.get('NODE_ENV', { infer: true }) === 'test',
  }),
}),
• autoLoadEntities registra solas las entidades que cada módulo declara con TypeOrmModule.forFeature([...]).
• dropSchema en test deja la base de pruebas limpia en cada corrida e2e.
• synchronize: true crea las tablas desde las entidades. Para la prueba basta; en producción se usan migraciones.
src/common/entities/base.entity.ts
import {
  CreateDateColumn, DeleteDateColumn, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';

export abstract class AppBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
Se llama AppBaseEntity y no BaseEntity para no chocar con la clase BaseEntity de TypeORM.
src/common/enums/role.enum.ts
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
}
En una entidad se usa así: @Column({ type: 'enum', enum: Role, default: Role.USER }). Los enums del caso (estado de un pedido, tipo de cita) siguen el mismo patrón.
Borrado lógico (soft delete)
• Borrar: this.repo.softDelete(id) llena deleted_at en vez de eliminar la fila.
• Los find ya excluyen los borrados; para verlos: find({ withDeleted: true }).
• Restaurar: this.repo.restore(id).
Checklist
[x] npm run start:dev arranca sin error de conexión.
[ ] Cuando tengas entidades, verifica las tablas: docker exec -it prueba_db psql -U postgres -d prueba_db -c "\dt".
[ ] Si el enunciado exige migraciones, móntalas antes del martes; con ESM la CLI de TypeORM necesita configuración extra.
Fase 5 — Carpeta common: decoradores, guards, interceptors, filtros, middleware y pipes
Aquí vive todo lo reutilizable. Si esto queda listo, el martes proteger un endpoint es escribir @Auth(Role.ADMIN) encima del método.
Orden en que Nest ejecuta cada pieza (te lo pueden preguntar)
1. Middleware — antes de saber qué controlador responde (logs, headers).
2. Guards — ¿puede pasar? (JWT, roles).
3. Interceptors (antes) — envuelven la ejecución.
4. Pipes — validan y transforman @Body, @Param, @Query.
5. Controlador y servicio.
6. Interceptors (después) — transforman la respuesta.
7. Exception filters — si algo lanzó un error en cualquier paso.
Regla de imports con inyección de dependencias
Nunca uses import type para una clase que se inyecta por constructor (servicios, JwtService, repositorios): Nest necesita la clase real para resolverla. import type es solo para interfaces y tipos.
interfaces/jwt-payload.interface.ts
import type { Request } from 'express';
import type { Role } from '../enums/role.enum.js';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

export type AuthRequest = Request & { user: JwtPayload };
Decoradores personalizados (decorators/)
// public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import type { Role } from '../enums/role.enum.js';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
// current-user.decorator.ts
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthRequest, JwtPayload } from '../interfaces/jwt-payload.interface.js';

export const CurrentUser = createParamDecorator(
  (field: keyof JwtPayload | undefined, ctx: ExecutionContext) => {
    const { user } = ctx.switchToHttp().getRequest<AuthRequest>();
    return field ? user?.[field] : user;
  },
);
// auth.decorator.ts — decorador compuesto
import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Role } from '../enums/role.enum.js';
import { Roles } from './roles.decorator.js';

export const Auth = (...roles: Role[]) =>
  applyDecorators(
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Token ausente o inválido' }),
    ApiForbiddenResponse({ description: 'Rol sin permisos' }),
  );
Uso: @Public() abre un endpoint, @Auth(Role.ADMIN) lo restringe, @CurrentUser('sub') userId: string te da el id del usuario logueado.
Guards (guards/)
// jwt-auth.guard.ts — global: todo endpoint exige token salvo @Public()
import {
  Injectable, UnauthorizedException, type CanActivate, type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import type { AuthRequest, JwtPayload } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('Token requerido');

    try {
      req.user = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    return true;
  }
}
// roles.guard.ts
import {
  ForbiddenException, Injectable, type CanActivate, type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { Role } from '../enums/role.enum.js';
import type { AuthRequest } from '../interfaces/jwt-payload.interface.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const { user } = ctx.switchToHttp().getRequest<AuthRequest>();
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }
    return true;
  }
}
No registres los guards globales todavía. JwtAuthGuard necesita JwtService, que lo aporta el JwtModule de AuthModule (Fase 7). Si lo registras antes, la app no arranca y Nest lanza UnknownDependenciesException: can't resolve dependencies of the JwtAuthGuard (?, Reflector). Deja estas líneas comentadas en app.module.ts y descoméntalas en la Fase 7 (el orden importa: primero JWT, después roles):
providers: [
  // Descomentar en la Fase 7, cuando exista AuthModule con JwtModule global
  // { provide: APP_GUARD, useClass: JwtAuthGuard },
  // { provide: APP_GUARD, useClass: RolesGuard },
],
Interceptor de respuesta (interceptors/transform.interceptor.ts)
Todas las respuestas exitosas salen con el mismo formato.
import {
  Injectable, type CallHandler, type ExecutionContext, type NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, type Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(ctx: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const res = ctx.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: res.statusCode,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
Filtro de excepciones (filters/all-exceptions.filter.ts)
Todos los errores salen con el mismo formato, y los errores de Postgres se traducen a códigos HTTP útiles.
import {
  Catch, HttpException, HttpStatus, Logger, type ArgumentsHost, type ExceptionFilter,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Error interno del servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string'
        ? body
        : ((body as { message?: string | string[] }).message ?? exception.message);
    } else if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string }).code;
      if (code === '23505') {
        status = HttpStatus.CONFLICT;
        message = 'El registro ya existe';
      } else if (code === '23503') {
        status = HttpStatus.BAD_REQUEST;
        message = 'Se referencia un registro que no existe';
      }
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) this.logger.error(exception);

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
Middleware de logs (middleware/logger.middleware.ts)
import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      this.logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${Date.now() - start}ms`);
    });
    next();
  }
}
Se registra en AppModule implementando NestModule:
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
  }
}
En Nest 11+ (Express 5) el comodín '*' ya no se recomienda; usa '{*splat}'.
Pipes y Zod
Hay tres formas de validar un body. Para el proyecto base usa la forma 1; las formas 2 y 3 son opcionales y solo las necesitas si el enunciado pide Zod o un pipe personalizado.
1. ValidationPipe global + class-validator (la principal, la que vas a usar casi siempre). Se activa una sola vez en app.setup.ts (Fase 6) y cada DTO es una clase con decoradores:
export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
En el controller solo escribes @Body() dto: CreateCategoryDto. Decoradores útiles: @IsEmail(), @IsInt(), @IsNumber(), @IsPositive(), @Min(), @Max(), @IsEnum(MiEnum), @IsUUID(), @IsBoolean(), @IsDateString(), @IsArray().
Tres cosas que fallan sin avisar:
• El DTO se importa normal, nunca con import type: si lo importas como tipo, el pipe no ve la clase y no valida nada.
• Todo campo que quieras aceptar necesita al menos un decorador de class-validator (aunque sea @IsOptional()); si no, forbidNonWhitelisted lo rechaza con 400.
• El UpdateDto se hace con PartialType importado de @nestjs/swagger, para que herede las validaciones del CreateDto con todo opcional.
2. Zod nativo de Nest 12 (opcional) con StandardSchemaValidationPipe registrado global y el schema en el decorador. Si no usas esta forma, puedes quitar ese pipe de app.setup.ts:
// categories/dto/create-category.schema.ts
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(60),
  description: z.string().max(255).optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;
// en el controller
import { createCategorySchema } from './dto/create-category.schema.js';
import type { CreateCategoryDto } from './dto/create-category.schema.js';

@Post()
create(@Body({ schema: createCategorySchema }) dto: CreateCategoryDto) {
  return this.categoriesService.create(dto);
}
3. Pipe personalizado (opcional): solo si te piden crear un pipe; demuestra que sabes hacerlo. Implementa PipeTransform, tiene un método transform(value) que valida con safeParse y lanza BadRequestException si falla:
// pipes/zod-validation.pipe.ts
import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      );
    }
    return result.data;
  }
}

// uso: @Body(new ZodValidationPipe(createCategorySchema)) dto: CreateCategoryDto
Pipes que ya trae Nest: @Param('id', ParseUUIDPipe) id: string valida que el id sea UUID antes de ir a la base; también existen ParseIntPipe, ParseEnumPipe y DefaultValuePipe.
[x] Commit: feat: common (guards, decoradores, interceptor, filtro, middleware, pipes).
Fase 6 — main.ts, app.setup.ts y app.module.ts
Toda la configuración global va en una función configureApp() aparte de main.ts. Así los tests e2e usan exactamente la misma configuración que la app real, y no fallan por un pipe que olvidaste replicar.
src/app.setup.ts
import {
  ClassSerializerInterceptor, ValidationPipe, type INestApplication,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.use(helmet()); // si Swagger se ve en blanco: helmet({ contentSecurityPolicy: false })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // borra propiedades que no están en el DTO
      forbidNonWhitelisted: true,  // y si llegan, responde 400
      transform: true,             // convierte el body en instancia del DTO
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // En la respuesta actúa primero el último: ClassSerializer quita los @Exclude
  // y después TransformInterceptor envuelve el resultado.
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
}

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API Prueba de desempeño')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
}
Este archivo usa solo ValidationPipe (forma 1 de la Fase 5). Si luego quieres Zod nativo, agrega StandardSchemaValidationPipe de @nestjs/common como segundo pipe.
src/main.ts
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp, setupSwagger } from './app.setup.js';
import type { Env } from './config/env.schema.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  setupSwagger(app);

  const port = app.get<ConfigService<Env, true>>(ConfigService).get('PORT', { infer: true });
  await app.listen(port);
  Logger.log(`API http://localhost:${port}/api | Docs http://localhost:${port}/docs`, 'Bootstrap');
}
await bootstrap();
src/app.module.ts completo
Empieza solo con lo que ya existe (ConfigModule, TypeOrmModule y el middleware). Los módulos UsersModule, AuthModule, ProductsModule y DatabaseModule, y los dos guards globales, están comentados: descoméntalos al llegar a las Fases 7, 8 y 10. Si registras los guards antes de tener AuthModule, la app no arranca (falta JwtService).
import { Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { APP_GUARD } from '@nestjs/core';                           // Fase 7
import { TypeOrmModule } from '@nestjs/typeorm';
// import { AuthModule } from './auth/auth.module.js';                // Fase 7
// import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';   // Fase 7
// import { RolesGuard } from './common/guards/roles.guard.js';        // Fase 7
import { LoggerMiddleware } from './common/middleware/logger.middleware.js';
import { envSchema, type Env } from './config/env.schema.js';
// import { DatabaseModule } from './database/database.module.js';    // Fase 10
// import { ProductsModule } from './products/products.module.js';    // Fase 8
// import { UsersModule } from './users/users.module.js';             // Fase 7

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
      validate: (config) => envSchema.parse(config),
    }),
    TypeOrmModule.forRootAsync({ /* el bloque de la Fase 4 */ }),
    // UsersModule,     // Fase 7
    // AuthModule,      // Fase 7
    // ProductsModule,  // Fase 8
    // DatabaseModule,  // Fase 10
  ],
  providers: [
    // Fase 7: descomentar los dos guards (JwtAuthGuard primero)
    // { provide: APP_GUARD, useClass: JwtAuthGuard },
    // { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('{*splat}');
  }
}
Checklist
[x] Borra app.controller.ts, app.service.ts, su .spec y el e2e de ejemplo (lo reemplazas en la Fase 9).
[x] npm run start:dev y abre http://localhost:3000/docs.
[ ] GET http://localhost:3000/api/nada debe responder 404 con tu formato (success: false, path, timestamp) y verse el log del middleware en la terminal.
Fase 7 — Users y Auth: register, login, JWT y roles
El registro siempre crea usuarios con rol user; el admin sale del seed (Fase 10). Si el body trae "role": "admin", el ValidationPipe lo rechaza con 400 porque no está en el DTO: eso es un punto de seguridad que vale la pena mencionar en la sustentación.
Antes de probar nada de esta fase, en app.module.ts: agrega UsersModule y AuthModule a imports y descomenta los dos APP_GUARD (con sus imports). Es lo que deja disponible JwtService para el JwtAuthGuard global, y desde ahí todos los endpoints piden token salvo los que lleven @Public().
Generar los archivos
nest g module users
nest g service users
nest g controller users
nest g module auth
nest g service auth
nest g controller auth
Importante: los DTOs y entidades se importan normal, nunca con import type. Si el DTO llega como tipo, el ValidationPipe no ve la clase y no valida nada, sin dar error.
users/entities/user.entity.ts
import { Exclude } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { Role } from '../../common/enums/role.enum.js';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 150 })
  email: string;

  @Exclude()                       // nunca sale en una respuesta
  @Column({ select: false })       // no se trae en los find normales
  password: string;

  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;
}
users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Role } from '../common/enums/role.enum.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly usersRepo: Repository<User>) {}

  create(data: { name: string; email: string; password: string; role?: Role }) {
    return this.usersRepo.save(this.usersRepo.create(data));
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ where: { email } });
  }

  findByEmailWithPassword(email: string) {
    return this.usersRepo.findOne({
      where: { email },
      select: { id: true, name: true, email: true, role: true, password: true },
    });
  }

  findAll() {
    return this.usersRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException(`Usuario ${id} no encontrado`);
    return user;
  }
}
users/users.controller.ts
@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Auth()            // cualquier usuario logueado
  @Get('me')         // va ANTES de ':id' o ':id' se lo traga
  me(@CurrentUser('sub') userId: string) {
    return this.usersService.findOne(userId);
  }

  @Auth(Role.ADMIN)
  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Auth(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }
}
users.module.ts: imports: [TypeOrmModule.forFeature([User])] y exports: [UsersService] para que Auth lo pueda inyectar.
auth/dto/auth.dto.ts (los dos DTOs en un archivo)
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'ana@mail.com' })
  @Transform(toLowerTrim)
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ example: 'Clave1234' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'La contraseña necesita al menos una mayúscula y un número',
  })
  password: string;
}

export class LoginDto {
  @ApiProperty({ example: 'ana@mail.com' })
  @Transform(toLowerTrim)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Clave1234' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
auth/auth.module.ts
@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      global: true, // el JwtAuthGuard global lo necesita en toda la app
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', { infer: true }) },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
JWT_EXPIRES_IN va en segundos (3600 = 1 hora). Si usas texto como '1d', @nestjs/jwt exige un tipo especial y TypeScript se queja.
auth/auth.service.ts
import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto, RegisterDto } from './dto/auth.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.usersService.findByEmail(dto.email);
    if (exists) throw new ConflictException('El email ya está registrado');

    const password = await hash(dto.password, 10);
    const user = await this.usersService.create({ ...dto, password });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);
    if (!user || !(await compare(dto.password, user.password))) {
      throw new UnauthorizedException('Credenciales inválidas'); // mismo mensaje en ambos casos
    }
    return this.buildAuthResponse(user);
  }

  private async buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    };
  }
}
En el servicio los DTOs sí pueden ir con import type, porque ahí no hay decorador que los lea; en el controller van con import normal.
auth/auth.controller.ts
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
Pruébalo en Postman o Swagger
[ ] POST /api/auth/register → 201 con accessToken.
[ ] El mismo registro otra vez → 409.
[ ] Email inválido o contraseña corta → 400 con la lista de errores.
[ ] Registro con "role": "admin" en el body → 400.
[ ] Login con contraseña mala → 401.
[ ] GET /api/users/me con Authorization: Bearer <token> → 200 y sin password.
[ ] GET /api/users con un usuario normal → 403.
[ ] Commit: feat: auth con JWT, registro, login y roles.
Fase 8 — Módulo plantilla CRUD (products)
Este módulo es tu molde: tiene relación con el usuario, paginación, búsqueda, validación de dueño, soft delete y una transacción. El martes lo copias y renombras para cada entidad del caso.
Receta para cada entidad nueva del caso
1. nest g res <nombre> → REST API → sí a los entry points CRUD.
2. En el UpdateDto, cambia el import de PartialType a @nestjs/swagger.
3. Entidad: extiende AppBaseEntity, columnas, enums, relaciones con Relation<T>.
4. TypeOrmModule.forFeature([Entidad]) en su módulo.
5. DTOs con class-validator + @ApiProperty.
6. Servicio: repositorio, NotFoundException, reglas de negocio del enunciado.
7. Controller: @Auth(...) / @Public(), ParseUUIDPipe, @CurrentUser().
8. Probar en Swagger → test unitario del servicio → commit.
common/dto/pagination.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}
products/entities/product.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { AppBaseEntity } from '../../common/entities/base.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('products')
export class Product extends AppBaseEntity {
  @Index()
  @Column({ length: 120 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Postgres devuelve numeric como texto; el transformer lo vuelve número
  @Column({
    type: 'numeric', precision: 10, scale: 2,
    transformer: { to: (v: number) => v, from: (v: string) => Number(v) },
  })
  price: number;

  @Column({ type: 'int', default: 0 })
  stock: number;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @ManyToOne(() => User, (user) => user.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User>;
}
Y el lado inverso en User:
@OneToMany(() => Product, (product) => product.owner)
products: Relation<Product[]>;
Para ManyToMany (ej. estudiantes y cursos): @ManyToMany(() => Course) + @JoinTable() en un solo lado.
products/dto
// create-product.dto.ts
export class CreateProductDto {
  @ApiProperty({ example: 'Teclado mecánico' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 150000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;
}

// update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
export class UpdateProductDto extends PartialType(CreateProductDto) {}

// query-product.dto.ts
export class QueryProductDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'teclado' })
  @IsOptional()
  @IsString()
  search?: string;
}
products/products.service.ts
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Role } from '../common/enums/role.enum.js';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
import type { CreateProductDto } from './dto/create-product.dto.js';
import type { QueryProductDto } from './dto/query-product.dto.js';
import type { UpdateProductDto } from './dto/update-product.dto.js';
import { Product } from './entities/product.entity.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly productsRepo: Repository<Product>,
    private readonly dataSource: DataSource,
  ) {}

  create(dto: CreateProductDto, ownerId: string) {
    return this.productsRepo.save(this.productsRepo.create({ ...dto, ownerId }));
  }

  async findAll({ page, limit, search }: QueryProductDto) {
    const [items, total] = await this.productsRepo.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const product = await this.productsRepo.findOne({ where: { id }, relations: { owner: true } });
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async update(id: string, dto: UpdateProductDto, user: JwtPayload) {
    const product = await this.findOne(id);
    this.assertOwner(product, user);
    Object.assign(product, dto);
    return this.productsRepo.save(product);
  }

  async remove(id: string, user: JwtPayload) {
    const product = await this.findOne(id);
    this.assertOwner(product, user);
    await this.productsRepo.softDelete(id);
    return { id, deleted: true };
  }

  // Transacción: si algo falla adentro, no se guarda nada
  decreaseStock(id: string, quantity: number) {
    return this.dataSource.transaction(async (manager) => {
      const product = await manager.findOne(Product, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
      if (product.stock < quantity) throw new BadRequestException('Stock insuficiente');
      product.stock -= quantity;
      return manager.save(product);
    });
  }

  private assertOwner(product: Product, user: JwtPayload) {
    if (user.role !== Role.ADMIN && product.ownerId !== user.sub) {
      throw new ForbiddenException('Solo el dueño o un admin puede modificar este producto');
    }
  }
}
products/products.controller.ts
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface.js';
// CreateProductDto, UpdateProductDto y QueryProductDto: import normal

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Auth()
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser('sub') userId: string) {
    return this.productsService.create(dto, userId);
  }

  @Public()
  @Get()
  findAll(@Query() query: QueryProductDto) {
    return this.productsService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Auth()
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.productsService.update(id, dto, user);
  }

  @Auth()
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.productsService.remove(id, user);
  }
}
[ ] Prueba: un usuario crea un producto, otro usuario intenta editarlo → 403; el admin sí puede.
[ ] GET /api/products?page=1&limit=5&search=tec devuelve items y meta.
[ ] Commit: feat: modulo plantilla products.
Fase 9 — Tests unitarios y e2e con Vitest
Los unitarios prueban un servicio con sus dependencias simuladas (mocks); los e2e levantan la app completa contra la base de pruebas del puerto 5434. Lleva listos los de Auth y Products para que el martes solo copies el patrón.
Configuración
[ ] Confirma que existen vitest.config.ts y vitest.config.e2e.ts (los crea nest new en ESM) y los scripts test, test:watch, test:cov y test:e2e en package.json.
[ ] Para cobertura: npm i -D @vitest/coverage-v8 si no viene.
[ ] En vitest.config.e2e.ts, dentro de test, agrega esto para que use .env.test y no corra archivos en paralelo contra la misma base:
env: { NODE_ENV: 'test' },
fileParallelism: false,
hookTimeout: 30000,
Si un test falla con "Nest can't resolve dependencies... at index [0]", el compilador no está emitiendo la metadata de decoradores. Solución: npm i -D unplugin-swc @swc/core y en ambos configs (en el de e2e, con include: ['test/**/*.e2e-spec.ts']):
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, root: './', include: ['src/**/*.spec.ts'] },
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
Unitario: src/auth/auth.service.spec.ts (patrón AAA)
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../common/enums/role.enum.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let service: AuthService;

  const usersService = {
    findByEmail: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    create: vi.fn(),
  };
  const jwtService = { signAsync: vi.fn().mockResolvedValue('token-falso') };
  const dto = { name: 'Ana', email: 'ana@mail.com', password: 'Clave1234' };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe('register', () => {
    it('guarda la contraseña hasheada y devuelve token', async () => {
      // Arrange
      usersService.findByEmail.mockResolvedValue(null);
      usersService.create.mockImplementation(async (data) => ({ id: 'u1', role: Role.USER, ...data }));
      // Act
      const result = await service.register(dto);
      // Assert
      const saved = usersService.create.mock.calls[0][0];
      expect(saved.password).not.toBe(dto.password);
      expect(result.accessToken).toBe('token-falso');
      expect(result.user).not.toHaveProperty('password');
    });

    it('lanza ConflictException si el email ya existe', async () => {
      usersService.findByEmail.mockResolvedValue({ id: 'u1' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('devuelve token con credenciales válidas', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({
        id: 'u1', name: 'Ana', email: dto.email, role: Role.USER,
        password: await hash(dto.password, 4),
      });
      const result = await service.login({ email: dto.email, password: dto.password });
      expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 'u1', email: dto.email, role: Role.USER });
      expect(result.accessToken).toBe('token-falso');
    });

    it('lanza UnauthorizedException si la contraseña no coincide', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue({ id: 'u1', password: await hash('Otra1234', 4) });
      await expect(service.login({ email: dto.email, password: dto.password }))
        .rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);
      await expect(service.login({ email: dto.email, password: dto.password }))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
Unitario con repositorio simulado: src/products/products.service.spec.ts
const repo = {
  findOne: vi.fn(),
  findAndCount: vi.fn(),
  save: vi.fn(),
  create: vi.fn((data) => data),
  softDelete: vi.fn(),
};

const moduleRef = await Test.createTestingModule({
  providers: [
    ProductsService,
    { provide: getRepositoryToken(Product), useValue: repo }, // de @nestjs/typeorm
    { provide: DataSource, useValue: {} },
  ],
}).compile();
Casos mínimos que conviene cubrir:
• findOne con repo.findOne devolviendo null → NotFoundException.
• update por un usuario que no es dueño ni admin → ForbiddenException y repo.save no se llama.
• update por el admin → repo.save se llama con los cambios.
• findAll con page: 2, limit: 5 → findAndCount recibe skip: 5, take: 5.
E2E: test/auth.e2e-spec.ts
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let token: string;
  const user = { name: 'Test', email: 'test@mail.com', password: 'Clave1234' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app); // misma configuración que main.ts
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra un usuario → 201', async () => {
    const res = await request(app.getHttpServer()).post('/api/auth/register').send(user).expect(201);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('rechaza email duplicado → 409', () =>
    request(app.getHttpServer()).post('/api/auth/register').send(user).expect(409));

  it('rechaza campos extra como role → 400', () =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ ...user, email: 'otro@mail.com', role: 'admin' })
      .expect(400));

  it('hace login → 200 con token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    token = res.body.data.accessToken;
  });

  it('GET /api/users/me sin token → 401', () =>
    request(app.getHttpServer()).get('/api/users/me').expect(401));

  it('GET /api/users/me con token → 200', () =>
    request(app.getHttpServer()).get('/api/users/me').set('Authorization', `Bearer ${token}`).expect(200));

  it('GET /api/users con rol user → 403', () =>
    request(app.getHttpServer()).get('/api/users').set('Authorization', `Bearer ${token}`).expect(403));
});
Checklist
[ ] npm run test en verde.
[ ] docker compose up -d y luego npm run test:e2e en verde.
[ ] npm run test:cov y revisa que auth.service y products.service tengan buena cobertura.
[ ] Commit: test: unitarios y e2e de auth y products.
Fase 10 — Seed, README, checklist final y plan del martes
Seed del admin: src/database/seed.service.ts
Crea el admin al arrancar si no existe, usando ADMIN_EMAIL y ADMIN_PASSWORD del .env.
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash } from 'bcryptjs';
import { Role } from '../common/enums/role.enum.js';
import type { Env } from '../config/env.schema.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap() {
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    if (await this.usersService.findByEmail(email)) return;

    await this.usersService.create({
      name: 'Administrador',
      email,
      password: await hash(this.config.get('ADMIN_PASSWORD', { infer: true }), 10),
      role: Role.ADMIN,
    });
    this.logger.log(`Admin creado: ${email}`);
  }
}
database.module.ts: imports: [UsersModule], providers: [SeedService]. Se usa OnApplicationBootstrap y no OnModuleInit porque en ese momento TypeORM ya creó las tablas.
[ ] Login con el admin → GET /api/users responde 200.
README.md (secciones mínimas)
1. Descripción del caso y stack (NestJS 12, TypeORM, PostgreSQL, Docker, JWT, Vitest).
2. Requisitos: Node 24, Docker.
3. Instalación: clonar → cp .env.example .env → docker compose up -d → npm i → npm run start:dev.
4. Documentación: Swagger en /docs.
5. Credenciales del admin del seed.
6. Tests: npm run test, npm run test:e2e, npm run test:cov.
7. Estructura de carpetas y decisiones (guard global + @Public(), formato de respuesta, soft delete).
Checklist final antes del martes
[ ] Todo en verde: npm run build, npm run test, npm run test:e2e.
[ ] Push a GitHub y etiqueta: git tag base-v1 y git push --tags.
[ ] Simula el día: clona el repo en una carpeta nueva, sigue tu README desde cero y verifica que todo levante.
[ ] Pregunta mañana: ¿se usa tu portátil o un equipo de Riwi? ¿hay internet, se permite documentación o IA? ¿cómo se entrega (repo, rama, zip)?
[ ] Si es en otro equipo, verifica que tenga Node 24 y Docker, o lleva todo instalado en tu portátil.
[ ] Ten abierta esta guía o una nota con la receta de la Fase 8.
Plan para las 8 horas
Tiempo
Qué hacer
0:00 – 0:30
Lee el enunciado dos veces. Subraya entidades, relaciones, roles, reglas de negocio y endpoints. Dibuja el modelo entidad-relación en papel.
0:30 – 1:00
Enums y entidades con relaciones. Levanta la app y revisa que las tablas existan. Commit.
1:00 – 3:30
Por cada entidad: DTOs → servicio → controller → prueba en Swagger → commit. Empieza por la entidad de la que dependen las demás.
3:30 – 4:30
Reglas de negocio difíciles: transacciones, validaciones cruzadas, permisos por rol o por dueño.
4:30 – 6:00
Tests unitarios de los servicios con reglas de negocio + e2e del flujo principal.
6:00 – 7:00
Decoradores de Swagger, README actualizado, datos de ejemplo.
7:00 – 8:00
Colchón para errores. Clonado limpio y entrega.
Si algo te traba más de 20 minutos, haz la versión simple, deja un // TODO y sigue: vale más todo funcionando de punta a punta que una parte perfecta y el resto sin hacer.
Fuentes
• Guía de migración a NestJS 12 — ESM, Vitest por defecto, Zod nativo, config con Standard Schema.
• Release NestJS v12.0.0
• Documentación de Pipes — StandardSchemaValidationPipe y ZodValidationPipe.
• Migración a Nest 11 — comodines {*splat} en middleware.
• Receta SWC + Vitest