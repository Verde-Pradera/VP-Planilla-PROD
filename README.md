# VP-Planilla

Sistema de planilla (nómina) para Costa Rica. Maneja empleados, períodos de planilla, cálculo de horas y horas extra según ley laboral costarricense, deducciones CCSS, y generación de reportes oficiales.

**Stack:** Express 5 + TypeScript + Prisma + PostgreSQL · Next.js 15 + React 19 + Tailwind 4  
**Producción:** Render (backend) · Vercel (frontend) · Supabase (base de datos)

---

## Índice

1. [Primera vez (onboarding)](#1-primera-vez-onboarding)
2. [Archivos que necesitás recibir](#2-archivos-que-necesitás-recibir)
3. [Modos de base de datos](#3-modos-de-base-de-datos)
4. [Día a día](#4-día-a-día)
5. [Implementar una feature](#5-implementar-una-feature)
6. [Solucionar un bug](#6-solucionar-un-bug)
7. [Hotfix (bug crítico en producción)](#7-hotfix-bug-crítico-en-producción)
8. [Flujo de PR](#8-flujo-de-pr)
9. [Pipeline CI/CD](#9-pipeline-cicd)
10. [Comandos de referencia](#10-comandos-de-referencia)

---

## 1. Primera vez (onboarding)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Node.js 22](https://nodejs.org/)
- [pnpm 11](https://pnpm.io/installation)

### Setup

```bash
# 1. Clonar el repo
git clone https://github.com/AleLeonMarin/VP-Planilla.git
cd VP-Planilla

# 2. Colocar los archivos de entorno (ver sección 2)
#    src/backend/.env.docker
#    src/backend/.env.supabase

# 3. Levantar el stack completo con datos de prueba
pnpm db:refresh
```

Cuando termine verás en los logs:

```
Seed completado.
  Usuarios de prueba:
    admin / Admin1234!  (rol: admin)
    mgonzalez / User1234!  (rol: user)
```

La app queda disponible en:

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| DB (Postgres) | localhost:5432 |

---

## 2. Archivos que necesitás recibir

Estos archivos tienen credenciales reales y **nunca están en el repo**. Pedíselos al equipo por un canal seguro.

| Archivo | Para qué |
|---|---|
| `src/backend/.env.docker` | Conectar el backend local a Docker |
| `src/backend/.env.supabase` | Conectar el backend local a Supabase (producción) |

Una vez que los tenés, copiá el que necesitás a `.env`:

```bash
cd src/backend
cp .env.docker .env      # → Docker local
cp .env.supabase .env    # → Supabase
```

O usá los scripts (ver sección 3).

---

## 3. Modos de base de datos

El backend puede conectarse a dos bases distintas. El frontend siempre apunta al backend local — no cambia.

### Comandos (desde `src/backend/`)

```bash
pnpm db:local      # conectar a Docker local (localhost:5432)
pnpm db:supabase   # conectar a Supabase (producción)
pnpm db:status     # ver a cuál estás conectado ahora
```

### Cuándo usar cada uno

| Situación | Base de datos |
|---|---|
| Desarrollo normal, features nuevas | `db:local` |
| Reproducir un bug con datos reales | `db:supabase` |
| Investigar el estado de producción | `db:supabase` |
| Antes de hacer un PR | `db:local` |

> **Atención:** con `db:supabase` cualquier acción que hagas (crear, editar, borrar) afecta datos reales de producción.

### Resetear la DB local

```bash
pnpm db:refresh   # borra el volumen Docker y vuelve a crear con seed data
```

Útil cuando ensuciaste la DB local probando cosas, o cuando el schema cambió y necesitás re-migrar desde cero.

---

## 4. Día a día

### Opción A — Todo en Docker (más simple)

```bash
docker compose up          # levanta postgres + backend + frontend
```

Hot-reload activo: los cambios en `src/backend/src/` y `src/frontend/src/` se reflejan solos sin rebuild.

### Opción B — Solo la DB en Docker, código local (más rápido)

```bash
# Terminal 1
docker compose up postgres -d

# Terminal 2
cd src/backend && pnpm db:local && pnpm dev

# Terminal 3
cd src/frontend && pnpm dev
```

Esta opción tiene hot-reload más rápido y permite usar debugger con breakpoints directamente.

### Verificar antes de pushear

```bash
# Backend
cd src/backend
npx tsc --noEmit   # type check
pnpm test          # tests

# Frontend
cd src/frontend
npx tsc --noEmit   # type check
npx next lint      # lint
```

---

## 5. Implementar una feature

```bash
# 1. Partir siempre de develop actualizado
git checkout develop
git pull origin develop
git checkout -b feature/nombre-descriptivo

# 2. Levantar el stack
docker compose up

# 3. Desarrollar
#    - Cambios con hot-reload automático
#    - Correr tests cuando sea relevante: cd src/backend && pnpm test

# 4. Verificar antes del PR
cd src/backend && npx tsc --noEmit && pnpm test
cd src/frontend && npx tsc --noEmit && npx next lint

# 5. Commitear y pushear
git add .
git commit -m "feat: descripción de lo que hace"
git push origin feature/nombre-descriptivo

# 6. Abrir PR en GitHub hacia develop
```

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
chore:    mantenimiento, dependencias, configuración
docs:     documentación
test:     agregar o modificar tests
refactor: refactorización sin cambio de comportamiento
```

### Si la feature necesita un cambio de schema

```bash
cd src/backend

# Crear la migración
npx prisma migrate dev --name descripcion-del-cambio

# El archivo nuevo en prisma/migrations/ va al repo
git add prisma/migrations/
git commit -m "chore: migración descripcion-del-cambio"
```

---

## 6. Solucionar un bug

### Flujo para bugs de producción

```bash
# 1. Crear rama desde develop
git checkout develop && git pull origin develop
git checkout -b fix/descripcion-del-bug

# 2. Conectar a Supabase para ver los datos reales y reproducir
cd src/backend
pnpm db:supabase
pnpm dev

# 3. Reproducir el bug con los datos reales
#    Entendés qué pasó, identificás la causa

# 4. Volver a local para implementar el fix sin tocar producción
pnpm db:local

# 5. Implementar el fix, verificar localmente

# 6. Verificar
npx tsc --noEmit && pnpm test

# 7. Commitear y PR hacia develop
git add .
git commit -m "fix: descripción del bug corregido"
git push origin fix/descripcion-del-bug
```

### Flujo para bugs locales (no afectan producción)

```bash
git checkout -b fix/descripcion
# reproducir localmente con Docker
# corregir
# PR hacia develop
```

---

## 7. Hotfix (bug crítico en producción)

Un bug que no puede esperar el flujo normal (feature → develop → main).

```bash
# 1. Partir de main — NO de develop
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-del-bug

# 2. Reproducir con Supabase
cd src/backend && pnpm db:supabase && pnpm dev

# 3. Corregir e implementar fix

# 4. Verificar
cd src/backend && npx tsc --noEmit && pnpm test

# 5. Commitear
git commit -m "fix: descripción del fix crítico"
git push origin hotfix/descripcion-del-bug

# 6. PR directo a main (con revisión rápida del otro dev)

# 7. Después del merge a main, sincronizar develop
git checkout develop
git pull origin develop
git merge hotfix/descripcion-del-bug
git push origin develop

# 8. Limpiar la rama
git branch -d hotfix/descripcion-del-bug
git push origin --delete hotfix/descripcion-del-bug
```

---

## 8. Flujo de PR

### Estructura de ramas

```
hotfix/* ──────────────────────────────────────────────► main
                                                          │
feature/* ──► develop ──────────────────────────────────► main
fix/*     ──►   │                                         │
                │                                         │
              CI corre tests                          CI corre tests
              en cada PR                              en cada PR
                                                          │
                                                          ▼
                                                   Render + Vercel
                                                   despliegan solos
```

### Reglas

- **Nunca push directo** a `develop` ni a `main` — todo entra por PR.
- `feature/*` y `fix/*` siempre van hacia `develop`.
- `hotfix/*` va directo a `main` y después se sincroniza a `develop`.
- Para promover `develop` a `main` se abre un PR de release.

### Proceso de PR

```
1. Push de la rama
2. Abrir PR en GitHub con base correcta (develop o main)
3. GitHub Actions corre automáticamente:
   - Type check + tests + build del backend
   - Tests + build del frontend
4. Si el CI pasa → el otro dev revisa y aprueba
5. Merge
```

### PR de release (develop → main)

```bash
# Verificar develop localmente antes del PR
git checkout develop && git pull origin develop
docker compose up   # probar el flujo completo manualmente

# Abrir PR en GitHub
# Base: main ← Compare: develop
# Título: "Release vX.X — descripción de los cambios"
```

Después del merge a main, Render y Vercel despliegan solos.

---

## 9. Pipeline CI/CD

El CI corre automáticamente en cada PR. Nunca toca Supabase — usa una Postgres efímera.

### Qué valida

| Job | Qué hace |
|---|---|
| `test-backend` | Instala deps → genera Prisma client → migra → tests → build |
| `test-frontend` | Instala deps → tests → build |

Los dos jobs corren en **paralelo**.

### Diferencia entre PR a develop y PR a main

| | PR → develop | PR → main |
|---|---|---|
| `NEXT_PUBLIC_API_URL` en build | `localhost:3001` | URL real de producción (Render) |

### Si el CI falla

El merge queda bloqueado hasta que el CI pase. Revisá los logs en la tab "Actions" del PR en GitHub.

---

## 10. Comandos de referencia

### Docker

```bash
pnpm db:refresh                            # reset completo con seed data
docker compose up                          # levantar todo
docker compose up postgres -d              # solo la DB en background
docker compose down                        # apagar
docker compose down -v                     # apagar y borrar volúmenes (reset DB)
docker compose logs -f backend             # logs del backend
docker compose logs -f frontend            # logs del frontend
```

### Base de datos (desde src/backend/)

```bash
pnpm db:local                              # apuntar a Docker local
pnpm db:supabase                           # apuntar a Supabase
pnpm db:status                             # ver conexión actual

npx prisma migrate dev --name nombre       # crear migración nueva
npx prisma studio                          # explorador visual de la DB
```

### Verificación (antes de pushear)

```bash
# Backend
cd src/backend
npx tsc --noEmit
pnpm test
pnpm build

# Frontend
cd src/frontend
npx tsc --noEmit
npx next lint
pnpm build
```

### Git

```bash
git checkout develop && git pull origin develop
git checkout -b feature/nombre
git add . && git commit -m "feat: descripción"
git push origin feature/nombre

git branch --merged develop | grep -v "develop\|main" | xargs git branch -d
```

### Datos de prueba (DB local)

| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `Admin1234!` | Administrador |
| `mgonzalez` | `User1234!` | Usuario |

La DB local incluye 7 empleados, 5 puestos, 2 tipos de planilla, feriados 2026, CCSS y parámetros legales de Costa Rica.

---

## Arquitectura

```
Backend:   Route → Controller → Service → Prisma (PostgreSQL)
Frontend:  Page → Hook → Service → http.ts → Backend API
```

```
src/
├── backend/
│   ├── src/
│   │   ├── controller/    # parsea req/res, delega al service
│   │   ├── service/       # toda la lógica de negocio
│   │   ├── routes/        # Express Router + asyncHandler
│   │   ├── middleware/     # AuthMiddleware, queryNormalizer
│   │   ├── model/         # interfaces TypeScript (sin lógica)
│   │   └── utils/         # payrollUtils, asyncHandler, docs
│   └── prisma/            # schema + migraciones
└── frontend/
    └── src/
        ├── app/pages/     # páginas Next.js ("use client")
        ├── hooks/         # useEmployee, usePayroll, etc.
        ├── services/      # llamadas al API via http.ts
        ├── components/    # componentes reutilizables
        └── schemas/       # validación Zod
```

Para el detalle completo del gitflow, protección de ramas, Render/Vercel, rollbacks y Sentry ver [`vp-planilla-gitflow-produccion.md`](./vp-planilla-gitflow-produccion.md).

---

*Kendall Fonseca · Alejandro León — Ingeniería en Sistemas 2026*
