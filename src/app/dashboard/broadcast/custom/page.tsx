'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

export default function CustomBroadcastRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/broadcast/manual?module=custom');
  }, [router]);

  return (
    <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-4">
      <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">Mengalihkan ke Broadcast Studio...</h2>
      <p className="text-xs text-slate-500 leading-relaxed">
        Fitur Pesan Custom Grup kini telah dipindahkan dan disatukan ke dalam <strong>Broadcast Studio</strong> untuk kemudahan manajemen terpadu.
      </p>
      <Link
        href="/dashboard/broadcast/manual?module=custom"
        className="inline-flex items-center space-x-2 text-xs font-semibold text-purple-600 hover:text-purple-700 underline pt-2"
      >
        <span>Buka Broadcast Studio</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
