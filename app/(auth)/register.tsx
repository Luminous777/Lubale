import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView, Image,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  registerPersonal, registerPro, registerInvite,
  login, getMyOrgs, updateProfile,
} from "@/lib/api";
import { setUserPlan } from "@/lib/storage";
import { Button, IconBadge } from "@/components/ui";
import { colors, radius, spacing, font } from "@/lib/theme";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = "gratis" | "pro" | "empresa";
type Step = "plan" | "build" | "save";

interface CardData {
  name: string;
  title: string;
  bio: string;
  phone: string;
  emailPublic: string;
  inviteCode: string;
}

function toSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function nameInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
}

// ─── Live card preview ────────────────────────────────────────────────────────

function CardPreview({ card }: { card: CardData }) {
  const hasContact = card.phone.trim() || card.emailPublic.trim();
  return (
    <View style={prev.wrap}>
      <View style={prev.card}>
        <View style={prev.header}>
          <View style={prev.avatar}>
            <Text style={prev.avatarText}>{nameInitials(card.name) || "?"}</Text>
          </View>
          <View style={prev.nameBlock}>
            <Text style={prev.name} numberOfLines={1}>
              {card.name.trim() || "Tu nombre"}
            </Text>
            {card.title.trim() ? (
              <Text style={prev.jobTitle} numberOfLines={1}>{card.title}</Text>
            ) : null}
          </View>
        </View>
        {hasContact ? (
          <View style={prev.contactRow}>
            {card.phone.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="phone" size={12} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{card.phone}</Text>
              </View>
            ) : null}
            {card.emailPublic.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="mail" size={12} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{card.emailPublic}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {card.bio.trim() ? (
          <Text style={prev.bio} numberOfLines={2}>{card.bio}</Text>
        ) : null}
      </View>
      <View style={prev.labelRow}>
        <Feather name="eye" size={11} color={colors.faint} />
        <Text style={prev.label}>Vista previa en tiempo real</Text>
      </View>
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  secureTextEntry?: boolean;
}) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.label}>{label}</Text>
      <TextInput
        style={[st.input, multiline && st.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={
          secureTextEntry || keyboardType === "email-address" || keyboardType === "url"
            ? "none"
            : "sentences"
        }
      />
    </View>
  );
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("plan");
  const [plan, setPlan] = useState<Plan>("gratis");
  const [card, setCard] = useState<CardData>({
    name: "", title: "", bio: "", phone: "", emailPublic: "", inviteCode: "",
  });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function updateCard(key: keyof CardData, value: string) {
    setCard((prev) => ({ ...prev, [key]: value }));
  }

  function handleSelectPlan(p: Plan) {
    setPlan(p);
    setStep("build");
  }

  async function handleCreate() {
    if (!email.trim() || !password) {
      Alert.alert("Campos incompletos", "Ingresá tu email y contraseña.");
      return;
    }
    if (!card.name.trim()) {
      Alert.alert("Falta el nombre", "Volvé al paso anterior y completá tu nombre.");
      return;
    }
    setLoading(true);
    try {
      const handle = toSlug(card.name) || "usuario";

      // 1. Registrar según plan
      if (plan === "empresa") {
        await registerInvite({
          inviteCode: card.inviteCode.trim(),
          name: card.name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
      } else if (plan === "pro") {
        await registerPro({
          name: card.name.trim(),
          handle,
          email: email.trim().toLowerCase(),
          password,
        });
      } else {
        await registerPersonal({
          name: card.name.trim(),
          handle,
          email: email.trim().toLowerCase(),
          password,
        });
      }

      // 2. Login automático
      await login(email.trim().toLowerCase(), password);

      // 3. Guardar plan en SecureStore
      await setUserPlan(plan === "empresa" ? "empresa" : plan === "pro" ? "pro" : "gratis");

      // 4. Volcar datos de la tarjeta al perfil recién creado
      try {
        const orgs = await getMyOrgs();
        const firstProfile = orgs.flatMap((o) => o.profiles)[0];
        if (firstProfile) {
          await updateProfile(firstProfile.id, {
            displayName: card.name.trim(),
            title: card.title.trim() || undefined,
            bio: plan !== "gratis" ? (card.bio.trim() || undefined) : undefined,
            phone: card.phone.trim() || undefined,
            emailPublic: plan !== "gratis" ? (card.emailPublic.trim() || undefined) : undefined,
            links: [],
          });
        }
      } catch {
        // Si falla el update del perfil no bloqueamos el flujo
      }

      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo crear la cuenta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={st.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Paso 1: Elegí tu plan ── */}
        {step === "plan" && (
          <StepPlan onSelect={handleSelectPlan} />
        )}

        {/* ── Paso 2: Construí tu tarjeta ── */}
        {step === "build" && (
          <StepBuild
            plan={plan}
            card={card}
            onChange={updateCard}
            onBack={() => setStep("plan")}
            onNext={() => setStep("save")}
          />
        )}

        {/* ── Paso 3: Registrate para guardarla ── */}
        {step === "save" && (
          <StepSave
            plan={plan}
            card={card}
            email={email}
            password={password}
            loading={loading}
            onChangeEmail={setEmail}
            onChangePassword={setPassword}
            onBack={() => setStep("build")}
            onCreate={handleCreate}
          />
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Paso 1: Selector de plan ─────────────────────────────────────────────────

function StepPlan({ onSelect }: { onSelect: (p: Plan) => void }) {
  return (
    <View style={st.stepWrap}>
      {/* Header */}
      <View style={st.header}>
        <IconBadge icon="credit-card" tone="accent" size={52} />
        <Text style={st.title}>Creá tu tarjeta</Text>
        <Text style={st.subtitle}>Elegí el plan que mejor se adapte a vos</Text>
      </View>

      {/* Plan cards */}
      <View style={st.planList}>

        {/* Gratis */}
        <TouchableOpacity style={st.planCard} onPress={() => onSelect("gratis")} activeOpacity={0.75}>
          <View style={[st.planIcon, { backgroundColor: colors.surfaceMuted }]}>
            <Feather name="star" size={20} color={colors.muted} />
          </View>
          <View style={st.planInfo}>
            <View style={st.planTitleRow}>
              <Text style={st.planName}>Gratis</Text>
              <Text style={st.planPrice}>Sin costo</Text>
            </View>
            <Text style={st.planSub}>Para empezar</Text>
            <View style={st.featureList}>
              {["Foto de perfil", "Nombre y puesto", "1 link de WhatsApp"].map((f) => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.faint} />
        </TouchableOpacity>

        {/* Pro */}
        <TouchableOpacity
          style={[st.planCard, st.planCardPro]}
          onPress={() => onSelect("pro")}
          activeOpacity={0.75}
        >
          <View style={st.planBadgePro}>
            <Text style={st.planBadgeText}>✨ Recomendado</Text>
          </View>
          <View style={[st.planIcon, { backgroundColor: colors.accentSoft }]}>
            <Feather name="zap" size={20} color={colors.accent} />
          </View>
          <View style={st.planInfo}>
            <View style={st.planTitleRow}>
              <Text style={[st.planName, { color: colors.accent }]}>Pro</Text>
              <Text style={st.planPrice}>Próximamente</Text>
            </View>
            <Text style={st.planSub}>Para profesionales</Text>
            <View style={st.featureList}>
              {["Todo lo de Gratis", "Bio y email público", "Links ilimitados", "Analíticas"].map((f) => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.accent} />
        </TouchableOpacity>

        {/* Empresa */}
        <TouchableOpacity style={st.planCard} onPress={() => onSelect("empresa")} activeOpacity={0.75}>
          <View style={[st.planIcon, { backgroundColor: "#EFF6FF" }]}>
            <Feather name="briefcase" size={20} color="#3B82F6" />
          </View>
          <View style={st.planInfo}>
            <Text style={st.planName}>Empresa</Text>
            <Text style={st.planSub}>Ingresá con código de invitación</Text>
            <View style={st.featureList}>
              {["Todo lo de Pro", "Gestión de equipo", "Branding de empresa"].map((f) => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Feather name="chevron-right" size={18} color={colors.faint} />
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={st.footer}>
          <Text style={st.footerText}>¿Ya tenés cuenta? </Text>
          <Text style={st.footerLink}>Iniciá sesión</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

// ─── Paso 2: Construí tu tarjeta ──────────────────────────────────────────────

function StepBuild({
  plan, card, onChange, onBack, onNext,
}: {
  plan: Plan;
  card: CardData;
  onChange: (key: keyof CardData, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isPro = plan === "pro" || plan === "empresa";

  return (
    <View style={st.stepWrap}>
      {/* Back */}
      <TouchableOpacity style={st.backBtn} onPress={onBack} hitSlop={8}>
        <Feather name="arrow-left" size={20} color={colors.accent} />
        <Text style={st.backText}>Cambiar plan</Text>
      </TouchableOpacity>

      {/* Plan chip */}
      <View style={st.stepChip}>
        <Text style={st.stepChipText}>
          {plan === "gratis" ? "⭐ Gratis" : plan === "pro" ? "⚡ Pro" : "🏢 Empresa"}
        </Text>
      </View>

      <Text style={st.title}>Construí tu tarjeta</Text>
      <Text style={st.subtitle}>Completá tus datos — podés cambiarlos después</Text>

      {/* Live preview */}
      <CardPreview card={card} />

      {/* Invite code — solo Empresa */}
      {plan === "empresa" && (
        <Field
          label="Código de invitación"
          value={card.inviteCode}
          onChangeText={(v) => onChange("inviteCode", v)}
          placeholder="Código que te mandó tu empresa"
        />
      )}

      {/* Campos comunes */}
      <Field
        label="Nombre completo"
        value={card.name}
        onChangeText={(v) => onChange("name", v)}
        placeholder="Juan Pérez"
      />
      <Field
        label="Puesto / Rol"
        value={card.title}
        onChangeText={(v) => onChange("title", v)}
        placeholder="Diseñador UX"
      />

      {/* Bio — solo Pro/Empresa */}
      {isPro && (
        <Field
          label="Bio (opcional)"
          value={card.bio}
          onChangeText={(v) => onChange("bio", v)}
          placeholder="Contá algo sobre vos..."
          multiline
        />
      )}

      <Field
        label="Teléfono / WhatsApp"
        value={card.phone}
        onChangeText={(v) => onChange("phone", v)}
        placeholder="+54 11 1234-5678"
        keyboardType="phone-pad"
      />

      {/* Email público — solo Pro/Empresa */}
      {isPro && (
        <Field
          label="Email público (opcional)"
          value={card.emailPublic}
          onChangeText={(v) => onChange("emailPublic", v)}
          placeholder="contacto@email.com"
          keyboardType="email-address"
        />
      )}

      <Button
        label="Ver mi tarjeta →"
        onPress={onNext}
        style={{ marginTop: spacing.lg }}
      />
    </View>
  );
}

// ─── Paso 3: Registrate ───────────────────────────────────────────────────────

function StepSave({
  plan, card, email, password, loading,
  onChangeEmail, onChangePassword, onBack, onCreate,
}: {
  plan: Plan;
  card: CardData;
  email: string;
  password: string;
  loading: boolean;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  return (
    <View style={st.stepWrap}>
      {/* Back */}
      <TouchableOpacity style={st.backBtn} onPress={onBack} hitSlop={8}>
        <Feather name="arrow-left" size={20} color={colors.accent} />
        <Text style={st.backText}>Editar tarjeta</Text>
      </TouchableOpacity>

      <Text style={st.title}>Guardá tu tarjeta</Text>
      <Text style={st.subtitle}>Creá tu cuenta para acceder y compartirla</Text>

      {/* Preview readonly */}
      <CardPreview card={card} />

      {/* Credentials */}
      <Field
        label="Email"
        value={email}
        onChangeText={onChangeEmail}
        placeholder="tu@email.com"
        keyboardType="email-address"
      />
      <Field
        label="Contraseña"
        value={password}
        onChangeText={onChangePassword}
        placeholder="Mínimo 8 caracteres"
        secureTextEntry
      />

      <Button
        label="Crear mi tarjeta"
        onPress={onCreate}
        loading={loading}
        style={{ marginTop: spacing.xl }}
      />

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={st.footer}>
          <Text style={st.footerText}>¿Ya tenés cuenta? </Text>
          <Text style={st.footerLink}>Iniciá sesión</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing["2xl"], paddingVertical: spacing["3xl"] },
  stepWrap: { flex: 1 },

  header: { alignItems: "center", gap: spacing.md, marginBottom: spacing["3xl"] },
  title: { fontSize: font.xl, fontWeight: font.bold, color: colors.ink, letterSpacing: -0.3, textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: font.sm, color: colors.muted, textAlign: "center", marginBottom: spacing.xl },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xl },
  backText: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },

  stepChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepChipText: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },

  // Plan cards
  planList: { gap: spacing.md, marginBottom: spacing["2xl"] },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  planCardPro: {
    borderColor: colors.accent,
    backgroundColor: "#FAFAFE",
    paddingTop: spacing["2xl"] + 4,
    position: "relative",
  },
  planBadgePro: {
    position: "absolute",
    top: 0,
    right: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: 0,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  planBadgeText: { fontSize: font.xs, fontWeight: font.semibold, color: colors.onAccent },
  planIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  planInfo: { flex: 1 },
  planTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  planName: { fontSize: font.md, fontWeight: font.bold, color: colors.ink },
  planPrice: { fontSize: font.xs, color: colors.muted },
  planSub: { fontSize: font.xs, color: colors.muted, marginBottom: spacing.md },
  featureList: { gap: 5 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureText: { fontSize: font.sm, color: colors.ink },

  // Fields
  fieldWrap: { marginBottom: spacing.lg },
  label: { fontSize: font.sm, fontWeight: font.semibold, color: colors.ink, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: font.base,
    color: colors.ink,
  },
  inputMultiline: { height: 80, textAlignVertical: "top", paddingTop: spacing.md },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing["2xl"] },
  footerText: { fontSize: font.sm, color: colors.muted },
  footerLink: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },
});

// ─── Preview styles ───────────────────────────────────────────────────────────

const prev = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#14142B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: font.md, fontWeight: font.bold, color: colors.accent },
  nameBlock: { flex: 1 },
  name: { fontSize: font.base, fontWeight: font.bold, color: colors.ink },
  jobTitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactText: { fontSize: font.xs, color: colors.muted },
  bio: { fontSize: font.xs, color: colors.muted, lineHeight: 18, marginTop: 4 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "center" },
  label: { fontSize: font.xs, color: colors.faint },
});
