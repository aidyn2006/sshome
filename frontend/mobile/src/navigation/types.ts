export type RootStackParamList = {
  Tabs: undefined;
  AddLocationModal: undefined;
  AddDeviceModal: { roomId?: string } | undefined;
  EditDeviceModal: { deviceId: string };
  AddScenarioModal: { scenarioId?: string } | undefined;
  AllRoomsModal: undefined;
  RoomDetailModal: { roomId: string };
  ManageFavoritesModal: undefined;
  ChangePasswordModal: undefined;
};

export type TabParamList = {
  Home: undefined;
  Room3D: undefined;
  Devices: undefined;
  Scenes: undefined;
  Activity: undefined;
  Admin: undefined;
  AttackSim: undefined;
};
