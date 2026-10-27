import { View, Text, Pressable, Alert } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import styles from "../styles/simple";
import colors from "../../config/colors";
import { useAppData } from "../../context/AppData";

export default function StudentCard({ student, canDelete = false }) {
  const { deleteStudent } = useAppData();
  const initials = (student.name || "Student")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  const onDelete = () => {
    Alert.alert(
      "Delete student",
      `Remove ${student.name}? This also clears their attendance and leave records.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteStudent(student.id),
        },
      ],
    );
  };

  return (
    <View style={[styles.card, styles.studentCard]}>
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>{initials}</Text>
      </View>
      <View style={styles.studentInfo}>
        <Text numberOfLines={1} style={styles.studentName}>
          {student.name}
        </Text>
        <Text numberOfLines={1} style={styles.studentDetails}>
          Class {student.class || "-"} · Section {student.section || "-"}
        </Text>
        <Text numberOfLines={1} style={styles.studentRoll}>
          Roll no. {student.roll_no || "-"}
        </Text>
      </View>
      {canDelete && (
        <Pressable
          accessibilityLabel={`Delete ${student.name}`}
          accessibilityRole="button"
          onPress={onDelete}
          hitSlop={10}
          style={styles.studentDelete}
        >
          <FontAwesomeIcon icon={faTrash} size={16} color={colors.red} />
        </Pressable>
      )}
    </View>
  );
}
