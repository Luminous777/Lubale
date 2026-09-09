import { View, Text, Image, Pressable, StyleSheet, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium } from "@expo-google-fonts/jost";

const NAVY = "#13263F";
const ICON  = require("../../icono-blanco-1024.png");

export default function LandingScreen() {
  const [loaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
  });

  // Splash while fonts load
  if (!loaded) return <View style={{ flex: 1, backgroundColor: NAVY }} />;

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Hero */}
      <View style={s.hero}>
        <Image source={ICON} style={s.icon} resizeMode="contain" />
        <Text style={s.wordmark}>LUBELA</Text>
        <Text style={s.tagline}>
          Tu tarjeta de presentación, siempre a un escaneo de distancia.
        </Text>
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <Pressable
          style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/register")}
        >
          <Text style={s.btnPrimaryLabel}>Crear mi tarjeta</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.btn, s.btnGhost, pressed && s.pressed]}
          onPress={() => router.push("/(auth)/login")}
        >
          <Text style={s.btnGhostLabel}>Ya tengo cuenta</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: NAVY,
    paddingHorizontal: 32,
    paddingBottom: 24,
  },

  // Hero centrado
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
  },
  icon: {
    width: 104,
    height: 104,
    borderRadius: 24,
  },
  wordmark: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 44,
    letterSpacing: 12,
    color: "#FFFFFF",
    paddingLeft: 12, // compensa el letter-spacing del último caracter
  },
  tagline: {
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 250,
    color: "rgba(255,255,255,0.62)",
    marginTop: -14,
  },

  // Botones
  actions: { gap: 12 },
  btn: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#FFFFFF" },
  btnPrimaryLabel: {
    fontFamily: "Jost_500Medium",
    fontSize: 16,
    color: NAVY,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  btnGhostLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 16,
    color: "#FFFFFF",
  },
  pressed: { opacity: 0.75 },
});
