import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, Alert } from "react-native";
import QRCode from "react-native-qrcode-svg";
import styles from "../styles/simple";
import colors from "../../config/colors";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function statusColor(status) {
  if (status === "present") return colors.green;
  if (status === "leave") return colors.primary;
  return colors.red;
}

function statusLabel(status) {
  if (status === "present") return "Present";
  if (status === "leave") return "Leave";
  return "Absent";
}

export default function MarkAttendance({ navigation }) {
  const { data, currentUser, markAttendance, createAttendanceSession } =
    useAppData();
  const date = todayKey();
  const [records, setRecords] = useState({});
  const [activeSession, setActiveSession] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  useEffect(() => {
    const existing = data.attendance[date] || {};
    const map = {};
    data.students.forEach((student) => {
      map[student.id] = existing[student.id] || "absent";
    });
    setRecords(map);
  }, [data.students, data.attendance, date]);

  const toggle = (id) => {
    if (records[id] === "leave") {
      Alert.alert(
        "On leave",
        "This student has approved leave. Change anyway?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Mark Present",
            onPress: () => setRecords((prev) => ({ ...prev, [id]: "present" })),
          },
          {
            text: "Mark Absent",
            onPress: () => setRecords((prev) => ({ ...prev, [id]: "absent" })),
          },
        ],
      );
      return;
    }

    setRecords((prev) => ({
      ...prev,
      [id]: prev[id] === "absent" ? "present" : "absent",
    }));
  };

  const save = async () => {
    if (!data.students.length) {
      Alert.alert("No students", "Add students first.");
      return;
    }
    await markAttendance(date, records);
    Alert.alert("Saved", `Attendance saved for ${date}.`, [
      { text: "OK", onPress: () => navigation.goBack() },
    ]);
  };

  const generateQr = async () => {
    if (currentUser?.role !== "teacher") {
      Alert.alert(
        "Teacher access required",
        "Sign in as a teacher to create a QR session.",
      );
      return;
    }
    if (!data.students.length) {
      Alert.alert("No students", "Add students before starting attendance.");
      return;
    }

    setIsCreatingSession(true);
    try {
      const session = await createAttendanceSession(currentUser.id);
      setActiveSession(session);
    } catch (error) {
      Alert.alert(
        "Could not create session",
        error.message || "Please try again.",
      );
    } finally {
      setIsCreatingSession(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Mark Attendance"
        subtitle={date}
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <View style={styles.content}>
        <View style={styles.qrSessionPanel}>
          <Text style={styles.qrSessionTitle}>Student QR check-in</Text>
          <Text style={styles.qrSessionDescription}>
            Generate a code for today's class. It expires after two hours.
          </Text>
          {activeSession ? (
            <View style={styles.qrCodeContainer}>
              <QRCode
                value={activeSession.qrValue}
                size={200}
                color="#17324d"
                backgroundColor="#ffffff"
                ecl="M"
              />
              <Text style={styles.qrSessionExpiry}>
                Valid until{" "}
                {new Date(activeSession.expiresAt).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={isCreatingSession}
              onPress={generateQr}
              style={[
                styles.qrSessionButton,
                isCreatingSession && styles.formSubmitDisabled,
              ]}
            >
              <Text style={styles.qrSessionButtonText}>
                {isCreatingSession ? "Generating..." : "Generate today's QR"}
              </Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={data.students}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>No students to mark.</Text>
          }
          renderItem={({ item }) => {
            const status = records[item.id] || "absent";
            return (
              <Pressable style={styles.card} onPress={() => toggle(item.id)}>
                <View style={styles.row}>
                  <View>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.cardMeta}>Roll {item.roll_no}</Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: statusColor(status) },
                    ]}
                  >
                    <Text style={styles.badgeText}>{statusLabel(status)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
        <Pressable style={styles.btn} onPress={save}>
          <Text style={styles.btnText}>Save Attendance</Text>
        </Pressable>
      </View>
    </View>
  );
}
