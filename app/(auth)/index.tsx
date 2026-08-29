import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, font, shadow } from "@/lib/theme";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - spacing["2xl"] * 2;

// ---------- Mini card preview ----------
function CardPreviewExample() {
  return (
    <View style={styles.cardWrap}>
      {/* Main card */}
      <View style={styles.card}>
        {/* Pro badge */}
        <View style={styles.proBadge}>
          <Feather name="zap" size={10} color={colors.accent} />
          <Text style={styles.proBadgeText}>Pro</Text>
        </View>

        {/* Avatar + name */}
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JP</Text>
          </View>
          <View>
            <Text style={styles.cardName}>Juan Pérez</Text>
            <Text style={styles.cardTitle}>Diseñador UX · Estudio Design</Text>
          </View>
        </View>

        {/* Contact chips */}
        <View style={styles.chipsRow}>
          {["WhatsApp", "LinkedIn", "Portfolio"].map((label) => (
            <View key={label} style={styles.chip}>
              <Text style={styles.chipText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* QR strip */}
        <View style={styles.qrStrip}>
          <View>
            <Text style={styles.qrLabel}>Compartí tu tarjeta</Text>
            <Text style={styles.qrUrl}>lubale.app/jp</Text>
          </View>
          {/* Minimal QR placeholder */}
          <View style={styles.qrBox}>
            <View style={styles.qrInner} />
          </View>
        </View>
      </View>

      {/* Shadow card behind */}
      <View style={styles.cardShadowBehind} />
    </View>
  );
}

// ---------- Screen ----------
export default function LandingScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.container}>
        {/* Decorative blob */}
        <View style={styles.blob} />

        {/* Logo + name */}
        <View style={styles.logoSection}>
          <View style={styles.logoIcon}>
            <Feather name="credit-card" size={34} color="#FFFFFF" />
          </View>
          <View style={styles.logoTextWrap}>
            <Text style={styles.logoName}>Lubale</Text>
            <Text style={styles.logoTagline}>Tu tarjeta digital, siempre a mano</Text>
          </View>
        </View>

        {/* Card example */}
        <CardPreviewExample />

        {/* CTAs */}
        <View style={styles.ctaSection}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryBtnText}>Crear mi tarjeta gratis</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            activeOpacity={0.7}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.ghostBtnText}>
              ¿Ya tenés cuenta?{" "}
              <Text style={styles.ghostBtnLink}>Iniciá sesión</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["4xl"],
    paddingBottom: spacing["3xl"],
    overflow: "hidden",
  },

  // Blob
  blob: {
    position: "absolute",
    top: -80,
    width: 480,
    height: 480,
    borderRadius: 999,
    backgroundColor: "#EFEDFE",
    opacity: 0.6,
    alignSelf: "center",
  },

  // Logo
  logoSection: {
    alignItems: "center",
    gap: 14,
    marginBottom: 40,
    zIndex: 1,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  logoTextWrap: {
    alignItems: "center",
    gap: 4,
  },
  logoName: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.ink,
    letterSpacing: -0.5,
  },
  logoTagline: {
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.2,
  },

  // Card wrap
  cardWrap: {
    width: CARD_WIDTH,
    marginBottom: 36,
    zIndex: 1,
  },
  card: {
    ...shadow.card,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    position: "relative",
  },
  cardShadowBehind: {
    backgroundColor: "#EFEDFE",
    borderRadius: 16,
    height: 26,
    marginHorizontal: 20,
    marginTop: -10,
    opacity: 0.6,
  },

  // Pro badge
  proBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFEDFE",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  proBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.accent,
  },

  // Profile
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 12,
    color: colors.muted,
  },

  // Chips
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    color: colors.ink,
    fontWeight: "500",
  },

  // QR strip
  qrStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  qrLabel: {
    fontSize: 11,
    color: colors.muted,
    marginBottom: 2,
  },
  qrUrl: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: "600",
  },
  qrBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  qrInner: {
    width: 22,
    height: 22,
    borderRadius: 3,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  // CTAs
  ctaSection: {
    width: "100%",
    gap: 6,
    zIndex: 1,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ghostBtn: {
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostBtnText: {
    fontSize: 14,
    color: colors.muted,
  },
  ghostBtnLink: {
    color: colors.accent,
    fontWeight: "600",
  },
});
