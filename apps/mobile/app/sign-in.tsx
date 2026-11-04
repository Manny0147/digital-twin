import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow: startGoogle } = useOAuth({ strategy: "oauth_google" });
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onEmailSignIn() {
    if (!isLoaded || !signIn) return;
    setBusy(true); setError(null);
    try {
      const result = await signIn.create({ identifier: email.trim(), password });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else setError("Additional verification required.");
    } catch (e: any) {
      setError(e?.errors?.[0]?.message || "Sign in failed");
    } finally { setBusy(false); }
  }

  async function onGoogle() {
    setBusy(true); setError(null);
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startGoogle();
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (e: any) { setError(e?.message || "Google sign-in failed"); }
    finally { setBusy(false); }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.kicker}>DIGITAL TWIN</Text>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Sign in with the same account you use on the web.</Text>
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#6b7280" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#6b7280" secureTextEntry value={password} onChangeText={setPassword} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable style={[styles.primary, busy && { opacity: 0.6 }]} onPress={onEmailSignIn} disabled={busy || !email || !password}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Sign in</Text>}
      </Pressable>
      <Pressable style={[styles.secondary, busy && { opacity: 0.6 }]} onPress={onGoogle} disabled={busy}>
        <Text style={styles.secondaryText}>Continue with Google</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0a14", padding: 28, justifyContent: "center" },
  kicker: { color: "#a78bfa", fontSize: 12, fontWeight: "700", letterSpacing: 2, marginBottom: 12 },
  title: { color: "#faf5ff", fontSize: 32, fontWeight: "800", marginBottom: 8 },
  sub: { color: "#c4b5fd", fontSize: 15, lineHeight: 22, marginBottom: 28 },
  input: { backgroundColor: "#161022", borderRadius: 12, padding: 14, color: "#faf5ff", marginBottom: 12, borderWidth: 1, borderColor: "#2e1065" },
  error: { color: "#f87171", marginBottom: 12, fontSize: 13 },
  primary: { backgroundColor: "#7c3aed", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondary: { borderWidth: 1, borderColor: "#4c1d95", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 12 },
  secondaryText: { color: "#e9d5ff", fontWeight: "600", fontSize: 16 },
});
