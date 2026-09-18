import { useState, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  StatusBar, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useFocusEffect, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getUserPlan } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY = "#13263F";

// ─── Planes (solo nombres) ──────────────────────────────────────────────────────

type PlanId = "gratis" | "pro" | "empresa";

const PLANS: { id: PlanId; name: string }[] = [
  { id: "gratis",  name: "Plan Gratis" },
  { id: "pro",     name: "Plan Pro" },
  { id: "empresa", name: "Plan Empresarial" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<PlanId>("gratis");

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const saved = await getUserPlan();
        if (active && saved) setCurrent(saved as PlanId);
      })();
      return () => { active = false; };
    }, []),
  );

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: NAVY }} />;
  }

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

        <Text style={s.title}>Planes</Text>

        {/* Lista de planes: solo nombres, marca el plan actual */}
        <View style={{ gap: 12 }}>
          {PLANS.map(p => {
            const on = current === p.id;
            return (
              <View key={p.id} style={[s.plan, on ? s.planOn : s.planOff]}>
                <Text style={[s.planName, { color: on ? NAVY : "#FFFFFF" }]}>
                  {p.name}
                </Text>
                {on && <Text style={s.current}>Plan actual</Text>}
              </View>
            );
          })}
        </View>
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
    marginBottom: 24,
  },

  plan: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  planOn:  { backgroundColor: "#FFFFFF", borderColor: "#FFFFFF" },
  planOff: { backgroundColor: "transparent", borderColor: "rgba(255,255,255,0.25)" },

  planName: { fontFamily: "Jost_500Medium", fontSize: 17 },
  current: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    color: "rgba(19,38,63,0.6)",
  },
});
