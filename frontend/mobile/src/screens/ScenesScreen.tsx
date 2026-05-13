import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SceneCard } from "../components/SceneCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { ToastNotification } from "../components/ToastNotification";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { Scenario } from "../types/smartHome";

const SCENE_ACCENTS = ["#E8A26C", "#7A5AE0", "#1F8A5B", "#2A6FDB", "#C8674A", "#B45309"];

export function ScenesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { scenarios, isDataLoading, runScenario } = useSmartHome();
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const sorted = useMemo(() => [...scenarios], [scenarios]);
  const featured = sorted[0] as Scenario | undefined;
  const rest = sorted.slice(1);

  return (
    <View style={styles.screen}>
      <ToastNotification
        visible={toastVisible}
        message={toastMessage}
        onHidden={() => setToastVisible(false)}
      />

      <ScreenHeader
        eyebrow="AUTOMATIONS"
        title="Scenes"
        subtitle="Routines that run on your schedule or at a tap."
        secure
        right={
          <View style={styles.headerActions}>
            <Pressable style={styles.editBtn}>
              <Ionicons name="pencil-outline" size={15} color={colors.ink700} />
              <Text style={styles.editText}>Edit</Text>
            </Pressable>
            <Pressable style={styles.addBtn} onPress={() => navigation.navigate("AddLocationModal")}>
              <Ionicons name="add" size={18} color={colors.cream50} />
            </Pressable>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isDataLoading ? (
          <View style={styles.list}>
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonBlock key={i} style={{ height: 100, borderRadius: 16 }} />
            ))}
          </View>
        ) : sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="flash-outline" size={26} color={colors.ink500} />
            </View>
            <Text style={styles.emptyTitle}>No automations yet</Text>
            <Text style={styles.emptyText}>Scene cards will appear here after they are created on the backend.</Text>
          </View>
        ) : (
          <>
            {/* Featured dark hero card */}
            {featured && (
              <FeaturedSceneCard
                scene={featured}
                accent={SCENE_ACCENTS[0]}
                onRun={() => {
                  void runScenario(featured.id).then((s) => {
                    if (!s) return;
                    setToastMessage(`${featured.name} running…`);
                    setToastVisible(true);
                  });
                }}
              />
            )}

            {/* Library */}
            {rest.length > 0 && (
              <View style={styles.librarySection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.eyebrow}>ALL SCENES</Text>
                  <Text style={styles.sectionTitle}>Library</Text>
                </View>
                <View style={styles.list}>
                  {rest.map((scene, i) => (
                    <SceneCard
                      key={scene.id}
                      scene={scene}
                      colorIndex={i + 1}
                      onRun={() => {
                        void runScenario(scene.id).then((s) => {
                          if (!s) return;
                          setToastMessage(`${scene.name} running…`);
                          setToastVisible(true);
                        });
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Suggestion strip */}
            <View style={styles.suggestion}>
              <View style={styles.suggestionIcon}>
                <Ionicons name="flash-outline" size={18} color={colors.accent} />
              </View>
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionTitle}>Build a scene from your habits</Text>
                <Text style={styles.suggestionSub}>We notice you turn off lights at 23:30 — wrap that in a scene?</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function FeaturedSceneCard({ scene, accent, onRun }: { scene: Scenario; accent: string; onRun: () => void }) {
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    onRun();
    setTimeout(() => setRunning(false), 1400);
  };

  return (
    <View style={styles.featured}>
      {/* glow bg */}
      <View style={[styles.featuredGlow, { backgroundColor: accent }]} />
      <View style={[styles.featuredRing1]} />
      <View style={[styles.featuredRing2, { borderColor: `${accent}AA` }]}>
        <Ionicons name="flash-outline" size={30} color={accent} />
      </View>

      <View style={styles.featuredContent}>
        <Text style={styles.featuredEyebrow}>NEXT UP · ON DEMAND</Text>
        <Text style={styles.featuredTitle}>{scene.name}</Text>
        <Text style={styles.featuredDesc} numberOfLines={2}>{scene.description}</Text>
        <View style={styles.featuredActions}>
          <Pressable
            onPress={run}
            style={[styles.featuredRunBtn, { backgroundColor: accent }]}
          >
            {running ? (
              <Ionicons name="stop" size={14} color="#fff" />
            ) : (
              <Ionicons name="play" size={14} color="#fff" />
            )}
            <Text style={styles.featuredRunText}>{running ? "Running" : "Run now"}</Text>
          </Pressable>
          <Text style={styles.featuredActionsCount}>{scene.actions.length} ACTIONS</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: 22,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  editText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink700,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  // featured
  featured: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.ink900,
    padding: 20,
    position: "relative",
    minHeight: 180,
  },
  featuredGlow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.35,
  },
  featuredRing1: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.12)",
  },
  featuredRing2: {
    position: "absolute",
    top: 36,
    right: 36,
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredContent: {
    position: "relative",
    zIndex: 2,
    gap: 6,
  },
  featuredEyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: "rgba(244, 245, 247, 0.5)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  featuredTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.cream50,
    letterSpacing: -0.5,
    marginTop: 6,
  },
  featuredDesc: {
    fontSize: 13,
    color: "rgba(244, 245, 247, 0.7)",
    lineHeight: 18,
    maxWidth: 220,
  },
  featuredActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  featuredRunBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 999,
  },
  featuredRunText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  featuredActionsCount: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "rgba(244, 245, 247, 0.5)",
  },
  // library
  librarySection: {
    gap: 12,
  },
  sectionHeader: {
    gap: 2,
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.4,
  },
  list: {
    gap: spacing.md,
  },
  // suggestion
  suggestion: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderStyle: "dashed",
  },
  suggestionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairline,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  suggestionText: {
    flex: 1,
  },
  suggestionTitle: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: "500",
  },
  suggestionSub: {
    color: colors.ink500,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  // empty
  emptyState: {
    paddingTop: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyText: {
    color: colors.ink500,
    textAlign: "center",
    fontSize: 13.5,
    maxWidth: 240,
    lineHeight: 19,
  },
});
