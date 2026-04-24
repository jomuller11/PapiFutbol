import { createClient } from '@/lib/supabase/server';
import { DesktopNav } from '@/components/public/DesktopNav';
import { TabBar } from '@/components/public/TabBar';

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, year, status, brand_name, logo_url')
    .eq('status', 'active')
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 md:bg-slate-100 font-sans pb-[68px] md:pb-0">
      <DesktopNav
        tournamentName={(tournament as any)?.name}
        tournamentYear={(tournament as any)?.year}
        brandName={(tournament as any)?.brand_name}
        logoUrl={(tournament as any)?.logo_url}
      />
      
      <main className="w-full">
        {!tournament && (
          <div className="bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800 text-center m-4 rounded-sm">
            No hay torneo activo actualmente. Volvé pronto.
          </div>
        )}
        {children}
      </main>

      <TabBar />
    </div>
  );
}
