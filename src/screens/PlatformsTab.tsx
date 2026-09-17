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
import { PlatformIcon } from '../components/PlatformIcon';
import { MainNavigation } from '../navigation/types';
import { colors, focusRing } from '../theme/colors';

interface Props {
  navigation: MainNavigation;
}

/** "Platforms" tab of the main screen: the library grouped by platform. */
export function PlatformsTab({ navigation }: Props) {
  const { withAuth, serverUrl } = useAuth();
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
    <View style={styles.container} testID="platforms-tab">
      <Text style={styles.title}>Platforms</Text>

      {loading && (
        <ActivityIndicator
          style={styles.centerFill}
          color={colors.accent}
          size="large"
          testID="platforms-loading"
        />
      )}

      {!loading && error && (
        <View style={styles.centerFill}>
          <Text style={styles.error}>{error}</Text>
          <FocusablePressable
            style={styles.retryButton}
            onPress={load}
            testID="retry-button"
          >
            <Text style={styles.buttonText}>Retry</Text>
          </FocusablePressable>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={platforms}
          keyExtractor={item => String(item.id)}
          numColumns={5}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <FocusablePressable
              style={styles.tile}
              focusedStyle={styles.tileFocused}
              hasTVPreferredFocus={index === 0}
              testID={`platform-tile-${item.id}`}
              onPress={() =>
                navigation.navigate('Roms', {
                  platformId: item.id,
                  platformName: item.name,
                })
              }
            >
              <View style={styles.iconWrap}>
                <PlatformIcon
                  serverUrl={serverUrl}
                  name={item.name}
                  slug={item.slug}
                  fsSlug={item.fs_slug}
                  size={48}
                />
              </View>
              <Text style={styles.tileName} numberOfLines={2}>
                {item.name}
              </Text>
              {typeof item.rom_count === 'number' && (
                <Text style={styles.tileCount}>
                  {item.rom_count} {item.rom_count === 1 ? 'game' : 'games'}
                </Text>
              )}
            </FocusablePressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 32, paddingBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 16, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: colors.textPrimary, fontWeight: '600' },
  grid: { paddingBottom: 32 },
  tile: {
    flex: 1,
    margin: 8,
    minHeight: 150,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileFocused: {
    borderColor: focusRing.borderColor,
    borderWidth: 2,
    backgroundColor: colors.accentSoft,
    transform: [{ scale: 1.05 }],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    marginBottom: 12,
  },
  tileName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  tileCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
