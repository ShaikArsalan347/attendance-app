import { View, Text, FlatList } from "react-native";
import styles from "../styles/simple";
import colors from "../../config/colors";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";

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

export default function MyAttendance({ navigation }) {
  const { currentUser, getStudentAttendance } = useAppData();
  const rows = currentUser?.id ? getStudentAttendance(currentUser.id) : [];

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="My Attendance"
        subtitle={currentUser?.name}
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <View style={styles.content}>
        <FlatList
          data={rows}
          keyExtractor={(item) => item.date}
          ListEmptyComponent={
            <Text style={styles.empty}>No attendance marked yet.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.cardTitle}>{item.date}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: statusColor(item.status) },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {statusLabel(item.status)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </View>
  );
}
