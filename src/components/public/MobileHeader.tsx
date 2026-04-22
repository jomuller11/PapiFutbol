import Link from 'next/link';
import { ChevronLeft, Share2 } from 'lucide-react';

export function MobileHeader({ title, backHref }: { title: string, backHref?: string }) {
  return (
    <div className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 flex items-center px-4 gap-3 md:hidden">
      {backHref && (
        <Link href={backHref} className="w-8 h-8 flex items-center justify-center -ml-2 text-slate-700">
          <ChevronLeft className="w-6 h-6" />
        </Link>
      )}
      <div className="flex-1 font-serif font-bold text-lg truncate text-slate-900">{title}</div>
      <button className="w-8 h-8 flex items-center justify-center text-slate-500">
        <Share2 className="w-5 h-5" />
      </button>
    </div>
  );
}
