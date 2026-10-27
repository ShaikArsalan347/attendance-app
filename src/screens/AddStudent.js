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

export default function AddStudent({ navigation }) {
  const { addStudent } = useAppData();
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (isSaving) return;
    if (
      !name.trim() ||
      !studentClass.trim() ||
      !section.trim() ||
      !rollNo.trim() ||
      !email.trim() ||
      !password
    ) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Password too short", "Use at least 8 characters.");
      return;
    }

    setIsSaving(true);
    try {
      const profile = await createUserAccount({
        targetRole: "student",
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        class: studentClass.trim(),
        section: section.trim(),
        roll_no: rollNo.trim(),
      });
      await addStudent({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        class: profile.class,
        section: profile.section,
        roll_no: profile.roll_no,
      });
      Alert.alert(
        "Account created",
        "Student can now sign in with this email and password.",
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
        title="Add Student"
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <ScrollView
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formIntro}>
          <Text style={styles.formEyebrow}>STUDENT DIRECTORY</Text>
          <Text style={styles.formTitle}>Student details</Text>
          <Text style={styles.formDescription}>
            Add the student's class information and roll number.
          </Text>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Full name</Text>
          <TextInput
            accessibilityLabel="Student full name"
            autoCapitalize="words"
            autoComplete="name"
            autoCorrect={false}
            onChangeText={setName}
            placeholder="e.g. Aarav Sharma"
            returnKeyType="next"
            style={styles.formInput}
            textContentType="name"
            value={name}
          />
        </View>

        <View style={styles.formRow}>
          <View style={[styles.formField, styles.formColumn]}>
            <Text style={styles.formLabel}>Class</Text>
            <TextInput
              accessibilityLabel="Class"
              onChangeText={setStudentClass}
              placeholder="e.g. 10"
              returnKeyType="next"
              style={styles.formInput}
              value={studentClass}
            />
          </View>
          <View style={[styles.formField, styles.formColumn]}>
            <Text style={styles.formLabel}>Section</Text>
            <TextInput
              accessibilityLabel="Section"
              autoCapitalize="characters"
              onChangeText={setSection}
              placeholder="e.g. A"
              returnKeyType="next"
              style={styles.formInput}
              value={section}
            />
          </View>
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Roll number</Text>
          <TextInput
            accessibilityLabel="Roll number"
            keyboardType="number-pad"
            onChangeText={setRollNo}
            placeholder="e.g. 5"
            returnKeyType="done"
            style={styles.formInput}
            value={rollNo}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Email</Text>
          <TextInput
            accessibilityLabel="Student email"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="student@school.edu"
            returnKeyType="next"
            style={styles.formInput}
            textContentType="emailAddress"
            value={email}
          />
        </View>

        <View style={styles.formField}>
          <Text style={styles.formLabel}>Temporary password</Text>
          <TextInput
            accessibilityLabel="Student temporary password"
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
            <Text style={styles.formSubmitText}>Add student</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}
