import { useState } from "react";
import {
  View, Text, TextInput, Pressable, Image, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";
import * as AppleAuthentication from "expo-apple-authentication";
import { login } from "@/lib/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY   = "#13263F";
const MUTED  = "#6B7787";
const LABEL  = "#8A94A2";
const BORDER = "rgba(19,38,63,0.16)";
const ICON   = require("../../icono-blanco-1024.png");

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow]         = useState(false);
  const [loading, setLoading]   = useState(false);

  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: "#fff" }} />;

  const valid = email.includes("@") && password.length >= 6;

  async function handleLogin() {
    if (!valid) return;
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error al ingresar", e instanceof Error ? e.message : "Revisá tus datos e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // TODO: enviar credential.identityToken al backend
      Alert.alert("Apple Sign-In", "Credencial recibida. El backend OAuth se configura próximamente.");
    } catch (e: any) {
      if (e?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Error", "No se pudo autenticar con Apple.");
      }
    }
  }

  function handleGoogle() {
    Alert.alert("Google Sign-In", "El inicio de sesión con Google se activa próximamente.");
  }

  function handleMagicLink() {
    Alert.alert(
      "Link mágico",
      "Ingresá tu email y te mandamos un link para entrar sin contraseña.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Enviar link",
          onPress: () => {
            if (!email.includes("@")) {
              Alert.alert("Falta el email", "Ingresá tu email primero.");
            } else {
              Alert.alert("¡Listo!", `Te enviamos un link a ${email.trim()}. Próximamente disponible.`);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/")}
            hitSlop={12}
          >
            <Text style={s.back}>← Volver</Text>
          </Pressable>

          {/* Hero */}
          <View style={s.hero}>
            <View style={s.iconWrap}>
              <Image source={ICON} style={s.icon} resizeMode="contain" />
            </View>
            <Text style={s.title}>Hola de nuevo</Text>
            <Text style={s.subtitle}>Entrá para editar y compartir tu tarjeta.</Text>
          </View>

          {/* Fields */}
          <View style={{ gap: 16 }}>
            {/* Email */}
            <View style={{ gap: 7 }}>
              <Text style={s.fieldLabel}>Email</Text>
              <TextInput
                style={[s.input, email ? s.inputActive : null]}
                value={email}
                onChangeText={setEmail}
                placeholder="camila@estudioruiz.com"
                placeholderTextColor="#B4BBC4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="username"
              />
            </View>

            {/* Password */}
            <View style={{ gap: 7 }}>
              <Text style={s.fieldLabel}>Contraseña</Text>
              <View style={[s.input, s.passRow, password ? s.inputActive : null]}>
                <TextInput
                  style={s.passInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#B4BBC4"
                  secureTextEntry={!show}
                  autoCapitalize="none"
                  textContentType="password"
                  onSubmitEditing={handleLogin}
                />
                <Pressable onPress={() => setShow(v => !v)} hitSlop={10}>
                  <Text style={s.showToggle}>{show ? "Ocultar" : "Ver"}</Text>
                </Pressable>
              </View>
            </View>

            {/* Forgot */}
            <Pressable
              onPress={() => Alert.alert("Recuperar contraseña", "Próximamente disponible.")}
              hitSlop={8}
            >
              <Text style={s.forgot}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
          </View>

          {/* CTA */}
          <Pressable
            disabled={!valid || loading}
            onPress={handleLogin}
            style={({ pressed }) => [s.cta, (!valid || loading) && s.ctaDisabled, pressed && s.pressed]}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.ctaLabel}>Ingresar</Text>
            }
          </Pressable>

          {/* Divider */}
          <View style={s.divider}>
            <View style={s.line} />
            <Text style={s.or}>o</Text>
            <View style={s.line} />
          </View>

          {/* Social providers */}
          <View style={{ gap: 10 }}>

            {/* Google */}
            <Pressable
              onPress={handleGoogle}
              style={({ pressed }) => [s.provider, pressed && s.providerPressed]}
            >
              <View style={s.googleIcon}>
                <Text style={s.googleG}>G</Text>
              </View>
              <Text style={s.providerLabel}>Continuar con Google</Text>
            </Pressable>

            {/* Apple */}
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={s.appleBtn}
              onPress={handleApple}
            />

            {/* Link mágico */}
            <Pressable
              onPress={handleMagicLink}
              style={({ pressed }) => [s.provider, pressed && s.providerPressed]}
            >
              <Text style={s.magicMark}>◈</Text>
              <Text style={s.providerLabel}>Ingresar con un link mágico</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1, minHeight: 14 }} />

          {/* Footer */}
          <Pressable onPress={() => router.push("/(auth)/register")} hitSlop={8}>
            <Text style={s.footer}>
              ¿No tenés cuenta?{" "}
              <Text style={{ color: NAVY, fontFamily: "Jost_500Medium" }}>Creá la tuya</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36 },

  back: { fontFamily: "Jost_400Regular", fontSize: 14, color: MUTED, marginBottom: 30 },

  // Hero
  hero:    { alignItems: "center", gap: 14, marginBottom: 28 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
  },
  icon: { width: 44, height: 44 },
  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 32, lineHeight: 38,
    color: NAVY,
  },
  subtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 14, lineHeight: 22,
    color: MUTED, textAlign: "center",
    marginTop: -8,
  },

  // Fields
  fieldLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase",
    color: LABEL,
  },
  input: {
    height: 52, borderWidth: 1,
    borderColor: BORDER, borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 15, color: NAVY,
  },
  inputActive: { borderColor: NAVY },
  passRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  passInput: {
    flex: 1, fontFamily: "Jost_400Regular",
    fontSize: 15, color: NAVY, padding: 0,
  },
  showToggle: { fontFamily: "Jost_400Regular", fontSize: 12, color: MUTED },
  forgot: { fontFamily: "Jost_400Regular", fontSize: 13, color: MUTED, textAlign: "right" },

  // CTA
  cta: {
    height: 54, borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    marginTop: 26,
  },
  ctaDisabled: { opacity: 0.35 },
  ctaLabel:    { fontFamily: "Jost_500Medium", fontSize: 16, color: "#FFFFFF" },

  // Divider
  divider: { flexDirection: "row", alignItems: "center", gap: 14, marginVertical: 18 },
  line:    { flex: 1, height: 1, backgroundColor: "rgba(19,38,63,0.12)" },
  or: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase", color: "#A6AEB9",
  },

  // Social providers
  provider: {
    height: 52, borderWidth: 1,
    borderColor: BORDER, borderRadius: 14,
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
  },
  providerPressed: { backgroundColor: "#F3F1EC" },
  googleIcon: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center", justifyContent: "center",
  },
  googleG:       { fontFamily: "Jost_500Medium", fontSize: 12, color: "#FFFFFF" },
  appleBtn:      { width: "100%", height: 52 },
  magicMark: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 17, color: NAVY, opacity: 0.6,
  },
  providerLabel: { fontFamily: "Jost_400Regular", fontSize: 15, color: NAVY },

  footer: { fontFamily: "Jost_400Regular", fontSize: 14, color: MUTED, textAlign: "center" },
  pressed: { opacity: 0.85 },
});
