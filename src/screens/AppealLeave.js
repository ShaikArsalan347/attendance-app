import { useState } from "react";
import { View, Text, TextInput, Pressable, Alert, ScrollView } from "react-native";
import styles from "../styles/simple";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";

export default function AppealLeave({ navigation }) {
  const { currentUser, addLeave, data } = useAppData();
  const [reason, setReason] = useState("");

  const myLeaves = data.leaves.filter((l) => l.studentId === currentUser?.id);

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing reason", "Please write why you need leave.");
      return;
    }
    const synced = await addLeave({
      studentId: currentUser.id,
      studentName: currentUser.name,
      reason: reason.trim(),
    });
    setReason("");
    Alert.alert(
      synced ? "Submitted" : "Saved on this device",
      synced
        ? "Leave appeal sent to teacher/admin."
        : "Leave appeal is queued and will sync when you are online.",
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Appeal Leave"
        subtitle={currentUser?.name}
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Reason</Text>
        <TextInput
          style={[styles.input, { minHeight: 100, textAlignVertical: "top" }]}
          value={reason}
          onChangeText={setReason}
          placeholder="Why do you need leave?"
          multiline
        />
        <Pressable style={styles.btn} onPress={submit}>
          <Text style={styles.btnText}>Submit Appeal</Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 10 }]}>My appeals</Text>
        {myLeaves.length === 0 ? (
          <Text style={styles.empty}>No leave appeals yet.</Text>
        ) : (
          myLeaves.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.reason}</Text>
              <Text style={styles.cardMeta}>Status: {item.status}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
