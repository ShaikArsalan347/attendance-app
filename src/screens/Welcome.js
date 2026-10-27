import { useEffect, useState } from "react";
import {
  Text,
  SafeAreaView,
  View,
  Pressable,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import styles from "../styles/welcome";
import { useAppData } from "../../context/AppData";
import { supabase } from "../../config/supabase";

const ROLE_SCREENS = {
  admin: "AdminHome",
  teacher: "TeacherHome",
  student: "StudentHome",
};

function Welcome({ navigation }) {
  const { setCurrentUser } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const openUserHome = async (user) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, email, name, role, class, section, roll_no, subject")
      .eq("id", user.id)
      .single();

    if (error || !profile || !ROLE_SCREENS[profile.role]) {
      await supabase.auth.signOut();
      throw new Error(
        "Your account profile is missing or has an invalid role.",
      );
    }

    setCurrentUser({ ...profile, email: user.email });
    navigation.reset({
      index: 0,
      routes: [{ name: ROLE_SCREENS[profile.role] }],
    });
  };

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active || !session?.user) return;
      try {
        await openUserHome(session.user);
      } catch {
        if (active) setErrorMessage("Could not load your account profile.");
      }
    });

    return () => {
      active = false;
    };
  }, []);

  const signIn = async () => {
    setErrorMessage("");
    if (!supabase) {
      setErrorMessage(
        "Add your Supabase URL and publishable key to .env first.",
      );
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await openUserHome(data.user);
    } catch (error) {
      setErrorMessage(error.message || "Unable to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.maincontainer}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Image
            source={require("../../assets/icon.png")}
            style={styles.logo}
          />
          <Text style={styles.brandName}>ATTENDE</Text>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>ATTENDANCE MANAGEMENT</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Use your school account to continue.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>EMAIL</Text>
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@school.edu"
            placeholderTextColor="#8493a0"
            returnKeyType="next"
            style={styles.input}
            textContentType="emailAddress"
            value={email}
          />
          <Text style={[styles.sectionLabel, styles.passwordLabel]}>
            PASSWORD
          </Text>
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            onSubmitEditing={signIn}
            placeholder="Enter your password"
            placeholderTextColor="#8493a0"
            returnKeyType="go"
            secureTextEntry
            style={styles.input}
            textContentType="password"
            value={password}
          />
        </View>

        {!!errorMessage && (
          <Text accessibilityRole="alert" style={styles.errorMessage}>
            {errorMessage}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={signIn}
          style={[styles.signInButton, isLoading && styles.buttonDisabled]}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.signInText}>Sign in</Text>
          )}
        </Pressable>
        <Text style={styles.footer}>
          Accounts are managed by your school administrator.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

export default Welcome;
