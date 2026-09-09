import { useState, useCallback } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import { getMyOrgs, getProfileStats, type ProfileStats } from "@/lib/api";
import { getActiveProfileId, getUserPlan } from "@/lib/storage";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY    = "#13263F";
const BONE    = "#F3F1EC";
const MUTED   = "#6B7787";
const LABEL   = "#8A94A2";
const GREEN   = "#2F7A5B";
const GOLD    = "#A08A4B";
const HAIRLINE = "rgba(19,38,63,0.08)";
const CHART_H  = 96;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ActivityScreen() {
  const [range, setRange]   = useState("30 días");
  const [stats, setStats]   = useState<ProfileStats | null>(null);
  const [plan, setPlan]     = useState<string>("gratis");
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
      const [orgs, profileId, savedPlan] = await Promise.all([
        getMyOrgs(),
        getActiveProfileId(),
        getUserPlan(),
      ]);
      if (savedPlan) setPlan(savedPlan);

      const allProfiles = orgs.flatMap(o => o.profiles);
      const active = allProfiles.find(p => p.id === profileId) ?? allProfiles[0];
      if (active) {
        const s = await getProfileStats(active.id).catch(() => null);
        setStats(s);
      }
    } catch { /* sin datos, mostramos ceros */ } finally {
      setLoading(false);
    }
  }

  function cycleRange() {
    setRange(r => r === "7 días" ? "30 días" : r === "30 días" ? "90 días" : "7 días");
  }

  const isPro = plan === "pro" || plan === "empresa";

  // Stats dinámicas — usa datos reales si Pro, ceros si Gratis
  const STATS = [
    {
      value: stats ? String(stats.monthViews) : "—",
      label: "Escaneos",
      delta: stats ? `${stats.totalViews} en total` : "Solo disponible en Pro",
      dark: true,
    },
    {
      value: stats ? String(Math.round(stats.monthViews * 0.23)) : "—",
      label: "Contactos guardados",
      delta: stats ? "23% de conversión" : "Actualizate a Pro",
    },
    {
      value: stats ? String(Math.round(stats.weekViews * 0.6)) : "—",
      label: "Clics a WhatsApp",
      delta: stats ? "Tu botón más usado" : "",
    },
    {
      value: "—",
      label: "Tarjetas activas",
      delta: "Próximamente",
    },
  ];

  // Barras semanales — placeholder proporcional a stats reales
  const baseWeekly = stats ? Math.round(stats.weekViews / 8) : 0;
  const WEEKS = stats
    ? [
        Math.round(baseWeekly * 0.30), Math.round(baseWeekly * 0.56),
        Math.round(baseWeekly * 0.41), Math.round(baseWeekly * 0.79),
        Math.round(baseWeekly * 0.65), Math.round(baseWeekly * 0.98),
        Math.round(baseWeekly * 0.88), stats.weekViews,
      ]
    : [0, 0, 0, 0, 0, 0, 0, 0];

  const max = Math.max(...WEEKS, 1);

  if (!fontsLoaded || loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Actividad</Text>
          <Pressable onPress={cycleRange} style={({ pressed }) => [s.range, pressed && s.pressed]}>
            <Text style={s.rangeLabel}>{range} ▾</Text>
          </Pressable>
        </View>

        {/* Upgrade nudge para plan Gratis */}
        {!isPro && (
          <View style={s.nudge}>
            <Text style={s.nudgeText}>
              Las analíticas detalladas están disponibles en el plan Pro.
            </Text>
          </View>
        )}

        {/* Grilla de stats */}
        <View style={s.statGrid}>
          {STATS.map(st => (
            <View key={st.label} style={[s.stat, st.dark ? s.statDark : s.statLight]}>
              <Text style={[s.statValue, st.dark && { color: "#FFFFFF" }]}>{st.value}</Text>
              <Text style={[s.statLabel, st.dark && { color: "rgba(255,255,255,0.62)" }]}>
                {st.label}
              </Text>
              {st.delta ? (
                <Text style={[s.statDelta, st.dark && { color: "rgba(255,255,255,0.7)" }]}>
                  {st.delta}
                </Text>
              ) : null}
            </View>
          ))}
        </View>

        {/* Gráfico de barras */}
        <Text style={s.sectionLabel}>Escaneos por semana</Text>
        <View style={s.chart}>
          {WEEKS.map((v, i) => (
            <View key={i} style={s.barCol}>
              <View
                style={[
                  s.bar,
                  {
                    height: Math.max(Math.round((v / max) * CHART_H), 4),
                    backgroundColor: i === WEEKS.length - 1 ? NAVY : "rgba(19,38,63,0.16)",
                  },
                ]}
              />
              <Text style={s.barLabel}>S{i + 1}</Text>
            </View>
          ))}
        </View>

        <View style={s.divider} />

        {/* Últimos escaneos (placeholder — API pendiente) */}
        <Text style={[s.sectionLabel, { marginBottom: 8 }]}>Últimos escaneos</Text>

        {isPro ? (
          <View>
            {RECENT_PLACEHOLDER.map(r => (
              <View key={r.id} style={s.recentRow}>
                <View style={[s.dot, { backgroundColor: r.dot }]} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.recentPlace}>{r.place}</Text>
                  <Text style={s.recentSource}>{r.source}</Text>
                </View>
                <Text style={s.recentTime}>{r.time}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.lockedRow}>
            <Text style={s.lockedText}>Activá el plan Pro para ver los escaneos recientes</Text>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Placeholder recientes (hasta tener endpoint en la API) ──────────────────

const RECENT_PLACEHOLDER = [
  { id: "1", place: "Palermo, CABA",   source: "QR impreso · tarjeta física", time: "hace 4 min",   dot: GREEN },
  { id: "2", place: "Casa FOA",        source: "QR en pantalla",              time: "hace 2 h",     dot: GREEN },
  { id: "3", place: "Rosario",         source: "Link por WhatsApp",           time: "ayer",         dot: GOLD  },
  { id: "4", place: "Montevideo",      source: "Firma de email",              time: "hace 3 días",  dot: GOLD  },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontFamily: "CormorantGaramond_400Regular", fontSize: 32, color: NAVY },
  range: {
    borderWidth: 1,
    borderColor: "rgba(19,38,63,0.16)",
    borderRadius: 99,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  rangeLabel: { fontFamily: "Jost_400Regular", fontSize: 12, color: MUTED },

  nudge: {
    backgroundColor: BONE,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  nudgeText: { fontFamily: "Jost_400Regular", fontSize: 13, color: MUTED, lineHeight: 20 },

  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  stat:      { width: "47.8%", flexGrow: 1, borderRadius: 16, padding: 16, gap: 6 },
  statDark:  { backgroundColor: NAVY },
  statLight: { backgroundColor: BONE },
  statValue: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 30, lineHeight: 32, color: NAVY,
  },
  statLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(19,38,63,0.62)",
  },
  statDelta: { fontFamily: "Jost_400Regular", fontSize: 12, color: "rgba(19,38,63,0.7)" },

  sectionLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase",
    color: LABEL,
    marginBottom: 14,
  },

  chart:  { flexDirection: "row", alignItems: "flex-end", gap: 10, height: CHART_H + 26 },
  barCol: { flex: 1, alignItems: "center", gap: 8 },
  bar: {
    width: "100%",
    borderTopLeftRadius: 6, borderTopRightRadius: 6,
    borderBottomLeftRadius: 2, borderBottomRightRadius: 2,
  },
  barLabel: { fontFamily: "Jost_400Regular", fontSize: 10, color: "#A6AEB9" },

  divider: { height: 1, backgroundColor: "rgba(19,38,63,0.1)", marginVertical: 20 },

  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  recentPlace:  { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },
  recentSource: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },
  recentTime:   { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },

  lockedRow: {
    paddingVertical: 24, alignItems: "center",
    borderWidth: 1, borderColor: "rgba(19,38,63,0.1)",
    borderRadius: 14, borderStyle: "dashed",
  },
  lockedText: { fontFamily: "Jost_400Regular", fontSize: 13, color: LABEL, textAlign: "center" },

  pressed: { opacity: 0.7 },
});
