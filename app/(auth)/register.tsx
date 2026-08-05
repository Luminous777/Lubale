import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from "react-native";
import { useRouter, Link } from "expo-router";
import { registerPersonal, registerPro, registerInvite, login } from "@/lib/api";
import { setUserPlan } from "@/lib/storage";

type PlanStep = "select" | "free" | "pro" | "invite";

function toSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
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

// ─── Plan selector ────────────────────────────────────────────────────────────

function PlanSelect({ onSelect }: { onSelect: (step: PlanStep) => void }) {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.logo}>🪪</Text>
        <Text style={styles.title}>Creá tu tarjeta</Text>
        <Text style={styles.subtitle}>Elegí el plan que mejor se adapte a vos</Text>
      </View>

      <TouchableOpacity style={styles.planCard} onPress={() => onSelect("free")}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planTitle}>Gratis</Text>
          <Text style={styles.planPrice}>$0</Text>
        </View>
        <Text style={styles.planDesc}>Tu tarjeta digital personal en segundos</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.planCard, styles.planCardPro]} onPress={() => onSelect("pro")}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planTitle}>Pro ✨</Text>
          <Text style={styles.planPricePro}>$9 / mes</Text>
        </View>
        <Text style={styles.planDesc}>Más personalización, estadísticas y soporte prioritario</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.planCard} onPress={() => onSelect("invite")}>
        <View style={styles.planHeaderRow}>
          <Text style={styles.planTitle}>Tarjeta de empresa 🏢</Text>
        </View>
        <Text style={styles.planDesc}>¿Tu empresa ya usa Mi Tarjeta? Sumate con un código de invitación</Text>
      </TouchableOpacity>
    </>
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
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Cambiar plan</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>🪪</Text>
        <Text style={styles.title}>Crear tarjeta gratis</Text>
        <Text style={styles.subtitle}>Tu tarjeta digital en segundos</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre visible</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="Juan Pérez"
          placeholderTextColor="#94a3b8"
          textContentType="name"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Tu URL pública</Text>
        <View style={styles.handleRow}>
          <Text style={styles.handlePrefix}>tarjeta.app/</Text>
          <TextInput
            style={[styles.input, styles.handleInput]}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="juan-perez"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="tu@email.com"
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Crear mi tarjeta</Text>}
        </TouchableOpacity>
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
      <TouchableOpacity onPress={onBack} style={styles.backRow}>
        <Text style={styles.backText}>‹ Cambiar plan</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>✨</Text>
        <Text style={styles.title}>Plan Pro</Text>
        <Text style={styles.subtitle}>Estadísticas, personalización avanzada y soporte prioritario</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre visible</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={onNameChange}
          placeholder="Juan Pérez"
          placeholderTextColor="#94a3b8"
          textContentType="name"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Tu URL pública</Text>
        <View style={styles.handleRow}>
          <Text style={styles.handlePrefix}>tarjeta.app/</Text>
          <TextInput
            style={[styles.input, styles.handleInput]}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            placeholder="juan-perez"
            placeholderTextColor="#94a3b8"
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          placeholder="tu@email.com"
          placeholderTextColor="#94a3b8"
        />

        <Text style={[styles.label, { marginTop: 16 }]}>Contraseña</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor="#94a3b8"
        />

        <TouchableOpacity
          style={[styles.btn, styles.btnPro, loading && styles.btnDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Activar plan Pro</Text>}
        </TouchableOpacity>
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
      <TouchableOpacity
        onPress={inviteStep === "details" ? () => setInviteStep("code") : onBack}
        style={styles.backRow}
      >
        <Text style={styles.backText}>
          {inviteStep === "details" ? "‹ Volver" : "‹ Cambiar plan"}
        </Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.logo}>🏢</Text>
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
            <Text style={styles.label}>Código de invitación</Text>
            <TextInput
              style={[styles.input, styles.inputCode]}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="ABC-123"
              placeholderTextColor="#94a3b8"
            />
            <TouchableOpacity style={styles.btn} onPress={handleCodeNext}>
              <Text style={styles.btnText}>Continuar</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Tu nombre</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Juan Pérez"
              placeholderTextColor="#94a3b8"
              textContentType="name"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="tu@empresa.com"
              placeholderTextColor="#94a3b8"
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              placeholder="Mínimo 8 caracteres"
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Unirme a la empresa</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  inner: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 },
  header: { alignItems: "center", marginBottom: 24 },
  logo: { fontSize: 48, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 6, textAlign: "center" },
  form: {},
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0f172a",
  },
  inputCode: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 4,
    textAlign: "center",
    color: "#3f67c4",
  },
  handleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  handlePrefix: { fontSize: 14, color: "#64748b", fontWeight: "500" },
  handleInput: { flex: 1 },
  btn: {
    backgroundColor: "#3f67c4",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnPro: { backgroundColor: "#7c3aed" },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerText: { fontSize: 14, color: "#64748b" },
  link: { fontSize: 14, color: "#3f67c4", fontWeight: "600" },
  backRow: { marginBottom: 8 },
  backText: { fontSize: 14, color: "#3f67c4", fontWeight: "600" },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  planCardPro: {
    borderColor: "#7c3aed",
    borderWidth: 1.5,
    backgroundColor: "#faf5ff",
  },
  planHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planTitle: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  planPrice: { fontSize: 15, fontWeight: "700", color: "#3f67c4" },
  planPricePro: { fontSize: 15, fontWeight: "700", color: "#7c3aed" },
  planDesc: { fontSize: 13, color: "#64748b", marginTop: 6 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginBottom: 28,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#e2e8f0",
  },
  stepDotActive: { backgroundColor: "#3f67c4" },
  stepLine: { width: 48, height: 2, backgroundColor: "#e2e8f0", marginHorizontal: 6 },
});
