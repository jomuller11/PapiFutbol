import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Papi Fútbol — Temporada 2026',
  description: 'Sistema de administración y seguimiento de Papi Fútbol.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:opsz,wght@9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
