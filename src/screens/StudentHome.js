import { useRef, useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import styles from "../styles/simple";
import ScreenHeader from "../components/ScreenHeader";
import { useAppData } from "../../context/AppData";

export default function StudentHome({ navigation }) {
  const { currentUser, data, checkInWithQr } = useAppData();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const hasScanned = useRef(false);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  const attendance = data.attendance || {};
  const weeks = [];
  const monthLabels = [];
  let currentWeek = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${currentDate.getDate()}`;
    const records = attendance[dateKey];
    const hasRecord =
      !!currentUser?.id &&
      Object.prototype.hasOwnProperty.call(records || {}, currentUser.id);

    if (currentDate.getDate() === 1) {
      monthLabels.push({
        weekIndex: weeks.length,
        label: currentDate.toLocaleString("en-US", { month: "short" }),
      });
    }

    currentWeek.push({
      date: dateKey,
      day: currentDate.getDate(),
      status: hasRecord ? records[currentUser.id] || "absent" : "unmarked",
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const gridWidth = weeks.length * 15 - 3;

  const attendanceStatusStyle = (status) => {
    if (status === "present") return styles.heatmapPresent;
    if (status === "absent") return styles.heatmapAbsent;
    if (status === "leave") return styles.heatmapLeave;
    return styles.heatmapUnmarked;
  };

  const attendanceStatusLabel = (status) => {
    if (status === "present") return "Present";
    if (status === "absent") return "Absent";
    if (status === "leave") return "On leave";
    return "Not marked";
  };

  const openScanner = async () => {
    setScanMessage("");
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        setScanMessage(
          "Camera permission is needed to scan attendance QR codes.",
        );
        return;
      }
    }
    hasScanned.current = false;
    setIsScannerOpen(true);
  };

  const handleQrScanned = async ({ data: qrValue }) => {
    if (hasScanned.current) return;
    hasScanned.current = true;
    setIsScannerOpen(false);

    const result = await checkInWithQr(qrValue, currentUser);
    setScanMessage(result.message || "Attendance marked present.");
    Alert.alert(
      result.ok ? "Checked in" : "Could not check in",
      result.message || "Your attendance was marked present.",
    );
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Student"
        subtitle={currentUser?.name || "Select student"}
        navigation={navigation}
      />
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.studentHomeContent}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {currentUser?.name || "Student profile"}
          </Text>
          {currentUser?.class ? (
            <Text style={styles.cardMeta}>
              Class {currentUser.class} · Sec {currentUser.section} · Roll{" "}
              {currentUser.roll_no}
            </Text>
          ) : (
            <Text style={styles.cardMeta}>Your class profile</Text>
          )}
        </View>

        <View style={styles.studentQrPanel}>
          <View style={styles.studentQrCopy}>
            <Text style={styles.studentQrTitle}>QR attendance</Text>
            <Text style={styles.studentQrDescription}>
              Scan the code displayed by your teacher to mark yourself present.
            </Text>
          </View>
          {isScannerOpen ? (
            <View style={styles.qrScannerFrame}>
              <CameraView
                style={styles.qrScanner}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={handleQrScanned}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsScannerOpen(false)}
                style={styles.qrScannerClose}
              >
                <Text style={styles.qrScannerCloseText}>Close scanner</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={openScanner}
              style={styles.qrScanButton}
            >
              <Text style={styles.qrScanButtonText}>Scan attendance QR</Text>
            </Pressable>
          )}
          {!!scanMessage && (
            <Text accessibilityRole="alert" style={styles.qrScanMessage}>
              {scanMessage}
            </Text>
          )}
        </View>

        <View style={styles.attendanceSection}>
          <View style={styles.attendanceHeading}>
            <View>
              <Text style={styles.attendanceTitle}>Attendance</Text>
              <Text style={styles.attendanceCaption}>
                Your activity over the last year
              </Text>
            </View>
          </View>

          <View style={styles.heatmapFrame}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.heatmapRows}>
                <View style={styles.heatmapDayLabels}>
                  <View style={styles.heatmapMonthSpacer} />
                  {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
                    <View key={index} style={styles.heatmapDayLabelCell}>
                      {!!label && (
                        <Text style={styles.heatmapDayLabel}>{label}</Text>
                      )}
                    </View>
                  ))}
                </View>
                <View style={{ width: gridWidth }}>
                  <View style={[styles.heatmapMonths, { width: gridWidth }]}>
                    {monthLabels.map((month) => (
                      <Text
                        key={`${month.label}-${month.weekIndex}`}
                        style={[
                          styles.heatmapMonth,
                          { left: month.weekIndex * 15 },
                        ]}
                      >
                        {month.label}
                      </Text>
                    ))}
                  </View>
                  <View style={[styles.heatmapWeeks, { width: gridWidth }]}>
                    {weeks.map((week, weekIndex) => (
                      <View key={weekIndex} style={styles.heatmapWeek}>
                        {week.map((day) => (
                          <View
                            key={day.date}
                            accessible
                            accessibilityLabel={`${day.date}: ${attendanceStatusLabel(day.status)}`}
                            style={[
                              styles.heatmapCell,
                              attendanceStatusStyle(day.status),
                            ]}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            </ScrollView>
            <View style={styles.heatmapLegend}>
              <View style={styles.heatmapLegendItem}>
                <View
                  style={[styles.heatmapLegendSwatch, styles.heatmapPresent]}
                />
                <Text style={styles.heatmapLegendText}>Present</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View
                  style={[styles.heatmapLegendSwatch, styles.heatmapAbsent]}
                />
                <Text style={styles.heatmapLegendText}>Absent</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View
                  style={[styles.heatmapLegendSwatch, styles.heatmapLeave]}
                />
                <Text style={styles.heatmapLegendText}>Leave</Text>
              </View>
              <View style={styles.heatmapLegendItem}>
                <View
                  style={[styles.heatmapLegendSwatch, styles.heatmapUnmarked]}
                />
                <Text style={styles.heatmapLegendText}>Unmarked</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={styles.btn}
          onPress={() => {
            if (!currentUser?.id) {
              Alert.alert("Select student", "Choose a student profile first.");
              return;
            }
            navigation.navigate("AppealLeave");
          }}
        >
          <Text style={styles.btnText}>Appeal Leave</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
