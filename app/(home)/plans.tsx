import { useState } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator, Alert, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getCheckoutUrl } from "@/lib/api";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY = "#13263F";

// ─── Planes ───────────────────────────────────────────────────────────────────

type PlanId = "free" | "pro" | "team";

const PLANS: { id: PlanId; name: string; price: string; desc: string }[] = [
  {
    id:    "free",
    name:  "Esencial",
    price: "Gratis",
    desc:  "Una tarjeta, link y QR estándar.",
  },
  {
    id:    "pro",
    name:  "Profesional",
    price: "$4.900",
    desc:  "Tarjetas ilimitadas, QR con logo, métricas y contactos.",
  },
  {
    id:    "team",
    name:  "Equipo",
    price: "$3.200",
    desc:  "Por persona. Identidad común y panel de administración.",
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlansScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlanId>("pro");
  const [loading, setLoading]   = useState(false);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: NAVY }} />;
  }

  async function handleCta() {
    if (selected === "free") {
      router.back();
      return;
    }

    setLoading(true);
    try {
      const { checkoutUrl } = await getCheckoutUrl();
      await Linking.openURL(checkoutUrl);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "No se pudo iniciar el pago. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const ctaLabel = selected === "free" ? "Continuar con Esencial" : "Suscribirme";

  return (
    <View style={{ flex: 1, backgroundColor: NAVY }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      <ScrollView
        contentContainerStyle={[
          s.scroll,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 34 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Volver */}
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/(home)/")}
          hitSlop={12}
        >
          <Text style={s.back}>← Cuenta</Text>
        </Pressable>

        <Text style={s.title}>Elegí tu plan</Text>
        <Text style={s.subtitle}>
          Cancelás cuando quieras. Tu link nunca deja de funcionar.
        </Text>

        {/* Cards de planes */}
        <View style={{ gap: 12 }}>
          {PLANS.map(p => {
            const on = selected === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setSelected(p.id)}
                style={[s.plan, on ? s.planOn : s.planOff]}
              >
                <View style={s.planHead}>
                  <Text style={[s.planName, { color: on ? NAVY : "#FFFFFF" }]}>
                    {p.name}
                  </Text>
                  <Text style={[s.planPrice, { color: on ? NAVY : "#FFFFFF" }]}>
                    {p.price}
                  </Text>
                </View>
                <Text
                  style={[
                    s.planDesc,
                    { color: on ? "rgba(19,38,63,0.72)" : "rgba(255,255,255,0.72)" },
                  ]}
                >
                  {p.desc}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* CTA */}
        <Pressable
          onPress={handleCta}
          disabled={loading}
          style={({ pressed }) => [s.cta, pressed && s.pressed, loading && { opacity: 0.7 }]}
        >
          {loading
            ? <ActivityIndicator color={NAVY} />
            : <Text style={s.ctaLabel}>{ctaLabel}</Text>
          }
        </Pressable>

        <Text style={s.legal}>Facturación mensual · IVA incluido</Text>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flexGrow: 1, paddingHorizontal: 24 },

  back: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 20,
  },

  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 34,
    lineHeight: 40,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 24,
  },

  plan: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
    borderWidth: 1,
  },
  planOn:  { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  planOff: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.25)" },

  planHead: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
  },
  planName:  { fontFamily: "Jost_500Medium",                  fontSize: 16 },
  planPrice: { fontFamily: "CormorantGaramond_400Regular",    fontSize: 24 },
  planDesc:  { fontFamily: "Jost_400Regular", fontSize: 13, lineHeight: 21 },

  cta: {
    height: 54,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  ctaLabel: { fontFamily: "Jost_500Medium", fontSize: 16, color: NAVY },

  legal: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    marginTop: 14,
  },

  pressed: { opacity: 0.85 },
});
