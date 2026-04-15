import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { AppNavigator } from "./src/navigation/AppNavigator";
import { SmartHomeProvider } from "./src/store/SmartHomeContext";
import { colors } from "./src/theme/colors";

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SmartHomeProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </SmartHomeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
  }
});
