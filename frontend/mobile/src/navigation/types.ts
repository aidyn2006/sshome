export type RootStackParamList = {
  Tabs: undefined;
  AddLocationModal: undefined;
  AddDeviceModal: undefined;
  EditDeviceModal: { deviceId: string };
  AddScenarioModal: { scenarioId?: string } | undefined;
  AllRoomsModal: undefined;
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
