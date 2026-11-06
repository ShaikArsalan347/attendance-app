import { View, Text, Pressable, Modal } from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
import {
  faBars,
  faSignOutAlt,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";
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
  const { currentUser, setCurrentUser } = useAppData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const logout = async () => {
    setIsMenuOpen(false);
    await supabase?.auth.signOut();
    setCurrentUser(null);
    navigation.reset({ index: 0, routes: [{ name: "Welcome" }] });
  };

  const userDetails = [
    currentUser?.role,
    currentUser?.email,
    currentUser?.class && `Class ${currentUser.class}`,
    currentUser?.section && `Section ${currentUser.section}`,
    currentUser?.roll_no && `Roll ${currentUser.roll_no}`,
    currentUser?.subject && `Subject ${currentUser.subject}`,
  ].filter(Boolean);

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
          accessibilityLabel="Open user menu"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => setIsMenuOpen(true)}
          style={styles.headerIconButton}
        >
          <FontAwesomeIcon icon={faBars} size={17} color="#17324d" />
        </Pressable>
      )}
      <Modal
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
        transparent
        visible={isMenuOpen}
      >
        <View style={styles.userMenuOverlay}>
          <Pressable
            accessibilityLabel="Close user menu"
            accessibilityRole="button"
            onPress={() => setIsMenuOpen(false)}
            style={styles.userMenuBackdrop}
          />
          <SafeAreaView edges={["top", "bottom"]} style={styles.userMenuPanel}>
            <View style={styles.userMenuDetails}>
              <View style={styles.studentAvatar}>
                <Text style={styles.studentAvatarText}>
                  {currentUser?.name?.trim()?.charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text numberOfLines={1} style={styles.userMenuName}>
                  {currentUser?.name || "User"}
                </Text>
                {userDetails.map((detail, index) => (
                  <Text key={`${detail}-${index}`} style={styles.userMenuMeta}>
                    {detail}
                  </Text>
                ))}
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={logout}
              style={styles.userMenuLogout}
            >
              <FontAwesomeIcon
                icon={faSignOutAlt}
                size={16}
                color="#b42318"
              />
              <Text style={styles.userMenuLogoutText}>Log out</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
