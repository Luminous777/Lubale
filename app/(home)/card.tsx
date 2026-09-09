import { useState, useEffect } from "react";
import {
  View, Text, Image, Pressable, ScrollView, StyleSheet,
  Linking, Platform, StatusBar, ActivityIndicator, Alert, Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getProfile, API_BASE, type ProfileDetail } from "@/lib/api";
import { getUserPlan } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY   = "#13263F";
const MUTED  = "#4A5768";
const LABEL  = "#8A94A2";
const BORDER = "rgba(19,38,63,0.14)";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

function publicCardUrl(orgSlug: string, cardSlug: string) {
  return `${API_BASE}/card/${orgSlug}/${cardSlug}`;
}

// Tipos de link que se muestran como chip social
const SOCIAL_KINDS = ["instagram", "linkedin", "twitter", "tiktok", "youtube", "github", "behance"];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PublicCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId, plan: planParam } = useLocalSearchParams<{ profileId: string; plan?: string }>();

  const [profile, setProfile]     = useState<ProfileDetail | null>(null);
  const [localPlan, setLocalPlan] = useState<string>(planParam ?? "gratis");
  const [loading, setLoading]     = useState(true);
  const [vcSaving, setVcSaving]   = useState(false);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  useEffect(() => {
    if (!profileId) return;
    (async () => {
      try {
        const [p, savedPlan] = await Promise.all([
          getProfile(profileId),
          getUserPlan(),
        ]);
        setProfile(p);
        if (savedPlan) setLocalPlan(savedPlan);
      } catch {
        Alert.alert("Error", "No se pudo cargar la tarjeta.");
        router.back();
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  // ── Acciones ──────────────────────────────────────────────────────────────

  function call() {
    if (!profile?.phone) return;
    Linking.openURL(`tel:${profile.phone}`);
  }

  function mail() {
    if (!profile?.emailPublic) return;
    Linking.openURL(`mailto:${profile.emailPublic}`);
  }

  function whatsapp() {
    if (!profile?.phone) return;
    Linking.openURL(`https://wa.me/${profile.phone.replace(/\D/g, "")}`);
  }

  async function saveContact() {
    if (!profile) return;
    setVcSaving(true);
    try {
      const cardUrl = publicCardUrl(profile.organization.slug, profile.cardSlug);
      const vcf = buildVCard({
        fullName:     profile.displayName,
        organization: profile.organization.name,
        title:        profile.title    ?? undefined,
        phone:        profile.phone    ?? undefined,
        email:        profile.emailPublic ?? undefined,
        url:          cardUrl,
        note:         profile.bio      ?? undefined,
      });
      await Share.share({ message: vcf, title: `Contacto: ${profile.displayName}` });
    } catch {
      Alert.alert("Error", "No se pudo compartir el contacto.");
    } finally {
      setVcSaving(false);
    }
  }

  // ── Carga ─────────────────────────────────────────────────────────────────

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  if (!profile) return null;

  // ── Datos ─────────────────────────────────────────────────────────────────

  const cardUrl    = publicCardUrl(profile.organization.slug, profile.cardSlug);
  const socials    = profile.links.filter(l => SOCIAL_KINDS.includes(l.kind));
  const hasPhone   = !!profile.phone;
  const hasEmail   = !!profile.emailPublic;

  const actions = [
    { mark: "✆", label: "Llamar",   onPress: call,        disabled: !hasPhone },
    { mark: "✉", label: "Email",    onPress: mail,        disabled: !hasEmail },
    { mark: "◈", label: "WhatsApp", onPress: whatsapp,    disabled: !hasPhone },
    { mark: "↓", label: "Guardar",  onPress: saveContact, disabled: false     },
  ];

  const details = [
    hasPhone  && { label: "Teléfono", value: profile.phone! },
    hasEmail  && { label: "Email",    value: profile.emailPublic! },
    { label: "Lubela",    value: `lubela.app/${profile.cardSlug}` },
    profile.organization.name && { label: "Organización", value: profile.organization.name },
  ].filter(Boolean) as { label: string; value: string }[];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 26 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero navy ── */}
        <View style={[s.hero, { paddingTop: insets.top + 18 }]}>

          {/* Botón Volver */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(home)/")}
            style={[s.editBtn, { top: insets.top + 12, left: 24 }]}
            hitSlop={8}
          >
            <Text style={s.editLabel}>← Volver</Text>
          </Pressable>

          {/* Botón Editar */}
          <Pressable
            onPress={() => router.push({ pathname: "/(home)/edit", params: { profileId: profile.id, plan: localPlan } })}
            style={[s.editBtn, { top: insets.top + 12 }]}
            hitSlop={8}
          >
            <Text style={s.editLabel}>Editar</Text>
          </Pressable>

          {/* Avatar o monograma */}
          {profile.photoUrl ? (
            <Image source={{ uri: profile.photoUrl }} style={s.avatar} />
          ) : (
            <View style={[s.avatar, s.avatarMono]}>
              <Text style={s.monogram}>{initials(profile.displayName)}</Text>
            </View>
          )}

          <View style={{ alignItems: "center", gap: 7 }}>
            <Text style={s.name}>{profile.displayName}</Text>
            {profile.title ? (
              <Text style={s.role}>{profile.title.toUpperCase()}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={s.body}>

          {/* Bio */}
          {profile.bio ? (
            <Text style={s.bio}>{profile.bio}</Text>
          ) : null}

          {/* Acciones rápidas */}
          <View style={s.actions}>
            {actions.map(a => (
              <Pressable
                key={a.label}
                onPress={a.onPress}
                disabled={a.disabled}
                style={({ pressed }) => [
                  s.action,
                  a.disabled && s.actionDisabled,
                  pressed && !a.disabled && s.actionPressed,
                ]}
              >
                {a.label === "Guardar" && vcSaving
                  ? <ActivityIndicator size="small" color={NAVY} />
                  : <Text style={[s.actionMark, a.disabled && { opacity: 0.2 }]}>{a.mark}</Text>
                }
                <Text style={[s.actionLabel, a.disabled && { opacity: 0.3 }]}>{a.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Detalles */}
          <View>
            {details.map(d => (
              <View key={d.label} style={s.detailRow}>
                <Text style={s.detailLabel}>{d.label}</Text>
                <Text style={s.detailValue} numberOfLines={1}>{d.value}</Text>
              </View>
            ))}
          </View>

          {/* Redes sociales */}
          {socials.length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={s.sectionLabel}>Redes</Text>
              <View style={s.socialList}>
                {socials.map(l => (
                  <Pressable
                    key={l.id}
                    onPress={() => Linking.openURL(l.url)}
                    style={({ pressed }) => [s.socialChip, pressed && s.actionPressed]}
                  >
                    <Text style={s.socialLabel}>{l.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Links adicionales (website, etc.) */}
          {profile.links.filter(l => !SOCIAL_KINDS.includes(l.kind)).length > 0 && (
            <View style={{ gap: 10 }}>
              <Text style={s.sectionLabel}>Links</Text>
              {profile.links
                .filter(l => !SOCIAL_KINDS.includes(l.kind))
                .map(l => (
                  <Pressable
                    key={l.id}
                    onPress={() => Linking.openURL(l.url)}
                    style={({ pressed }) => [s.linkRow, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={s.linkTitle}>{l.title}</Text>
                    <Text style={s.linkUrl} numberOfLines={1}>{l.url.replace(/^https?:\/\//, "")}</Text>
                  </Pressable>
                ))
              }
            </View>
          )}

          {/* ── CTA dejar datos → web ── */}
          <View style={s.leadCta}>
            <Text style={s.leadCtaHeading}>
              ¿Querés que {profile.displayName.split(" ")[0]} te contacte?
            </Text>
            <Text style={s.leadCtaSub}>
              Dejá tus datos y te escribe. Solo los ve{" "}
              {profile.displayName.split(" ")[0]}.
            </Text>
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://lubela.app/${profile.organization.slug}/contacto`,
                )
              }
              style={({ pressed }) => [s.leadBtn, pressed && s.pressed]}
            >
              <Text style={s.leadBtnLabel}>Dejar mis datos</Text>
            </Pressable>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.wordmark}>LUBELA</Text>
            <Text style={s.footerHint}>Creá la tuya en lubela.app</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  hero: {
    backgroundColor: NAVY,
    paddingHorizontal: 28,
    paddingBottom: 34,
    alignItems: "center",
    gap: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  editBtn: {
    position: "absolute",
    right: 24,
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  editLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: "#FFFFFF" },

  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarMono: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  monogram: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 40, letterSpacing: 4,
    color: "#FFFFFF", paddingLeft: 4,
  },
  name: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32, color: "#FFFFFF", textAlign: "center",
  },
  role: {
    fontFamily: "Jost_400Regular",
    fontSize: 12, letterSpacing: 2.4,
    color: "rgba(255,255,255,0.62)", textAlign: "center",
  },

  body: { paddingHorizontal: 28, paddingTop: 26, gap: 22 },

  bio: {
    fontFamily: "Jost_400Regular",
    fontSize: 15, lineHeight: 26,
    color: MUTED, textAlign: "center",
  },

  // Botones acción
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  action: {
    width: "47.5%",
    flexGrow: 1,
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionPressed: { backgroundColor: "#F3F1EC" },
  actionDisabled: { opacity: 0.45 },
  actionMark: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15, color: NAVY, opacity: 0.55,
  },
  actionLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },

  // Filas de detalle
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(19,38,63,0.09)",
  },
  detailLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase", color: LABEL,
  },
  detailValue: {
    fontFamily: "Jost_400Regular",
    fontSize: 14, color: NAVY,
    flexShrink: 1, textAlign: "right",
  },

  // Redes
  sectionLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase", color: LABEL,
  },
  socialList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  socialChip: {
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 99, borderWidth: 1, borderColor: BORDER,
  },
  socialLabel: { fontFamily: "Jost_400Regular", fontSize: 13, color: NAVY },

  // Links adicionales
  linkRow: {
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, borderWidth: 1, borderColor: BORDER,
    gap: 2,
  },
  linkTitle: { fontFamily: "Jost_500Medium", fontSize: 13, color: NAVY },
  linkUrl:   { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },

  // CTA
  cta: {
    height: 56, borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
  },
  ctaLabel: { fontFamily: "Jost_500Medium", fontSize: 16, color: "#FFFFFF" },

  // Footer
  footer: { alignItems: "center", gap: 6, paddingBottom: 6 },
  wordmark: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 15, letterSpacing: 4.5,
    color: LABEL, paddingLeft: 4.5,
  },
  footerHint: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#A6AEB9" },

  // CTA dejar datos
  leadCta: {
    borderTopWidth: 1,
    borderTopColor: "rgba(19,38,63,0.09)",
    paddingTop: 24,
    gap: 12,
  },
  leadCtaHeading: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 24, color: NAVY, lineHeight: 30,
  },
  leadCtaSub: {
    fontFamily: "Jost_400Regular",
    fontSize: 13, lineHeight: 21,
    color: MUTED,
  },
  leadBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  leadBtnLabel: { fontFamily: "Jost_500Medium", fontSize: 16, color: "#FFFFFF" },

  pressed: { opacity: 0.85 },
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
