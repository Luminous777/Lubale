import { useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  Share, StatusBar, Platform, Alert, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, Stack } from "expo-router";
import { useState } from "react";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getMyOrgs, API_BASE } from "@/lib/api";
import { getActiveProfileId } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY = "#13263F";

function publicCardUrl(orgSlug: string, cardSlug: string) {
  return `${API_BASE}/card/${orgSlug}/${cardSlug}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ShareScreen() {
  const insets = useSafeAreaInsets();

  const [name, setName]     = useState("");
  const [slug, setSlug]     = useState("");
  const [cardUrl, setCardUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

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
      const [orgs, profileId] = await Promise.all([getMyOrgs(), getActiveProfileId()]);
      const all = orgs.flatMap(o => o.profiles.map(p => ({ ...p, orgSlug: o.orgSlug })));
      const active = all.find(p => p.id === profileId) ?? all[0];
      if (active) {
        setName(active.displayName);
        setSlug(active.cardSlug);
        setCardUrl(publicCardUrl(active.orgSlug, active.cardSlug));
      }
    } catch { /* sin datos */ } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!cardUrl) return;
    await Clipboard.setStringAsync(cardUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function send() {
    if (!cardUrl) return;
    await Share.share({
      message: Platform.OS === "ios" ? `Mi tarjeta LUBELA: ${name}` : `Mi tarjeta LUBELA: ${cardUrl}`,
      url: Platform.OS === "ios" ? cardUrl : undefined,
      title: name,
    });
  }

  const options = [
    {
      label: "Personalizar el diseño del QR",
      onPress: () => Alert.alert("QR personalizado", "Próximamente disponible."),
    },
    ...(Platform.OS === "ios" ? [{
      label: "Agregar a Apple Wallet",
      onPress: () => Alert.alert("Apple Wallet", "Próximamente disponible."),
    }] : []),
    {
      label: "Compartir por NFC",
      onPress: () => Alert.alert("NFC", "Próximamente disponible."),
    },
  ];

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View style={s.topBar}>
          <View style={{ width: 62 }} />
          <Text style={s.topLabel}>Compartir</Text>
          <View style={{ width: 62 }} />
        </View>

        {/* QR card */}
        <View style={s.qrCard}>
          {cardUrl ? (
            <QRCode
              value={cardUrl}
              size={236}
              color={NAVY}
              backgroundColor="#FFFFFF"
              ecl="M"
            />
          ) : (
            <View style={{ width: 236, height: 236 }} />
          )}
          <View style={{ alignItems: "center", gap: 5 }}>
            <Text style={s.qrName}>{name}</Text>
            <Text style={s.qrUrl}>lubela.app/{slug}</Text>
          </View>
        </View>

        {/* Botones */}
        <View style={s.btnRow}>
          <Pressable
            onPress={copy}
            style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.pressed]}
          >
            <Text style={s.btnGhostLabel}>{copied ? "¡Copiado!" : "Copiar link"}</Text>
          </Pressable>
          <Pressable
            onPress={send}
            style={({ pressed }) => [s.btn, s.btnSolid, pressed && s.pressed]}
          >
            <Text style={s.btnSolidLabel}>Enviar</Text>
          </Pressable>
        </View>

        <View style={{ minHeight: 28 }} />

        {/* Opciones adicionales */}
        <View>
          <Text style={s.sectionLabel}>También podés</Text>
          {options.map(o => (
            <Pressable
              key={o.label}
              onPress={o.onPress}
              style={({ pressed }) => [s.optionRow, pressed && { opacity: 0.6 }]}
            >
              <Text style={s.optionLabel}>{o.label}</Text>
              <Text style={s.chevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 28 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  topLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 2.2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.5)",
  },

  qrCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 26,
    alignItems: "center",
    gap: 18,
  },
  qrName: { fontFamily: "CormorantGaramond_400Regular", fontSize: 24, color: NAVY },
  qrUrl:  { fontFamily: "Jost_400Regular", fontSize: 12, color: "#6B7787" },

  btnRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  btn: { flex: 1, height: 50, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  btnGhost: { borderWidth: 1, borderColor: "rgba(255,255,255,0.28)" },
  btnGhostLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#FFFFFF" },
  btnSolid: { backgroundColor: "#FFFFFF" },
  btnSolidLabel: { fontFamily: "Jost_500Medium", fontSize: 14, color: NAVY },

  sectionLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 2,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  optionLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: "#FFFFFF" },
  chevron:     { fontFamily: "Jost_400Regular", fontSize: 16, color: "rgba(255,255,255,0.45)" },

  pressed: { opacity: 0.8 },
});
