# Liga.9

Sistema de administración de torneos de fútbol 9 del colegio.

**Stack:** Next.js 15 (App Router) · TypeScript · Supabase · shadcn/ui · Tailwind CSS

---

## 🚀 Setup inicial

### 1. Requisitos

- **Node.js** 20+ ([nvm](https://github.com/nvm-sh/nvm) recomendado)
- **pnpm** 9+ (`npm i -g pnpm`)
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Cuenta en [Vercel](https://vercel.com) para deploy (opcional al principio)

### 2. Instalar dependencias

```bash
pnpm install
```

### 3. Crear el proyecto en Supabase

1. Entrar a [app.supabase.com](https://app.supabase.com) y crear un proyecto nuevo.
2. Elegí la región más cercana (ej. São Paulo para Argentina).
3. Anotá la contraseña de la DB (la vas a necesitar si querés conectarte con `psql` o la CLI).
4. Esperá ~2 minutos a que el proyecto termine de provisionarse.

### 4. Correr la migración del schema

1. En el dashboard de Supabase, ir a **SQL Editor** → **New query**.
2. Abrir el archivo `supabase/migrations/20260420000001_initial_schema.sql` de este repo.
3. Copiar todo el contenido y pegarlo en el editor de Supabase.
4. Hacer click en **Run** (o `Ctrl+Enter`). Debería ejecutarse sin errores.
5. Verificar en **Table Editor** que aparecen las 15 tablas.

### 5. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Llená con los valores de tu proyecto Supabase (los encontrás en **Settings → API**):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # ⚠️ nunca exponer al cliente
SUPABASE_PROJECT_ID=xxxx
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Generar los tipos de TypeScript desde el schema

```bash
pnpm types:db
```

Esto reemplaza `src/types/database.ts` con los tipos auto-generados reales. El archivo que viene en el repo es un placeholder para que compile antes de este paso.

### 7. Levantar en desarrollo

```bash
pnpm dev
```

Visitar [http://localhost:3000](http://localhost:3000).

### 8. Crear el primer admin

Por defecto todos los registros crean usuarios con rol `player`. Para promover al primer admin:

1. Registrate normalmente en `/register`.
2. En Supabase **SQL Editor**, correr:

```sql
update public.profiles
set role = 'admin'
where email = 'tu@email.com';
```

3. Cerrar sesión y volver a entrar. El middleware ahora te lleva al panel admin.

---

## 📁 Estructura del proyecto

```
liga9/
├── docs/
│   └── 00-architecture.md       ← Leer antes de empezar a codear
├── supabase/
│   └── migrations/
│       └── *.sql                ← Schema y migraciones
├── src/
│   ├── app/                     ← Rutas (App Router)
│   │   ├── (public)/            ← Sin auth: home, fixture, tabla, goleadores
│   │   ├── (auth)/              ← login, register
│   │   ├── (player)/            ← Panel jugador logueado
│   │   └── (admin)/             ← Panel administrador
│   ├── components/
│   │   ├── ui/                  ← shadcn/ui (Button, Input, ...)
│   │   ├── admin/
│   │   ├── player/
│   │   ├── public/
│   │   └── shared/
│   ├── lib/
│   │   ├── supabase/            ← client, server, middleware
│   │   ├── actions/             ← Server actions por dominio
│   │   ├── queries/             ← Queries reutilizables
│   │   └── utils.ts
│   ├── types/
│   │   └── database.ts          ← Generado con `pnpm types:db`
│   └── middleware.ts            ← Protección de rutas
├── .env.local.example
├── tailwind.config.ts
├── tsconfig.json
├── components.json              ← Config shadcn
└── package.json
```

---

## 🎨 Diseño

La estética y paleta están basadas en los mockups validados:

- **Azul marino** (`brand-blue` = `#1e3a8a`) → color primario, institucional
- **Naranja** (`brand-orange` = `#ea580c`) → accent, llamadas a la acción
- **Fraunces** → títulos (serif con carácter editorial)
- **Inter** → cuerpo
- **Anton** → display deportivo (vista pública)
- **JetBrains Mono** → datos y labels

Los mockups originales están en:
- `tournament-admin.jsx` (panel admin)
- `player-app.jsx` (panel jugador)
- `public-view.jsx` (vista pública, mobile-first)

Son tu **referencia visual** al implementar cada pantalla.

---

## 🧱 Agregar componentes shadcn/ui

```bash
pnpm dlx shadcn@latest add card dialog select tabs toast avatar checkbox
```

Los componentes se copian a `src/components/ui/` y podés personalizarlos.

---

## 🗄️ Modelo de datos — resumen

| Tabla | Qué guarda |
|---|---|
| `profiles` | Extiende `auth.users`. Tiene `role`: player / staff / admin. |
| `players` | Datos personales, posición, foot, score (1-15), referencia, avatar. |
| `tournaments` | Torneos. Solo uno puede estar `active` por año. |
| `phases` | Fases del torneo (grupos, cuartos, semi, final). |
| `groups` | Zonas dentro de fase de grupos. |
| `brackets` | Llaves dentro de fase eliminatoria. |
| `teams` | Equipos del torneo (con color, short_name). |
| `group_teams` | Relación equipo-zona. |
| `team_memberships` | Jugadores por equipo. |
| `player_tournament_registrations` | Inscripciones al torneo (pending/approved/rejected/waitlist). |
| `matches` | Partidos con canchas, horarios, scores, veedor. |
| `match_goals` | Goles con jugador, minuto, equipo. |
| `match_cards` | Tarjetas (yellow/red/blue) con minuto. |
| `notifications` | Avisos in-app + flag de si ya se mandó email. |
| `staff_invitations` | Invitaciones a colaboradores por email. |

**Vistas útiles ya creadas:**
- `v_players_public` → datos públicos del jugador (sin DNI, teléfono, etc.)
- `v_player_stats` → estadísticas agregadas por torneo
- `v_standings` → tabla de posiciones por grupo (ya calculada)

---

## 🛣️ Roadmap de implementación

Seguí este orden para no atarte con tareas bloqueadas:

### Milestone 1 — Fundación ✅ *(base incluida)*
- [x] Setup proyecto, Supabase, Tailwind, shadcn
- [x] Schema + RLS + triggers
- [x] Auth: login, register, logout
- [x] Middleware con protección de rutas por rol
- [ ] Recuperar contraseña
- [ ] Verificación de email

### Milestone 2 — Lado del jugador
- [ ] Onboarding 3 pasos con upload de foto
- [ ] Perfil del jugador (ver/editar)
- [ ] Solicitud de inscripción al torneo
- [ ] Vista pública: home, fixture, tabla, goleadores, valla menos vencida, fair play
- [ ] Detalle de partido / equipo / jugador públicos

### Milestone 3 — Panel admin core
- [ ] Dashboard admin
- [ ] Aprobación de inscripciones
- [ ] Listado y edición de jugadores
- [ ] Configuración de torneo (fases, canchas, horarios)
- [ ] Creación de equipos
- [ ] Sorteo con drag & drop

### Milestone 4 — Partidos
- [ ] Generación de fixture
- [ ] Carga de resultado, goles, tarjetas
- [ ] Asignación de veedor con sugerencia automática
- [ ] Sistema de notificaciones (in-app + email)
- [ ] Gestión de staff
- [ ] Bracket de eliminatorias

---

## 🔒 Seguridad

Toda la seguridad vive en **Row Level Security (RLS)** en Postgres. Ningún endpoint puede saltarse las reglas. Los principios:

- Datos públicos (fixtures, goles, tablas) → cualquiera puede leer.
- Datos privados (DNI, teléfono, email) → solo el dueño o admin/staff.
- Operaciones de admin → solo usuarios con `role = 'admin'`.
- Operaciones de staff → solo usuarios con `role in ('staff', 'admin')`.

Las funciones `current_user_role()`, `is_staff_or_admin()` e `is_admin()` están definidas como SECURITY DEFINER y se usan en todas las policies.

---

## 🚢 Deploy en Vercel

1. Push del repo a GitHub.
2. En [vercel.com/new](https://vercel.com/new), importar el repo.
3. Configurar las variables de entorno con los mismos valores del `.env.local`.
4. En Supabase → **Authentication → URL Configuration**, agregar la URL de Vercel a "Site URL" y "Redirect URLs".
5. Deploy automático.

---

## 🤖 Usando un IDE agéntico

Este proyecto está pensado para continuar desarrollándose en un IDE con agente (Cursor, Google Antigravity, Claude Code). Para arrancar:

1. Abrir el repo en tu IDE preferido.
2. Pegar en el agente el contenido de `docs/00-architecture.md` como contexto inicial.
3. Pedirle que implemente el siguiente milestone del roadmap.
4. Iterar sobre cada pantalla usando los archivos `*.jsx` de mockups como referencia visual.

**Prompts sugeridos para el agente:**

> "Implementá el flujo de onboarding de 3 pasos según el mockup `player-app.jsx`, usando los componentes de shadcn y los types generados de Supabase. Crear una server action `completePlayerProfile` en `src/lib/actions/players.ts`."

> "Implementá la vista pública de la tabla de posiciones usando la vista `v_standings` de Supabase. Reference visual: `public-view.jsx`, función `MobileStandings`."

---

## ❓ Preguntas frecuentes

**¿Por qué hay una tabla `profiles` aparte de `auth.users`?**
Porque `auth.users` está en un schema privado que solo puede tocar Supabase. `profiles` es nuestro "espejo" editable con columnas custom como `role`.

**¿Cómo invito a un colaborador?**
Como admin, vas a `/admin/staff` (pendiente de implementar) → ingresar email + rol → se inserta en `staff_invitations` y se envía email con link de registro. Al registrarse, el trigger `handle_new_user` lee la invitación y asigna el rol correcto.

**¿El puntaje se puede borrar?**
Sí, un admin/staff puede dejarlo en NULL (no asignado).

**¿Un jugador puede inscribirse a dos torneos?**
Sí, pero a uno distinto por año. El constraint `unique_active_per_year` asegura que solo haya un torneo activo por año. Y `player_tournament_registrations` tiene unique en `(player_id, tournament_id)`.

---

## 📚 Recursos

- [Docs Supabase](https://supabase.com/docs)
- [Docs Next.js 15](https://nextjs.org/docs)
- [Docs shadcn/ui](https://ui.shadcn.com)
- [Mockups originales](./docs/) — referencia visual

---

**Organizado por el Colegio Marista · 2026**
