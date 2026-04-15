import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SceneCard } from "../components/SceneCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { ToastNotification } from "../components/ToastNotification";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";

export function ScenesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scenarios, isDataLoading, runScenario } = useSmartHome();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const sortedScenes = useMemo(() => [...scenarios], [scenarios]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ToastNotification
          visible={toastVisible}
          message={toastMessage}
          onHidden={() => setToastVisible(false)}
        />

        <View style={styles.headerRow}>
          <Text style={typography.h2}>Automation</Text>
          <Pressable style={styles.addButton} onPress={() => navigation.navigate("AddLocationModal")}>
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        {isDataLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonBlock key={`scene-skeleton-${index}`} style={{ width: "100%", height: 100, borderRadius: 20 }} />
            ))}
          </View>
        ) : (
          <FlatList
            data={sortedScenes}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No automations yet</Text>
                <Text style={styles.emptyText}>Scenario cards will appear here after they are created on the backend.</Text>
              </View>
            }
            renderItem={({ item, index }) => (
              <SceneCard
                scene={item}
                colorIndex={index}
                onRun={() => {
                  void runScenario(item.id).then((scene) => {
                    if (!scene) {
                      return;
                    }

                    setToastMessage("Scenario running...");
                    setToastVisible(true);
                  });
                }}
              />
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl
  },
  emptyState: {
    paddingTop: spacing.xl,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 13
  }
});
