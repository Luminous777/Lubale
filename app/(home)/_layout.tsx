import { Stack } from "expo-router";
import { colors, font } from "@/lib/theme";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: font.semibold, fontSize: font.md, color: colors.ink },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        headerBackTitle: "",
      }}
    />
  );
}
