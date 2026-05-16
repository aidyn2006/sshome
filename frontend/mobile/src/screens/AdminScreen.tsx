import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type { AdminUser, AuditLogEntry, ManufacturedDevice } from "../api/admin";
import { ScreenHeader } from "../components/ScreenHeader";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { Device } from "../types/smartHome";

const DEVICE_TYPES: Array<Device["type"]> = ["LIGHT", "DOOR", "AC", "TEMP", "CAMERA", "MOTION"];

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "Request failed";
}

export function AdminScreen() {
  const {
    generateManufacturedDevices,
    listAdminUsers,
    listAuditLogs,
    updateAdminUserRole,
    user
  } = useSmartHome();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [generatedDevices, setGeneratedDevices] = useState<ManufacturedDevice[]>([]);
  const [deviceType, setDeviceType] = useState<Device["type"]>("LIGHT");
  const [countInput, setCountInput] = useState("5");
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextUsers, nextLogs] = await Promise.all([listAdminUsers(), listAuditLogs(20)]);
      setUsers(nextUsers);
      setAuditLogs(nextLogs);
    } catch (error) {
      Alert.alert("Admin", getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [listAdminUsers, listAuditLogs]);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  const handleGenerateDevices = async () => {
    const parsedCount = Number.parseInt(countInput, 10);
    const nextCount = Number.isFinite(parsedCount) ? Math.min(Math.max(parsedCount, 1), 500) : 1;
    setCountInput(String(nextCount));
    setIsGenerating(true);

    try {
      const devices = await generateManufacturedDevices(nextCount, deviceType);
      setGeneratedDevices(devices);
      const nextLogs = await listAuditLogs(20);
      setAuditLogs(nextLogs);
    } catch (error) {
      Alert.alert("Generate devices", getErrorMessage(error));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleRole = async (targetUser: AdminUser) => {
    const nextRole = targetUser.role === "ADMIN" ? "USER" : "ADMIN";
    setUpdatingUserId(targetUser.id);
    try {
      const updatedUser = await updateAdminUserRole(targetUser.id, nextRole);
      setUsers((currentUsers) =>
        currentUsers.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      );
      const nextLogs = await listAuditLogs(20);
      setAuditLogs(nextLogs);
    } catch (error) {
      Alert.alert("Update role", getErrorMessage(error));
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="ADMIN"
        title="Admin"
        subtitle="Factory devices, user roles, and security audit."
        secure
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh admin data"
            style={styles.iconButton}
            onPress={() => void loadAdminData()}
          >
            <Ionicons name="refresh" size={17} color={colors.ink700} />
          </Pressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>MANUFACTURE</Text>
              <Text style={styles.sectionTitle}>Device batch</Text>
            </View>
            {isGenerating ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Count</Text>
              <TextInput
                value={countInput}
                onChangeText={setCountInput}
                keyboardType="number-pad"
                style={styles.textInput}
                maxLength={3}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={isGenerating}
              style={[styles.actionButton, isGenerating && styles.actionButtonDisabled]}
              onPress={() => void handleGenerateDevices()}
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.onAccent} />
              <Text style={styles.actionButtonText}>Generate</Text>
            </Pressable>
          </View>

          <View style={styles.typeGrid}>
            {DEVICE_TYPES.map((type) => {
              const isActive = type === deviceType;
              return (
                <Pressable
                  accessibilityRole="button"
                  key={type}
                  style={[styles.typeChip, isActive && styles.typeChipActive]}
                  onPress={() => setDeviceType(type)}
                >
                  <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>{type}</Text>
                </Pressable>
              );
            })}
          </View>

          {generatedDevices.length > 0 ? (
            <View style={styles.generatedList}>
              {generatedDevices.map((device) => (
                <View key={device.hardware_id} style={styles.generatedRow}>
                  <View style={styles.generatedMain}>
                    <Text style={styles.generatedId}>{device.hardware_id}</Text>
                    <Text style={styles.generatedMeta}>{device.device_type} / batch {device.batch}</Text>
                  </View>
                  <Text style={styles.secretText}>{device.secret ?? "Saved"}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>ACCESS</Text>
              <Text style={styles.sectionTitle}>Users</Text>
            </View>
            {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          {users.map((item) => {
            const isCurrentUser = item.id === user?.id;
            const isUpdating = updatingUserId === item.id;
            return (
              <View key={item.id} style={styles.userRow}>
                <View style={styles.userAvatar}>
                  <Ionicons name={item.role === "ADMIN" ? "shield-checkmark" : "person"} size={18} color={colors.accent} />
                </View>
                <View style={styles.userMain}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={styles.userEmail}>{item.email}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  disabled={isCurrentUser || isUpdating}
                  style={[styles.roleButton, item.role === "ADMIN" && styles.roleButtonAdmin, (isCurrentUser || isUpdating) && styles.roleButtonDisabled]}
                  onPress={() => void handleToggleRole(item)}
                >
                  <Text style={[styles.roleButtonText, item.role === "ADMIN" && styles.roleButtonAdminText]}>
                    {isUpdating ? "..." : item.role}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>SECURITY</Text>
              <Text style={styles.sectionTitle}>Audit trail</Text>
            </View>
          </View>

          {auditLogs.map((entry) => (
            <View key={entry.id} style={styles.logRow}>
              <View style={styles.logIcon}>
                <Ionicons name="pulse-outline" size={17} color={colors.ink600} />
              </View>
              <View style={styles.logMain}>
                <Text style={styles.logAction}>{entry.action}</Text>
                <Text style={styles.logMeta}>
                  {new Date(entry.timestamp).toLocaleString()} {entry.ip_address ? `/ ${entry.ip_address}` : ""}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: spacing.md
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 16,
    gap: 14
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionEyebrow: {
    color: colors.ink500,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.1
  },
  sectionTitle: {
    marginTop: 3,
    color: colors.ink900,
    fontSize: 20,
    fontWeight: "700"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10
  },
  inputGroup: {
    flex: 1,
    gap: 6
  },
  inputLabel: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: "600"
  },
  textInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.cream50,
    color: colors.ink900,
    fontSize: 16,
    fontWeight: "700",
    paddingHorizontal: 12
  },
  actionButton: {
    height: 42,
    minWidth: 132,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14
  },
  actionButtonDisabled: {
    opacity: 0.55
  },
  actionButtonText: {
    color: colors.onAccent,
    fontSize: 14,
    fontWeight: "700"
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  typeChip: {
    height: 32,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.cream50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10
  },
  typeChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentTint
  },
  typeChipText: {
    color: colors.ink600,
    fontSize: 12,
    fontWeight: "700"
  },
  typeChipTextActive: {
    color: colors.accent
  },
  generatedList: {
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline,
    paddingTop: 6,
    gap: 8
  },
  generatedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 6
  },
  generatedMain: {
    flex: 1
  },
  generatedId: {
    color: colors.ink900,
    fontSize: 13,
    fontWeight: "700"
  },
  generatedMeta: {
    color: colors.ink500,
    fontSize: 12,
    marginTop: 2
  },
  secretText: {
    maxWidth: 132,
    color: colors.ink600,
    fontFamily: "monospace",
    fontSize: 10
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accentTint
  },
  userMain: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: "700"
  },
  userEmail: {
    color: colors.ink500,
    fontSize: 12,
    marginTop: 2
  },
  roleButton: {
    minWidth: 72,
    height: 30,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    backgroundColor: colors.cream50
  },
  roleButtonAdmin: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accent
  },
  roleButtonDisabled: {
    opacity: 0.55
  },
  roleButtonText: {
    color: colors.ink600,
    fontSize: 11,
    fontWeight: "800"
  },
  roleButtonAdminText: {
    color: colors.accent
  },
  logRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink50
  },
  logMain: {
    flex: 1
  },
  logAction: {
    color: colors.ink900,
    fontSize: 13,
    fontWeight: "700"
  },
  logMeta: {
    color: colors.ink500,
    fontSize: 12,
    marginTop: 2
  }
});
