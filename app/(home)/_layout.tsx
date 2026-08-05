import { Stack } from "expo-router";

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTintColor: "#1e293b",
        headerTitleStyle: { fontWeight: "600" },
        headerShadowVisible: false,
      }}
    />
  );
}
