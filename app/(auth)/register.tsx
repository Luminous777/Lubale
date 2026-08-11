import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { registerPersonal, registerPro, registerInvite, login } from "@/lib/api";
import { setUserPlan } from "@/lib/storage";
import { Button, IconBadge } from "@/components/ui";
import { colors, radius, spacing, font } from "@/lib/theme";

type PlanStep = "select" | "free" | "pro" | "invite";

function toSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export default function RegisterScreen() {
  const [step, setStep] = useState<PlanStep>("select");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {step === "select" && <PlanSelect onSelect={setStep} />}
        {step === "free"   && <FreeForm   onBack={() => setStep("select")} />}
        {step === "pro"    && <ProForm    onBack={() => setStep("select")} />}
        {step === "invite" && <InviteForm onBack={() => setStep("select")} />}

        {step === "select" && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tenés cuenta? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Iniciá sesión</Text>
              </TouchableOpacity>
            </Link>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Reusable input ──────────────────────────────────────────────────────────

function LabeledInput({
  label, style, ...props
}: { label: string } & React.ComponentProps<typeof TextInput> & { style?: object }) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.faint}
        {...props}
      />
    </>
  );
}

// ─── Plan selector ────────────────────────────────────────────────────────────

function PlanSelect({ onSelect }: { onSelect: (step: PlanStep) => void }) {
  return (
    <>
      <View style={styles.header}>
        <IconBadge icon="credit-card" tone="accent" size={56} />
        <Text style={styles.title}>Creá tu tarjeta</Text>
        <Text style={styles.subtitle}>Elegí el plan que mejor se adapte a vos</Text>
      </View>

      <TouchableOpacity style={styles.planCard} onPress={() => onSelect("free")} activeOpacity={0.85}>
        <IconBadge icon="user" tone="neutral" size={44} />
        <View style={styles.planBody}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>Gratis</Text>
            <Text style={styles.planPrice}>$0</Text>
          </View>
          <Text style={styles.planDesc}>Tu tarjeta digital personal en segundos</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.planCard, styles.planCardPro]} onPress={() => onSelect("pro")} activeOpacity={0.85}>
        <IconBadge icon="zap" tone="pro" size={44} />
        <View style={styles.planBody}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>Pro</Text>
            <Text style={styles.planPricePro}>$9 / mes</Text>
          </View>
          <Text style={styles.planDesc}>Más personalización, estadísticas y soporte prioritario</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.planCard} onPress={() => onSelect("invite")} activeOpacity={0.85}>
        <IconBadge icon="briefcase" tone="neutral" size={44} />
        <View style={styles.planBody}>
          <View style={styles.planHeaderRow}>
            <Text style={styles.planTitle}>Tarjeta de empresa</Text>
          </View>
          <Text style={styles.planDesc}>¿Tu empresa ya usa Mi Tarjeta? Sumate con un código de invitación</Text>
        </View>
      </TouchableOpacity>
    </>
  );
}

// ─── Back row ─────────────────────────────────────────────────────────────────

function BackRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.backRow} hitSlop={8}>
      <Feather name="chevron-left" size={18} color={colors.accent} />
      <Text style={styles.backText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Plan Gratis ──────────────────────────────────────────────────────────────

function FreeForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function onNameChange(val: string) {
    setName(val);
    setHandle(toSlug(val));
  }

  async function handleRegister() {
    if (!name.trim() || !handle.trim() || !email.trim() || password.length < 8) {
      Alert.alert("Datos incompletos", "Completá todos los campos. La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await registerPersonal({ name: name.trim(), handle: handle.trim(), email: email.trim().toLowerCase(), password });
      await login(email.trim().toLowerCase(), password);
      await setUserPlan("gratis");
      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BackRow label="Cambiar plan" onPress={onBack} />

      <View style={styles.header}>
        <IconBadge icon="user" tone="accent" size={52} />
        <Text style={styles.title}>Crear tarjeta gratis</Text>
        <Text style={styles.subtitle}>Tu tarjeta digital en segundos</Text>
      </View>

      <View style={styles.form}>
        <LabeledInput
          label="Nombre visible"
          value={name}
          onChangeText={onNameChange}
          placeholder="Juan Pérez"
          textContentType="name"
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Tu URL pública</Text>
        <View style={styles.handleRow}>
          <Text style={styles.handlePrefix}>tarjeta.app/</Text>
          <TextInput
            style={[styles.input, styles.handleInput]}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="juan-perez"
            placeholderTextColor={colors.faint}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="tu@email.com"
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <LabeledInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="Mínimo 8 caracteres"
          />
        </View>

        <Button
          label="Crear mi tarjeta"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: spacing["2xl"] }}
        />
      </View>
    </>
  );
}

// ─── Plan Pro ─────────────────────────────────────────────────────────────────

function ProForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function onNameChange(val: string) {
    setName(val);
    setHandle(toSlug(val));
  }

  async function handleRegister() {
    if (!name.trim() || !handle.trim() || !email.trim() || password.length < 8) {
      Alert.alert("Datos incompletos", "Completá todos los campos. La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await registerPro({ name: name.trim(), handle: handle.trim(), email: email.trim().toLowerCase(), password });
      await login(email.trim().toLowerCase(), password);
      await setUserPlan("pro");
      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Error al registrarse en plan Pro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BackRow label="Cambiar plan" onPress={onBack} />

      <View style={styles.header}>
        <IconBadge icon="zap" tone="pro" size={52} />
        <Text style={styles.title}>Plan Pro</Text>
        <Text style={styles.subtitle}>Estadísticas, personalización avanzada y soporte prioritario</Text>
      </View>

      <View style={styles.form}>
        <LabeledInput
          label="Nombre visible"
          value={name}
          onChangeText={onNameChange}
          placeholder="Juan Pérez"
          textContentType="name"
        />

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Tu URL pública</Text>
        <View style={styles.handleRow}>
          <Text style={styles.handlePrefix}>tarjeta.app/</Text>
          <TextInput
            style={[styles.input, styles.handleInput]}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="juan-perez"
            placeholderTextColor={colors.faint}
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <LabeledInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="tu@email.com"
          />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          <LabeledInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
            placeholder="Mínimo 8 caracteres"
          />
        </View>

        <Button
          label="Activar plan Pro"
          variant="pro"
          icon="zap"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: spacing["2xl"] }}
        />
      </View>
    </>
  );
}

// ─── Tarjeta de empresa (invite code) ────────────────────────────────────────

type InviteStep = "code" | "details";

function InviteForm({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const [inviteStep, setInviteStep] = useState<InviteStep>("code");
  const [inviteCode, setInviteCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  function handleCodeNext() {
    if (!inviteCode.trim()) {
      Alert.alert("Código requerido", "Ingresá el código de invitación que te compartió tu empresa.");
      return;
    }
    setInviteStep("details");
  }

  async function handleRegister() {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert("Datos incompletos", "Completá todos los campos. La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setLoading(true);
    try {
      await registerInvite({
        inviteCode: inviteCode.trim().toUpperCase(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      await login(email.trim().toLowerCase(), password);
      await setUserPlan("empresa");
      router.replace("/(home)/");
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "Código inválido o error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BackRow
        label={inviteStep === "details" ? "Volver" : "Cambiar plan"}
        onPress={inviteStep === "details" ? () => setInviteStep("code") : onBack}
      />

      <View style={styles.header}>
        <IconBadge icon="briefcase" tone="accent" size={52} />
        <Text style={styles.title}>Tarjeta de empresa</Text>
        <Text style={styles.subtitle}>
          {inviteStep === "code"
            ? "Ingresá el código de invitación que te compartió tu empresa"
            : "Completá tus datos para crear tu tarjeta"}
        </Text>
      </View>

      {/* Indicador de paso */}
      <View style={styles.stepRow}>
        <View style={[styles.stepDot, inviteStep === "code" && styles.stepDotActive]} />
        <View style={styles.stepLine} />
        <View style={[styles.stepDot, inviteStep === "details" && styles.stepDotActive]} />
      </View>

      <View style={styles.form}>
        {inviteStep === "code" ? (
          <>
            <LabeledInput
              label="Código de invitación"
              style={styles.inputCode}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABC-123"
            />
            <Button
              label="Continuar"
              icon="arrow-right"
              onPress={handleCodeNext}
              style={{ marginTop: spacing["2xl"] }}
            />
          </>
        ) : (
          <>
            <LabeledInput
              label="Tu nombre"
              value={name}
              onChangeText={setName}
              placeholder="Juan Pérez"
              textContentType="name"
            />

            <View style={{ marginTop: spacing.lg }}>
              <LabeledInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                textContentType="emailAddress"
                placeholder="tu@empresa.com"
              />
            </View>

            <View style={{ marginTop: spacing.lg }}>
              <LabeledInput
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textContentType="newPassword"
                placeholder="Mínimo 8 caracteres"
              />
            </View>

            <Button
              label="Unirme a la empresa"
              onPress={handleRegister}
              loading={loading}
              style={{ marginTop: spacing["2xl"] }}
            />
          </>
        )}
      </View>
    </>
  );
}

// ─── Estilos ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: spacing["3xl"], paddingVertical: spacing["4xl"] },
  header: { alignItems: "center", marginBottom: spacing["2xl"] },
  title: { fontSize: font.xl, fontWeight: font.bold, color: colors.ink, textAlign: "center", marginTop: spacing.lg, letterSpacing: -0.3 },
  subtitle: { fontSize: font.sm, color: colors.muted, marginTop: 6, textAlign: "center", lineHeight: 20 },
  form: {},
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
  inputCode: {
    fontSize: font.xl,
    fontWeight: font.bold,
    letterSpacing: 6,
    textAlign: "center",
    color: colors.ink,
  },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  handlePrefix: { fontSize: font.sm, color: colors.muted, fontWeight: font.medium },
  handleInput: { flex: 1 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing["3xl"] },
  footerText: { fontSize: font.sm, color: colors.muted },
  link: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },
  backRow: { flexDirection: "row", alignItems: "center", gap: 2, marginBottom: spacing.sm },
  backText: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardPro: {
    borderColor: colors.proBorder,
    backgroundColor: colors.proSoft,
  },
  planBody: { flex: 1 },
  planHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: font.md, fontWeight: font.bold, color: colors.ink },
  planPrice: { fontSize: font.base, fontWeight: font.bold, color: colors.ink },
  planPricePro: { fontSize: font.base, fontWeight: font.bold, color: colors.pro },
  planDesc: { fontSize: font.sm, color: colors.muted, marginTop: 4, lineHeight: 18 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing["2xl"],
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  stepDotActive: { backgroundColor: colors.ink },
  stepLine: { width: 48, height: 2, backgroundColor: colors.border, marginHorizontal: 6 },
});
