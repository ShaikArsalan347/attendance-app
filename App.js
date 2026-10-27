import "react-native-url-polyfill/auto";
import "react-native-gesture-handler";
import React from "react";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  useFonts,
  Poppins_800ExtraBold,
  Poppins_100Thin,
  Poppins_500Medium,
  Poppins_400Regular,
  Poppins_300Light,
} from "@expo-google-fonts/poppins";
import { AppDataProvider, useAppData } from "./context/AppData";
import Welcome from "./src/screens/Welcome";
import AdminHome from "./src/screens/AdminHome";
import TeacherHome from "./src/screens/Teacherhome";
import StudentHome from "./src/screens/StudentHome";
import AddStudent from "./src/screens/AddStudent";
import AddTeacher from "./src/screens/AddTeacher";
import MarkAttendance from "./src/screens/MarkAttendance";
import AppealLeave from "./src/screens/AppealLeave";
import LeaveList from "./src/screens/LeaveList";
import colors from "./config/colors";

const Stack = createNativeStackNavigator();

function RootNav() {
  return (
    <Stack.Navigator initialRouteName="Welcome">
      <Stack.Screen
        name="Welcome"
        component={Welcome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminHome"
        component={AdminHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TeacherHome"
        component={TeacherHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="StudentHome"
        component={StudentHome}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddStudent"
        component={AddStudent}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddTeacher"
        component={AddTeacher}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MarkAttendance"
        component={MarkAttendance}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppealLeave"
        component={AppealLeave}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="LeaveList"
        component={LeaveList}
        options={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.white },
        }}
      />
    </Stack.Navigator>
  );
}

function AppReady({ children }) {
  const { ready } = useAppData();
  const [fontsLoaded] = useFonts({
    Poppins_800ExtraBold,
    Poppins_500Medium,
    Poppins_100Thin,
    Poppins_400Regular,
    Poppins_300Light,
  });

  if (!ready || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#fff",
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return children;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppDataProvider>
        <AppReady>
          <NavigationContainer>
            <RootNav />
          </NavigationContainer>
        </AppReady>
      </AppDataProvider>
    </GestureHandlerRootView>
  );
}
