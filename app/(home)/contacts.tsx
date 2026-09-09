import { useState, useMemo } from "react";
import {
  View, Text, TextInput, Pressable, ScrollView,
  StyleSheet, StatusBar, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Stack } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";

// ─── Tokens ───────────────────────────────────────────────────────────────────

const NAVY    = "#13263F";
const BONE    = "#F3F1EC";
const MUTED   = "#6B7787";
const LABEL   = "#8A94A2";
const GREEN   = "#2F7A5B";
const GOLD    = "#A08A4B";
const HAIRLINE = "rgba(19,38,63,0.08)";

// ─── Datos placeholder ────────────────────────────────────────────────────────

type Tag = "Nuevo" | "Evento" | "Contactado";

const TAG_COLORS: Record<Tag, string> = {
  Nuevo:      GREEN,
  Evento:     GOLD,
  Contactado: LABEL,
};

const LEADS: { id: string; initials: string; name: string; company: string; tag: Tag }[] = [
  { id: "1", initials: "MG", name: "Mariano Gómez",  company: "Constructora Delta",  tag: "Nuevo"      },
  { id: "2", initials: "LP", name: "Lucía Prado",    company: "Estudio Prado",        tag: "Nuevo"      },
  { id: "3", initials: "JS", name: "Javier Sosa",    company: "Casa FOA",             tag: "Evento"     },
  { id: "4", initials: "VN", name: "Valeria Nieto",  company: "Particular",           tag: "Evento"     },
  { id: "5", initials: "RD", name: "Ramiro Díaz",    company: "Inmobiliaria Norte",   tag: "Contactado" },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ContactsScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LEADS;
    return LEADS.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.company.toLowerCase().includes(q),
    );
  }, [query]);

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: "#fff" }} />;
  }

  return (
    <SafeAreaView style={s.root} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header con volver */}
        <View style={s.header}>
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(home)/")}
            hitSlop={12}
          >
            <Text style={s.back}>← Cuenta</Text>
          </Pressable>
        </View>

        <Text style={s.title}>Contactos</Text>
        <Text style={s.subtitle}>
          Personas que dejaron sus datos después de ver tu tarjeta.
        </Text>

        {/* Buscador */}
        <TextInput
          style={s.search}
          value={query}
          onChangeText={setQuery}
          placeholder="Buscar por nombre o empresa"
          placeholderTextColor={LABEL}
          autoCorrect={false}
          clearButtonMode="while-editing"
        />

        {/* Lista */}
        {results.length === 0 ? (
          <Text style={s.empty}>Sin resultados para "{query}".</Text>
        ) : (
          <View>
            {results.map(l => (
              <Pressable
                key={l.id}
                onPress={() =>
                  Alert.alert(
                    l.name,
                    `${l.company} · ${l.tag}`,
                    [{ text: "Cerrar" }],
                  )
                }
                style={({ pressed }) => [s.row, pressed && { opacity: 0.6 }]}
              >
                <View style={s.avatar}>
                  <Text style={s.avatarLabel}>{l.initials}</Text>
                </View>
                <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
                  <Text style={s.name}>{l.name}</Text>
                  <Text style={s.company} numberOfLines={1}>{l.company}</Text>
                </View>
                <Text style={[s.tag, { color: TAG_COLORS[l.tag] }]}>{l.tag}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Exportar */}
        <Pressable
          onPress={() => Alert.alert("Próximamente", "La exportación a CSV estará disponible en breve.")}
          style={({ pressed }) => [s.export, pressed && s.pressed]}
        >
          <Text style={s.exportLabel}>Exportar a CSV</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingHorizontal: 24, paddingTop: 6, paddingBottom: 40 },

  header: { marginBottom: 16 },
  back: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: LABEL,
  },

  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32,
    color: NAVY,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 13,
    lineHeight: 21,
    color: MUTED,
    marginBottom: 20,
  },

  search: {
    height: 46,
    borderRadius: 12,
    backgroundColor: BONE,
    paddingHorizontal: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: NAVY,
    marginBottom: 18,
  },

  empty: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    color: LABEL,
    paddingVertical: 24,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: HAIRLINE,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BONE,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 16,
    color: NAVY,
  },
  name:    { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },
  company: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },
  tag: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  export: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(19,38,63,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  exportLabel: { fontFamily: "Jost_400Regular", fontSize: 14, color: NAVY },

  pressed: { opacity: 0.8 },
});
