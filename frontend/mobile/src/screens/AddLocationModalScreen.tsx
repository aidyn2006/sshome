import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FilterPill } from "../components/FilterPill";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AddLocationModal">;

type Mode = "home" | "room";

export function AddLocationModalScreen({ navigation }: Props) {
  const { homes, addHome, addRoom } = useSmartHome();
  const [mode, setMode] = useState<Mode>("home");
  const [name, setName] = useState("");

  const save = () => {
    if (!name.trim()) {
      return;
    }

    if (mode === "home") {
      addHome(name);
    } else {
      addRoom(name, homes[0]?.id);
    }

    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardWrap}
      >
        <View style={styles.card}>
          <Text style={typography.h2}>Add Home / Room</Text>
          <Text style={styles.subtitle}>This modal uses slide-from-bottom stack transition.</Text>

          <View style={styles.modeWrap}>
            <FilterPill label="Home" isActive={mode === "home"} onPress={() => setMode("home")} />
            <FilterPill label="Room" isActive={mode === "room"} onPress={() => setMode("room")} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{mode === "home" ? "Home name" : "Room name"}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={mode === "home" ? "Mountain House" : "Office"}
              placeholderTextColor={colors.textSecondary}
              style={styles.input}
            />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.saveButton} onPress={save}>
              <Text style={styles.saveText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13
  },
  modeWrap: {
    flexDirection: "row",
    gap: spacing.sm
  },
  field: {
    gap: spacing.sm
  },
  label: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: 12
  },
  buttonRow: {
    flexDirection: "row",
    gap: spacing.sm
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600"
  },
  saveButton: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center"
  },
  saveText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  }
});
