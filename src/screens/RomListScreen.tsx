import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getRoms } from '../api/rommClient';
import { RommRom } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FocusablePressable } from '../components/FocusablePressable';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Roms'>;

export function RomListScreen({ route, navigation }: Props) {
  const { platformId, platformName } = route.params;
  const { withAuth, serverUrl } = useAuth();
  const [roms, setRoms] = useState<RommRom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withAuth((url, token) =>
        getRoms(url, token, platformId),
      );
      result.sort((a, b) => a.name.localeCompare(b.name));
      setRoms(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load games');
    } finally {
      setLoading(false);
    }
  }, [withAuth, platformId]);

  useEffect(() => {
    navigation.setOptions({ title: platformName });
    load();
  }, [load, navigation, platformName]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{platformName}</Text>

      {loading && (
        <ActivityIndicator
          style={styles.centerFill}
          color={colors.accent}
          size="large"
          testID="roms-loading"
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

      {!loading && !error && roms.length === 0 && (
        <View style={styles.centerFill}>
          <Text style={styles.subtitle}>No games found for this platform.</Text>
        </View>
      )}

      {!loading && !error && roms.length > 0 && (
        <FlatList
          data={roms}
          keyExtractor={item => String(item.id)}
          numColumns={5}
          contentContainerStyle={styles.grid}
          renderItem={({ item, index }) => (
            <FocusablePressable
              style={styles.tile}
              hasTVPreferredFocus={index === 0}
              testID={`rom-tile-${item.id}`}
              onPress={() =>
                navigation.navigate('Player', {
                  romId: item.id,
                  romName: item.name,
                  platformSlug: item.platform_slug ?? '',
                })
              }
            >
              {item.url_cover ? (
                <Image
                  source={{ uri: resolveCoverUrl(serverUrl, item.url_cover) }}
                  style={styles.cover}
                  resizeMode="cover"
                  testID={`rom-cover-${item.id}`}
                />
              ) : (
                <View
                  style={[styles.cover, styles.coverPlaceholder]}
                  testID={`rom-cover-placeholder-${item.id}`}
                >
                  <Text style={styles.coverPlaceholderText} numberOfLines={3}>
                    {item.name}
                  </Text>
                </View>
              )}
              <Text style={styles.tileName} numberOfLines={2}>
                {item.name}
              </Text>
            </FocusablePressable>
          )}
        />
      )}
    </View>
  );
}

function resolveCoverUrl(serverUrl: string, urlCover: string): string {
  if (/^https?:\/\//i.test(urlCover)) {
    return urlCover;
  }
  return `${serverUrl}${urlCover.startsWith('/') ? '' : '/'}${urlCover}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 32 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  subtitle: { fontSize: 16, color: colors.textMuted },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: colors.danger, fontSize: 16, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: colors.text, fontWeight: '600' },
  grid: { paddingBottom: 32 },
  tile: { flex: 1, margin: 8, padding: 8, maxWidth: '20%' },
  cover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  coverPlaceholderText: {
    color: colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
  },
  tileName: {
    color: colors.text,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
