import { View, Text } from "react-native";
import styles from "../styles/simple";

export default function UserProfileCard({ name, detail }) {
  const initial = name?.trim()?.charAt(0).toUpperCase() || "?";

  return (
    <View style={styles.userProfileCard}>
      <View style={styles.userProfileBanner}>
        <View style={styles.userProfilePatternLeft} />
        <View style={styles.userProfilePatternCenter} />
        <View style={styles.userProfilePatternRight} />
      </View>
      <View style={styles.userProfileAvatar}>
        <View style={styles.userProfileAvatarCore}>
          <Text style={styles.userProfileAvatarText}>{initial}</Text>
        </View>
      </View>
      <View style={styles.userProfileContent}>
        <Text numberOfLines={2} style={styles.userProfileName}>
          {name || "User"}
        </Text>
        {!!detail && (
          <Text numberOfLines={2} style={styles.userProfileDetail}>
            {detail}
          </Text>
        )}
      </View>
    </View>
  );
}
