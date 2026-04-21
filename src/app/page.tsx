import { redirect } from 'next/navigation';

// La home pública vive en src/app/(public)/page.tsx
// que renderiza en la URL raíz "/" gracias al route group.
// Esta página no debería ser alcanzable, pero por si acaso:
export default function RootPage() {
  redirect('/fixture');
}

