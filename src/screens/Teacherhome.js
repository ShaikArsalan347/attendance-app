import { View, Text, Pressable, ScrollView } from "react-native";
import styles from "../styles/simple";
import ScreenHeader from "../components/ScreenHeader";
import StudentCard from "../components/StudentCard";
import { useAppData } from "../../context/AppData";

export default function TeacherHome({ navigation }) {
  const { data, currentUser } = useAppData();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Teacher"
        subtitle={currentUser?.name || "Teacher"}
        navigation={navigation}
      />
      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{currentUser?.name || "Teacher"}</Text>
          <Text style={styles.cardMeta}>
            Subject: {currentUser?.subject || "Not specified"}
          </Text>
        </View>

        <Pressable
          style={styles.btn}
          onPress={() => navigation.navigate("MarkAttendance")}
        >
          <Text style={styles.btnText}>Attendance & QR Check-in</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          onPress={() => navigation.navigate("AddStudent")}
        >
          <Text style={styles.btnText}>Add Student</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => navigation.navigate("LeaveList")}
        >
          <Text style={styles.btnText}>Leave Appeals</Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 8 }]}>
          Students ({data.students.length})
        </Text>
        {data.students.length === 0 ? (
          <Text style={styles.empty}>No students yet. Add one above.</Text>
        ) : (
          data.students.map((item) => (
            <StudentCard key={item.id} student={item} canDelete />
          ))
        )}
      </ScrollView>
    </View>
  );
}
