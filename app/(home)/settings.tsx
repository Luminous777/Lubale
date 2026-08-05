import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { getMe, logout, type MeResponse } from "@/lib/api";

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
        <ActivityIndicator size="large" color="#3f67c4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Cuenta</Text>
        {me ? (
          <>
            <Text style={styles.cardValue}>{me.name ?? "Sin nombre"}</Text>
            <Text style={styles.cardSub}>{me.email}</Text>
          </>
        ) : (
          <Text style={styles.cardSub}>No disponible</Text>
        )}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Mi Tarjeta Digital v1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 24 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardLabel: { fontSize: 11, fontWeight: "600", color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6 },
  cardValue: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  cardSub: { fontSize: 13, color: "#64748b", marginTop: 2 },
  logoutBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
    marginTop: 8,
  },
  logoutText: { color: "#dc2626", fontSize: 15, fontWeight: "600" },
  version: { textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 32 },
});
