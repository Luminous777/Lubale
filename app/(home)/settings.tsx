import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getMe, logout, type MeResponse } from "@/lib/api";
import { Button, Card, SectionLabel } from "@/components/ui";
import { colors, radius, spacing, font } from "@/lib/theme";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

export default function SettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: "Ajustes" });
    getMe().then(setMe).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    Alert.alert("Cerrar sesión", "¿Seguro que querés salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionLabel>Cuenta</SectionLabel>
      <Card style={styles.accountCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(me?.name)}</Text>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.name}>{me?.name ?? "Sin nombre"}</Text>
          <View style={styles.emailRow}>
            <Feather name="mail" size={13} color={colors.muted} />
            <Text style={styles.email}>{me?.email ?? "No disponible"}</Text>
          </View>
        </View>
      </Card>

      <View style={{ marginTop: spacing["2xl"] }}>
        <Button label="Cerrar sesión" variant="danger" icon="log-out" onPress={handleLogout} />
      </View>

      <View style={styles.versionRow}>
        <Feather name="credit-card" size={13} color={colors.faint} />
        <Text style={styles.version}>Mi Tarjeta Digital · v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing["2xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  accountCard: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.full,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.onInk, fontSize: font.md, fontWeight: font.bold },
  accountInfo: { flex: 1 },
  name: { fontSize: font.md, fontWeight: font.bold, color: colors.ink },
  emailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  email: { fontSize: font.sm, color: colors.muted, flexShrink: 1 },

  versionRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing["4xl"] },
  version: { textAlign: "center", color: colors.faint, fontSize: font.xs },
});
