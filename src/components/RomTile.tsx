import React from 'react';
import {
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { RommRom } from '../api/types';
import { colors } from '../theme/colors';
import { CoverPlaceholder } from './CoverPlaceholder';
import { FocusablePressable } from './FocusablePressable';

interface Props {
  rom: RommRom;
  serverUrl: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  testID: string;
  style?: StyleProp<ViewStyle>;
}

/** A single rom's cover art, with a platform badge and title overlaid. */
export function RomTile({
  rom,
  serverUrl,
  onPress,
  hasTVPreferredFocus,
  testID,
  style,
}: Props) {
  const platformLabel = platformLabelFor(rom).toUpperCase();

  return (
    <FocusablePressable
      style={[styles.tile, style]}
      hasTVPreferredFocus={hasTVPreferredFocus}
      testID={testID}
      onPress={onPress}
    >
      <View style={styles.cover}>
        {rom.url_cover ? (
          <Image
            source={{ uri: resolveCoverUrl(serverUrl, rom.url_cover) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            testID={`rom-cover-${rom.id}`}
          />
        ) : (
          <CoverPlaceholder
            seed={rom.id}
            testID={`rom-cover-placeholder-${rom.id}`}
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
          {rom.name}
        </Text>
      </View>
    </FocusablePressable>
  );
}

/** Best available human-readable platform name for a rom, or ''. */
export function platformLabelFor(rom: RommRom): string {
  return (
    rom.platform_display_name ?? rom.platform_name ?? rom.platform_slug ?? ''
  );
}

export function resolveCoverUrl(serverUrl: string, urlCover: string): string {
  if (/^https?:\/\//i.test(urlCover)) {
    return urlCover;
  }
  return `${serverUrl}${urlCover.startsWith('/') ? '' : '/'}${urlCover}`;
}

const styles = StyleSheet.create({
  tile: { overflow: 'hidden' },
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
