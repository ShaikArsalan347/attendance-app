import { View, Text, FlatList, Pressable } from "react-native";
import styles from "../styles/simple";
import colors from "../../config/colors";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";

export default function LeaveList({ navigation }) {
  const { data, updateLeaveStatus } = useAppData();

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Leave Appeals"
        navigation={navigation}
        showBack
        showLogout={false}
      />
      <View style={styles.content}>
        <FlatList
          data={data.leaves}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No leave appeals.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.studentName}</Text>
              <Text style={styles.cardMeta}>{item.reason}</Text>
              <Text style={[styles.cardMeta, { marginTop: 6 }]}>
                Status: {item.status}
              </Text>
              {item.status === "pending" && (
                <View style={[styles.row, { marginTop: 12 }]}>
                  <Pressable
                    style={[styles.btn, { flex: 1, marginRight: 8, marginBottom: 0, backgroundColor: colors.green }]}
                    onPress={() => updateLeaveStatus(item.id, "approved")}
                  >
                    <Text style={styles.btnText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, { flex: 1, marginBottom: 0, backgroundColor: colors.red }]}
                    onPress={() => updateLeaveStatus(item.id, "rejected")}
                  >
                    <Text style={styles.btnText}>Reject</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        />
      </View>
    </View>
  );
}
