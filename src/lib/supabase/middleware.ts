import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Refresca la sesión en cada request y redirige según rol si es necesario.
 * Se llama desde src/middleware.ts
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: any) {
          cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: any) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no poner código entre createServerClient y getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isAdminRoute = pathname.startsWith('/admin');
  const isPlayerRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/matches') ||
    pathname.startsWith('/stats') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/tournament-signup');

  // ── 1. Sin sesión → redirigir a login si intenta acceder a ruta protegida
  if (!user && (isPlayerRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // ── 2. Con sesión → obtener el rol
  let role: string | null = null;
  let hasPlayerRecord = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    role = (profile as any)?.role ?? null;

    if (role === 'player') {
      const { count } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', user.id);
      hasPlayerRecord = (count ?? 0) > 0;
    }
  }

  // ── 3. Con sesión en login/register → mandar al home correcto
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    if (role === 'admin' || role === 'staff') {
      url.pathname = '/admin/dashboard';
    } else if (hasPlayerRecord) {
      url.pathname = '/dashboard';
    } else {
      url.pathname = '/onboarding';
    }
    return NextResponse.redirect(url);
  }

  // ── 4. Player sin perfil → forzar onboarding (excepto si ya está en /onboarding)
  if (user && role === 'player' && !hasPlayerRecord && isPlayerRoute && pathname !== '/onboarding') {
    const url = request.nextUrl.clone();
    url.pathname = '/onboarding';
    return NextResponse.redirect(url);
  }

  // ── 5. Admin/staff intentando entrar a rutas de player → mandarlos al panel
  if (user && (role === 'admin' || role === 'staff') && isPlayerRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/dashboard';
    return NextResponse.redirect(url);
  }

  // ── 6. Player intentando entrar al panel admin → dashboard jugador
  if (user && role === 'player' && isAdminRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
