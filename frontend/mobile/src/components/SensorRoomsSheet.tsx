import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device } from "../types/smartHome";

type Room = { id: string; name: string; emoji?: string | null };

type RoomSensorRow = {
  room: Room;
  temp: number | null;
  humidity: number | null;
  sensorName: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  rooms: Room[];
  devices: Device[];
};

function pickLatestSensor(sensors: Device[]): Device | null {
  if (sensors.length === 0) return null;
  return sensors.reduce((best, d) => {
    if (!best.last_seen_at) return d;
    if (!d.last_seen_at) return best;
    return d.last_seen_at > best.last_seen_at ? d : best;
  });
}

export function SensorRoomsSheet({ visible, onClose, rooms, devices }: Props) {
  const rows: RoomSensorRow[] = rooms
    .map((room) => {
      const sensors = devices.filter(
        (d) => d.type === "TEMP" && d.room_id === room.id && d.telemetry
      );
      const sensor = pickLatestSensor(sensors);
      if (!sensor) return null;
      return {
        room,
        temp: (sensor.telemetry?.temp as number | null) ?? null,
        humidity: (sensor.telemetry?.humidity as number | null) ?? null,
        sensorName: sensor.name,
      };
    })
    .filter((r): r is RoomSensorRow => r !== null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* handle */}
        <View style={styles.handle} />

        {/* header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CLIMATE</Text>
            <Text style={styles.title}>By room</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>

        {rows.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="thermometer-outline" size={32} color={colors.ink300} />
            <Text style={styles.emptyText}>No sensors with data yet</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {rows.map(({ room, temp, humidity, sensorName }) => (
              <View key={room.id} style={styles.row}>
                <View style={styles.rowLeft}>
                  {room.emoji ? (
                    <Text style={styles.emoji}>{room.emoji}</Text>
                  ) : (
                    <View style={styles.emojiPlaceholder}>
                      <Ionicons name="home-outline" size={16} color={colors.ink500} />
                    </View>
                  )}
                  <View style={styles.rowMeta}>
                    <Text style={styles.roomName}>{room.name}</Text>
                    <Text style={styles.sensorName}>{sensorName}</Text>
                  </View>
                </View>
                <View style={styles.rowRight}>
                  {temp != null && (
                    <View style={styles.badge}>
                      <Ionicons name="thermometer-outline" size={12} color="#C8674A" />
                      <Text style={[styles.badgeText, { color: "#C8674A" }]}>{temp} °C</Text>
                    </View>
                  )}
                  {humidity != null && (
                    <View style={styles.badge}>
                      <Ionicons name="water-outline" size={12} color="#2A6FDB" />
                      <Text style={[styles.badgeText, { color: "#2A6FDB" }]}>{humidity} %</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,13,18,0.4)",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: "70%",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.ink200,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.4,
    marginTop: 3,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 28,
    width: 40,
    textAlign: "center",
  },
  emojiPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  rowMeta: {
    gap: 2,
  },
  roomName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.ink900,
  },
  sensorName: {
    fontSize: 12,
    color: colors.ink400,
  },
  rowRight: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.ink50,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  badgeText: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: colors.ink400,
    fontSize: 14,
  },
});
