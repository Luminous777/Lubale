import { useEffect, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { isLoggedIn } from "@/lib/storage";

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const loggedIn = await isLoggedIn();
      const inAuth = segments[0] === "(auth)";
      if (!loggedIn && !inAuth) {
        router.replace("/(auth)/login");
      } else if (loggedIn && inAuth) {
        router.replace("/(home)/");
      }
      setChecked(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!checked) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
