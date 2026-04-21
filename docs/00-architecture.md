# Liga.9 — Arquitectura y Decisiones Técnicas

> Sistema de administración de torneos de fútbol 9 del colegio.
> Stack: Next.js 15 (App Router) + TypeScript + Supabase + shadcn/ui.

---

## 1. Visión general

Liga.9 es una plataforma web para gestionar torneos de fútbol 9 de principio a fin:

- **Administrador** configura el torneo (fases, zonas, llaves, canchas, horarios), gestiona jugadores, arma el fixture, carga resultados y estadísticas.
- **Jugadores** se registran, completan su perfil, solicitan inscripción al torneo activo, ven sus partidos y estadísticas.
- **Público general** (hinchas, familias) consulta fixture, tabla de posiciones, goleadores y demás estadísticas sin necesidad de login.

**Escala esperada:** hasta 24 equipos × 12 jugadores = 288 jugadores activos por torneo. Un torneo activo por año calendario.

---

## 2. Stack técnico

| Capa | Tecnología | Razón |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | SSR, Server Components, routing moderno. Ideal para SEO de vista pública. |
| Lenguaje | **TypeScript** | Tipos derivados del schema Supabase, menos bugs en runtime. |
| Base de datos | **Supabase (PostgreSQL)** | Auth incluido, RLS policies, realtime, storage, gratis para MVP. |
| Auth | **Supabase Auth** | Email + password nativo, invitaciones por email gratuitas. |
| Storage | **Supabase Storage** | Fotos de perfil de jugadores, bucket público con ACL. |
| UI | **shadcn/ui** (Radix + Tailwind) | Componentes copiados, personalizables, sin dependencias pesadas. |
| Estilos | **Tailwind CSS** | Ya probado en mockups, rápido de iterar. |
| Iconos | **lucide-react** | Consistencia visual con los mockups. |
| Forms | **react-hook-form + zod** | Validaciones tipadas, DX excelente. |
| Data fetching | **Server Components + Server Actions** | Sin API routes innecesarias para el MVP. |
| Hosting | **Vercel** (recomendado) | Zero config para Next.js, CI/CD automático, gratis en free tier. |

---

## 3. Roles y permisos

### Jugador (`player`)
- Crear cuenta con email + password.
- Completar perfil propio (datos personales, posición, foto).
- Solicitar inscripción al torneo activo (queda en estado pendiente).
- Ver sus partidos, estadísticas y notificaciones.
- **No puede** modificar su puntaje, ni ver datos privados de otros jugadores.

### Colaborador (`staff`)
Todo lo del jugador +
- Aprobar/rechazar solicitudes de inscripción.
- Cargar resultados de partidos, goles, tarjetas, veedor.
- Editar datos de jugadores aprobados (incluyendo puntaje).
- Ver el panel admin.

### Admin principal (`admin`)
Todo lo del colaborador +
- Crear/cerrar torneos.
- Configurar fases, zonas, llaves, canchas, horarios.
- Invitar/eliminar colaboradores.
- Modificar reglamento y configuración general.

**Implementación:** la tabla `profiles` tiene una columna `role` con enum `('player', 'staff', 'admin')`. Todas las RLS policies validan contra esta columna.

**Flujo de invitación de staff:**
1. Admin principal abre pantalla "Equipo admin" e ingresa email + rol.
2. Sistema llama a `supabase.auth.admin.inviteUserByEmail()` que envía link de registro.
3. Al registrarse, el trigger `handle_new_user` crea el profile con el rol asignado en la invitación.

---

## 4. Modelo de datos

### Entidades principales

```
tournaments (torneos)
  └─ phases (fases: grupos, cuartos, semi, final)
       └─ groups (zonas dentro de fase de grupos)
       └─ brackets (llaves dentro de fase eliminatoria)
            └─ bracket_matches (partidos de llave)

players (jugadores)
  └─ player_tournament_registrations (inscripción al torneo)
       └─ team_memberships (pertenencia a equipo)

teams (equipos)
  └─ team_memberships (plantel)
  └─ group_teams (equipo en una zona)

matches (partidos)
  └─ match_goals (goles con goleador y minuto)
  └─ match_cards (tarjetas con jugador, tipo, minuto)
  └─ match_observer (veedor asignado)

notifications (notificaciones in-app)
tournament_invitations (invitaciones staff)
```

### Decisiones clave

- **Puntaje del jugador** (1-15) se guarda en `players.score` como `SMALLINT NULL`. Null = aún no evaluado.
- **Referencia** (Padre de Alumno, Ex Alumno, etc.) como enum `player_reference`.
- **Tarjetas** como enum `('yellow', 'red', 'blue')`. La azul es distintiva de este torneo.
- **Veedor sugerido**: se calcula por query considerando misma cancha + horario adyacente, no se guarda precalculado.
- **Estado de inscripción**: enum `('pending', 'approved', 'rejected')` en `player_tournament_registrations`.

Ver el archivo `01-database-schema.sql` para el DDL completo.

---

## 5. Estructura de directorios

```
liga9/
├── src/
│   ├── app/                        # App Router
│   │   ├── (public)/               # Vista pública, sin auth
│   │   │   ├── page.tsx            # Home público (landing)
│   │   │   ├── fixture/page.tsx
│   │   │   ├── standings/page.tsx
│   │   │   ├── scorers/page.tsx
│   │   │   ├── goalkeepers/page.tsx
│   │   │   ├── fair-play/page.tsx
│   │   │   ├── match/[id]/page.tsx
│   │   │   ├── team/[id]/page.tsx
│   │   │   └── player/[id]/page.tsx
│   │   ├── (auth)/                 # Login/registro
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (player)/               # Panel jugador logueado
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── matches/page.tsx
│   │   │   ├── stats/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   └── tournament-signup/page.tsx
│   │   ├── (admin)/                # Panel administrador
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tournament/page.tsx
│   │   │   ├── players/page.tsx
│   │   │   ├── approvals/page.tsx
│   │   │   ├── draw/page.tsx
│   │   │   ├── teams/page.tsx
│   │   │   ├── fixture/page.tsx
│   │   │   ├── match/[id]/page.tsx
│   │   │   └── staff/page.tsx      # Gestión de colaboradores
│   │   ├── api/                    # Solo si necesitamos webhooks externos
│   │   ├── layout.tsx              # Root layout
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn/ui generados
│   │   ├── admin/                  # Componentes del admin
│   │   ├── player/                 # Componentes del jugador
│   │   ├── public/                 # Componentes de vista pública
│   │   └── shared/                 # Reutilizables (headers, avatar, badges)
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Client para componentes cliente
│   │   │   ├── server.ts           # Client para componentes servidor
│   │   │   └── middleware.ts       # Refresh de sesión
│   │   ├── actions/                # Server actions por dominio
│   │   │   ├── auth.ts
│   │   │   ├── players.ts
│   │   │   ├── tournaments.ts
│   │   │   ├── matches.ts
│   │   │   └── notifications.ts
│   │   ├── queries/                # Queries reutilizables
│   │   └── utils.ts
│   ├── types/
│   │   ├── database.ts             # Generado desde Supabase CLI
│   │   └── app.ts                  # Tipos custom del dominio
│   └── middleware.ts               # Protección de rutas
├── supabase/
│   ├── migrations/
│   │   └── 20260420000001_initial_schema.sql
│   └── seed.sql                    # Data de prueba
├── public/
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 6. Seguridad (RLS policies)

Toda la seguridad vive en la base de datos con Row Level Security. Ningún endpoint puede bypassearla. Las reglas principales:

- **Cualquiera** (sin auth) puede leer: `tournaments` (solo activo o pasados), `matches`, `match_goals`, `match_cards`, `teams`, `groups`, `brackets`, y un subset público de `players` (nombre, apodo, posición, puntaje, foto — no DNI/teléfono/email).
- **Jugador autenticado** puede leer/editar solo su propia fila en `players` (excepto `score` que es read-only), ver sus propias notificaciones y sus `player_tournament_registrations`.
- **Staff/Admin** tiene permisos de escritura sobre matches, goals, cards, registrations, players.
- **Solo admin** puede escribir en `tournaments`, `phases`, `staff invites`.

Implementación detallada en `01-database-schema.sql`.

---

## 7. Roadmap de implementación

Dividido en 4 milestones para entregar valor progresivamente.

### M1 — Fundación (1-2 semanas)
- Setup del proyecto (Next.js, Supabase, shadcn, Tailwind, eslint).
- Schema de base de datos + RLS + triggers.
- Auth completo: login, registro, recuperar password.
- Layout base con navegación.
- **Entregable:** un usuario puede registrarse y loguearse.

### M2 — Lado del jugador (2-3 semanas)
- Onboarding de 3 pasos (datos personales, posición, foto).
- Perfil del jugador (ver/editar, upload de foto a Storage).
- Vista pública del torneo (home, fixture, standings, scorers).
- Solicitud de inscripción al torneo.
- **Entregable:** un jugador puede inscribirse al torneo y ver la información pública.

### M3 — Panel admin core (2-3 semanas)
- Dashboard admin.
- Gestión de jugadores (listado, editar, aprobar inscripciones).
- Configuración de torneo (fases, zonas, canchas, horarios).
- Sorteo de equipos con drag & drop.
- **Entregable:** el admin puede configurar un torneo y armar los equipos.

### M4 — Partidos y estadísticas (2-3 semanas)
- Generación de fixture.
- Carga de resultados, goles, tarjetas, veedor.
- Sistema de notificaciones (in-app + email vía Supabase Edge Functions).
- Gestión de staff (invitaciones).
- Bracket de eliminatorias.
- **Entregable:** torneo funcional de punta a punta.

### Post-MVP (opcionales)
- Realtime updates del fixture con Supabase Realtime.
- Push notifications (PWA).
- Export de estadísticas a PDF.
- Histórico de torneos (ya la estructura lo soporta, solo hay que renderizar).
- Import desde el sistema actual.

---

## 8. Variables de entorno

`.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Solo para server actions privilegiadas
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 9. Comandos principales

```bash
# Desarrollo
pnpm dev                    # Correr en local
pnpm build                  # Build de producción
pnpm lint                   # Chequear código

# Supabase
pnpm supabase start         # Levantar Supabase local
pnpm supabase db reset      # Resetear DB local (aplica migraciones)
pnpm supabase gen types     # Generar types desde el schema

# shadcn
pnpm dlx shadcn@latest add button card dialog  # Agregar componentes
```

---

## 10. Próximos pasos para desarrollo

1. Crear proyecto en Supabase (supabase.com) y anotar las keys.
2. Clonar la base del proyecto que generamos, correr `pnpm install`.
3. Copiar `.env.local.example` a `.env.local` y llenar las keys.
4. Correr la migración: conectarse al proyecto Supabase, pegar el contenido de `01-database-schema.sql` en el SQL editor y ejecutar.
5. Correr `pnpm dev` y visitar `http://localhost:3000`.
6. Continuar implementando los mockups que ya validamos.

Idealmente a partir de acá usar un IDE agéntico (Cursor, Antigravity, Claude Code) para iterar sobre el codebase completo.
