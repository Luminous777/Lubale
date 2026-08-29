import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { login } from "@/lib/api";
import { Button, IconBadge } from "@/components/ui";
import { colors, radius, spacing, font } from "@/lib/theme";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.inner}>
        <View style={styles.header}>
          <IconBadge icon="credit-card" tone="accent" size={56} />
          <Text style={styles.title}>Mi Tarjeta Digital</Text>
          <Text style={styles.subtitle}>Iniciá sesión para ver tu tarjeta</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrap}>
            <Feather name="mail" size={17} color={colors.faint} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tu@email.com"
              placeholderTextColor={colors.faint}
            />
          </View>

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Contraseña</Text>
          <View style={styles.inputWrap}>
            <Feather name="lock" size={17} color={colors.faint} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor={colors.faint}
              onSubmitEditing={handleLogin}
            />
          </View>

          <Button
            label="Entrar"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: spacing["2xl"] }}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tenés cuenta? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Crear tarjeta gratis</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, justifyContent: "center", paddingHorizontal: spacing["3xl"] },
  header: { alignItems: "center", marginBottom: spacing["4xl"] },
  title: { fontSize: font.xl, fontWeight: font.bold, color: colors.ink, textAlign: "center", marginTop: spacing.lg, letterSpacing: -0.3 },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 6, textAlign: "center" },
  form: {},
  label: { fontSize: font.sm, fontWeight: font.semibold, color: colors.ink, marginBottom: spacing.sm },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.lg,
    fontSize: font.base,
    color: colors.ink,
  },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing["3xl"] },
  footerText: { fontSize: font.sm, color: colors.muted },
  link: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },
});
