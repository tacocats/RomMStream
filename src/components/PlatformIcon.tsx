import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { colors } from '../theme/colors';
import {
  invalidatePlatformIcon,
  ResolvedIcon,
  resolvePlatformIcon,
} from './platformIconCache';

export { iconCandidates, inlineSvgClasses } from './platformIconCache';

interface Props {
  serverUrl: string;
  name: string;
  slug?: string;
  fsSlug?: string;
  size?: number;
}

// Renders whatever the cache resolves for the platform: an inlined SVG, an
// .ico via Image, or a letter badge when RomM has no icon for it.
export function PlatformIcon({
  serverUrl,
  name,
  slug,
  fsSlug,
  size = 56,
}: Props) {
  const [icon, setIcon] = useState<ResolvedIcon | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIcon(null);
    resolvePlatformIcon(serverUrl, [fsSlug, slug]).then(resolved => {
      if (!cancelled) {
        setIcon(resolved);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [serverUrl, fsSlug, slug]);

  if (!icon) {
    return <View style={{ width: size, height: size }} />;
  }

  if (icon.kind === 'svg') {
    return <SvgXml xml={icon.xml} width={size} height={size} />;
  }

  if (icon.kind === 'ico') {
    return (
      <Image
        testID="platform-icon-image"
        source={{ uri: icon.url }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        onError={() => {
          invalidatePlatformIcon(serverUrl, [fsSlug, slug]);
          setIcon({ kind: 'none' });
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 4 },
      ]}
    >
      <Text style={styles.fallbackText}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.avatarBg,
  },
  fallbackText: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
});
