import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Pressable,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ScrollView, ActivityIndicator, Linking, Image, StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useFonts, CormorantGaramond_400Regular } from "@expo-google-fonts/cormorant-garamond";
import { Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from "@expo-google-fonts/jost";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  registerPersonal, registerPro, registerInvite,
  login, getMyOrgs, updateProfile, generateAiCard, getCheckoutUrl,
  type AiCardResult,
} from "@/lib/api";
import { setUserPlan } from "@/lib/storage";
import { colors, radius, spacing, font } from "@/lib/theme";

// ─── Constants ────────────────────────────────────────────────────────────────

const NAVY = "#13263F";

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = "gratis" | "pro" | "empresa";

/**
 * Flujo:
 *  "register"  → datos personales (nombre, email, contraseña)
 *  "plan"      → elegí el tipo de cuenta
 *  "payment"   → confirmación de pago Pro (después de abrir MercadoPago)
 *  "build"     → construí tu tarjeta
 */
type Step = "register" | "plan" | "payment" | "build";

interface CardData {
  title: string;
  bio: string;
  phone: string;
  emailPublic: string;
}

// ─── Links ────────────────────────────────────────────────────────────────────

type LinkKind =
  | "whatsapp" | "linkedin" | "instagram" | "website"
  | "youtube" | "tiktok" | "github" | "twitter";

interface LinkItem { key: string; kind: LinkKind; url: string; }

const LINK_KINDS: { kind: LinkKind; label: string; icon: string; placeholder: string }[] = [
  { kind: "whatsapp",  label: "WhatsApp",  icon: "phone",    placeholder: "https://wa.me/541112345678" },
  { kind: "linkedin",  label: "LinkedIn",  icon: "linkedin", placeholder: "https://linkedin.com/in/usuario" },
  { kind: "instagram", label: "Instagram", icon: "instagram",placeholder: "https://instagram.com/usuario" },
  { kind: "website",   label: "Sitio web", icon: "globe",    placeholder: "https://tu-sitio.com" },
  { kind: "youtube",   label: "YouTube",   icon: "youtube",  placeholder: "https://youtube.com/@canal" },
  { kind: "tiktok",    label: "TikTok",    icon: "music",    placeholder: "https://tiktok.com/@usuario" },
  { kind: "github",    label: "GitHub",    icon: "github",   placeholder: "https://github.com/usuario" },
  { kind: "twitter",   label: "Twitter/X", icon: "twitter",  placeholder: "https://x.com/usuario" },
];

let _keyCounter = 0;
function newKey() { return `lk_${++_keyCounter}`; }

function toSlug(val: string) {
  return val
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}

// ─── Root screen ──────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  // Fonts
  const [fontsLoaded] = useFonts({
    CormorantGaramond_400Regular,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
  });

  // Navigation
  const [step, setStep] = useState<Step>("register");

  // Step 1 — datos personales
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [slug, setSlug]       = useState("");

  // Step 2 — tipo de cuenta
  const [plan, setPlan]           = useState<Plan>("gratis");
  const [inviteCode, setInviteCode] = useState("");

  // Post-register context
  const [orgSlug, setOrgSlug]   = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Step 3 — construir tarjeta
  const [card, setCard] = useState<CardData>({ title: "", bio: "", phone: "", emailPublic: "" });
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  // Global loading
  const [loading, setLoading] = useState(false);

  function updateCard(key: keyof CardData, value: string) {
    setCard(prev => ({ ...prev, [key]: value }));
  }

  function addLink() {
    const isPro = plan === "pro" || plan === "empresa";
    if (!isPro && links.length >= 1) return;
    setLinks(prev => [...prev, { key: newKey(), kind: "whatsapp", url: "" }]);
  }

  function removeLink(key: string) {
    setLinks(prev => prev.filter(l => l.key !== key));
  }

  function updateLink(key: string, patch: Partial<LinkItem>) {
    setLinks(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
  }

  // ── Paso 1 → 2: validar datos personales ──────────────────────────────────
  function handleNextFromRegister() {
    if (!name.trim()) {
      Alert.alert("Falta el nombre", "Ingresá tu nombre completo.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      Alert.alert("Email inválido", "Ingresá un email válido.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Contraseña muy corta", "Mínimo 8 caracteres.");
      return;
    }
    if (!slug.trim()) {
      Alert.alert("Falta tu link", "Elegí el nombre para tu link público.");
      return;
    }
    setStep("plan");
  }

  // ── Social auth ───────────────────────────────────────────────────────────
  async function handleSocialRegister(provider: "google" | "apple") {
    if (provider === "apple") {
      try {
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        // TODO: enviar credential.identityToken al backend para crear sesión
        // await loginWithApple(credential.identityToken)
        Alert.alert(
          "Apple Sign-In",
          "Recibimos tu credencial de Apple. El backend OAuth se configura próximamente.",
          [{ text: "OK" }]
        );
      } catch (e: any) {
        if (e?.code !== "ERR_REQUEST_CANCELED") {
          Alert.alert("Error", "No se pudo autenticar con Apple.");
        }
      }
    } else {
      // Google OAuth — requiere configurar Google Cloud Console + backend endpoint
      Alert.alert(
        "Google Sign-In",
        "El inicio de sesión con Google se activa próximamente.",
        [{ text: "OK" }]
      );
    }
  }

  // ── Paso 2 → registrar + según plan ───────────────────────────────────────
  async function handleSelectPlan(selectedPlan: Plan) {
    setPlan(selectedPlan);

    if (selectedPlan === "empresa") {
      // Pide el código antes de registrar — lo manejamos inline en StepPlan
      return;
    }

    setLoading(true);
    try {
      await doRegister(selectedPlan, "");
      if (selectedPlan === "pro") {
        // Abrir checkout de MercadoPago
        try {
          const { checkoutUrl } = await getCheckoutUrl();
          await Linking.openURL(checkoutUrl);
        } catch {
          // Si falla el checkout igual continuamos
        }
        setStep("payment");
      } else {
        setStep("build");
      }
    } catch (e: unknown) {
      Alert.alert("Error al crear cuenta", e instanceof Error ? e.message : "Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterEmpresa() {
    if (!inviteCode.trim()) {
      Alert.alert("Falta el código", "Ingresá el código que te envió tu empresa.");
      return;
    }
    setLoading(true);
    try {
      await doRegister("empresa", inviteCode.trim());
      setStep("build");
    } catch (e: unknown) {
      Alert.alert("Error al crear cuenta", e instanceof Error ? e.message : "Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function doRegister(selectedPlan: Plan, code: string) {
    const handle   = slug.trim() || toSlug(name) || "usuario";
    const emailLow = email.trim().toLowerCase();

    if (selectedPlan === "empresa") {
      await registerInvite({ inviteCode: code, name: name.trim(), email: emailLow, password });
    } else if (selectedPlan === "pro") {
      await registerPro({ name: name.trim(), handle, email: emailLow, password });
    } else {
      await registerPersonal({ name: name.trim(), handle, email: emailLow, password });
    }

    await login(emailLow, password);
    await setUserPlan(selectedPlan);

    const orgs = await getMyOrgs();
    const org   = orgs[0];
    const prof  = org?.profiles[0];
    if (org?.orgSlug) setOrgSlug(org.orgSlug);
    if (prof?.id)     setProfileId(prof.id);
  }

  // ── IA en tiempo real (StepBuild) ─────────────────────────────────────────
  async function handleAiGenerate() {
    if (!aiPrompt.trim() || !orgSlug) return;
    setAiLoading(true);
    try {
      const result: AiCardResult = await generateAiCard(orgSlug, aiPrompt.trim());
      if (result.title) updateCard("title", result.title);
      if (result.bio)   updateCard("bio",   result.bio);
    } catch (e: unknown) {
      Alert.alert("Error de IA", e instanceof Error ? e.message : "Intentá de nuevo.");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Guardar tarjeta → home ─────────────────────────────────────────────────
  async function handleSave() {
    if (!profileId) { router.replace("/(home)/"); return; }
    setLoading(true);
    try {
      const isPro = plan === "pro" || plan === "empresa";
      const cleanLinks = links
        .filter(l => l.url.trim())
        .map((l, i) => ({
          title: LINK_KINDS.find(k => k.kind === l.kind)?.label ?? l.kind,
          url: l.url.trim(),
          sortOrder: i,
        }));
      await updateProfile(profileId, {
        displayName: name.trim(),
        title: card.title.trim() || undefined,
        bio: isPro ? (card.bio.trim() || undefined) : undefined,
        phone: card.phone.trim() || undefined,
        emailPublic: isPro ? (card.emailPublic.trim() || undefined) : undefined,
        links: cleanLinks,
      });
    } catch { /* si falla el update no bloqueamos */ } finally {
      setLoading(false);
    }
    router.replace("/(home)/");
  }

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: NAVY }} />;

  return (
    <KeyboardAvoidingView
      style={st.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={st.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "register" && (
          <StepRegister
            name={name}
            email={email}
            password={password}
            slug={slug}
            onChangeName={setName}
            onChangeEmail={setEmail}
            onChangePassword={setPassword}
            onChangeSlug={setSlug}
            onNext={handleNextFromRegister}
            onSocialRegister={handleSocialRegister}
          />
        )}

        {step === "plan" && (
          <StepPlan
            plan={plan}
            inviteCode={inviteCode}
            loading={loading}
            onChangePlan={setPlan}
            onChangeInviteCode={setInviteCode}
            onSelectPlan={handleSelectPlan}
            onRegisterEmpresa={handleRegisterEmpresa}
            onBack={() => setStep("register")}
          />
        )}

        {step === "payment" && (
          <StepPayment
            onCheckoutAgain={async () => {
              try { const { checkoutUrl } = await getCheckoutUrl(); await Linking.openURL(checkoutUrl); } catch {}
            }}
            onContinue={() => setStep("build")}
          />
        )}

        {step === "build" && (
          <StepBuild
            plan={plan}
            name={name}
            card={card}
            links={links}
            aiPrompt={aiPrompt}
            aiLoading={aiLoading}
            loading={loading}
            photoUri={photoUri}
            onChange={updateCard}
            onAddLink={addLink}
            onRemoveLink={removeLink}
            onUpdateLink={updateLink}
            onAiPromptChange={setAiPrompt}
            onAiGenerate={handleAiGenerate}
            onPhotoChange={setPhotoUri}
            onSave={handleSave}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Step 2: Registro personal ────────────────────────────────────────────────

function StepRegister({
  name, email, password, slug,
  onChangeName, onChangeEmail, onChangePassword, onChangeSlug,
  onNext, onSocialRegister,
}: {
  name: string; email: string; password: string; slug: string;
  onChangeName: (v: string) => void;
  onChangeEmail: (v: string) => void;
  onChangePassword: (v: string) => void;
  onChangeSlug: (v: string) => void;
  onNext: () => void;
  onSocialRegister: (provider: "google" | "apple") => void;
}) {
  const valid = name.trim() && email.includes("@") && password.length >= 8 && slug.trim();

  return (
    <SafeAreaView style={reg.root} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={reg.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Back */}
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace("/(auth)/")}
            hitSlop={12}
          >
            <Text style={reg.back}>← Volver</Text>
          </Pressable>

          {/* Header */}
          <Text style={reg.title}>Creá tu cuenta</Text>
          <Text style={reg.subtitle}>
            Tu tarjeta vive en un link. No hace falta que la otra persona instale nada.
          </Text>

          {/* ── Social auth ── */}
          <View style={reg.socialRow}>
            {/* Apple — solo iOS */}
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={reg.appleBtn}
              onPress={() => onSocialRegister("apple")}
            />

            {/* Google */}
            <Pressable
              style={({ pressed }) => [reg.googleBtn, pressed && reg.pressed]}
              onPress={() => onSocialRegister("google")}
            >
              {/* Google G logo en SVG inline no es posible en RN — usamos letras */}
              <View style={reg.googleIcon}>
                <Text style={reg.googleG}>G</Text>
              </View>
              <Text style={reg.googleLabel}>Continuar con Google</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={reg.dividerRow}>
            <View style={reg.dividerLine} />
            <Text style={reg.dividerText}>o continuá con email</Text>
            <View style={reg.dividerLine} />
          </View>

          {/* Fields */}
          <View style={reg.fields}>
            <RegField label="Nombre y apellido">
              <TextInput
                style={reg.input}
                value={name}
                onChangeText={onChangeName}
                placeholder="Camila Ruiz"
                placeholderTextColor="#B4BBC4"
                autoCapitalize="words"
              />
            </RegField>

            <RegField label="Email">
              <TextInput
                style={reg.input}
                value={email}
                onChangeText={onChangeEmail}
                placeholder="camila@estudioruiz.com"
                placeholderTextColor="#B4BBC4"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </RegField>

            <RegField label="Contraseña">
              <TextInput
                style={reg.input}
                value={password}
                onChangeText={onChangePassword}
                placeholder="Mínimo 8 caracteres"
                placeholderTextColor="#B4BBC4"
                secureTextEntry
              />
            </RegField>

            <RegField label="Elegí tu link">
              <View style={[reg.input, reg.slugRow, slug ? reg.inputActive : null]}>
                <Text style={reg.slugPrefix}>lubela.app/</Text>
                <TextInput
                  style={reg.slugInput}
                  value={slug}
                  onChangeText={t => onChangeSlug(t.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="camila"
                  placeholderTextColor="#B4BBC4"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </RegField>
          </View>

          <View style={{ flex: 1, minHeight: 24 }} />

          {/* CTA */}
          <Pressable
            disabled={!valid}
            onPress={onNext}
            style={({ pressed }) => [reg.cta, !valid && reg.ctaDisabled, pressed && reg.pressed]}
          >
            <Text style={reg.ctaLabel}>Continuar</Text>
          </Pressable>

          <Text style={reg.legal}>
            Al continuar aceptás los términos y la política de privacidad.
          </Text>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={st.footer}>
              <Text style={st.footerText}>¿Ya tenés cuenta? </Text>
              <Text style={st.footerLink}>Iniciá sesión</Text>
            </TouchableOpacity>
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RegField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={reg.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

// ─── Step 3: Tipo de cuenta ───────────────────────────────────────────────────

function StepPlan({
  plan, inviteCode, loading,
  onChangePlan, onChangeInviteCode,
  onSelectPlan, onRegisterEmpresa, onBack,
}: {
  plan: Plan; inviteCode: string; loading: boolean;
  onChangePlan: (p: Plan) => void;
  onChangeInviteCode: (v: string) => void;
  onSelectPlan: (p: Plan) => void;
  onRegisterEmpresa: () => void;
  onBack: () => void;
}) {
  return (
    <SafeAreaView style={st.safeStep} edges={["top"]}>
      <TouchableOpacity style={st.backBtn} onPress={onBack} hitSlop={8}>
        <Feather name="arrow-left" size={20} color={colors.accent} />
        <Text style={st.backText}>Volver</Text>
      </TouchableOpacity>

      <Text style={st.stepTitle}>Tipo de cuenta</Text>
      <Text style={st.stepSub}>Elegí el plan que mejor se adapte a vos</Text>

      <View style={st.planList}>

        {/* Gratis */}
        <TouchableOpacity
          style={[st.planCard, plan === "gratis" && st.planCardSelected]}
          onPress={() => { onChangePlan("gratis"); onSelectPlan("gratis"); }}
          activeOpacity={0.75}
          disabled={loading}
        >
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
              {["Foto de perfil", "Nombre y puesto", "1 link de WhatsApp"].map(f => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          {loading && plan === "gratis"
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Feather name="chevron-right" size={18} color={colors.faint} />
          }
        </TouchableOpacity>

        {/* Pro */}
        <TouchableOpacity
          style={[st.planCard, st.planCardPro, plan === "pro" && st.planCardSelected]}
          onPress={() => { onChangePlan("pro"); onSelectPlan("pro"); }}
          activeOpacity={0.75}
          disabled={loading}
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
              <Text style={[st.planPrice, { color: colors.accent }]}>$1.599/mes</Text>
            </View>
            <Text style={st.planSub}>Para profesionales</Text>
            <View style={st.featureList}>
              {["Links ilimitados", "Bio y email público", "IA para tu tarjeta", "Analíticas"].map(f => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          {loading && plan === "pro"
            ? <ActivityIndicator size="small" color={colors.accent} />
            : <Feather name="chevron-right" size={18} color={colors.accent} />
          }
        </TouchableOpacity>

        {/* Empresa */}
        <TouchableOpacity
          style={[st.planCard, plan === "empresa" && st.planCardSelected]}
          onPress={() => onChangePlan("empresa")}
          activeOpacity={0.75}
          disabled={loading}
        >
          <View style={[st.planIcon, { backgroundColor: colors.surfaceMuted }]}>
            <Feather name="briefcase" size={20} color={colors.ink} />
          </View>
          <View style={st.planInfo}>
            <Text style={st.planName}>Empresa</Text>
            <Text style={st.planSub}>Con código de invitación</Text>
            <View style={st.featureList}>
              {["Todo lo de Pro", "Gestión de equipo", "Branding de empresa"].map(f => (
                <View key={f} style={st.featureRow}>
                  <Feather name="check" size={13} color={colors.success} />
                  <Text style={st.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
          <Feather name={plan === "empresa" ? "chevron-down" : "chevron-right"} size={18} color={colors.faint} />
        </TouchableOpacity>

        {/* Invite code — aparece si seleccionó Empresa */}
        {plan === "empresa" && (
          <View style={st.inviteBox}>
            <Text style={st.inviteLabel}>Código de invitación</Text>
            <TextInput
              style={st.inviteInput}
              value={inviteCode}
              onChangeText={onChangeInviteCode}
              placeholder="Código que te envió tu empresa"
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              style={({ pressed }) => [st.primaryBtn, { marginTop: spacing.sm }, pressed && st.pressed]}
              onPress={onRegisterEmpresa}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={st.primaryBtnText}>Unirme a la empresa →</Text>
              }
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Step 3b: Confirmación de pago Pro ────────────────────────────────────────

function StepPayment({
  onCheckoutAgain, onContinue,
}: {
  onCheckoutAgain: () => void;
  onContinue: () => void;
}) {
  return (
    <SafeAreaView style={st.safeStep} edges={["top"]}>
      <View style={st.paymentCenter}>
        <View style={st.paymentIcon}>
          <Feather name="zap" size={32} color={colors.onAccent} />
        </View>
        <Text style={[st.stepTitle, { textAlign: "center", marginTop: spacing.xl }]}>
          Activá tu plan Pro
        </Text>
        <Text style={[st.stepSub, { textAlign: "center" }]}>
          Completá el pago en MercadoPago para desbloquear todas las funciones
        </Text>

        <Pressable
          style={({ pressed }) => [st.primaryBtn, { marginTop: spacing["2xl"] }, pressed && st.pressed]}
          onPress={onCheckoutAgain}
        >
          <Feather name="external-link" size={16} color="#fff" style={{ marginRight: 6 }} />
          <Text style={st.primaryBtnText}>Ir a MercadoPago</Text>
        </Pressable>

        <TouchableOpacity style={st.skipBtn} onPress={onContinue}>
          <Text style={st.skipText}>Ya pagué — continuar →</Text>
        </TouchableOpacity>

        <Text style={st.paymentNote}>
          Si ya completaste el pago, tocá "Continuar". Tu cuenta puede tardar unos segundos en activarse.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// ─── Step 4: Armá tu tarjeta ──────────────────────────────────────────────────

function StepBuild({
  plan, name, card, links, aiPrompt, aiLoading, loading, photoUri,
  onChange, onAddLink, onRemoveLink, onUpdateLink,
  onAiPromptChange, onAiGenerate, onPhotoChange, onSave,
}: {
  plan: Plan; name: string; card: CardData; links: LinkItem[];
  aiPrompt: string; aiLoading: boolean; loading: boolean; photoUri: string | null;
  onChange: (key: keyof CardData, value: string) => void;
  onAddLink: () => void;
  onRemoveLink: (key: string) => void;
  onUpdateLink: (key: string, patch: Partial<LinkItem>) => void;
  onAiPromptChange: (v: string) => void;
  onAiGenerate: () => void;
  onPhotoChange: (uri: string) => void;
  onSave: () => void;
}) {
  const isPro      = plan === "pro" || plan === "empresa";
  const canAddLink = isPro || links.length === 0;

  async function pickPhoto() {
    const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!granted) {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para subir una foto.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled) onPhotoChange(res.assets[0].uri);
  }

  return (
    <SafeAreaView style={bld.root} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView
        contentContainerStyle={bld.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Barra de progreso 3/3 */}
        <View style={bld.progressBar}>
          <View style={[bld.progressStep, bld.progressStepOn]} />
          <View style={[bld.progressStep, bld.progressStepOn]} />
          <View style={[bld.progressStep, bld.progressStepOn]} />
        </View>

        <Text style={bld.title}>Armá tu tarjeta</Text>

        {/* ── Foto de perfil ── */}
        <View style={bld.photoRow}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={bld.avatar} />
          ) : (
            <View style={[bld.avatar, bld.avatarEmpty]}>
              <Text style={bld.avatarInitials}>{initials(name) || "?"}</Text>
            </View>
          )}
          <View style={{ gap: 6 }}>
            <Text style={bld.photoLabel}>Foto de perfil</Text>
            <Pressable
              onPress={pickPhoto}
              style={({ pressed }) => [bld.photoBtn, pressed && bld.pressed]}
            >
              <Text style={bld.photoBtnLabel}>{photoUri ? "Cambiar imagen" : "Subir imagen"}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Cargo ── */}
        <View style={bld.fieldGroup}>
          <Text style={bld.fieldLabel}>Cargo</Text>
          <TextInput
            style={[bld.input, card.title ? bld.inputActive : null]}
            value={card.title}
            onChangeText={v => onChange("title", v)}
            placeholder="Arquitecta · Estudio Ruiz"
            placeholderTextColor="#B4BBC4"
          />
        </View>

        {/* ── Bio (todos) ── */}
        <View style={bld.fieldGroup}>
          <View style={bld.bioLabelRow}>
            <Text style={bld.fieldLabel}>Bio corta</Text>
            {isPro && (
              <Pressable
                style={({ pressed }) => [bld.aiBadge, pressed && { opacity: 0.7 }]}
                onPress={onAiGenerate}
                disabled={!aiPrompt.trim() || aiLoading}
              >
                {aiLoading
                  ? <ActivityIndicator size="small" color={NAVY} style={{ width: 13 }} />
                  : <Text style={bld.aiBadgeText}>✨ IA</Text>
                }
              </Pressable>
            )}
          </View>
          <TextInput
            style={[bld.input, bld.textarea, card.bio ? bld.inputActive : null]}
            value={card.bio}
            onChangeText={v => onChange("bio", v)}
            placeholder="Diseño de interiores y obra nueva en Buenos Aires."
            placeholderTextColor="#B4BBC4"
            multiline
            maxLength={160}
            textAlignVertical="top"
          />
          <Text style={bld.counter}>{card.bio.length}/160</Text>
        </View>

        {/* ── IA completa (Pro/Empresa) ── */}
        {isPro && (
          <View style={bld.aiSection}>
            <Text style={bld.aiTitle}>✨ Generar con IA</Text>
            <Text style={bld.aiSub}>
              Describí quién sos y la IA completará tu cargo y bio al instante
            </Text>
            <TextInput
              style={bld.aiInput}
              value={aiPrompt}
              onChangeText={onAiPromptChange}
              placeholder="Soy diseñador UX en Buenos Aires con 5 años de experiencia..."
              placeholderTextColor="#B4BBC4"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <Pressable
              style={({ pressed }) => [
                bld.aiBtn,
                (!aiPrompt.trim() || aiLoading) && bld.aiBtnDisabled,
                pressed && bld.pressed,
              ]}
              onPress={onAiGenerate}
              disabled={!aiPrompt.trim() || aiLoading}
            >
              {aiLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={bld.aiBtnText}>Generar con IA</Text>
              }
            </Pressable>
          </View>
        )}

        {/* ── Teléfono ── */}
        <View style={bld.fieldGroup}>
          <Text style={bld.fieldLabel}>Teléfono / WhatsApp</Text>
          <TextInput
            style={[bld.input, card.phone ? bld.inputActive : null]}
            value={card.phone}
            onChangeText={v => onChange("phone", v)}
            placeholder="+54 11 1234-5678"
            placeholderTextColor="#B4BBC4"
            keyboardType="phone-pad"
          />
        </View>

        {/* ── Email público (Pro/Empresa) ── */}
        {isPro && (
          <View style={bld.fieldGroup}>
            <Text style={bld.fieldLabel}>Email público</Text>
            <TextInput
              style={[bld.input, card.emailPublic ? bld.inputActive : null]}
              value={card.emailPublic}
              onChangeText={v => onChange("emailPublic", v)}
              placeholder="contacto@email.com"
              placeholderTextColor="#B4BBC4"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        )}

        {/* ── Links ── */}
        <Text style={[bld.fieldLabel, { marginTop: 28, marginBottom: 12 }]}>
          {isPro ? "Tus links — ilimitados" : "Tu link"}
        </Text>

        {links.map(link => (
          <LinkRow
            key={link.key}
            link={link}
            isPro={isPro}
            onChange={patch => onUpdateLink(link.key, patch)}
            onDelete={() => onRemoveLink(link.key)}
          />
        ))}

        {canAddLink && (
          <Pressable
            style={({ pressed }) => [bld.addLinkBtn, pressed && bld.pressed]}
            onPress={onAddLink}
          >
            <Text style={bld.addLinkText}>+ Agregar link</Text>
          </Pressable>
        )}

        {/* ── CTA ── */}
        <Pressable
          onPress={onSave}
          disabled={loading}
          style={({ pressed }) => [bld.cta, loading && { opacity: 0.6 }, pressed && bld.pressed]}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={bld.ctaLabel}>Ver mi tarjeta</Text>
          }
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Card preview ─────────────────────────────────────────────────────────────

function CardPreview({ name, card, links }: { name: string; card: CardData; links: LinkItem[] }) {
  const visibleLinks = links.filter(l => l.url.trim()).slice(0, 3);
  return (
    <View style={prev.wrap}>
      <View style={prev.card}>
        <View style={prev.header}>
          <View style={prev.avatar}>
            <Text style={prev.avatarText}>{initials(name) || "?"}</Text>
          </View>
          <View style={prev.nameBlock}>
            <Text style={prev.name} numberOfLines={1}>{name.trim() || "Tu nombre"}</Text>
            {card.title.trim() ? <Text style={prev.title} numberOfLines={1}>{card.title}</Text> : null}
          </View>
        </View>
        {(card.phone.trim() || card.emailPublic.trim()) ? (
          <View style={prev.contactRow}>
            {card.phone.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="phone" size={11} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{card.phone}</Text>
              </View>
            ) : null}
            {card.emailPublic.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="mail" size={11} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{card.emailPublic}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        {card.bio.trim() ? <Text style={prev.bio} numberOfLines={2}>{card.bio}</Text> : null}
        {visibleLinks.length > 0 ? (
          <View style={prev.linksRow}>
            {visibleLinks.map(l => {
              const meta = LINK_KINDS.find(k => k.kind === l.kind) ?? LINK_KINDS[0];
              return (
                <View key={l.key} style={prev.chip}>
                  <Feather name={meta.icon as any} size={10} color={colors.accent} />
                  <Text style={prev.chipText}>{meta.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
      <View style={prev.hint}>
        <Feather name="eye" size={11} color={colors.faint} />
        <Text style={prev.hintText}>Vista previa en tiempo real</Text>
      </View>
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType, secureTextEntry,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  secureTextEntry?: boolean;
}) {
  return (
    <View style={st.fieldWrap}>
      <Text style={st.fieldLabel}>{label}</Text>
      <TextInput
        style={[st.input, multiline && st.inputMulti]}
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
            ? "none" : "sentences"
        }
      />
    </View>
  );
}

// ─── Link row ─────────────────────────────────────────────────────────────────

function LinkRow({ link, isPro, onChange, onDelete }: {
  link: LinkItem; isPro: boolean;
  onChange: (patch: Partial<LinkItem>) => void;
  onDelete: () => void;
}) {
  const meta = LINK_KINDS.find(k => k.kind === link.kind) ?? LINK_KINDS[0];
  function pickKind() {
    if (!isPro) return;
    Alert.alert("Tipo de link", "Elegí el tipo", [
      ...LINK_KINDS.map(k => ({ text: k.label, onPress: () => onChange({ kind: k.kind, url: "" }) })),
      { text: "Cancelar", style: "cancel" as const },
    ]);
  }
  return (
    <View style={st.linkRow}>
      <TouchableOpacity style={st.linkKindBtn} onPress={pickKind} activeOpacity={isPro ? 0.7 : 1}>
        <Feather name={meta.icon as any} size={14} color={colors.accent} />
        <Text style={st.linkKindText}>{meta.label}</Text>
        {isPro && <Feather name="chevron-down" size={11} color={colors.muted} />}
      </TouchableOpacity>
      <TextInput
        style={st.linkUrlInput}
        value={link.url}
        onChangeText={url => onChange({ url })}
        placeholder={meta.placeholder}
        placeholderTextColor={colors.faint}
        keyboardType="url"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity onPress={onDelete} hitSlop={10} style={{ padding: 4 }}>
        <Feather name="trash-2" size={15} color={colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingHorizontal: spacing["2xl"], paddingBottom: spacing["3xl"] },
  safeStep: { flex: 1, paddingTop: spacing.xl },

  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.xl },
  backText: { fontSize: font.sm, color: colors.accent, fontFamily: "Jost_500Medium" },

  stepTitle: {
    fontFamily: "Jost_600SemiBold",
    fontSize: font.xl,
    color: colors.ink,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  stepSub: {
    fontFamily: "Jost_400Regular",
    fontSize: font.sm,
    color: colors.muted,
    marginBottom: spacing.xl,
  },

  stepChip: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  stepChipText: { fontSize: font.sm, color: colors.accent, fontFamily: "Jost_500Medium" },

  // Primary button
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    backgroundColor: NAVY,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 16, color: "#FFFFFF" },
  pressed: { opacity: 0.75 },

  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: spacing["2xl"] },
  footerText: { fontFamily: "Jost_400Regular", fontSize: font.sm, color: colors.muted },
  footerLink: { fontFamily: "Jost_600SemiBold", fontSize: font.sm, color: colors.accent },

  // Plan cards
  planList: { gap: spacing.md, marginBottom: spacing.xl },
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
  planCardSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  planCardPro: {
    borderColor: colors.accent,
    backgroundColor: "#FAFAFE",
    paddingTop: spacing["2xl"] + 4,
    position: "relative",
  },
  planBadgePro: {
    position: "absolute", top: 0, right: spacing.lg,
    backgroundColor: colors.accent,
    borderBottomLeftRadius: radius.sm, borderBottomRightRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: 4,
  },
  planBadgeText: { fontSize: font.xs, fontFamily: "Jost_600SemiBold", color: "#FFFFFF" },
  planIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  planInfo: { flex: 1 },
  planTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  planName: { fontSize: font.md, fontFamily: "Jost_600SemiBold", color: colors.ink },
  planPrice: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted },
  planSub: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted, marginBottom: spacing.sm },
  featureList: { gap: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureText: { fontSize: font.sm, fontFamily: "Jost_400Regular", color: colors.ink },

  // Empresa invite box
  inviteBox: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
  inviteLabel: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.ink, marginBottom: spacing.sm },
  inviteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    fontSize: font.base, color: colors.ink, fontFamily: "Jost_400Regular",
  },

  // Payment screen
  paymentCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.md },
  paymentIcon: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 8,
  },
  skipBtn: { marginTop: spacing.xl, paddingVertical: spacing.md },
  skipText: { fontFamily: "Jost_500Medium", fontSize: font.sm, color: colors.accent },
  paymentNote: {
    fontFamily: "Jost_400Regular",
    fontSize: font.xs, color: colors.muted,
    textAlign: "center", lineHeight: 18,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },

  // AI section
  aiSection: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.accent + "30",
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  aiTitle: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.accent },
  aiSub: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted, marginBottom: spacing.md, lineHeight: 16 },
  aiInput: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    fontSize: font.sm, color: colors.ink,
    minHeight: 72, textAlignVertical: "top",
    fontFamily: "Jost_400Regular",
  },
  aiBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, backgroundColor: colors.accent,
    borderRadius: radius.sm, paddingVertical: spacing.md, marginTop: spacing.md,
  },
  aiBtnDisabled: { opacity: 0.4 },
  aiBtnText: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.onAccent },

  // Bio label row
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.accentSoft, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  aiBadgeText: { fontSize: 11, fontFamily: "Jost_600SemiBold", color: colors.accent },

  // Section headers
  sectionLabel: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.ink, marginBottom: spacing.md },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  sectionSub: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted },

  // Links
  linkRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.md },
  linkKindBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.accentSoft, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 8, flexShrink: 0,
  },
  linkKindText: { fontSize: font.xs, fontFamily: "Jost_600SemiBold", color: colors.accent },
  linkUrlInput: {
    flex: 1, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: font.sm, color: colors.ink, fontFamily: "Jost_400Regular",
  },
  addLinkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: spacing.md },
  addLinkText: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.accent },

  // Fields
  fieldWrap: { marginBottom: spacing.lg },
  fieldLabel: { fontSize: font.sm, fontFamily: "Jost_600SemiBold", color: colors.ink, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.lg,
    fontSize: font.base, color: colors.ink, fontFamily: "Jost_400Regular",
  },
  inputMulti: { height: 80, textAlignVertical: "top", paddingTop: spacing.md },
});

// ─── Register screen styles (diseño propio) ───────────────────────────────────

const MUTED  = "#6B7787";
const LABEL  = "#8A94A2";
const BORDER = "rgba(19,38,63,0.16)";

const reg = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 8, paddingBottom: 36 },

  back: { fontFamily: "Jost_400Regular", fontSize: 14, color: MUTED, marginBottom: 26 },

  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 34,
    lineHeight: 40,
    color: NAVY,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Jost_400Regular",
    fontSize: 14,
    lineHeight: 22,
    color: MUTED,
    marginBottom: 24,
  },

  // Social auth
  socialRow: { gap: 10, marginBottom: 20 },
  appleBtn: { width: "100%", height: 50 },
  googleBtn: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  googleIcon: {
    width: 20, height: 20,
    borderRadius: 10,
    backgroundColor: "#4285F4",
    alignItems: "center", justifyContent: "center",
  },
  googleG: { fontFamily: "Jost_600SemiBold", fontSize: 12, color: "#FFFFFF" },
  googleLabel: { fontFamily: "Jost_500Medium", fontSize: 15, color: NAVY },

  // Divider
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: { fontFamily: "Jost_400Regular", fontSize: 12, color: LABEL },

  // Fields
  fields: { gap: 16 },
  fieldLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: LABEL,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: NAVY,
  },
  inputActive: { borderColor: NAVY },
  slugRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16 },
  slugPrefix: { fontFamily: "Jost_400Regular", fontSize: 15, color: LABEL },
  slugInput: {
    flex: 1,
    fontFamily: "Jost_400Regular",
    fontSize: 15,
    color: NAVY,
    padding: 0,
  },

  // CTA
  cta: {
    height: 54,
    borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    marginTop: 28,
  },
  ctaDisabled: { opacity: 0.35 },
  ctaLabel: { fontFamily: "Jost_500Medium", fontSize: 16, color: "#FFFFFF" },

  legal: {
    fontFamily: "Jost_400Regular",
    fontSize: 12,
    lineHeight: 19,
    color: LABEL,
    textAlign: "center",
    marginTop: 16,
  },
  pressed: { opacity: 0.85 },
});

// ─── Build screen styles ──────────────────────────────────────────────────────

const bld = StyleSheet.create({
  root:   { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 14, paddingBottom: 40 },

  // Progress bar
  progressBar: { flexDirection: "row", gap: 6, marginBottom: 28 },
  progressStep: {
    flex: 1, height: 4, borderRadius: 2,
    backgroundColor: "rgba(19,38,63,0.10)",
  },
  progressStepOn: { backgroundColor: NAVY },

  title: {
    fontFamily: "CormorantGaramond_400Regular",
    fontSize: 34, lineHeight: 40,
    color: NAVY, marginBottom: 28,
  },

  // Photo row
  photoRow: {
    flexDirection: "row", alignItems: "center", gap: 20,
    marginBottom: 28,
    padding: 18,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
  },
  avatar: { width: 78, height: 78, borderRadius: 39 },
  avatarEmpty: {
    backgroundColor: "rgba(19,38,63,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: "Jost_600SemiBold",
    fontSize: 24, color: NAVY,
  },
  photoLabel: { fontFamily: "Jost_600SemiBold", fontSize: 15, color: NAVY, marginBottom: 2 },
  photoBtn: {
    borderWidth: 1, borderColor: "rgba(19,38,63,0.20)",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
    alignSelf: "flex-start",
  },
  photoBtnLabel: { fontFamily: "Jost_500Medium", fontSize: 13, color: NAVY },

  // Fields
  fieldGroup: { gap: 8, marginBottom: 18 },
  fieldLabel: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, letterSpacing: 1.8,
    textTransform: "uppercase",
    color: "#8A94A2",
  },
  input: {
    height: 52, borderWidth: 1,
    borderColor: "rgba(19,38,63,0.16)", borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: "Jost_400Regular",
    fontSize: 15, color: NAVY,
  },
  inputActive: { borderColor: NAVY },
  textarea: { height: 90, paddingTop: 14 },

  bioLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(19,38,63,0.06)",
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  aiBadgeText: { fontFamily: "Jost_600SemiBold", fontSize: 12, color: NAVY },

  counter: {
    fontFamily: "Jost_400Regular",
    fontSize: 11, color: "#A6AEB9",
    textAlign: "right", marginTop: 4,
  },

  // AI section
  aiSection: {
    backgroundColor: "rgba(19,38,63,0.04)",
    borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: "rgba(19,38,63,0.10)",
    marginBottom: 18,
  },
  aiTitle: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: NAVY, marginBottom: 4 },
  aiSub: {
    fontFamily: "Jost_400Regular",
    fontSize: 12, lineHeight: 18, color: "#6B7787",
    marginBottom: 12,
  },
  aiInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1, borderColor: "rgba(19,38,63,0.14)",
    borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "Jost_400Regular",
    fontSize: 14, color: NAVY,
    minHeight: 72,
  },
  aiBtn: {
    height: 44, borderRadius: 10,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    marginTop: 12,
  },
  aiBtnDisabled: { opacity: 0.35 },
  aiBtnText: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: "#FFFFFF" },

  // Links
  addLinkBtn: { paddingVertical: 14, alignItems: "flex-start" },
  addLinkText: { fontFamily: "Jost_600SemiBold", fontSize: 14, color: NAVY, opacity: 0.7 },

  // CTA
  cta: {
    height: 56, borderRadius: 14,
    backgroundColor: NAVY,
    alignItems: "center", justifyContent: "center",
    marginTop: 28,
  },
  ctaLabel: { fontFamily: "Jost_500Medium", fontSize: 16, color: "#FFFFFF" },

  pressed: { opacity: 0.8 },
});

// ─── Preview styles ───────────────────────────────────────────────────────────

const prev = StyleSheet.create({
  wrap: { marginBottom: spacing.xl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: NAVY, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.md },
  avatar: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.accentSoft, alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: font.md, fontFamily: "Jost_600SemiBold", color: colors.accent },
  nameBlock: { flex: 1 },
  name: { fontSize: font.base, fontFamily: "Jost_600SemiBold", color: colors.ink },
  title: { fontSize: font.sm, fontFamily: "Jost_400Regular", color: colors.muted, marginTop: 2 },
  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.sm },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  contactText: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted },
  bio: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.muted, lineHeight: 18, marginTop: 4 },
  linksRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.accentSoft, borderRadius: radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  chipText: { fontSize: 10, fontFamily: "Jost_600SemiBold", color: colors.accent },
  hint: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "center" },
  hintText: { fontSize: font.xs, fontFamily: "Jost_400Regular", color: colors.faint },
});
