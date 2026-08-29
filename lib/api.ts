import * as SecureStore from "expo-secure-store";

// En dev usa la IP de la red local. En prod cambia por tu dominio.
export const API_BASE = "http://192.168.1.162:3001";

export type ApiError = { error: string };

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("access_token");
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al iniciar sesión");
  await SecureStore.setItemAsync("access_token", data.access_token);
  return data as { access_token: string; expires_in: number };
}

export async function registerPersonal(payload: {
  name: string;
  handle: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/api/signup/personal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al registrarse");
  return data as { ok: boolean; handle: string };
}

// POST /api/signup/pro
// Body: { name, handle, email, password }
// Response: { ok: true, handle: string }
// El backend crea user + org personal marcada como plan "pro".
export async function registerPro(payload: {
  name: string;
  handle: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/api/signup/pro`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al registrarse en plan Pro");
  return data as { ok: boolean; handle: string };
}

// POST /api/signup/invite
// Body: { inviteCode, name, email, password }
// Response: { ok: true, orgSlug: string, orgName: string }
// El backend valida el código, crea el user y lo asocia a la org de la empresa.
// El cardSlug se genera automáticamente desde el nombre.
export async function registerInvite(payload: {
  inviteCode: string;
  name: string;
  email: string;
  password: string;
}) {
  const res = await fetch(`${API_BASE}/api/signup/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al unirse con el código de invitación");
  return data as { ok: boolean; orgSlug: string; orgName: string };
}

export async function getCheckoutUrl(): Promise<{ checkoutUrl: string }> {
  const res = await fetch(`${API_BASE}/api/v1/billing/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al iniciar el pago");
  return data as { checkoutUrl: string };
}

export async function logout() {
  await SecureStore.deleteItemAsync("access_token");
  await SecureStore.deleteItemAsync("active_profile");
}

// ─── Me ──────────────────────────────────────────────────────────────────────

export type MeResponse = { id: string; email: string; name: string | null };

export async function getMe(): Promise<MeResponse> {
  const res = await fetch(`${API_BASE}/api/v1/me`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "No autenticado");
  return data as MeResponse;
}

// ─── Organizaciones y perfiles ───────────────────────────────────────────────

export type ProfileSummary = {
  id: string;
  cardSlug: string;
  displayName: string;
  title: string | null;
  status: "active" | "disabled";
  ownerUserId: string | null;
};

export type OrgSummary = {
  id: string;
  slug: string;
  name: string;
  kind: "business" | "personal";
};

export type OrgProfilesResponse = {
  organization: OrgSummary;
  profiles: ProfileSummary[];
};

export async function getOrgProfiles(orgSlug: string): Promise<OrgProfilesResponse> {
  const res = await fetch(`${API_BASE}/api/v1/organizations/${orgSlug}/profiles`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar perfiles");
  return data as OrgProfilesResponse;
}

// ─── Perfil detallado ────────────────────────────────────────────────────────

export type ProfileLink = {
  id: string;
  title: string;
  url: string;
  kind: string;
  sortOrder: number;
};

export type ProfileDetail = {
  id: string;
  cardSlug: string;
  displayName: string;
  title: string | null;
  bio: string | null;
  phone: string | null;
  emailPublic: string | null;
  photoUrl: string | null;
  status: "active" | "disabled";
  organization: { id: string; slug: string; name: string; kind: string };
  links: ProfileLink[];
};

export async function getProfile(profileId: string): Promise<ProfileDetail> {
  const res = await fetch(`${API_BASE}/api/v1/profile/${profileId}`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar el perfil");
  return data as ProfileDetail;
}

export type UpdateProfilePayload = {
  displayName: string;
  title?: string;
  bio?: string;
  phone?: string;
  emailPublic?: string;
  photoUrl?: string;
  links: { id?: string; title: string; url: string; sortOrder: number }[];
};

export async function updateProfile(profileId: string, payload: UpdateProfilePayload) {
  const res = await fetch(`${API_BASE}/api/v1/profile/${profileId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al guardar el perfil");
  return data as ProfileDetail;
}

// ─── Mis orgs (todas las del usuario) ────────────────────────────────────────

export type MyOrg = {
  orgSlug: string;
  orgName: string;
  orgKind: "business" | "personal";
  plan?: "gratis" | "pro" | "empresa";
  profiles: ProfileSummary[];
};

export async function getMyOrgs(): Promise<MyOrg[]> {
  const res = await fetch(`${API_BASE}/api/v1/my-orgs`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar organizaciones");
  return data as MyOrg[];
}

// ─── IA ──────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/ai/card-text
 * Genera texto (bio, descripción) usando IA. Solo disponible en plan Pro/Empresa.
 * Cupo: 4 textos/mes por usuario.
 */
export async function generateAiBio(prompt: string): Promise<{ text: string }> {
  const res = await fetch(`${API_BASE}/api/v1/ai/card-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify({ prompt }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al generar texto con IA");
  return data as { text: string };
}

// ─── Analíticas ───────────────────────────────────────────────────────────────

export type ProfileStats = {
  weekViews: number;
  monthViews: number;
  totalViews: number;
};

/**
 * GET /api/v1/profile/:profileId/stats
 * Devuelve vistas de la tarjeta: última semana, último mes y totales.
 * Solo disponible en plan Pro/Empresa.
 */
export async function getProfileStats(profileId: string): Promise<ProfileStats> {
  const res = await fetch(`${API_BASE}/api/v1/profile/${profileId}/stats`, {
    headers: await authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Error al cargar analíticas");
  return data as ProfileStats;
}
