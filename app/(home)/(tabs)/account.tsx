import { useState, useCallback } from "react";
import {
  View, Text, Image, Pressable, ScrollView,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getMe, logout, type MeResponse } from "@/lib/api";
import { getUserPlan, clearAll } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY    = "#13263F";
const LABEL   = "#8A94A2";
const HAIRLINE = "rgba(19,38,63,0.08)";

const PLAN_LABELS: Record<string, string> = {
  gratis:  "Gratis",
  pro:     "Profesional",
  empresa: "Empresa",
};

const PLAN_RENEWS: Record<string, string> = {
  gratis:  "Sin cargo mensual",
  pro:     "Suscripción activa",
  empresa: "Plan corporativo",
};

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AccountScreen() {
  const router = useRouter();
  const [user, setUser]   = useState<MeResponse | null>(null);
  const [plan, setPlan]   = useState<string>("gratis");
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
      const [me, savedPlan] = await Promise.all([getMe(), getUserPlan()]);
      setUser(me);
      if (savedPlan) setPlan(savedPlan);
    } catch { /* sin sesión */ } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    Alert.alert(
      "Cerrar sesión",
      "¿Seguro que querés salir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          style: "destructive",
          onPress: async () => {
            await logout();
            await clearAll();
            router.replace("/(auth)/");
          },
        },
      ]
    );
  }

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  const settings = [
    { label: "Contactos recibidos", hint: "Personas que te escanearon", onPress: () => router.push("/(home)/contacts") },
    { label: "Diseño del QR",       hint: "Forma, color y logo",  onPress: () => Alert.alert("Próximamente", "Personalización del QR disponible en breve.") },
    { label: "Notificaciones",      hint: "Avisos de escaneo",    onPress: () => Alert.alert("Próximamente", "Configuración de notificaciones disponible en breve.") },
    { label: "Privacidad del link", hint: "Público · sin contraseña", onPress: () => Alert.alert("Próximamente", "Configuración de privacidad disponible en breve.") },
    { label: "Cerrar sesión",       hint: "",                     onPress: handleLogout, danger: true },
  ];

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Cuenta</Text>

        {/* Perfil */}
        <View style={s.profile}>
          <View style={[s.avatar, s.avatarEmpty]} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={s.name}>{user?.name ?? "—"}</Text>
            <Text style={s.email}>{user?.email ?? "—"}</Text>
          </View>
          <Pressable
            onPress={() => router.push({ pathname: "/(home)/edit", params: { plan } })}
            hitSlop={10}
          >
            <Text style={s.editLink}>Editar</Text>
          </Pressable>
        </View>

        {/* Card del plan */}
        <Pressable
          onPress={() => router.push("/(home)/plans")}
          style={({ pressed }) => [s.planCard, pressed && s.pressed]}
        >
          <View style={{ gap: 5 }}>
            <Text style={s.planLabel}>Plan actual</Text>
            <Text style={s.planName}>{PLAN_LABELS[plan] ?? plan}</Text>
            <Text style={s.planHint}>{PLAN_RENEWS[plan] ?? ""}</Text>
          </View>
          <Text style={s.planChevron}>›</Text>
        </Pressable>

        {/* Opciones */}
        <View>
          {settings.map(o => (
            <Pressable
              key={o.label}
              onPress={o.onPress}
              style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
            >
              <View style={{ gap: 2 }}>
                <Text style={[s.rowLabel, o.danger && { color: "#C0392B" }]}>{o.label}</Text>
                {!!o.hint && <Text style={s.rowHint}>{o.hint}</Text>}
              </View>
              {!o.danger && <Text style={s.chevron}>›</Text>}
            </Pressable>
          ))}
        </View>

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.wordmark}>LUBELA</Text>
          <Text style={s.version}>Versión 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 },

  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32, color: NAVY, marginBottom: 20,
  },

  profile: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingBottom: 22,
    borderBottomWidth: 1, borderBottomColor: "rgba(19,38,63,0.1)",
  },
  avatar:      { width: 58, height: 58, borderRadius: 29 },
  avatarEmpty: {
    backgroundColor: "#EFEDE8",
    borderWidth: 1, borderColor: "rgba(19,38,63,0.12)",
  },
  name:     { fontFamily: "Jost_400Regular", fontSize: 16, color: NAVY },
  email:    { fontFamily: "Jost_400Regular", fontSize: 13, color: LABEL },
  editLink: { fontFamily: "Jost_400Regular", fontSize: 13, color: NAVY },

  planCard: {
    marginVertical: 20,
    borderRadius: 18, backgroundColor: NAVY,
    padding: 18,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  planLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 2,
    textTransform: "uppercase", color: "rgba(255,255,255,0.55)",
  },
  planName:    { fontFamily: "CormorantGaramond_400Regular", fontSize: 24, color: "#FFFFFF" },
  planHint:    { fontFamily: "Jost_400Regular", fontSize: 12, color: "rgba(255,255,255,0.6)" },
  planChevron: { fontFamily: "Jost_400Regular", fontSize: 18, color: "rgba(255,255,255,0.5)" },

  row: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: HAIRLINE,
  },
  rowLabel: { fontFamily: "Jost_400Regular", fontSize: 15, color: NAVY },
  rowHint:  { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },
  chevron:  { fontFamily: "Jost_400Regular", fontSize: 16, color: "#C3C9D1" },

  footer:   { alignItems: "center", gap: 6, marginTop: 30 },
  wordmark: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 14, letterSpacing: 4.2,
    color: "#B4BBC4", paddingLeft: 4.2,
  },
  version: { fontFamily: "Jost_400Regular", fontSize: 11, color: "#C3C9D1" },

  pressed: { opacity: 0.85 },
});
