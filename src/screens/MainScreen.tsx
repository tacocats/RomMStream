import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { MainTab, TopBar } from '../components/TopBar';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { HomeTab } from './HomeTab';
import { PlatformsTab } from './PlatformsTab';
import { SearchTab } from './SearchTab';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

/**
 * The signed-in landing screen: a top bar switching between the Home,
 * Platforms and Search tabs. Tabs are plain local state rather than
 * navigator routes, so switching never adds history and the TV back button
 * keeps meaning "leave the app" here.
 */
export function MainScreen({ navigation }: Props) {
  const { signOut } = useAuth();
  const [tab, setTab] = useState<MainTab>('Home');

  return (
    <View style={styles.container} testID="main-screen">
      <TopBar
        active={tab}
        onSelect={setTab}
        onSettings={() => navigation.navigate('Settings')}
        onSignOut={signOut}
      />
      <View style={styles.content}>
        {tab === 'Home' && <HomeTab />}
        {tab === 'Platforms' && <PlatformsTab navigation={navigation} />}
        {tab === 'Search' && <SearchTab navigation={navigation} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1 },
});
