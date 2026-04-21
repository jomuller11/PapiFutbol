# Liga.9 — Contexto del Proyecto

> **Este archivo es el "contrato" del proyecto.**
> Cualquier agente (humano o AI) que trabaje en este codebase **DEBE** leer esto antes de generar código.
> Si algo acá contradice otra fuente (mockups viejos, sugerencias de agentes, tutoriales), **este archivo gana**.

---

## 🎯 Qué es Liga.9

Sistema de administración de torneos de fútbol 9 del colegio.

- **Escala**: hasta 24 equipos × 12 jugadores = 288 jugadores activos por torneo.
- **Un torneo activo por año calendario** (constraint real en DB).
- **3 tipos de usuarios**: administrador principal, colaboradores (staff), jugadores.
- **Público general** (hinchas/familias) consulta sin login.

---

## 🎨 Paleta visual — OBLIGATORIA

**Light theme institucional.** No usar tema oscuro ni colores fluorescentes.

| Rol | Color | Hex | Tailwind | HSL (globals.css) |
|---|---|---|---|---|
| Primario | Azul marino | `#1e3a8a` | `blue-900` / `brand-blue` | `225 70% 33%` |
| Acento | Naranja | `#ea580c` | `orange-600` / `brand-orange` | `21 90% 48%` |
| Éxito | Verde esmeralda | `#059669` | `emerald-600` | — |
| Advertencia | Ámbar | `#f59e0b` | `amber-500` | — |
| Error | Rojo | `#dc2626` | `red-600` | — |
| Fondo | Blanco / slate claro | `#f8fafc` | `slate-50` | `0 0% 100%` |
| Texto | Slate oscuro | `#0f172a` | `slate-900` | `222 47% 11%` |
| Borde | Slate claro | `#e2e8f0` | `slate-200` | `214 32% 91%` |

**Prohibido** usar en el panel admin/player:
- `bg-neutral-950`, `bg-black`, `bg-zinc-900` → NO. Light theme.
- `text-lime-400`, `bg-lime-400` → NO. Usar `text-orange-600` / `bg-orange-500`.
- Cualquier combinación de fondo oscuro + texto claro.

**La vista pública sí usa gradientes y tonos más saturados** (es más editorial), pero nunca tema oscuro global.

---

## 🔤 Tipografías

| Familia | Uso |
|---|---|
| **Inter** | Cuerpo general, labels, tablas |
| **Fraunces** (serif) | Títulos de sección, headers, números destacados |
| **Anton** | Display deportivo (solo vista pública) |
| **JetBrains Mono** | Labels pequeños, datos técnicos, números de ranking |

Ya están configuradas en `tailwind.config.ts` como `font-sans`, `font-serif`, `font-display`, `font-mono`.

---

## ⚙️ Reglas de datos del dominio

Estas no son opiniones, son reglas del negocio:

- **Puntaje del jugador**: rango **1 a 15** (no 0-100, no 1-10). Null = aún no asignado.
- **Torneo**: solo UNO activo por año calendario.
- **Posiciones (fútbol 9)**: `ARQ`, `DFC`, `LAT`, `MCC`, `MCO`, `EXT`, `DEL`.
- **Pie hábil**: `derecho`, `izquierdo`, `ambidiestro`.
- **Tarjetas**: `yellow`, `red`, `blue`. La **azul** es distintiva de este torneo: suma 1 punto fair play como la amarilla, equivale a 5 minutos fuera, no acumula para suspensión.
- **Referencia del jugador** (vínculo con el colegio): `padre_alumno`, `padre_ex_alumno`, `ex_alumno`, `docente_colegio`, `invitado`, `hermano_marista`, `esposo_educadora`, `abuelo_alumno`.
- **Veedor**: un equipo distinto al que juega observa el partido. Sugerencia automática: equipo que juega en la misma cancha en horario adyacente, con posibilidad de cambio manual.
- **Inscripción al torneo**: siempre requiere **aprobación del admin** antes de quedar confirmada. Estados: `pending` → `approved` / `rejected` / `waitlist`.

---

## 🛠️ Stack y patrones de código

### Stack fijo (no cambiar)
- Next.js 15 (App Router) + React 19
- TypeScript estricto
- Supabase (Postgres + Auth + Storage)
- shadcn/ui + Tailwind CSS
- lucide-react para iconos
- react-hook-form + zod para formularios
- pnpm como gestor

### Patrones de código

**1. Nunca usar datos mock después del M1.** Si una página necesita datos, consulta Supabase. Si todavía no hay un flujo para cargar esos datos, se crea antes o se deja un estado `empty` claramente marcado como pantalla vacía, no un `MOCK_PLAYERS` hardcodeado.

**2. Server Components por default.** Solo marcar `'use client'` cuando haya interactividad real (hooks, eventos, estado local).

**3. Data fetching desde Server Components** usando `createClient()` de `@/lib/supabase/server`:

```tsx
// ✅ Correcto
export default async function PlayersPage() {
  const supabase = await createClient();
  const { data: players } = await supabase
    .from('players')
    .select('*, profiles(email)')
    .order('last_name');

  return <PlayersTable players={players ?? []} />;
}
```

**4. Mutations con Server Actions** en `src/lib/actions/*.ts`, siempre con validación Zod y retorno tipado:

```tsx
// ✅ Patrón obligatorio
'use server';

const SomeSchema = z.object({ ... });

export type ActionResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function someAction(formData: FormData): Promise<ActionResult> {
  const parsed = SomeSchema.safeParse({ ... });
  if (!parsed.success) {
    return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // ... lógica
  revalidatePath('/ruta/afectada');
  return { success: true };
}
```

**5. Nombres de DB en `snake_case`** (`first_name`, `birth_date`, `created_at`). Nombres de JS en `camelCase` (`firstName`, `birthDate`, `createdAt`). Hacer el mapeo explícito al insertar/leer.

**6. RLS es la seguridad real.** Nunca bypassear con `SUPABASE_SERVICE_ROLE_KEY` en operaciones de usuario. Solo usar service role para scripts administrativos muy puntuales (ej. promover al primer admin).

**7. Usar los types generados.** `src/types/database.ts` está auto-generado desde Supabase. Importar tipos desde ahí, no inventar interfaces paralelas.

---

## 📁 Estructura de rutas

- `src/app/page.tsx` → home público
- `src/app/(auth)/login` → login
- `src/app/(auth)/register` → registro
- `src/app/(player)/dashboard` → dashboard jugador logueado
- `src/app/(player)/onboarding` → completar perfil post-registro
- `src/app/(player)/profile` → perfil propio del jugador
- `src/app/(player)/matches` → mis partidos
- `src/app/(player)/stats` → mis estadísticas
- `src/app/(player)/notifications` → notificaciones
- `src/app/(player)/tournament-signup` → inscripción al torneo activo
- `src/app/admin/dashboard` → dashboard admin
- `src/app/admin/players` → gestión de jugadores
- `src/app/admin/approvals` → aprobación de inscripciones
- `src/app/admin/tournament` → configuración del torneo
- `src/app/admin/teams` → equipos
- `src/app/admin/draw` → sorteo con drag & drop
- `src/app/admin/fixture` → fixture y carga de partidos
- `src/app/admin/staff` → gestión de colaboradores
- `src/app/(public)/fixture` → fixture público
- `src/app/(public)/standings` → tabla de posiciones pública
- `src/app/(public)/scorers` → goleadores
- `src/app/(public)/goalkeepers` → valla menos vencida
- `src/app/(public)/fair-play` → fair play
- `src/app/(public)/match/[id]` → detalle partido público
- `src/app/(public)/team/[id]` → detalle equipo público
- `src/app/(public)/player/[id]` → detalle jugador público

---

## 🔐 Roles y permisos

### Jugador (`player`)
- Completar/editar su perfil propio (no puede editar su `score`).
- Solicitar inscripción al torneo activo.
- Ver sus partidos, estadísticas, notificaciones.

### Colaborador (`staff`)
Todo lo del jugador +
- Aprobar/rechazar inscripciones.
- Cargar resultados, goles, tarjetas, asignar veedor.
- Editar datos de jugadores (incluyendo puntaje).

### Admin principal (`admin`)
Todo lo del colaborador +
- Crear/cerrar torneos.
- Configurar fases, canchas, horarios.
- Invitar/eliminar colaboradores.

---

## 📱 Referencias visuales

Los 3 mockups originales validados con el cliente (son la fuente de verdad visual):

- **`docs/mockups/tournament-admin.jsx`** — Panel administrador completo.
- **`docs/mockups/player-app.jsx`** — Panel del jugador (login, registro, onboarding, perfil, partidos, stats, notificaciones).
- **`docs/mockups/public-view.jsx`** — Vista pública mobile-first con versión desktop.

**Cuando implementes una pantalla, abrí el mockup correspondiente y tomalo como guía visual.** No inventes layouts nuevos, no cambies paletas, no uses componentes distintos. Si necesitás un cambio, discutilo antes.

---

## ⛔ Errores frecuentes a evitar

1. **Copiar el mockup con su data mock y no conectar a Supabase.** Los mockups son para *referencia visual*. La data SIEMPRE viene de la DB.
2. **Usar el tema oscuro en el panel admin/player.** Es light theme institucional. La única excepción: algunos heroes o banners puntuales en la vista pública.
3. **Asignar puntaje en rango 0-100.** Es 1-15.
4. **Olvidar la validación Zod en server actions.** Siempre validar.
5. **Crear interfaces TypeScript inventadas cuando ya hay types generados.** Usar `database.ts`.
6. **No revalidar el path después de una mutation.** Usar `revalidatePath()`.

---

## 🗺️ Roadmap (milestones)

Los milestones se cierran de punta a punta, no por pantallas sueltas. No avanzar al siguiente hasta no tener el anterior funcional.

- **M1 — Fundación** ✅ Setup, auth, protección de rutas.
- **M2 — Lado del jugador** 🟡 Onboarding, perfil, solicitud de inscripción, vista pública básica.
- **M3 — Panel admin core** 🔴 Gestión de jugadores, aprobaciones, configuración torneo, sorteo.
- **M4 — Partidos y stats** 🔴 Fixture, carga de partidos, veedor, notificaciones, bracket.

Ver `docs/00-architecture.md` para el detalle.
