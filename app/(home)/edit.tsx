import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { getProfile, updateProfile, type ProfileDetail, API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";
import { Button, Card, SectionLabel } from "@/components/ui";
import { colors, radius, spacing, font } from "@/lib/theme";

type Plan = "gratis" | "pro" | "empresa";
type LinkDraft = { id?: string; title: string; url: string; sortOrder: number };

const FREE_LINK_LIMIT = 1;

function nameInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Live preview ─────────────────────────────────────────────────────────────

function CardPreview({
  name, title, phone, email, photoUrl, links,
}: {
  name: string; title: string; phone: string; email: string;
  photoUrl: string; links: LinkDraft[];
}) {
  const visibleLinks = links.filter((l) => l.title.trim() && l.url.trim()).slice(0, 4);
  const hasContact = phone.trim() || email.trim();

  return (
    <View style={prev.wrap}>
      <Card style={prev.card}>
        <View style={prev.header}>
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={prev.photo} />
          ) : (
            <View style={prev.initialsCircle}>
              <Text style={prev.initials}>{nameInitials(name) || "?"}</Text>
            </View>
          )}
          <View style={prev.nameBlock}>
            <Text style={prev.personName} numberOfLines={1}>
              {name.trim() || "Tu nombre"}
            </Text>
            {title.trim() ? (
              <Text style={prev.jobTitle} numberOfLines={1}>{title}</Text>
            ) : null}
          </View>
        </View>

        {hasContact ? (
          <View style={prev.contactRow}>
            {phone.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="phone" size={13} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{phone}</Text>
              </View>
            ) : null}
            {email.trim() ? (
              <View style={prev.contactItem}>
                <Feather name="mail" size={13} color={colors.muted} />
                <Text style={prev.contactText} numberOfLines={1}>{email}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {visibleLinks.length > 0 ? (
          <View style={prev.chips}>
            {visibleLinks.map((l, i) => (
              <View key={i} style={prev.chip}>
                <Text style={prev.chipText} numberOfLines={1}>{l.title}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card>
      <View style={prev.labelRow}>
        <Feather name="eye" size={11} color={colors.faint} />
        <Text style={prev.label}>Vista previa en tiempo real</Text>
      </View>
    </View>
  );
}

// ─── Locked field for free plan ───────────────────────────────────────────────

function LockedField({ label }: { label: string }) {
  function onPress() {
    Alert.alert(
      "Función exclusiva Pro",
      "Esta opción está disponible en el Plan Pro. Mejorá tu plan desde tarjeta.app",
      [{ text: "Entendido" }],
    );
  }
  return (
    <View style={st.fieldWrap}>
      <View style={st.labelRow}>
        <Text style={st.label}>{label}</Text>
        <TouchableOpacity onPress={onPress} style={st.proBadge} activeOpacity={0.8}>
          <Feather name="zap" size={11} color={colors.pro} />
          <Text style={st.proBadgeText}>Plan Pro</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[st.input, st.lockedField]}>
        <Feather name="lock" size={14} color={colors.faint} />
        <Text style={st.lockedText}>Disponible en Plan Pro</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, multiline, keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
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
        autoCapitalize={
          keyboardType === "email-address" || keyboardType === "url" ? "none" : "sentences"
        }
      />
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditScreen() {
  const { profileId, plan: planParam } = useLocalSearchParams<{ profileId: string; plan?: string }>();
  const plan = (planParam as Plan) ?? "gratis";
  const isPro = plan === "pro" || plan === "empresa";

  const router = useRouter();
  const navigation = useNavigation();

  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [emailPublic, setEmailPublic] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [links, setLinks] = useState<LinkDraft[]>([]);

  useEffect(() => {
    navigation.setOptions({ title: "Editar tarjeta" });
    if (profileId) loadProfile(profileId);
  }, [profileId]);

  async function loadProfile(id: string) {
    setLoading(true);
    try {
      const p = await getProfile(id);
      setProfile(p);
      setDisplayName(p.displayName);
      setTitle(p.title ?? "");
      setBio(p.bio ?? "");
      setPhone(p.phone ?? "");
      setEmailPublic(p.emailPublic ?? "");
      setPhotoUrl(p.photoUrl ?? "");
      setLinks(
        p.links.map((l) => ({ id: l.id, title: l.title, url: l.url, sortOrder: l.sortOrder })),
      );
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const token = await SecureStore.getItemAsync("access_token");
    const form = new FormData();
    form.append("file", {
      uri: asset.uri,
      type: asset.mimeType ?? "image/jpeg",
      name: "photo.jpg",
    } as unknown as Blob);
    form.append("orgSlug", profile?.organization.slug ?? "");
    form.append("kind", "profile-photo");
    if (profileId) form.append("profileId", profileId);

    try {
      const res = await fetch(`${API_BASE}/api/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (res.ok && data.url) setPhotoUrl(data.url);
      else Alert.alert("Error", data.error ?? "No se pudo subir la imagen");
    } catch {
      Alert.alert("Error", "Error de conexión al subir la imagen");
    }
  }

  async function handleSave() {
    if (!displayName.trim()) {
      Alert.alert("Error", "El nombre no puede estar vacío");
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profileId!, {
        displayName: displayName.trim(),
        title: title.trim() || undefined,
        bio: isPro ? (bio.trim() || undefined) : undefined,
        phone: phone.trim() || undefined,
        emailPublic: isPro ? (emailPublic.trim() || undefined) : undefined,
        photoUrl: photoUrl.trim() || undefined,
        links: links.filter((l) => l.title && l.url),
      });
      Alert.alert("¡Guardado!", "Tu tarjeta fue actualizada.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  function addLink() {
    if (!isPro && links.length >= FREE_LINK_LIMIT) return;
    setLinks((prev) => [...prev, { title: "", url: "", sortOrder: prev.length }]);
  }

  function updateLink(i: number, field: keyof LinkDraft, value: string) {
    setLinks((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i));
  }

  if (loading) {
    return (
      <View style={st.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const atLinkLimit = !isPro && links.length >= FREE_LINK_LIMIT;

  return (
    <ScrollView
      style={st.scroll}
      contentContainerStyle={st.container}
      keyboardShouldPersistTaps="handled"
    >
      {/* Live preview */}
      <CardPreview
        name={displayName}
        title={title}
        phone={phone}
        email={emailPublic}
        photoUrl={photoUrl}
        links={links}
      />

      {/* ── Información ── */}
      <SectionLabel>Información</SectionLabel>

      <TouchableOpacity style={st.photoRow} onPress={pickPhoto} activeOpacity={0.8}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={st.photo} />
        ) : (
          <View style={st.photoEmpty}>
            <Feather name="camera" size={20} color={colors.faint} />
          </View>
        )}
        <View style={st.photoInfo}>
          <Text style={st.photoLabel}>Foto de perfil</Text>
          <Text style={st.photoHint}>Tocar para cambiar</Text>
        </View>
        <Feather name="chevron-right" size={20} color={colors.faint} />
      </TouchableOpacity>

      <Field
        label="Nombre visible *"
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Juan Pérez"
      />
      <Field
        label="Puesto"
        value={title}
        onChangeText={setTitle}
        placeholder="Ej: Diseñador UX"
      />

      {isPro ? (
        <Field
          label="Bio"
          value={bio}
          onChangeText={setBio}
          placeholder="Una descripción breve de quién sos..."
          multiline
        />
      ) : (
        <LockedField label="Bio" />
      )}

      {/* ── Contacto ── */}
      <SectionLabel>Contacto</SectionLabel>

      <Field
        label="Teléfono / WhatsApp"
        value={phone}
        onChangeText={setPhone}
        placeholder="+54 11 1234-5678"
        keyboardType="phone-pad"
      />

      {isPro ? (
        <Field
          label="Email público"
          value={emailPublic}
          onChangeText={setEmailPublic}
          placeholder="contacto@empresa.com"
          keyboardType="email-address"
        />
      ) : (
        <LockedField label="Email público" />
      )}

      {/* ── Links ── */}
      <View style={st.linksSectionHeader}>
        <SectionLabel>Links</SectionLabel>
        {!isPro && (
          <Text style={st.linkCounter}>{links.length}/{FREE_LINK_LIMIT} · solo WhatsApp</Text>
        )}
      </View>

      {links.map((l, i) => (
        <View key={i} style={st.linkRow}>
          <View style={st.linkFields}>
            <TextInput
              style={[st.input, st.linkInput]}
              value={l.title}
              onChangeText={(v) => updateLink(i, "title", v)}
              placeholder="WhatsApp, LinkedIn..."
              placeholderTextColor={colors.faint}
            />
            <TextInput
              style={[st.input, st.linkInput]}
              value={l.url}
              onChangeText={(v) => updateLink(i, "url", v)}
              placeholder="https://..."
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <TouchableOpacity onPress={() => removeLink(i)} style={st.removeBtn} hitSlop={8}>
            <Feather name="x" size={18} color={colors.faint} />
          </TouchableOpacity>
        </View>
      ))}

      {atLinkLimit ? (
        <TouchableOpacity
          style={st.upgradePrompt}
          activeOpacity={0.8}
          onPress={() =>
            Alert.alert(
              "Plan Pro",
              "Con el Plan Pro podés agregar links ilimitados de cualquier tipo. El plan Gratis solo permite 1 link de WhatsApp.",
              [{ text: "Entendido" }],
            )
          }
        >
          <Feather name="zap" size={15} color={colors.pro} />
          <Text style={st.upgradePromptText}>Más links con Plan Pro</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={st.addLinkBtn} onPress={addLink} activeOpacity={0.8}>
          <Feather name="plus" size={16} color={colors.accent} />
          <Text style={st.addLinkText}>Agregar link</Text>
        </TouchableOpacity>
      )}

      {/* Save */}
      <Button
        label="Guardar cambios"
        icon="check"
        onPress={handleSave}
        loading={saving}
        style={{ marginTop: spacing["2xl"] }}
      />
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const prev = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  card: { padding: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  photo: { width: 52, height: 52, borderRadius: 26 },
  initialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  initials: { color: colors.onInk, fontSize: font.lg, fontWeight: font.bold },
  nameBlock: { flex: 1 },
  personName: { fontSize: font.md, fontWeight: font.bold, color: colors.ink },
  jobTitle: { fontSize: font.sm, color: colors.muted, marginTop: 2 },
  contactRow: { gap: 5, marginBottom: spacing.sm },
  contactItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactText: { fontSize: font.xs, color: colors.muted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  chipText: { fontSize: font.xs, color: colors.accent, fontWeight: font.semibold },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: spacing.md },
  label: {
    fontSize: font.xs,
    color: colors.faint,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.xl, paddingBottom: spacing["4xl"] },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  linksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  linkCounter: { fontSize: font.xs, fontWeight: font.semibold, color: colors.faint },

  fieldWrap: { marginBottom: spacing.md },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  label: { fontSize: font.sm, fontWeight: font.semibold, color: colors.ink, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 13,
    fontSize: font.base,
    color: colors.ink,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },

  lockedField: {
    backgroundColor: colors.surfaceMuted,
    borderStyle: "dashed",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  lockedText: { fontSize: font.sm, color: colors.faint },

  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.proSoft,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  proBadgeText: { fontSize: font.xs, color: colors.pro, fontWeight: font.semibold },

  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  photo: { width: 52, height: 52, borderRadius: 26 },
  photoEmpty: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  photoInfo: { flex: 1 },
  photoLabel: { fontSize: font.base, fontWeight: font.semibold, color: colors.ink },
  photoHint: { fontSize: font.xs, color: colors.faint, marginTop: 2 },

  linkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  linkFields: { flex: 1, gap: 6 },
  linkInput: { fontSize: font.sm, paddingVertical: spacing.md },
  removeBtn: { paddingTop: spacing.lg, paddingHorizontal: spacing.xs },

  addLinkBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  addLinkText: { fontSize: font.sm, color: colors.accent, fontWeight: font.semibold },

  upgradePrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.proSoft,
    borderWidth: 1,
    borderColor: colors.proBorder,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
  },
  upgradePromptText: { fontSize: font.sm, color: colors.pro, fontWeight: font.semibold },
});
