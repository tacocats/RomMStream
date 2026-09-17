import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RommRom } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { colors, platformGradients } from '../theme/colors';
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
      renderItem={({ item, index }) => {
        const platformLabel = (
          item.platform_name ??
          item.platform_slug ??
          ''
        ).toUpperCase();

        return (
          <FocusablePressable
            style={styles.tile}
            hasTVPreferredFocus={autoFocus && index === 0}
            testID={`rom-tile-${item.id}`}
            onPress={() => onSelect(item)}
          >
            <View style={styles.cover}>
              {item.url_cover ? (
                <Image
                  source={{ uri: resolveCoverUrl(serverUrl, item.url_cover) }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  testID={`rom-cover-${item.id}`}
                />
              ) : (
                <CoverPlaceholder
                  seed={item.id}
                  testID={`rom-cover-placeholder-${item.id}`}
                />
              )}

              <Svg style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="scrim" x1="0" y1="0.45" x2="0" y2="1">
                    <Stop offset="0" stopColor={colors.scrim} stopOpacity={0} />
                    <Stop offset="1" stopColor={colors.scrim} stopOpacity={1} />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#scrim)" />
              </Svg>

              {platformLabel !== '' && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {platformLabel}
                  </Text>
                </View>
              )}

              <Text style={styles.tileName} numberOfLines={2}>
                {item.name}
              </Text>
            </View>
          </FocusablePressable>
        );
      }}
    />
  );
}

/** Diagonal placeholder gradient for roms with no cover art, cycled by id. */
function CoverPlaceholder({ seed, testID }: { seed: number; testID: string }) {
  const gradient = platformGradients[seed % platformGradients.length];
  const gradientId = `cover-gradient-${seed}`;

  return (
    <View style={StyleSheet.absoluteFill} testID={testID}>
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={gradient.from} />
            <Stop offset="1" stopColor={gradient.to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
    </View>
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
  tile: { flex: 1, margin: 8, maxWidth: '20%', overflow: 'hidden' },
  cover: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 10,
    backgroundColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.badgeBg,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  badgeText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tileName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    padding: 10,
  },
});
