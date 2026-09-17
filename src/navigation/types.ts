export type RootStackParamList = {
  Login: undefined;
  Platforms: undefined;
  Roms: { platformId: number; platformName: string };
  Player: { romId: number; romName: string; platformSlug: string };
  Settings: undefined;
};
