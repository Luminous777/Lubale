import { useState, useCallback } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView, Share, Platform,
} from "react-native";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";
import { getMyOrgs, getCheckoutUrl, type MyOrg } from "@/lib/api";
import { getActiveProfileId, setActiveProfileId, getUserPlan } from "@/lib/storage";
import { API_BASE } from "@/lib/api";
import { Linking } from "react-native";

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3f67c4" />
      </View>
    );
  }

  if (!active || !cardUrl) {
    return (
      <View style={styles.center}>
        <Stack.Screen
          options={{
            title: "Mi Tarjeta",
            headerRight: () => (
              <TouchableOpacity onPress={() => router.push("/(home)/settings")} style={{ paddingRight: 4 }}>
                <Text style={{ fontSize: 22 }}>⚙️</Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={styles.emptyTitle}>Sin tarjeta activa</Text>
        <Text style={styles.emptyText}>
          Tu cuenta no tiene ninguna tarjeta creada todavía.
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => router.push("/(home)/settings")}
        >
          <Text style={styles.emptyBtnText}>Ir a ajustes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: "Mi Tarjeta",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/(home)/settings")} style={{ paddingRight: 4 }}>
              <Text style={{ fontSize: 22 }}>⚙️</Text>
            </TouchableOpacity>
          ),
        }}
      />
      {/* Selector de tarjeta si hay más de una */}
      {allProfiles.filter((p) => p.status === "active").length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorRow}
        >
          {allProfiles
            .filter((p) => p.status === "active")
            .map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.selectorChip, p.id === activeProfileId && styles.selectorChipActive]}
                onPress={() => switchProfile(p.id)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    p.id === activeProfileId && styles.selectorTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {p.displayName}
                </Text>
                <Text style={styles.selectorOrg} numberOfLines={1}>
                  {p.orgName}
                </Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      ) : null}

      {/* Banner pago pendiente */}
      {localPlan === "pro" && activeOrg?.plan === "gratis" && (
        <ProPaymentBanner />
      )}

      {/* Card con QR */}
      <View style={styles.card}>
        <Text style={styles.name}>{active.displayName}</Text>
        {active.title ? <Text style={styles.title}>{active.title}</Text> : null}
        <Text style={styles.orgName}>{active.orgName}</Text>

        <View style={styles.qrWrap}>
          <QRCode
            value={cardUrl}
            size={220}
            color="#3f67c4"
            backgroundColor="#ffffff"
          />
        </View>

        <Text style={styles.urlText} numberOfLines={1}>
          {cardUrl}
        </Text>
      </View>

      {/* Acciones */}
      <TouchableOpacity style={styles.btnPrimary} onPress={handleShare}>
        <Text style={styles.btnPrimaryText}>Compartir tarjeta</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnSecondary} onPress={handleCopy}>
        <Text style={styles.btnSecondaryText}>
          {copied ? "¡Link copiado!" : "Copiar link"}
        </Text>
      </TouchableOpacity>

      {/* Ir a editar */}
      <TouchableOpacity
        style={styles.btnGhost}
        onPress={() => {
          const activeOrg = orgs.find((o) => o.profiles.some((p) => p.id === active.id));
          const plan = activeOrg
            ? activeOrg.orgKind === "business"
              ? "empresa"
              : (activeOrg.plan ?? localPlan)
            : localPlan;
          router.push({ pathname: "/(home)/edit", params: { profileId: active.id, plan } });
        }}
      >
        <Text style={styles.btnGhostText}>Editar mi tarjeta</Text>
      </TouchableOpacity>
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
      <View style={styles.payBannerText}>
        <Text style={styles.payBannerTitle}>✨ Plan Pro — pago pendiente</Text>
        <Text style={styles.payBannerSub}>
          Completá el pago para desbloquear foto, bio y links ilimitados.
        </Text>
      </View>
      <TouchableOpacity style={styles.payBannerBtn} onPress={handlePay} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.payBannerBtnText}>Pagar</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

HomeScreen.options = { title: "Mi Tarjeta" };

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 24, paddingBottom: 48, alignItems: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8 },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center", marginBottom: 24 },
  emptyBtn: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },

  selectorRow: { paddingBottom: 16, gap: 8, flexDirection: "row" },
  selectorChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxWidth: 160,
  },
  selectorChipActive: { borderColor: "#3f67c4", backgroundColor: "#eff4ff" },
  selectorText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  selectorTextActive: { color: "#3f67c4" },
  selectorOrg: { fontSize: 11, color: "#94a3b8", marginTop: 1 },

  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 20,
  },
  name: { fontSize: 22, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  title: { fontSize: 14, color: "#64748b", marginTop: 4, textAlign: "center" },
  orgName: { fontSize: 12, color: "#94a3b8", marginTop: 2, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.8 },
  qrWrap: {
    marginTop: 24,
    marginBottom: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  urlText: { fontSize: 11, color: "#94a3b8", textAlign: "center", maxWidth: 280 },

  btnPrimary: {
    width: "100%",
    backgroundColor: "#3f67c4",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  btnSecondaryText: { color: "#374151", fontSize: 15, fontWeight: "600" },
  btnGhost: {
    width: "100%",
    paddingVertical: 14,
    alignItems: "center",
  },
  btnGhostText: { color: "#3f67c4", fontSize: 14, fontWeight: "600" },

  payBanner: {
    width: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  payBannerText: { flex: 1 },
  payBannerTitle: { fontSize: 13, fontWeight: "700", color: "#fff", marginBottom: 2 },
  payBannerSub: { fontSize: 12, color: "#e9d5ff", lineHeight: 16 },
  payBannerBtn: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: "center",
  },
  payBannerBtnText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
});
