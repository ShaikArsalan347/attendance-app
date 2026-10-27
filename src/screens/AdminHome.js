import { View, Text, Pressable, ScrollView } from "react-native";
import styles from "../styles/simple";
import ScreenHeader from "../components/ScreenHeader";
import StudentCard from "../components/StudentCard";
import { useAppData } from "../../context/AppData";

export default function AdminHome({ navigation }) {
  const { data, currentUser } = useAppData();
  const teachers = data.teachers || [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Admin"
        subtitle={currentUser?.name || "Admin"}
        navigation={navigation}
      />
      <ScrollView style={styles.content}>
        <Pressable
          style={styles.btn}
          onPress={() => navigation.navigate("AddTeacher")}
        >
          <Text style={styles.btnText}>Add Teacher</Text>
        </Pressable>
        <Pressable
          style={[styles.btn, styles.btnSecondary]}
          onPress={() => navigation.navigate("LeaveList")}
        >
          <Text style={styles.btnText}>Leave Appeals</Text>
        </Pressable>

        <Text style={[styles.label, { marginTop: 8 }]}>
          Teachers ({teachers.length})
        </Text>
        {teachers.length === 0 ? (
          <Text style={styles.empty}>No teachers yet. Add one above.</Text>
        ) : (
          teachers.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardMeta}>Subject: {item.subject}</Text>
            </View>
          ))
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>
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
