# VP-Planilla — Guía Completa de GitFlow y Despliegue a Producción

> Documento de referencia para el equipo: Kendall Fonseca & Alejandro León Marín  
> Flujo adoptado: `feature → develop → main`  
> Stack: Next.js + Express + Prisma + Supabase + Vercel + Render + Docker

---

## Índice

1. [Arquitectura del flujo](#1-arquitectura-del-flujo)
2. [Configuración de la Organización en GitHub](#2-configuración-de-la-organización-en-github)
3. [Configuración del Repositorio](#3-configuración-del-repositorio)
4. [Protección de Ramas](#4-protección-de-ramas)
5. [Docker Compose — Entorno Local](#5-docker-compose--entorno-local)
6. [Pipeline CI/CD con GitHub Actions](#6-pipeline-cicd-con-github-actions)
7. [Producción — Vercel y Render](#7-producción--vercel-y-render) *(pendiente)*
8. [Variables de Entorno por Contexto](#8-variables-de-entorno-por-contexto)
9. [Flujo de Trabajo Diario](#9-flujo-de-trabajo-diario)
10. [Trabajando con Agentes (Claude Code)](#10-trabajando-con-agentes-claude-code)
11. [Manejo de Hotfixes](#11-manejo-de-hotfixes)
12. [Sentry — Monitoreo de Errores](#12-sentry--monitoreo-de-errores)
13. [Checklist Pre-Producción](#13-checklist-pre-producción)
14. [Rollback y Recuperación](#14-rollback-y-recuperación)
15. [Comandos de Referencia Rápida](#15-comandos-de-referencia-rápida)

---

## 1. Arquitectura del flujo

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUJO COMPLETO VP-PLANILLA                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   LOCAL (Docker Compose)          GITHUB              PRODUCCIÓN    │
│   ──────────────────────          ──────              ──────────    │
│                                                                      │
│   frontend  :3000                 Actions corre       Vercel        │
│   backend   :3001    ──push──►    tests en cada  ──►  (solo main)   │
│   postgres  :5432                 PR                               │
│                                                                      │
│                                                       Render        │
│                                                       (solo main)   │
│                                                                      │
│                                                       Supabase      │
│                                                       (producción)  │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   feature/xyz ──PR──► develop ──PR──► main                         │
│       │                  │              │                           │
│   Docker local       CI tests       CI tests                        │
│   toda la prueba     pasan           pasan                          │
│   ocurre aquí            │              │                           │
│                     merge ok       merge ok                         │
│                                        │                            │
│                                        ▼                            │
│                                   Vercel + Render                   │
│                                   despliegan solos                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Principios del flujo

- **Docker Compose** es el único entorno de desarrollo. Todo se prueba aquí antes de cualquier push.
- **GitHub Actions** valida que los tests pasen antes de permitir cualquier merge.
- **Vercel** solo despliega desde `main`. Ninguna otra rama genera un deploy.
- **Render** solo escucha `main`. El backend de producción nunca cambia por pushes a `develop` o `feature/*`.
- Nunca se hace push directo a `develop` ni a `main`. Todo entra por Pull Request.

---

## 2. Configuración de la Organización en GitHub

### Por qué una organización

El código no debe vivir en una cuenta personal. Una organización en GitHub permite:
- Propiedad del código independiente de cualquier persona
- Gestión de permisos por roles
- El cliente puede ser dueño de la org si así se acuerda
- Se ve profesional en todas las integraciones (Vercel, Render, etc.)

### Crear la organización

```
1. github.com → tu avatar → "Your organizations" → "New organization"
2. Plan: Free
3. Nombre: verde-pradera  (o el nombre acordado con el cliente)
4. Contact email: email del proyecto
5. Confirmar creación
```

### Transferir el repositorio existente

```
1. Ir al repo en tu cuenta personal
2. Settings → General → Danger Zone → "Transfer repository"
3. Escribir el nombre del repo para confirmar
4. Seleccionar la organización como destino
5. Confirmar
```

> Los clones locales se redirigen automáticamente. No necesitas cambiar nada en tu máquina.

### Configurar miembros

```
Organización → People → Invite member

- Kendall Fonseca   → Owner
- Alejandro León    → Member

Dentro del repo:
Repo → Settings → Collaborators and teams → Add people
- Alejandro León → Maintainer
```

---

## 3. Configuración del Repositorio

### Crear las ramas base

```bash
# Partir de main actualizado
git checkout main
git pull origin main

# Crear develop
git checkout -b develop
git push origin develop
```

A partir de aquí, `develop` es la rama de integración. Todo trabajo nuevo parte de `develop`.

### Estructura del repositorio

```
vp-planilla/
├── .github/
│   └── workflows/
│       ├── ci-reusable.yml      ← workflow compartido (reutilizable)
│       ├── ci-develop.yml       ← CI para PRs hacia develop
│       └── ci-main.yml          ← CI para PRs hacia main
├── src/
│   ├── backend/
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile.dev
│   │   ├── package.json
│   │   └── .env.example
│   ├── frontend/
│   │   ├── src/
│   │   ├── Dockerfile.dev
│   │   ├── package.json
│   │   └── .env.example
│   └── DB/                      ← scripts de base de datos
├── docker-compose.yml
├── .gitignore
└── README.md
```

### .gitignore

```gitignore
# Entornos — NUNCA commitear
.env
.env.local
.env.production
.env.staging
.env*.local

# Dependencias
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
.next/
out/
build/

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# OS
.DS_Store
Thumbs.db

# Editor
.vscode/settings.json
.idea/

# Docker
.docker/

# Prisma — NO ignorar migrations/, sí commitearlas
```

### Archivos .env.example

Estos SÍ se commitean — documentan qué variables necesita cada servicio.

`src/backend/.env.example`:
```env
# ─── Core ────────────────────────────────────────────────────────────────────
NODE_ENV="development"
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/vp_planilla_dev"

# ─── JWT ─────────────────────────────────────────────────────────────────────
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="cambiar-en-produccion"
JWT_EXPIRES_IN="1d"
JWT_REFRESH_SECRET="cambiar-en-produccion-diferente-al-jwt-secret"
JWT_REFRESH_EXPIRES_IN="15d"

# ─── CORS ────────────────────────────────────────────────────────────────────
# Lista separada por comas
ALLOWED_ORIGINS="http://localhost:3000"

# ─── Email ───────────────────────────────────────────────────────────────────
# Opción A: Resend (recomendado para producción)
RESEND_API_KEY=""

# Opción B: SMTP genérico
SMTP_HOST=""
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM=""
SMTP_SECURE=false
SMTP_TLS=false

# ─── Reportes ────────────────────────────────────────────────────────────────
REPORTS_OUTPUT_DIR=""
REPORTS_ENTERPRISE_NAME="VP-Planillas"
REPORTS_ENTERPRISE_TAX_ID=""

# ─── Sentry ───────────────────────────────────────────────────────────────────
# Obtener en: sentry.io → Project Settings → Client Keys (DSN)
# Dejar vacío en desarrollo local si no se quiere reportar errores a Sentry.
SENTRY_DSN=""
```

`src/frontend/.env.example`:
```env
# ─── API ─────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_API_URL="http://localhost:3001"

# ─── OpenWeather ──────────────────────────────────────────────────────────────
# Obtener en: openweathermap.org → API keys
NEXT_PUBLIC_OPENWEATHER_API_KEY=""

# ─── Sentry ───────────────────────────────────────────────────────────────────
# Obtener en: sentry.io → Project Settings → Client Keys (DSN)
# Dejar vacío en desarrollo local si no se quiere reportar errores a Sentry.
NEXT_PUBLIC_SENTRY_DSN=""
```

---

## 4. Protección de Ramas

Evita que alguien — incluyendo tú mismo — haga push directo a `main` o `develop`.

### Proteger `main`

```
Repo → Settings → Branches → Add branch ruleset

Nombre: protect-main
Target: main

☑ Restrict creations
☑ Restrict deletions
☑ Require a pull request before merging
   → Required approvals: 1
☑ Require status checks to pass
   → Agregar: "test-backend" y "test-frontend"
☑ Block force pushes
```

### Proteger `develop`

```
Repo → Settings → Branches → Add branch ruleset

Nombre: protect-develop
Target: develop

☑ Restrict deletions
☑ Require a pull request before merging
   → Required approvals: 1
☑ Require status checks to pass
   → Agregar: "test-backend" y "test-frontend"
☑ Block force pushes
```

Con esto activo, el único camino válido es:

```
feature/* → PR → develop → PR → main
```

---

## 5. Docker Compose — Entorno Local

Todo el desarrollo ocurre aquí. Docker levanta frontend, backend y base de datos de forma idéntica a producción.

### docker-compose.yml

En la raíz del repo:

```yaml
services:

  postgres:
    image: postgres:16-alpine
    container_name: vp-planilla-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: vp_user
      POSTGRES_PASSWORD: vp_password
      POSTGRES_DB: vp_planilla_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U vp_user -d vp_planilla_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile.dev
    container_name: vp-planilla-backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: "postgresql://vp_user:vp_password@postgres:5432/vp_planilla_dev"
      JWT_SECRET: "dev-secret-local"
      JWT_EXPIRES_IN: "1d"
      JWT_REFRESH_SECRET: "dev-refresh-secret-local"
      JWT_REFRESH_EXPIRES_IN: "15d"
      ALLOWED_ORIGINS: "http://localhost:3000"
      NODE_ENV: "development"
      PORT: 3001
    volumes:
      - ./src/backend/src:/app/src
      - ./src/backend/prisma:/app/prisma
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "pnpm prisma migrate deploy && pnpm dev"

  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile.dev
    container_name: vp-planilla-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: "http://localhost:3001"
      NODE_ENV: "development"
    volumes:
      - ./src/frontend/src:/app/src
      - /app/node_modules
    depends_on:
      - backend

volumes:
  postgres_data:
```

### src/backend/Dockerfile.dev

```dockerfile
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY prisma ./prisma
RUN pnpm prisma generate

COPY . .

EXPOSE 3001
```

### src/frontend/Dockerfile.dev

```dockerfile
FROM node:22-alpine

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install

COPY . .

EXPOSE 3000
```

### Comandos de Docker

```bash
# Levantar todo el stack
docker compose up

# Levantar en background (sin ver logs)
docker compose up -d

# Ver logs de un servicio
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Apagar todo
docker compose down

# Apagar y borrar la base de datos (reset completo)
docker compose down -v

# Correr una migración nueva
docker compose exec backend pnpm prisma migrate dev --name nombre-migracion

# Abrir Prisma Studio
docker compose exec backend pnpm prisma studio

# Correr tests dentro del contenedor
docker compose exec backend pnpm test

# Entrar al contenedor del backend
docker compose exec backend sh
```

### Cómo se relaciona Docker con las ramas de Git

Docker no está conectado a ninguna rama. Simplemente corre el código que tienes en tu carpeta local en ese momento.

```bash
# Trabajando en una feature
git checkout feature/qr-attendance
docker compose up        # corre el código de feature/qr-attendance

# Revisando develop antes de un PR a main
git checkout develop
docker compose up        # corre el código de develop
```

Docker es una herramienta de tu máquina. Git es el control del código. Son independientes y se complementan.

---

## 6. Pipeline CI/CD con GitHub Actions

GitHub Actions valida que los tests pasen antes de permitir cualquier merge. Usa su propia instancia de Postgres efímera — no toca Supabase de producción.

Los tres archivos comparten la lógica de tests: `ci-reusable.yml` contiene todo el trabajo real; `ci-develop.yml` y `ci-main.yml` son disparadores que lo llaman.

### ci-reusable.yml

`.github/workflows/ci-reusable.yml`:

```yaml
name: CI — Reusable

on:
  workflow_call:
    inputs:
      frontend_api_url:
        description: 'NEXT_PUBLIC_API_URL para el build del frontend'
        required: false
        type: string
        default: 'http://localhost:3001'

jobs:
  test-backend:
    name: test-backend
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: vp_user
          POSTGRES_PASSWORD: vp_password
          POSTGRES_DB: vp_planilla_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    defaults:
      run:
        working-directory: ./src/backend

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: src/backend/pnpm-lock.yaml

      - name: Instalar dependencias
        run: pnpm install

      - name: Generar cliente Prisma
        run: pnpm prisma generate

      - name: Correr migraciones
        run: pnpm prisma migrate deploy
        env:
          DATABASE_URL: "postgresql://vp_user:vp_password@localhost:5432/vp_planilla_test"

      - name: Correr tests
        run: pnpm test
        env:
          DATABASE_URL: "postgresql://vp_user:vp_password@localhost:5432/vp_planilla_test"
          JWT_SECRET: "ci-test-secret"
          JWT_REFRESH_SECRET: "ci-refresh-test-secret"
          NODE_ENV: test

      - name: Build
        run: pnpm build

  test-frontend:
    name: test-frontend
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: ./src/frontend

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
          cache-dependency-path: src/frontend/pnpm-lock.yaml

      - name: Instalar dependencias
        run: pnpm install

      - name: Correr tests
        run: pnpm test
        env:
          NEXT_PUBLIC_API_URL: "http://localhost:3001"

      - name: Build
        run: pnpm build
        env:
          NEXT_PUBLIC_API_URL: ${{ inputs.frontend_api_url }}
```

### ci-develop.yml

`.github/workflows/ci-develop.yml`:

```yaml
name: CI — develop

on:
  pull_request:
    branches: [develop]

jobs:
  ci:
    uses: ./.github/workflows/ci-reusable.yml
```

### ci-main.yml

`.github/workflows/ci-main.yml`:

```yaml
name: CI — main (producción)

on:
  pull_request:
    branches: [main]

jobs:
  ci:
    uses: ./.github/workflows/ci-reusable.yml
    with:
      frontend_api_url: ${{ vars.PROD_API_URL }}
```

### Variables en GitHub Actions

```
Repo → Settings → Variables → Actions → New repository variable

PROD_API_URL    → https://api.tudominio.com
```

> Se usa `vars` (no `secrets`) porque la URL del API no es un dato sensible — ya es pública una vez que el dominio está activo.

Los tests usan Postgres efímera directamente — no necesitan credenciales de Supabase.

---

## 7. Producción — Vercel y Render

> ⚠️ **PENDIENTE DE IMPLEMENTAR** — Los servicios de esta sección aún no están configurados. Este bloque es el blueprint a seguir antes del primer deploy real.

### Vercel — Solo main

```
1. Crear cuenta en vercel.com con la cuenta de GitHub de la organización
2. Add New Project → importar repo desde la organización
3. Root Directory: src/frontend
4. Vercel detecta Next.js automáticamente
5. En Settings → Git → desactivar deploys de otras ramas:

   Settings → Git → "Ignored Build Step"
   Agregar este comando:
   if [ "$VERCEL_GIT_COMMIT_REF" != "main" ]; then exit 0; fi

   (exit 0 = cancelar el build en la lógica de Vercel — es correcto aunque parezca invertido)

6. Variables de entorno en Settings → Environment Variables:
   NEXT_PUBLIC_API_URL        = https://api.tudominio.com   → solo Production
   NEXT_PUBLIC_SENTRY_DSN     = dsn del proyecto frontend   → solo Production
   NEXT_PUBLIC_OPENWEATHER_API_KEY = clave de OpenWeather   → solo Production

7. Dominio en Settings → Domains:
   Agregar tudominio.com
   Vercel entrega los registros DNS a configurar en name.com
```

### Render — Solo main

```
1. Crear cuenta en render.com con GitHub de la organización
2. New → Web Service → conectar repo
3. Root Directory: src/backend
4. Configuración:
   Name:          vp-planilla-api
   Branch:        main
   Build Command: pnpm install && pnpm prisma generate
   Start Command: pnpm prisma migrate deploy && pnpm start

5. Variables de entorno:
   DATABASE_URL            → connection string Supabase (puerto 6543, pooler)
   JWT_SECRET              → secret seguro generado con crypto
   JWT_EXPIRES_IN          → 1d
   JWT_REFRESH_SECRET      → secret distinto al JWT_SECRET
   JWT_REFRESH_EXPIRES_IN  → 15d
   ALLOWED_ORIGINS         → https://tudominio.com
   RESEND_API_KEY          → clave de Resend (o configurar SMTP_*)
   SENTRY_DSN              → dsn del proyecto backend
   REPORTS_ENTERPRISE_NAME → nombre de la empresa
   REPORTS_ENTERPRISE_TAX_ID → cédula jurídica
   NODE_ENV                → production
   PORT                    → 3001
```

### UptimeRobot — Evitar cold starts

```
1. Crear cuenta en uptimerobot.com
2. Add New Monitor:
   Type:     HTTP(s)
   URL:      https://api.tudominio.com/health
   Interval: 14 minutos
```

Agregar el endpoint en Express si aún no existe:

```typescript
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

> Render (plan free) duerme el servicio tras 15 minutos de inactividad. 14 minutos garantiza que nunca llegue a ese punto.

### DNS en name.com

```
Tipo    Nombre    Valor
A       @         76.76.21.21          ← IP de Vercel
CNAME   www       cname.vercel-dns.com
CNAME   api       vp-planilla-api.onrender.com
```

SSL se activa solo en Vercel y Render. No hay nada que configurar.

---

## 8. Variables de Entorno por Contexto

| Variable | Local (Docker) | CI (Actions) | Producción |
|---|---|---|---|
| `DATABASE_URL` | postgres:5432 (Docker) | localhost:5432 (efímera) | Supabase :6543 (pooler) |
| `JWT_SECRET` | dev-secret-local | ci-test-secret | secret aleatorio seguro |
| `JWT_REFRESH_SECRET` | dev-refresh-secret-local | ci-refresh-test-secret | secret distinto al JWT_SECRET |
| `NODE_ENV` | development | test | production |
| `ALLOWED_ORIGINS` | http://localhost:3000 | — | https://tudominio.com |
| `NEXT_PUBLIC_API_URL` | http://localhost:3001 | http://localhost:3001 | https://api.tudominio.com |
| `SENTRY_DSN` | vacío | — | DSN de producción |
| `NEXT_PUBLIC_SENTRY_DSN` | vacío | — | DSN de producción |

### Generar un secret seguro para producción

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Generar uno para `JWT_SECRET` y otro distinto para `JWT_REFRESH_SECRET`.

---

## 9. Flujo de Trabajo Diario

### Inicio de una funcionalidad

```bash
# Siempre partir de develop actualizado
git checkout develop
git pull origin develop

# Crear la rama
git checkout -b feature/nombre-descriptivo

# Levantar el stack local
docker compose up
```

### Desarrollar y probar

```bash
# El stack corre en:
# frontend → localhost:3000
# backend  → localhost:3001
# postgres → localhost:5432

# Hot reload activo — los cambios se reflejan solos

# Cuando quieras correr los tests
docker compose exec backend pnpm test
```

### Convención de commits

```
feat:     nueva funcionalidad
fix:      corrección de bug
chore:    mantenimiento, dependencias
docs:     documentación
test:     agregar o modificar tests
refactor: refactorización sin cambio de comportamiento
perf:     mejora de rendimiento
```

```bash
git add .
git commit -m "feat: implementar rotación de QR tokens cada 3 minutos"
git commit -m "fix: corregir cálculo de horas extra en feriados nacionales"
```

### PR hacia develop

```bash
git push origin feature/nombre-descriptivo
# GitHub muestra el link para crear el PR automáticamente

# En GitHub:
# Base: develop ← Compare: feature/nombre-descriptivo
# GitHub Actions corre los tests
# El otro miembro revisa y aprueba
# Merge
```

### Revisión antes de promover a main

```bash
# Después del merge a develop, revisar localmente
git checkout develop
git pull origin develop
docker compose up

# Probar el flujo completo manualmente
# Si todo bien → PR develop → main
```

### PR hacia main

```bash
# En GitHub:
# Base: main ← Compare: develop
# Título: "Release — descripción de los cambios"
# GitHub Actions corre los tests de nuevo
# Aprobación → merge → Vercel y Render despliegan solos
```

---

## 10. Trabajando con Agentes (Claude Code)

El agente trabaja siempre dentro de una `feature branch`. Nunca en `develop` ni `main` directamente.

### Inicio de sesión

```bash
# Verificar la rama antes de abrir Claude Code
git checkout develop
git pull origin develop
git checkout -b feature/nombre-de-lo-que-hara-el-agente

# Levantar Docker si vas a probar mientras el agente trabaja
docker compose up -d

# Abrir Claude Code
claude
```

### Instrucción inicial para el agente

```
Estamos en la rama feature/nombre, partiendo de develop actualizado.
Lee STATE.md, ROADMAP.md y PROJECT.md antes de comenzar.
No hagas commits a develop ni main directamente.
Todos los cambios van en esta rama.
Objetivo de esta sesión: [descripción concreta]
```

### Al terminar la sesión del agente

```bash
# Revisar qué cambió
git status
git diff

# Correr los tests para verificar
docker compose exec backend pnpm test

# Si todo está bien
git add .
git commit -m "feat: descripción de lo implementado"
git push origin feature/nombre

# Abrir PR hacia develop en GitHub
```

### Reglas para trabajo con agentes

```
✅ El agente trabaja siempre en feature branches
✅ Revisar los cambios antes de hacer commit
✅ Correr los tests localmente antes de pushear
✅ Usar /compact cuando el contexto se sature
✅ Dar siempre el contexto de rama al inicio

❌ No dejar que el agente pushee a develop sin revisión humana
❌ No dejar que el agente modifique archivos de CI/CD sin revisión
❌ No iniciar una sesión sin saber en qué rama estás
```

---

## 11. Manejo de Hotfixes

Un bug crítico en producción que no puede esperar el flujo normal.

```bash
# 1. Partir de main actualizado
git checkout main
git pull origin main
git checkout -b hotfix/descripcion-del-bug

# 2. Levantar Docker para reproducir y corregir el bug
docker compose up

# 3. Corregir y commitear
git commit -m "fix: corregir cálculo incorrecto de CCSS en período quincenal"

# 4. PR directo hacia main (con revisión rápida)
git push origin hotfix/descripcion-del-bug

# 5. Después del merge a main, sincronizar develop
git checkout develop
git pull origin develop
git merge hotfix/descripcion-del-bug
git push origin develop

# 6. Eliminar la rama
git branch -d hotfix/descripcion-del-bug
git push origin --delete hotfix/descripcion-del-bug
```

El hotfix es el único caso donde se abre PR directo a `main`. Siempre con PR, nunca push directo.

---

## 12. Sentry — Monitoreo de Errores

El proyecto ya tiene Sentry integrado en ambos servicios:
- **Backend**: `src/backend/instrument.js` (cargado con `--import` en dev y start)
- **Frontend**: `src/frontend/src/instrumentation.ts` (Next.js instrumentation hook)

Sin configurar `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, Sentry simplemente no reporta nada — el código no explota.

### Configuración inicial en sentry.io

```
1. sentry.io → New Project
2. Crear dos proyectos:
   - Platform: Node.js   → Name: vp-planilla-backend
   - Platform: Next.js   → Name: vp-planilla-frontend
3. Copiar el DSN de cada uno:
   Project Settings → Client Keys (DSN)
```

### Variables necesarias por entorno

| Variable | Servicio | Dónde configurar |
|---|---|---|
| `SENTRY_DSN` | Backend | Render → Environment Variables |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend | Vercel → Environment Variables → Production |

En desarrollo local (`.env`), dejar vacías para no enviar errores locales a Sentry:

```env
# src/backend/.env
SENTRY_DSN=""

# src/frontend/.env.local
NEXT_PUBLIC_SENTRY_DSN=""
```

### Environments

Sentry separa los errores por ambiente basándose en `NODE_ENV`. Configurar alertas solo para `production` para no recibir ruido de los pipelines de CI.

```
sentry.io → Project Settings → Alerts → crear alerta para environment: production
```

### Ver errores en producción

```
sentry.io → tu organización → vp-planilla-backend → Issues
sentry.io → tu organización → vp-planilla-frontend → Issues
```

---

## 13. Checklist Pre-Producción

### Código

```
☐ Ningún .env commiteado en el historial
  → Verificar: git log --all --full-history -- "**/.env"
☐ Todos los secrets en variables de entorno, no hardcodeados
☐ CORS restringido al dominio de producción (ALLOWED_ORIGINS)
☐ helmet y express-rate-limit instalados y configurados
☐ Manejo de errores no expone stack traces en producción
☐ JWT con expiración definida (JWT_SECRET y JWT_REFRESH_SECRET distintos)
☐ prisma migrate deploy en el start command (nunca migrate dev)
☐ Endpoint GET /api/health que retorne { status: "ok" }
☐ pnpm-lock.yaml commiteado en backend y frontend
☐ .env.example actualizado en src/backend y src/frontend
☐ SENTRY_DSN configurado en Render
☐ NEXT_PUBLIC_SENTRY_DSN configurado en Vercel
```

### GitHub

```
☐ Repo transferido a la organización
☐ Ramas main y develop creadas
☐ Branch protection rules activas en main y develop
☐ Workflows de CI en .github/workflows/ (ci-reusable, ci-develop, ci-main)
☐ Variable PROD_API_URL configurada en el repo
☐ Miembros del equipo con roles correctos
```

### Servicios externos

```
☐ Supabase: proyecto de producción creado
☐ Supabase: connection string usa pooler (puerto 6543)
☐ Render: Web Service con Root Directory = src/backend
☐ Render: rama main, variables de entorno completas
☐ Vercel: Root Directory = src/frontend
☐ Vercel: deploy desactivado para ramas que no sean main
☐ Vercel: variables de entorno de producción configuradas
☐ Vercel: dominio agregado y DNS configurado en name.com
☐ UptimeRobot: monitor apuntando a /api/health cada 14 minutos
☐ Sentry: dos proyectos creados (backend y frontend)
☐ Sentry: alertas configuradas solo para environment production
```

### Antes del primer deploy real

```
☐ docker compose up → todo levanta sin errores
☐ pnpm test → todos los tests pasan localmente (desde src/backend y src/frontend)
☐ pnpm build → sin errores en backend y frontend
☐ Flujo completo probado manualmente en Docker
☐ Backup manual de la DB antes del primer deploy
☐ Acuerdo escrito con el cliente sobre propiedad y mantenimiento
```

---

## 14. Rollback y Recuperación

### Vercel — Rollback del frontend

El rollback en Vercel es instantáneo y no requiere tocar código.

```
1. Vercel Dashboard → tu proyecto → Deployments
2. Buscar el último deployment exitoso
3. Click en los tres puntos → "Promote to Production"
```

O via CLI:

```bash
vercel rollback
```

### Render — Rollback del backend

```
1. Render Dashboard → vp-planilla-api → Events
2. Buscar el deploy anterior exitoso
3. Click en "Redeploy" en ese commit específico
```

Alternativa desde Git si el problema está en el código:

```bash
# Revertir el commit problemático (crea un commit nuevo que deshace el anterior)
git revert HEAD
git push origin main
# Render detecta el push a main y despliega automáticamente
```

> No uses `git reset --hard` en `main`. Render y Vercel reaccionan al push, no al estado local del repo — un reset forzado no ayuda y puede generar inconsistencias.

### Base de datos — Consideraciones

Render ejecuta `pnpm prisma migrate deploy` en el start command. Las migraciones de Prisma **no tienen rollback automático**.

```
⚠️ Una migración destructiva (DROP COLUMN, DROP TABLE) no se puede deshacer
   automáticamente. Si el nuevo código falla, la base ya cambió.
```

Estrategia recomendada:

```
Antes de cualquier deploy con migración:
1. Supabase Dashboard → Database Backups → tomar snapshot manual

Si la migración falla y hay que restaurar:
2. Supabase Dashboard → Backups → Restore to point in time

Para evitar el problema:
3. Diseñar migraciones aditivas primero:
   - Sprint 1: agregar columna nullable (sin romper el código viejo)
   - Sprint 2: rellenar la columna
   - Sprint 3: hacer la columna NOT NULL o eliminar la columna anterior
```

### Git — Revertir un merge a main

```bash
# Ver el historial para identificar el merge a revertir
git log --oneline -10

# Revertir el merge commit (-m 1 mantiene el lado de main)
git revert -m 1 <hash-del-merge>
git push origin main
```

---

## 15. Comandos de Referencia Rápida

### Git

```bash
# Inicio de trabajo
git checkout develop && git pull origin develop
git checkout -b feature/nombre

# Commit
git add .
git commit -m "feat: descripción"

# Push
git push origin feature/nombre

# Sincronizar feature con develop si develop avanzó
git rebase develop

# Ver estado
git branch -a
git log --oneline -10
git status

# Limpiar ramas locales ya mergeadas
git fetch --prune
git branch --merged develop | grep -v "develop\|main" | xargs git branch -d
```

### Docker

```bash
# Stack completo
docker compose up
docker compose up -d
docker compose down
docker compose down -v   # borra la DB también

# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Comandos dentro de contenedores
docker compose exec backend pnpm test
docker compose exec backend pnpm prisma migrate dev --name nombre
docker compose exec backend pnpm prisma studio
docker compose exec backend sh
```

### Tests y typecheck

```bash
# Desde src/backend/
pnpm test
npx tsc --noEmit

# Desde src/frontend/
pnpm test
npx tsc --noEmit
npx next lint
```

---

*VP-Planilla (Verde Pradera Planilla)*  
*Revisado: Mayo 2026*
