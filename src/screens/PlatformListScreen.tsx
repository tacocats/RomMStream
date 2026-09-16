import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getPlatforms } from '../api/rommClient';
import { RommPlatform } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FocusablePressable } from '../components/FocusablePressable';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Platforms'>;

export function PlatformListScreen({ navigation }: Props) {
  const { withAuth, signOut, serverUrl } = useAuth();
  const [platforms, setPlatforms] = useState<RommPlatform[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withAuth((url, token) => getPlatforms(url, token));
      result.sort((a, b) => a.name.localeCompare(b.name));
      setPlatforms(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load platforms');
    } finally {
      setLoading(false);
    }
  }, [withAuth]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Platforms</Text>
          <Text style={styles.subtitle}>{serverUrl}</Text>
        </View>
        <View style={styles.headerButtons}>
          <FocusablePressable
            style={styles.signOutButton}
            onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.signOutText}>Settings</Text>
          </FocusablePressable>
          <FocusablePressable style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </FocusablePressable>
        </View>
      </View>

      {loading && <ActivityIndicator style={styles.centerFill} color={colors.accent} size="large" />}

      {!loading && error && (
        <View style={styles.centerFill}>
          <Text style={styles.error}>{error}</Text>
          <FocusablePressable style={styles.retryButton} onPress={load}>
            <Text style={styles.buttonText}>Retry</Text>
          </FocusablePressable>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={platforms}
          keyExtractor={item => String(item.id)}
          numColumns={4}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <FocusablePressable
              style={styles.tile}
              hasTVPreferredFocus={index === 0}
              onPress={() =>
                navigation.navigate('Roms', { platformId: item.id, platformName: item.name })
              }>
              <Text style={styles.tileName} numberOfLines={2}>
                {item.name}
              </Text>
              {typeof item.rom_count === 'number' && (
                <Text style={styles.tileCount}>{item.rom_count} games</Text>
              )}
            </FocusablePressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 32 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  headerButtons: { flexDirection: 'row', gap: 12 },
  signOutButton: { paddingHorizontal: 16, paddingVertical: 10 },
  signOutText: { color: colors.text, fontWeight: '600' },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 16, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: colors.text, fontWeight: '600' },
  grid: { paddingBottom: 32 },
  tile: {
    flex: 1,
    margin: 8,
    minHeight: 100,
    padding: 16,
    justifyContent: 'center',
  },
  tileName: { color: colors.text, fontSize: 16, fontWeight: '600' },
  tileCount: { color: colors.textMuted, fontSize: 13, marginTop: 6 },
});
