import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { RommRom } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { FocusablePressable } from './FocusablePressable';

interface Props {
  roms: RommRom[];
  serverUrl: string;
  onSelect: (rom: RommRom) => void;
  /**
   * Give the first tile TV focus on mount. Off when something else on the
   * screen (a search box, say) should keep it.
   */
  autoFocus?: boolean;
}

/** Grid of rom tiles with cover art, shared by the rom list and search. */
export function RomGrid({
  roms,
  serverUrl,
  onSelect,
  autoFocus = true,
}: Props) {
  return (
    <FlatList
      data={roms}
      keyExtractor={item => String(item.id)}
      numColumns={5}
      contentContainerStyle={styles.grid}
      renderItem={({ item, index }) => (
        <FocusablePressable
          style={styles.tile}
          hasTVPreferredFocus={autoFocus && index === 0}
          testID={`rom-tile-${item.id}`}
          onPress={() => onSelect(item)}
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
  );
}

/** Route params for opening a rom in the web player. */
export function playerParamsFor(rom: RommRom): RootStackParamList['Player'] {
  return {
    romId: rom.id,
    romName: rom.name,
    platformSlug: rom.platform_slug ?? '',
  };
}

export function resolveCoverUrl(serverUrl: string, urlCover: string): string {
  if (/^https?:\/\//i.test(urlCover)) {
    return urlCover;
  }
  return `${serverUrl}${urlCover.startsWith('/') ? '' : '/'}${urlCover}`;
}

const styles = StyleSheet.create({
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
    color: colors.textPrimary,
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});
