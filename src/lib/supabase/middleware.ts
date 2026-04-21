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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: no poner código entre createServerClient y getUser.
  // Puede causar que la sesión no se refresque bien.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPlayerRoute = ['/dashboard', '/profile', '/matches', '/stats', '/notifications', '/onboarding', '/tournament-signup'].some(p => pathname.startsWith(p));
  const isAdminRoute = pathname.startsWith('/admin');

  // Usuario no logueado intentando acceder a ruta protegida → login
  if (!user && (isPlayerRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  let profile = null;
  let isPlayerProfileComplete = false;

  if (user) {
    const [{ data: pData }, { count }] = await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('players').select('id', { count: 'exact', head: true }).eq('profile_id', user.id)
    ]);
    profile = pData;
    isPlayerProfileComplete = count !== null && count > 0;
  }

  // Usuario logueado en login/register → mandar al dashboard correspondiente (o onboarding)
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    if (profile?.role === 'admin' || profile?.role === 'staff') {
      url.pathname = '/admin/dashboard';
    } else {
      url.pathname = isPlayerProfileComplete ? '/dashboard' : '/onboarding';
    }
    return NextResponse.redirect(url);
  }

  // Lógica de onboarding para jugadores
  if (user && profile?.role === 'player') {
    if (!isPlayerProfileComplete && pathname !== '/onboarding' && isPlayerRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
    if (isPlayerProfileComplete && pathname === '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Usuario player intentando entrar al panel admin → dashboard jugador
  if (user && isAdminRoute) {
    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
