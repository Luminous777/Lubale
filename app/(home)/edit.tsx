import { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, Image,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getProfile, updateProfile, type ProfileDetail, API_BASE } from "@/lib/api";
import * as SecureStore from "expo-secure-store";

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
      <View style={prev.card}>
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
              <Text style={prev.contactItem} numberOfLines={1}>📱 {phone}</Text>
            ) : null}
            {email.trim() ? (
              <Text style={prev.contactItem} numberOfLines={1}>✉️ {email}</Text>
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
      </View>
      <Text style={prev.label}>Vista previa en tiempo real</Text>
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
        <TouchableOpacity onPress={onPress} style={st.proBadge}>
          <Text style={st.proBadgeText}>✨ Plan Pro</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[st.input, st.lockedField]}>
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
        placeholderTextColor="#94a3b8"
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
        <ActivityIndicator size="large" color="#3f67c4" />
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
      <Text style={st.sectionLabel}>Información</Text>

      <TouchableOpacity style={st.photoRow} onPress={pickPhoto}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={st.photo} />
        ) : (
          <View style={st.photoEmpty}>
            <Text style={st.photoEmptyIcon}>📷</Text>
          </View>
        )}
        <View style={st.photoInfo}>
          <Text style={st.photoLabel}>Foto de perfil</Text>
          <Text style={st.photoHint}>Tocar para cambiar</Text>
        </View>
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
      <Text style={st.sectionLabel}>Contacto</Text>

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
        <Text style={st.sectionLabel}>Links</Text>
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
              placeholderTextColor="#94a3b8"
            />
            <TextInput
              style={[st.input, st.linkInput]}
              value={l.url}
              onChangeText={(v) => updateLink(i, "url", v)}
              placeholder="https://..."
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
          <TouchableOpacity onPress={() => removeLink(i)} style={st.removeBtn}>
            <Text style={st.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      {atLinkLimit ? (
        <TouchableOpacity
          style={st.upgradePrompt}
          onPress={() =>
            Alert.alert(
              "Plan Pro",
              "Con el Plan Pro podés agregar links ilimitados de cualquier tipo. El plan Gratis solo permite 1 link de WhatsApp.",
              [{ text: "Entendido" }],
            )
          }
        >
          <Text style={st.upgradePromptText}>✨ Más links con Plan Pro</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={st.addLinkBtn} onPress={addLink}>
          <Text style={st.addLinkText}>+ Agregar link</Text>
        </TouchableOpacity>
      )}

      {/* Save */}
      <TouchableOpacity
        style={[st.saveBtn, saving && st.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={st.saveBtnText}>Guardar cambios</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const prev = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 10,
  },
  photo: { width: 52, height: 52, borderRadius: 26 },
  initialsCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#3f67c4",
    justifyContent: "center",
    alignItems: "center",
  },
  initials: { color: "#fff", fontSize: 18, fontWeight: "700" },
  nameBlock: { flex: 1 },
  personName: { fontSize: 17, fontWeight: "700", color: "#0f172a" },
  jobTitle: { fontSize: 13, color: "#64748b", marginTop: 2 },
  contactRow: { gap: 3, marginBottom: 8 },
  contactItem: { fontSize: 12, color: "#475569" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#eff4ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 11, color: "#3f67c4", fontWeight: "600" },
  label: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});

const st = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 20, paddingBottom: 64 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 10,
  },
  linksSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 24,
    marginBottom: 10,
  },
  linkCounter: { fontSize: 12, fontWeight: "600", color: "#94a3b8", paddingBottom: 1 },

  fieldWrap: { marginBottom: 10 },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: "#0f172a",
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },

  lockedField: {
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  lockedText: { fontSize: 14, color: "#cbd5e1" },

  proBadge: {
    backgroundColor: "#f5f3ff",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  proBadgeText: { fontSize: 11, color: "#7c3aed", fontWeight: "600" },

  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  photo: { width: 52, height: 52, borderRadius: 26 },
  photoEmpty: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  photoEmptyIcon: { fontSize: 22 },
  photoInfo: { flex: 1 },
  photoLabel: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
  photoHint: { fontSize: 12, color: "#94a3b8", marginTop: 2 },

  linkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  linkFields: { flex: 1, gap: 6 },
  linkInput: { fontSize: 13, paddingVertical: 10 },
  removeBtn: { paddingTop: 14, paddingHorizontal: 4 },
  removeBtnText: { fontSize: 15, color: "#94a3b8" },

  addLinkBtn: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  addLinkText: { fontSize: 14, color: "#3f67c4", fontWeight: "600" },

  upgradePrompt: {
    backgroundColor: "#f5f3ff",
    borderWidth: 1,
    borderColor: "#e9d5ff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  upgradePromptText: { fontSize: 13, color: "#7c3aed", fontWeight: "600" },

  saveBtn: {
    backgroundColor: "#3f67c4",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
