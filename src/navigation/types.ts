import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  /** Top bar host: Home / Platforms / Search tabs. */
  Main: undefined;
  Roms:
    | { platformId: number; platformName: string }
    | { collectionId: number; collectionName: string }
    | { virtualCollectionId: string; virtualCollectionName: string };
  GameDetails: { romId: number; romName: string; platformSlug: string };
  Player: { romId: number; romName: string; platformSlug: string };
  Settings: undefined;
};

/** Navigation prop of the Main screen, handed down to the tabs it hosts. */
export type MainNavigation = NativeStackNavigationProp<
  RootStackParamList,
  'Main'
>;
