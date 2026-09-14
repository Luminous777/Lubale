// app/crear/page.tsx — Server Component (lee los datos del formulario anterior)
import ClaimForm from './ClaimForm';

export const metadata = { title: 'Crear mi tarjeta', robots: { index: false } };

// Depende de searchParams del formulario anterior: se renderiza por request,
// no en build. Evita el prerender estático de un formulario interactivo.
export const dynamic = 'force-dynamic';

type Query = {
  name?:    string;
  email?:   string;
  company?: string;
  slug?:    string;
  trial?:   string;
};

export default async function CreatePage({ searchParams }: { searchParams: Promise<Query> }) {
  const { name = '', email = '', company = '', slug = '', trial } = await searchParams;

  return (
    <ClaimForm
      initial={{ name, email, company, slug: slug || slugify(name) }}
      trial={trial === 'pro_30d'}
    />
  );
}

function slugify(v: string) {
  return v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 32);
}
