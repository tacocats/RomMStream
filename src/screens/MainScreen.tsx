import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { FocusablePressable } from '../components/FocusablePressable';
import { SearchIcon } from '../components/icons';
import { MainTab, Sidebar } from '../components/Sidebar';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { HomeTab } from './HomeTab';
import { PlatformsTab } from './PlatformsTab';
import { SearchTab } from './SearchTab';

type Props = NativeStackScreenProps<RootStackParamList, 'Main'>;

/**
 * The signed-in landing screen: a left nav rail switching between the Home
 * and Platforms tabs, plus a top-right search control. Tabs are plain local
 * state rather than navigator routes, so switching never adds history and
 * the TV back button keeps meaning "leave the app" here.
 */
export function MainScreen({ navigation }: Props) {
  const { signOut, username } = useAuth();
  const [tab, setTab] = useState<MainTab>('Home');

  return (
    <View style={styles.container} testID="main-screen">
      <Sidebar
        active={tab}
        username={username}
        onSelect={setTab}
        onSettings={() => navigation.navigate('Settings')}
        onSignOut={signOut}
      />
      <View style={styles.main}>
        <View style={styles.topBar}>
          <FocusablePressable
            style={[
              styles.searchButton,
              tab === 'Search' && styles.searchButtonActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'Search' }}
            accessibilityLabel="Search"
            onPress={() => setTab('Search')}
            testID="tab-search"
          >
            <SearchIcon
              color={tab === 'Search' ? colors.accent : colors.textMuted}
            />
          </FocusablePressable>
        </View>
        <View style={styles.content}>
          {tab === 'Home' && <HomeTab />}
          {tab === 'Platforms' && <PlatformsTab navigation={navigation} />}
          {tab === 'Search' && <SearchTab navigation={navigation} />}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.background,
  },
  main: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceSolid,
  },
  searchButtonActive: { backgroundColor: colors.accentSoft },
  content: { flex: 1 },
});
