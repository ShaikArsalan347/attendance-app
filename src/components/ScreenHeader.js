import { View, Text, Pressable } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import { faSignOutAlt, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import styles from "../styles/simple";
import { useAppData } from "../../context/AppData";
import { supabase } from "../../config/supabase";

export default function ScreenHeader({
  title,
  subtitle,
  navigation,
  showBack = false,
  showLogout = true,
}) {
  const { setCurrentUser } = useAppData();

  const logout = async () => {
    await supabase?.auth.signOut();
    setCurrentUser(null);
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  return (
    <View style={styles.header}>
      {showBack && (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => navigation.goBack()}
          style={styles.headerIconButton}
        >
          <FontAwesomeIcon icon={faArrowLeft} size={17} color="#17324d" />
        </Pressable>
      )}
      <View style={styles.headerCopy}>
        <View style={styles.headerAccent} />
        <View style={styles.headerText}>
          <Text numberOfLines={1} style={styles.headerTitle}>
            {title}
          </Text>
          {!!subtitle && (
            <Text numberOfLines={1} style={styles.headerSub}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {showLogout && (
        <Pressable
          accessibilityLabel="Sign out"
          accessibilityRole="button"
          hitSlop={8}
          onPress={logout}
          style={styles.headerIconButton}
        >
          <FontAwesomeIcon icon={faSignOutAlt} size={17} color="#17324d" />
        </Pressable>
      )}
    </View>
  );
}
