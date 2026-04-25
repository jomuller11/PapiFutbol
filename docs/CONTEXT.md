# Liga.9 - Estado tecnico del proyecto

Ultima actualizacion: 2026-04-25.

Este documento es el handoff principal del proyecto. Cualquier persona o AI que entre al repo deberia leerlo antes de tocar codigo. Resume que es el producto, como esta armado, que decisiones ya se tomaron, que se arreglo recientemente y que pasos siguen.

## 1. Producto

Liga.9 es una plataforma para administrar y publicar torneos de futbol 9 del colegio.

Audiencias:

- Publico general: consulta fixture, resultados, tabla, goleadores, sanciones, fair play, equipos, jugadores y bracket sin login.
- Jugadores: se registran, completan perfil, suben foto, ven sus partidos y estadisticas.
- Staff/admin: administran jugadores, aprobaciones, equipos, sorteo, fixture, partidos, goles, tarjetas, staff y torneo.

Reglas de dominio ya asumidas:

- Escala objetivo: hasta 24 equipos x 12 jugadores.
- Un torneo activo por anio calendario.
- Puntaje de jugador: 1 a 15. `null` significa no asignado.
- Posiciones: `ARQ`, `DFC`, `LAT`, `MCC`, `MCO`, `EXT`, `DEL`.
- Pie habil: `derecho`, `izquierdo`, `ambidiestro`.
- Tarjetas: `yellow`, `red`, `blue`. La azul suma fair play como amarilla y representa 5 minutos fuera.
- Inscripciones: flujo `pending` -> `approved` / `rejected` / `waitlist`.

## 2. Stack

- Framework: Next.js 15 App Router.
- Runtime UI: React 19.
- Lenguaje: TypeScript.
- Base de datos/Auth/Storage: Supabase.
- UI: Tailwind CSS, shadcn/ui, Radix, lucide-react.
- Formularios: react-hook-form + zod.
- Hosting actual: AWS Amplify.
- Repo remoto: GitHub `jomuller11/PapiFutbol`.
- Rama activa: `main`.
- Dominio de produccion actual: `https://main.d3oq0bto5l3dl0.amplifyapp.com`.

Scripts importantes:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run types:db
```

Nota: aunque hay `pnpm-lock.yaml`, el deploy actual de Amplify usa `npm install --legacy-peer-deps` y `npm run build`.

## 3. Estructura relevante

Rutas principales:

- `src/app/(public)` - sitio publico mobile-first.
- `src/app/(auth)` - login y registro.
- `src/app/(player)` - experiencia del jugador logueado.
- `src/app/admin` - panel administrativo.

Supabase:

- `src/lib/supabase/client.ts` - cliente para componentes cliente.
- `src/lib/supabase/server.ts` - cliente SSR con cookies.
- `src/lib/supabase/admin.ts` - cliente server-only con service role.
- `src/lib/supabase/middleware.ts` - refresh/proteccion de sesion.

Server actions:

- `src/lib/actions/auth.ts`
- `src/lib/actions/players.ts`
- `src/lib/actions/teams.ts`
- `src/lib/actions/tournament.ts`
- `src/lib/actions/matches.ts`
- `src/lib/actions/brackets.ts`
- `src/lib/actions/approvals.ts`
- `src/lib/actions/staff.ts`
- `src/lib/actions/admin.ts`

Migraciones:

- `supabase/migrations/20260420000001_initial_schema.sql`
- `supabase/migrations/20260424000100_add_tournament_branding.sql`
- `supabase/migrations/20260424000200_add_team_secondary_color.sql`

Documentacion adicional:

- `docs/00-architecture.md` - arquitectura original y roadmap historico.
- `README.md` - setup inicial.

## 4. Modelo de datos

Tablas principales:

- `profiles`: extension de `auth.users`, contiene `role`.
- `players`: datos del jugador, posicion, puntaje, referencia, foto.
- `tournaments`: torneos.
- `phases`: fases.
- `groups`: zonas.
- `brackets`: llaves.
- `teams`: equipos, colores, branding.
- `group_teams`: pertenencia de equipos a zonas.
- `player_tournament_registrations`: inscripciones.
- `team_memberships`: planteles.
- `matches`: partidos.
- `match_goals`: goles.
- `match_cards`: tarjetas.
- `notifications`: notificaciones.
- `staff_invitations`: invitaciones.

Views relevantes:

- `v_players_public`: subset publico de jugadores.
- `v_player_stats`: estadisticas agregadas.
- `v_standings`: tabla agregada.

Observacion importante sobre datos publicos de jugadores:

- La tabla `players` esta protegida por RLS y no es legible para anon.
- `v_players_public` existe, pero actualmente esta creada con `security_invoker = on`, por lo que anon sigue sin poder leer filas si RLS de `players` lo impide.
- Por eso, algunas paginas publicas SSR usan `createAdminClient()` en servidor para leer solo campos seguros de jugadores y renderizarlos sin exponer la service role al cliente.
- Deuda recomendada: crear una migracion para que la vista publica funcione correctamente sin depender del service role en rutas publicas.

## 5. Seguridad

Principio general:

- RLS en Supabase es la barrera de seguridad real.
- La service role nunca debe importarse en componentes cliente.
- `src/lib/supabase/admin.ts` importa `server-only` y valida que existan variables de entorno.

Roles:

- `player`: gestiona su perfil y ve su informacion.
- `staff`: puede administrar partidos, goles, tarjetas, jugadores y aprobaciones.
- `admin`: controla torneo, staff y configuracion.

Storage:

- Bucket `avatars`: publico para lectura. Usado para fotos de jugadores.
- Bucket `team-logos`: usado por acciones de equipos/torneo. Si falta, las acciones muestran error indicando crearlo como publico con limite 2MB.

Variables requeridas:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PROJECT_ID=
NEXT_PUBLIC_SITE_URL=
```

No commitear secretos. `.env.local` queda local.

## 6. Deploy actual

Hosting actual: AWS Amplify.

App:

- appId: `d3oq0bto5l3dl0`
- branch: `main`
- dominio: `https://main.d3oq0bto5l3dl0.amplifyapp.com`

Build:

```yaml
preBuild:
  commands:
    - npm install --legacy-peer-deps
build:
  commands:
    - env | grep -e NEXT_PUBLIC_SUPABASE_URL -e NEXT_PUBLIC_SUPABASE_ANON_KEY -e SUPABASE_SERVICE_ROLE_KEY >> .env.production
    - npm run build
```

Contexto del fix de deploy:

- Las rutas SSR publicas empezaron a fallar en produccion con HTTP 500.
- CloudWatch mostro `Error: supabaseKey is required`.
- Causa: Amplify no estaba entregando `SUPABASE_SERVICE_ROLE_KEY` al runtime SSR de Next.
- Fix: agregar las variables necesarias a `.env.production` durante el build en `amplify.yml`.
- Ultimo deploy verificado: job 13, commit `7b6ca4d`, estado `SUCCEED`.

## 7. Estado funcional actual

Validado el 2026-04-25 contra produccion:

- `/bracket`: 200.
- `/scorers`: 200, sin `undefined undefined`, sin fallback `Jugador`, con nombres reales.
- `/`: 200, top artilleros sin `undefined undefined`.
- `/match/fa4612d6-954c-4048-a787-8e4bc65775e2`: 200, eventos sin `Desconocido`, con links a jugador.

Build local:

- `npm run build`: pasa.

Cambios recientes confirmados:

- Bracket publico mobile ahora renderiza una version vertical usable en telefono.
- Public pages ahora muestran datos reales de jugadores, goleadores, sanciones, equipos y fotos si existen.
- Se incorporo `PlayerAvatar` compartido para mostrar imagen cargada o iniciales.
- Se ajustaron consultas SSR para evitar filas cruzadas de torneos con `!inner` donde correspondia.
- Se corrigio el runtime de Amplify para que rutas SSR con Supabase admin no fallen.

## 8. Commits recientes importantes

- `7b6ca4d Fix Amplify Supabase runtime env`
  - Corrige variables runtime de Supabase en Amplify.
  - Refuerza `createAdminClient()` como server-only.

- `591aefe Fix public player data rendering`
  - Corrige render de datos publicos de jugadores en home, goleadores, sanciones, partido, equipo y jugador.
  - Evita `undefined undefined`, `Jugador` y `Desconocido` cuando hay datos reales.

- `2872824 Improve public bracket and player data views`
  - Mejora bracket publico mobile.
  - Agrega/usa avatars y datos de jugadores en vistas publicas.

- `83a7cea feat: add tournament branding and team color combos`
  - Branding de torneo y combinaciones de colores/equipos.

- `be24d37 feat: improve bracket editing flow`
  - Mejoras previas al flujo admin de bracket.

## 9. Estado del working tree

Al momento de documentar, `main` esta sincronizada con `origin/main`, pero hay cambios locales no relacionados que no fueron tocados en los commits recientes.

Archivos modificados locales detectados:

- `src/app/(player)/dashboard/page.tsx`
- `src/app/(player)/matches/page.tsx`
- `src/app/(player)/profile/page.tsx`
- `src/app/(player)/stats/page.tsx`
- `src/app/admin/draw/DrawClient.tsx`
- `src/app/admin/draw/page.tsx`
- `src/app/admin/layout.tsx`
- `src/components/admin/TopBar.tsx`
- `src/components/admin/approvals/ApprovalsPageClient.tsx`
- `src/components/admin/players/PlayersPageClient.tsx`
- `src/components/admin/teams/RosterPanel.tsx`
- `src/components/admin/teams/TeamEditor.tsx`
- `src/components/admin/teams/TeamsPageClient.tsx`
- `src/components/player/profile/ProfileShell.tsx`
- `src/lib/actions/players.ts`
- `src/lib/supabase/middleware.ts`

Archivos/directorios no trackeados detectados:

- `.claude/`
- `amplify-runtime-log.json`
- `devserver-3000*.log`
- `devserver-3001*.log`
- `devserver-3002*.log`
- `src/app/admin/players/[id]/`

Regla para siguientes agentes:

- No revertir ni limpiar esos cambios sin confirmacion explicita.
- Si se trabaja en esas zonas, revisar primero el diff y asumir que son cambios del usuario o de otra sesion.

## 10. Patrones de implementacion

Server Components:

- Usar por defecto para paginas que solo leen datos.
- Usar `createClient()` de `@/lib/supabase/server` para queries bajo RLS.
- Usar `createAdminClient()` solo server-side y solo cuando haya una razon de seguridad/control clara.

Client Components:

- Solo con `'use client'` cuando hay estado, interacciones, tabs, forms o handlers.
- No importar `createAdminClient()` ni ningun secreto.

Mutations:

- Server actions en `src/lib/actions/*.ts`.
- Validar inputs con Zod.
- Retornar objetos tipados `{ success, error, fieldErrors }`.
- Revalidar rutas afectadas con `revalidatePath()`.

UI:

- Admin/player: light theme institucional.
- Publico: mas editorial y mobile-first, con azul/naranja como identidad.
- Iconos: lucide-react.
- Evitar datos mock en pantallas conectadas.

## 11. Deuda tecnica y riesgos conocidos

Prioridad alta:

- Arreglar acceso publico a datos seguros de jugadores desde DB: crear migracion para `v_players_public` o una RPC segura que exponga solo campos publicos, y luego dejar de usar service role en paginas publicas.
- Revisar y normalizar el working tree antes de nuevos commits grandes.
- Confirmar que los buckets `avatars` y `team-logos` existen en produccion y tienen policies correctas.

Prioridad media:

- Actualizar `README.md` y `docs/00-architecture.md`, que todavia mencionan Vercel como deploy recomendado aunque el deploy actual es Amplify.
- Revisar encoding de docs antiguos con caracteres rotos.
- Mejorar tests/checks automatizados para rutas publicas SSR.
- Agregar una verificacion post-deploy automatica para `/`, `/scorers`, `/bracket`, `/fixture`, `/standings` y una ruta de partido.

Prioridad baja:

- Consolidar gestor de paquetes: repo tiene `pnpm-lock.yaml`, pero deploy usa npm.
- Documentar flujos completos de admin por pantalla.
- Agregar capturas o checklist visual mobile para vistas publicas.

## 12. Proximos pasos recomendados

Orden sugerido:

1. Cerrar estado de working tree: decidir si los cambios locales de admin/player se commitean, se separan por feature o se descartan manualmente.
2. Crear migracion para datos publicos de jugador:
   - Corregir `v_players_public` para lectura anon segura, o crear una RPC `get_public_player_data`.
   - Validar que no expone DNI, telefono, email privado ni campos sensibles.
   - Reemplazar lecturas publicas con anon client o RPC.
3. Revisar fotos:
   - Confirmar bucket `avatars`.
   - Confirmar que `players.avatar_url` guarda URL publica o path consistente.
   - Confirmar que `PlayerAvatar` cubre URL, iniciales y fallback.
4. QA mobile publico:
   - Home.
   - Fixture.
   - Tabla.
   - Goleadores.
   - Fair play/sanciones.
   - Bracket.
   - Equipo.
   - Jugador.
   - Partido.
5. Admin/player:
   - Revisar cambios locales existentes.
   - Probar onboarding, profile, dashboard, matches, stats.
   - Probar carga de goles/tarjetas y su impacto en publico.
6. Documentacion:
   - Actualizar README para Amplify.
   - Actualizar arquitectura con estado real, no solo roadmap inicial.

## 13. Checklist para cualquier nueva sesion

Antes de tocar codigo:

```bash
git status -sb
git log --oneline -5
npm run build
```

Si se toca produccion:

```bash
git push origin main
aws amplify list-jobs --app-id d3oq0bto5l3dl0 --branch-name main --max-results 5
aws amplify get-job --app-id d3oq0bto5l3dl0 --branch-name main --job-id <job-id>
```

Checks minimos post-deploy:

- Home responde 200.
- Goleadores responde 200.
- Bracket responde 200.
- No aparece `undefined undefined`.
- No aparece `Jugador` como fallback si hay datos reales.
- No aparece `Desconocido` en eventos con jugador cargado.

## 14. Decision log resumido

- Se priorizo mobile public porque el uso real viene desde telefono.
- Se mantuvo SSR para vistas publicas para SEO y performance.
- Se uso admin client server-only como parche controlado para renderizar datos publicos de jugadores mientras RLS/view no permiten anon.
- Se eligio documentar el estado en `docs/CONTEXT.md` como contrato vivo para humanos y AI.
- Se mantiene cuidado sobre cambios locales no relacionados: no revertir sin autorizacion.
