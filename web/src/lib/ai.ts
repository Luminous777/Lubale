/**
 * @/lib/ai — stub de funciones de IA
 *
 * TODO: implementar con Anthropic Claude API.
 * Por ahora las funciones devuelven valores de ejemplo para que la UI funcione.
 */

/** Genera una propuesta de colores de marca a partir de un prompt de texto. */
export async function suggestBranding({
  prompt,
  orgName,
}: {
  prompt: string;
  orgName: string;
}): Promise<{ primary: string; secondary: string }> {
  // TODO: llamar a Claude con el prompt y el nombre de la org para sugerir una paleta.
  // El response debe incluir colores en formato #RRGGBB.
  if (process.env.NODE_ENV === 'development') {
    console.log('[ai] suggestBranding', { orgName, prompt: prompt.slice(0, 60) });
  }

  // Stub: devuelve una paleta por defecto
  return { primary: '#13263F', secondary: '#3C5A80' };
}

/** Genera contenido de tarjeta (bio, título) a partir de un prompt. */
export async function generateCardContent({
  prompt,
  displayName,
}: {
  prompt: string;
  displayName: string;
}): Promise<{ title?: string; bio?: string }> {
  // TODO: llamar a Claude para generar título y bio personalizados.
  if (process.env.NODE_ENV === 'development') {
    console.log('[ai] generateCardContent', { displayName, prompt: prompt.slice(0, 60) });
  }

  return {};
}
