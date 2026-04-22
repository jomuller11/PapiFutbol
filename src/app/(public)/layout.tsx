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
    .select('name, year, status')
    .eq('status', 'active')
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50 md:bg-slate-100 font-sans pb-[68px] md:pb-0">
      <DesktopNav tournamentName={(tournament as any)?.name} tournamentYear={(tournament as any)?.year} />
      
      <main className="w-full md:max-w-[420px] md:mx-auto md:bg-white md:min-h-screen md:shadow-xl md:border-x md:border-slate-200">
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

