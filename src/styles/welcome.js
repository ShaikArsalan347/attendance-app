import { StyleSheet } from "react-native";

const styles = StyleSheet.create({
  maincontainer: {
    flex: 1,
    backgroundColor: "#f4f7fa",
  },
  content: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 44,
  },
  logo: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  brandName: {
    color: "#17324d",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 17,
  },
  intro: {
    marginBottom: 32,
  },
  eyebrow: {
    color: "#168a87",
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    marginBottom: 8,
  },
  title: {
    color: "#17324d",
    fontFamily: "Poppins_800ExtraBold",
    fontSize: 36,
    lineHeight: 44,
  },
  subtitle: {
    color: "#627486",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    color: "#627486",
    fontFamily: "Poppins_500Medium",
    fontSize: 11,
    marginBottom: 7,
  },
  passwordLabel: {
    marginTop: 8,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#d6e0e7",
    borderRadius: 7,
    backgroundColor: "#ffffff",
    color: "#17324d",
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  errorMessage: {
    color: "#b42318",
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  signInButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    borderRadius: 7,
    backgroundColor: "#17324d",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  signInText: {
    color: "#ffffff",
    fontFamily: "Poppins_500Medium",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    color: "#8493a0",
    fontFamily: "Poppins_400Regular",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 16,
  },
});

export default styles;
