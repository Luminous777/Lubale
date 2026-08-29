import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, Share, Platform,
} from "react-native";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { getMyOrgs, getCheckoutUrl, type MyOrg } from "@/lib/api";
import { getActiveProfileId, setActiveProfileId, getUserPlan } from "@/lib/storage";
import { API_BASE } from "@/lib/api";
import { Linking } from "react-native";
import { Button, Card, IconBadge } from "@/components/ui";
import { colors, radius, spacing, font, shadow } from "@/lib/theme";

function publicCardUrl(orgSlug: string, cardSlug: string) {
  return `${API_BASE}/card/${orgSlug}/${cardSlug}`;
}

export default function HomeScreen() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<MyOrg[]>([]);
  const [activeProfileId, setActiveId] = useState<string | null>(null);
  const [localPlan, setLocalPlan] = useState<"gratis" | "pro" | "empresa">("gratis");
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    setLoading(true);
    try {
      const data = await getMyOrgs();
      setOrgs(data);
      const saved = await getActiveProfileId();
      const savedPlan = await getUserPlan();
      if (savedPlan) setLocalPlan(savedPlan);
      // Encuentra el perfil guardado, o usa el primero activo disponible
      const allProfiles = data.flatMap((o) => o.profiles.map((p) => ({ ...p, orgSlug: o.orgSlug })));
      const valid = allProfiles.find((p) => p.id === saved && p.status === "active");
      const first = allProfiles.find((p) => p.status === "active");
      const chosen = valid ?? first ?? null;
      if (chosen) {
        setActiveId(chosen.id);
        await setActiveProfileId(chosen.id);
      }
    } catch {
      Alert.alert("Error", "No se pudo cargar tu tarjeta. Verificá tu conexión.");
    } finally {
      setLoading(false);
    }
  }

  // Resuelve el perfil y org activos
  const allProfiles = orgs.flatMap((o) =>
    o.profiles.map((p) => ({ ...p, orgSlug: o.orgSlug, orgName: o.orgName })),
  );
  const active = allProfiles.find((p) => p.id === activeProfileId);
  const activeOrg = orgs.find((o) => o.profiles.some((p) => p.id === activeProfileId));
  const cardUrl = active ? publicCardUrl(active.orgSlug, active.cardSlug) : null;

  async function handleShare() {
    if (!cardUrl || !active) return;
    await Share.share({
      message: Platform.OS === "ios" ? active.displayName : `${active.displayName} — ${cardUrl}`,
      url: Platform.OS === "ios" ? cardUrl : undefined,
      title: active.displayName,
    });
  }

  async function handleCopy() {
    if (!cardUrl) return;
    await Clipboard.setStringAsync(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function switchProfile(id: string) {
    setActiveId(id);
    await setActiveProfileId(id);
  }

  const settingsButton = (
    <TouchableOpacity
      onPress={() => router.push("/(home)/settings")}
      style={styles.headerBtn}
      hitSlop={8}
    >
      <Feather name="settings" size={20} color={colors.ink} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!active || !cardUrl) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "Mi Tarjeta", headerRight: () => settingsButton }} />
        <IconBadge icon="credit-card" tone="neutral" size={64} />
        <Text style={styles.emptyTitle}>Sin tarjeta activa</Text>
        <Text style={styles.emptyText}>
          Tu cuenta no tiene ninguna tarjeta creada todavía.
        </Text>
        <Button
          label="Ir a ajustes"
          variant="secondary"
          icon="settings"
          onPress={() => router.push("/(home)/settings")}
          style={{ marginTop: spacing.xl }}
        />
      </View>
    );
  }

  const activeProfiles = allProfiles.filter((p) => p.status === "active");

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: "Mi Tarjeta", headerRight: () => settingsButton }} />

      {/* Selector de tarjeta si hay más de una */}
      {activeProfiles.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorRow}
        >
          {activeProfiles.map((p) => {
            const isActive = p.id === activeProfileId;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.selectorChip, isActive && styles.selectorChipActive]}
                onPress={() => switchProfile(p.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[styles.selectorText, isActive && styles.selectorTextActive]}
                  numberOfLines={1}
                >
                  {p.displayName}
                </Text>
                <Text
                  style={[styles.selectorOrg, isActive && styles.selectorOrgActive]}
                  numberOfLines={1}
                >
                  {p.orgName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Banner pago pendiente */}
      {localPlan === "pro" && activeOrg?.plan === "gratis" && <ProPaymentBanner />}

      {/* Card con QR */}
      <Card style={styles.card}>
        <Text style={styles.name}>{active.displayName}</Text>
        {active.title ? <Text style={styles.title}>{active.title}</Text> : null}
        <View style={styles.orgRow}>
          <Feather name="briefcase" size={12} color={colors.faint} />
          <Text style={styles.orgName}>{active.orgName}</Text>
        </View>

        <View style={styles.qrWrap}>
          <QRCode value={cardUrl} size={216} color={colors.ink} backgroundColor={colors.surface} />
        </View>

        <View style={styles.urlPill}>
          <Feather name="link" size={13} color={colors.muted} />
          <Text style={styles.urlText} numberOfLines={1}>
            {cardUrl.replace(/^https?:\/\//, "")}
          </Text>
        </View>
      </Card>

      {/* Acciones */}
      <View style={styles.actions}>
        <Button label="Compartir tarjeta" icon="share-2" onPress={handleShare} />
        <Button
          label={copied ? "¡Link copiado!" : "Copiar link"}
          icon={copied ? "check" : "copy"}
          variant="secondary"
          onPress={handleCopy}
        />
        <Button
          label="Editar mi tarjeta"
          icon="edit-3"
          variant="ghost"
          onPress={() => {
            const org = orgs.find((o) => o.profiles.some((p) => p.id === active.id));
            const plan = org
              ? org.orgKind === "business"
                ? "empresa"
                : (org.plan ?? localPlan)
              : localPlan;
            router.push({ pathname: "/(home)/edit", params: { profileId: active.id, plan } });
          }}
        />
      </View>
    </ScrollView>
  );
}

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
    <View style={styles.payBanner}>
      <View style={styles.payIcon}>
        <Feather name="zap" size={18} color={colors.pro} />
      </View>
      <View style={styles.payBannerText}>
        <Text style={styles.payBannerTitle}>Plan Pro — pago pendiente</Text>
        <Text style={styles.payBannerSub}>
          Completá el pago para desbloquear foto, bio y links ilimitados.
        </Text>
      </View>
      <TouchableOpacity style={styles.payBannerBtn} onPress={handlePay} disabled={loading} activeOpacity={0.85}>
        {loading ? (
          <ActivityIndicator color={colors.onInk} size="small" />
        ) : (
          <Text style={styles.payBannerBtnText}>Pagar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

HomeScreen.options = { title: "Mi Tarjeta" };

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing["2xl"], paddingBottom: spacing["4xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing["3xl"], backgroundColor: colors.background },
  headerBtn: { paddingHorizontal: spacing.xs },

  emptyTitle: { fontSize: font.lg, fontWeight: font.bold, color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.xs },
  emptyText: { fontSize: font.sm, color: colors.muted, textAlign: "center", lineHeight: 20 },

  selectorRow: { paddingBottom: spacing.lg, gap: spacing.sm, flexDirection: "row" },
  selectorChip: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: 170,
  },
  selectorChipActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  selectorText: { fontSize: font.sm, fontWeight: font.semibold, color: colors.ink },
  selectorTextActive: { color: colors.onInk },
  selectorOrg: { fontSize: font.xs, color: colors.faint, marginTop: 2 },
  selectorOrgActive: { color: "rgba(255,255,255,0.6)" },

  card: { alignItems: "center", marginBottom: spacing.xl, padding: spacing["2xl"] },
  name: { fontSize: font.xl, fontWeight: font.bold, color: colors.ink, textAlign: "center", letterSpacing: -0.3 },
  title: { fontSize: font.base, color: colors.muted, marginTop: spacing.xs, textAlign: "center" },
  orgRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: spacing.sm },
  orgName: { fontSize: font.xs, color: colors.faint, textAlign: "center", textTransform: "uppercase", letterSpacing: 1 },
  qrWrap: {
    marginTop: spacing["2xl"],
    marginBottom: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    maxWidth: 280,
  },
  urlText: { fontSize: font.xs, color: colors.muted, flexShrink: 1 },

  actions: { gap: spacing.md },

  payBanner: {
    backgroundColor: colors.proSoft,
    borderWidth: 1,
    borderColor: colors.proBorder,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  payIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  payBannerText: { flex: 1 },
  payBannerTitle: { fontSize: font.sm, fontWeight: font.bold, color: colors.pro, marginBottom: 2 },
  payBannerSub: { fontSize: font.xs, color: colors.muted, lineHeight: 16 },
  payBannerBtn: {
    backgroundColor: colors.pro,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 60,
    alignItems: "center",
  },
  payBannerBtnText: { fontSize: font.sm, fontWeight: font.bold, color: colors.onInk },
});
