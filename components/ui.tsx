import type { ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, font, shadow } from "@/lib/theme";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

// ─── Button ─────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "pro" | "danger";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: FeatherName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[btn.base, v.container, isDisabled && btn.disabled, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={v.label.color} />
      ) : (
        <View style={btn.content}>
          {icon ? <Feather name={icon} size={18} color={v.label.color} /> : null}
          <Text style={[btn.label, v.label]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const variantStyles: Record<ButtonVariant, { container: ViewStyle; label: { color: string } }> = {
  primary: { container: { backgroundColor: colors.ink }, label: { color: colors.onInk } },
  secondary: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    label: { color: colors.ink },
  },
  ghost: { container: { backgroundColor: "transparent" }, label: { color: colors.accent } },
  pro: { container: { backgroundColor: colors.pro }, label: { color: colors.onInk } },
  danger: {
    container: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.dangerBorder },
    label: { color: colors.danger },
  },
};

const btn = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  label: { fontSize: font.base, fontWeight: font.semibold },
  disabled: { opacity: 0.45 },
});

// ─── Card ───────────────────────────────────────────────────────────────────

export function Card({
  children,
  style,
  elevated = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  elevated?: boolean;
}) {
  return (
    <View style={[card.base, elevated ? shadow.card : card.bordered, style]}>{children}</View>
  );
}

const card = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  bordered: { borderWidth: 1, borderColor: colors.border },
});

// ─── Icon badge ───────────────────────────────────────────────────────────────

type Tone = "accent" | "pro" | "neutral";

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  accent: { bg: colors.accentSoft, fg: colors.accent },
  pro: { bg: colors.proSoft, fg: colors.pro },
  neutral: { bg: colors.surfaceMuted, fg: colors.muted },
};

export function IconBadge({
  icon,
  tone = "accent",
  size = 48,
}: {
  icon: FeatherName;
  tone?: Tone;
  size?: number;
}) {
  const t = toneMap[tone];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: t.bg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Feather name={icon} size={size * 0.46} color={t.fg} />
    </View>
  );
}

// ─── Section label ─────────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Text style={sectionLabel.text}>{children}</Text>;
}

const sectionLabel = StyleSheet.create({
  text: {
    fontSize: font.xs,
    fontWeight: font.semibold,
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing["2xl"],
    marginBottom: spacing.md,
  },
});
