import { useState, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Alert, Share, Platform, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import * as Clipboard from "expo-clipboard";
import {
  getMyOrgs, getCheckoutUrl, getProfile, getProfileStats, API_BASE,
  type MyOrg, type ProfileStats,
} from "@/lib/api";
import { getActiveProfileId, setActiveProfileId, getUserPlan } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY    = "#13263F";
const MUTED   = "#6B7787";
const LABEL   = "#8A94A2";
const GREEN   = "#2F7A5B";
const GOLD    = "#A08A4B";
const HAIRLINE = "rgba(19,38,63,0.08)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function publicCardUrl(orgSlug: string, cardSlug: string) {
  return `${API_BASE}/card/${orgSlug}/${cardSlug}`;
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function stateInfo(status: string): { label: string; color: string } {
  switch (status) {
    case "active":  return { label: "Activa",    color: GREEN };
    case "paused":  return { label: "Pausada",   color: GOLD  };
    default:        return { label: "Borrador",  color: LABEL };
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();

  const [tab, setTab]                 = useState<"mine" | "team">("mine");
  const [orgs, setOrgs]               = useState<MyOrg[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan]     = useState<"gratis" | "pro" | "empresa">("gratis");
  const [loading, setLoading]         = useState(true);
  const [stats, setStats]             = useState<ProfileStats | null>(null);
  const [vcardLoading, setVcardLoading] = useState(false);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  useFocusEffect(
    useCallback(() => { loadData(); }, []),
  );

  async function loadData() {
    setLoading(true);
    try {
      const data      = await getMyOrgs();
      setOrgs(data);
      const saved     = await getActiveProfileId();
      const savedPlan = await getUserPlan();
      if (savedPlan) setLocalPlan(savedPlan);

      const allP    = data.flatMap(o => o.profiles.map(p => ({ ...p, orgSlug: o.orgSlug })));
      const valid   = allP.find(p => p.id === saved && p.status === "active");
      const first   = allP.find(p => p.status === "active");
      const chosen  = valid ?? first ?? null;

      if (chosen) {
        setActiveId(chosen.id);
        await setActiveProfileId(chosen.id);
        const plan = savedPlan ?? "gratis";
        if (plan === "pro" || plan === "empresa") {
          getProfileStats(chosen.id).then(setStats).catch(() => null);
        }
      }
    } catch {
      Alert.alert("Error", "No se pudo cargar tu tarjeta. Verificá tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  // ── Datos derivados ───────────────────────────────────────────────────────

  const allProfiles = orgs.flatMap(o =>
    o.profiles.map(p => ({ ...p, orgSlug: o.orgSlug, orgName: o.orgName }))
  );
  const active    = allProfiles.find(p => p.id === activeProfileId);
  const activeOrg = orgs.find(o => o.profiles.some(p => p.id === activeProfileId));
  const cardUrl   = active ? publicCardUrl(active.orgSlug, active.cardSlug) : null;
  const isPro     = localPlan === "pro" || localPlan === "empresa";
  const isEmpresa = localPlan === "empresa";

  // Filas de tarjetas personales
  const myCards = allProfiles.map(p => {
    const { label, color } = stateInfo(p.status);
    return {
      id:       p.id,
      initials: initials(p.displayName),
      name:     p.displayName,
      role:     p.title ?? "Sin cargo",
      link:     `lubela.app/${p.cardSlug}`,
      state:    label,
      color,
      scans:    p.id === active?.id && stats ? stats.totalViews : 0,
      orgSlug:  p.orgSlug,
      cardSlug: p.cardSlug,
    };
  });

  // Miembros del equipo (perfiles de la org activa)
  const teamMembers = (activeOrg?.profiles ?? []).map(p => {
    const { label, color } = stateInfo(p.status);
    return { id: p.id, name: p.displayName, role: p.title ?? "Sin cargo", state: label, color };
  });
  const seatsUsed  = teamMembers.length;
  const seatsTotal = 15;

  // ── Acciones ──────────────────────────────────────────────────────────────

  async function handleSaveContact() {
    if (!active || !cardUrl) return;
    setVcardLoading(true);
    try {
      const full = await getProfile(active.id).catch(() => null);
      const vcf  = buildVCard({
        fullName:     active.displayName,
        organization: active.orgName,
        title:        active.title    ?? undefined,
        phone:        full?.phone     ?? undefined,
        email:        full?.emailPublic ?? undefined,
        url:          cardUrl,
        note:         full?.bio       ?? undefined,
      });
      await Share.share({ message: vcf, title: `Contacto: ${active.displayName}` });
    } catch {
      Alert.alert("Error", "No se pudo compartir el contacto.");
    } finally {
      setVcardLoading(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.headTitle}>Mis tarjetas</Text>
        <Pressable
          onPress={() => router.push("/(home)/settings")}
          style={({ pressed }) => [s.addBtn, pressed && s.pressed]}
          hitSlop={8}
        >
          <Text style={s.addLabel}>+</Text>
        </Pressable>
      </View>

      {/* Banner pago pendiente Pro */}
      {localPlan === "pro" && activeOrg?.plan === "gratis" && (
        <View style={{ paddingHorizontal: 24, paddingBottom: 10 }}>
          <ProPaymentBanner />
        </View>
      )}

      {/* Tabs (Personales / Equipo) */}
      <View style={s.tabs}>
        {(["mine", "team"] as const).map(key => {
          const label = key === "mine" ? "Personales" : "Equipo";
          const on    = tab === key;
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={[s.tab, on && s.tabOn]}>
              <Text style={[s.tabLabel, { color: on ? NAVY : LABEL }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── TAB: Personales ── */}
        {tab === "mine" && (
          <View style={{ gap: 14 }}>
            {myCards.length === 0 ? (
              <View style={s.empty}>
                <Text style={s.emptyText}>No tenés tarjetas todavía</Text>
                <Pressable
                  style={({ pressed }) => [s.emptyBtn, pressed && s.pressed]}
                  onPress={() => router.push("/(home)/settings")}
                >
                  <Text style={s.emptyBtnLabel}>Crear tarjeta</Text>
                </Pressable>
              </View>
            ) : myCards.map(c => (
              <Pressable
                key={c.id}
                onPress={() => router.push({ pathname: "/(home)/card", params: { profileId: c.id, plan: localPlan } })}
                style={({ pressed }) => [s.card, pressed && s.cardPressed]}
              >
                <View style={s.thumb}>
                  <Text style={s.thumbLabel}>{c.initials}</Text>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.cardName}>{c.name}</Text>
                  <Text style={s.cardRole} numberOfLines={1}>{c.role}</Text>
                  <Text style={s.cardLink} numberOfLines={1}>{c.link}</Text>
                </View>

                <View style={s.cardMeta}>
                  <Text style={[s.cardState, { color: c.color }]}>{c.state}</Text>
                  {isPro && c.scans > 0 && (
                    <Text style={s.cardScans}>{c.scans} escaneos</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* ── TAB: Equipo ── */}
        {tab === "team" && (
          <View style={{ gap: 16 }}>
            {!isEmpresa ? (
              // Upgrade prompt para no-empresa
              <View style={s.upgradeBox}>
                <Text style={s.upgradeTitle}>Plan Empresa</Text>
                <Text style={s.upgradeSub}>
                  Gestioná las tarjetas de todo tu equipo, invitá miembros y controlá licencias desde acá.
                </Text>
                <Pressable
                  style={({ pressed }) => [s.upgradeBtn, pressed && s.pressed]}
                  onPress={() => Alert.alert("Empresa", "Contactanos en hola@lubela.app para activar el plan Empresa.")}
                >
                  <Text style={s.upgradeBtnLabel}>Conocer plan Empresa</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* Seats */}
                <View style={s.seats}>
                  <Text style={s.seatsLabel}>
                    {activeOrg?.orgName ?? "Mi empresa"} · Plan Equipo
                  </Text>
                  <View style={s.seatsRow}>
                    <Text style={s.seatsCount}>{seatsUsed} / {seatsTotal}</Text>
                    <Text style={s.seatsHint}>licencias en uso</Text>
                  </View>
                  <View style={s.track}>
                    <View style={[s.fill, { width: `${(seatsUsed / seatsTotal) * 100}%` as any }]} />
                  </View>
                </View>

                {/* Members */}
                <View>
                  {teamMembers.map(m => (
                    <Pressable
                      key={m.id}
                      onPress={() => router.push({ pathname: "/(home)/card", params: { profileId: m.id, plan: localPlan } })}
                      style={({ pressed }) => [s.memberRow, pressed && { opacity: 0.6 }]}
                    >
                      <View style={s.memberAvatar} />
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={s.memberName}>{m.name}</Text>
                        <Text style={s.memberRole}>{m.role}</Text>
                      </View>
                      <Text style={[s.memberState, { color: m.color }]}>{m.state}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={() => Alert.alert("Invitar", "Invitar por email — próximamente disponible.")}
                  style={({ pressed }) => [s.invite, pressed && s.pressed]}
                >
                  <Text style={s.inviteLabel}>Invitar por email</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Pro Payment Banner ───────────────────────────────────────────────────────

function ProPaymentBanner() {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const { checkoutUrl } = await getCheckoutUrl();
      await Linking.openURL(checkoutUrl);
    } catch {
      Alert.alert("Error", "No se pudo iniciar el pago. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Pressable
      onPress={handlePay}
      style={({ pressed }) => [s.payBanner, pressed && { opacity: 0.9 }]}
    >
      <View style={s.payDot} />
      <View style={{ flex: 1 }}>
        <Text style={s.payTitle}>Pago pendiente · Pro</Text>
        <Text style={s.paySub}>Completá el pago para activar todas las funciones</Text>
      </View>
      {loading
        ? <ActivityIndicator size="small" color={NAVY} />
        : <Text style={s.payArrow}>→</Text>
      }
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 6,
    paddingBottom: 4,
  },
  headTitle: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32, color: NAVY,
  },
  addBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
  },
  addLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 22, color: "#FFFFFF", lineHeight: 24,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    gap: 22,
    paddingHorizontal: 24,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  tab: {
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabOn: { borderBottomColor: NAVY },
  tabLabel: { fontFamily: "Jost_400Regular", fontSize: 14 },

  // Scroll
  scroll: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 },

  // Card row
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(19,38,63,0.12)",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },
  cardPressed: { borderColor: NAVY, backgroundColor: "#FCFBF9" },
  thumb: {
    width: 52, height: 52,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
  },
  thumbLabel: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 20, letterSpacing: 1.2, color: "#FFFFFF",
  },
  cardBody: { flex: 1, gap: 3, minWidth: 0 },
  cardName: { fontFamily: "Jost_500Medium", fontSize: 15, color: NAVY },
  cardRole: { fontFamily: "Jost_400Regular", fontSize: 13, color: MUTED },
  cardLink: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },
  cardMeta: { alignItems: "flex-end", gap: 6 },
  cardState: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  cardScans: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },

  // Empty
  empty: { alignItems: "center", paddingVertical: 48, gap: 16 },
  emptyText: { fontFamily: "Jost_400Regular", fontSize: 14, color: LABEL },
  emptyBtn: {
    borderWidth: 1, borderColor: "rgba(19,38,63,0.2)",
    borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
  },
  emptyBtnLabel: { fontFamily: "Jost_500Medium", fontSize: 14, color: NAVY },

  // Team — seats
  seats: {
    borderRadius: 18, backgroundColor: NAVY,
    padding: 18, gap: 10,
  },
  seatsLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.55)",
  },
  seatsRow: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  seatsCount: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32, color: "#FFFFFF",
  },
  seatsHint: {
    fontFamily: "Jost_400Regular",
    fontSize: 13, color: "rgba(255,255,255,0.6)",
  },
  track: {
    height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
    overflow: "hidden",
  },
  fill: { height: "100%", backgroundColor: "#FFFFFF" },

  // Team — member rows
  memberRow: {
    flexDirection: "row", alignItems: "center",
    gap: 13, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  memberAvatar: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "#EFEDE8",
    borderWidth: 1, borderColor: "rgba(19,38,63,0.1)",
  },
  memberName: { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },
  memberRole: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },
  memberState: { fontFamily: "Jost_400Regular", fontSize: 12 },

  // Invite
  invite: {
    height: 50, borderRadius: 14,
    borderWidth: 1, borderStyle: "dashed",
    borderColor: "rgba(19,38,63,0.28)",
    alignItems: "center", justifyContent: "center",
  },
  inviteLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },

  // Upgrade prompt
  upgradeBox: {
    borderRadius: 18, borderWidth: 1,
    borderColor: "rgba(19,38,63,0.12)",
    padding: 24, gap: 12, alignItems: "center",
  },
  upgradeTitle: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 26, color: NAVY,
  },
  upgradeSub: {
    fontFamily: "Jost_400Regular",
    fontSize: 14, color: MUTED,
    lineHeight: 22, textAlign: "center",
  },
  upgradeBtn: {
    marginTop: 4, borderRadius: 12,
    backgroundColor: NAVY,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  upgradeBtnLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 14, color: "#FFFFFF",
  },

  // Pro payment banner
  payBanner: {
    flexDirection: "row", alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(19,38,63,0.04)",
    borderWidth: 1, borderColor: "rgba(19,38,63,0.12)",
    borderRadius: 14, padding: 14,
  },
  payDot: {
    width: 8, height: 8,
    borderRadius: 4, backgroundColor: GOLD,
    flexShrink: 0,
  },
  payTitle: { fontFamily: "Jost_500Medium", fontSize: 13, color: NAVY },
  paySub:   { fontFamily: "Jost_400Regular", fontSize: 12, color: MUTED },
  payArrow: { fontFamily: "Jost_400Regular", fontSize: 18, color: NAVY },

  pressed: { opacity: 0.8 },
});

// ─── vCard ────────────────────────────────────────────────────────────────────

function escVCard(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

function buildVCard(input: {
  fullName: string; organization?: string; title?: string;
  phone?: string; email?: string; url?: string; note?: string;
}) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`FN:${escVCard(input.fullName)}`);
  if (input.organization) lines.push(`ORG:${escVCard(input.organization)}`);
  if (input.title)        lines.push(`TITLE:${escVCard(input.title)}`);
  if (input.phone)        lines.push(`TEL;TYPE=CELL:${escVCard(input.phone)}`);
  if (input.email)        lines.push(`EMAIL;TYPE=INTERNET:${escVCard(input.email)}`);
  if (input.url)          lines.push(`URL:${escVCard(input.url)}`);
  if (input.note)         lines.push(`NOTE:${escVCard(input.note)}`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}
