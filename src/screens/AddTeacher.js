import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import styles from "../styles/simple";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";
import { createUserAccount } from "../services/accounts";

export default function AddTeacher({ navigation }) {
  const { addTeacher } = useAppData();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (isSaving) return;
    if (!name.trim() || !subject.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Please complete all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const profile = await createUserAccount({
        targetRole: "teacher",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        subject: subject.trim(),
      });
      await addTeacher({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        subject: profile.subject,
      });
      Alert.alert(
        "Account created",
        "Teacher can now sign in with this email and password.",
        [{ text: "OK", onPress: () => navigation.goBack() }],
      );
    } catch (error) {
      Alert.alert(
        "Could not create account",
        error.message || "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Add Teacher"
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formIntro}>
          <Text style={styles.formEyebrow}>STAFF DIRECTORY</Text>
          <Text style={styles.formTitle}>Teacher details</Text>
          <Text style={styles.formDescription}>
            Add the teacher's name and teaching subject.
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Full name</Text>
          <TextInput
            accessibilityLabel="Teacher full name"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            onChangeText={setName}
            placeholder="e.g. Maya Sharma"
            returnKeyType="next"
            style={styles.formInput}
            textContentType="name"
            value={name}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Subject</Text>
          <TextInput
            accessibilityLabel="Teaching subject"
            autoCapitalize="words"
            onChangeText={setSubject}
            placeholder="e.g. Mathematics"
            returnKeyType="done"
            style={styles.formInput}
            value={subject}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Email</Text>
          <TextInput
            accessibilityLabel="Teacher email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="teacher@school.edu"
            returnKeyType="next"
            style={styles.formInput}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Temporary password</Text>
          <TextInput
            accessibilityLabel="Teacher temporary password"
            autoCapitalize="none"
            autoComplete="new-password"
            onChangeText={setPassword}
            placeholder="At least 8 characters"
            returnKeyType="done"
            secureTextEntry
            style={styles.formInput}
            textContentType="newPassword"
            value={password}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={save}
          style={[styles.formSubmit, isSaving && styles.formSubmitDisabled]}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.formSubmitText}>Add teacher</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
