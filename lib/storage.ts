import * as SecureStore from "expo-secure-store";

export async function getActiveProfileId(): Promise<string | null> {
  return SecureStore.getItemAsync("active_profile");
}

export async function setActiveProfileId(id: string) {
  await SecureStore.setItemAsync("active_profile", id);
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await SecureStore.getItemAsync("access_token");
  return Boolean(token);
}

export async function getUserPlan(): Promise<"gratis" | "pro" | "empresa" | null> {
  const val = await SecureStore.getItemAsync("user_plan");
  if (val === "gratis" || val === "pro" || val === "empresa") return val;
  return null;
}

export async function setUserPlan(plan: "gratis" | "pro" | "empresa") {
  await SecureStore.setItemAsync("user_plan", plan);
}
