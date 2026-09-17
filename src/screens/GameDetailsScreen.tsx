import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getRom } from '../api/rommClient';
import { RommRomDetail } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { CoverPlaceholder } from '../components/CoverPlaceholder';
import { FocusablePressable } from '../components/FocusablePressable';
import { PlayIcon, VerifiedIcon } from '../components/icons';
import { playerParamsFor } from '../components/RomGrid';
import { platformLabelFor, resolveCoverUrl } from '../components/RomTile';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { formatReleaseDate } from '../utils/formatDate';

type Props = NativeStackScreenProps<RootStackParamList, 'GameDetails'>;

interface ChipRowProps {
  label: string;
  items: string[];
}

function ChipRow({ label, items }: ChipRowProps) {
  if (items.length === 0) {
    return null;
  }
  return (
    <View style={styles.chipSection}>
      <Text style={styles.chipLabel}>{label.toUpperCase()}</Text>
      <View style={styles.chipRow}>
        {items.map(item => (
          <View key={item} style={styles.chip}>
            <Text style={styles.chipText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Details screen for a single rom: title, cover, metadata and a Play button
 * that hands off to the web player.
 *
 * The Play button only needs the route params (romId/platformSlug), so it's
 * live immediately rather than waiting on the metadata fetch below it — a
 * slow or failed metadata load shouldn't block launching the game.
 */
export function GameDetailsScreen({ route, navigation }: Props) {
  const { romId, romName, platformSlug } = route.params;
  const { withAuth, serverUrl } = useAuth();
  const [rom, setRom] = useState<RommRomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await withAuth((url, token) => getRom(url, token, romId));
      setRom(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load game');
    } finally {
      setLoading(false);
    }
  }, [withAuth, romId]);

  useEffect(() => {
    navigation.setOptions({ title: romName });
    load();
  }, [load, navigation, romName]);

  const play = () => {
    navigation.navigate(
      'Player',
      rom ? playerParamsFor(rom) : { romId, romName, platformSlug },
    );
  };

  const metadatum = rom?.metadatum;
  const platformLabel = rom ? platformLabelFor(rom) : '';

  return (
    <View style={styles.container} testID="game-details-screen">
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.cover}>
            {rom?.url_cover ? (
              <Image
                source={{ uri: resolveCoverUrl(serverUrl, rom.url_cover) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                testID="game-details-cover"
              />
            ) : (
              <CoverPlaceholder
                seed={rom?.id ?? romId}
                testID="game-details-cover-placeholder"
              />
            )}
          </View>

          <View style={styles.info}>
            <Text style={styles.name}>{rom?.name ?? romName}</Text>

            {rom && (
              <View style={styles.metaRow}>
                {platformLabel !== '' && (
                  <Text style={styles.metaText}>{platformLabel}</Text>
                )}
                {metadatum?.first_release_date != null && (
                  <Text style={styles.metaText}>
                    {`· ${formatReleaseDate(metadatum.first_release_date)}`}
                  </Text>
                )}
                {rom.is_identified && (
                  <VerifiedIcon color={colors.accent} size={16} />
                )}
                {(rom.regions ?? []).map(region => (
                  <View key={region} style={styles.regionBadge}>
                    <Text style={styles.regionText}>{region}</Text>
                  </View>
                ))}
              </View>
            )}

            <FocusablePressable
              style={styles.playButton}
              onPress={play}
              hasTVPreferredFocus
              testID="play-button"
            >
              <PlayIcon color={colors.background} size={16} />
              <Text style={styles.playButtonText}>Play</Text>
            </FocusablePressable>

            {loading && (
              <ActivityIndicator
                style={styles.metadataLoading}
                color={colors.accent}
                testID="game-details-loading"
              />
            )}

            {!loading && error && (
              <View style={styles.metadataError}>
                <Text style={styles.error}>{error}</Text>
                <FocusablePressable
                  style={styles.retryButton}
                  onPress={load}
                  testID="retry-button"
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </FocusablePressable>
              </View>
            )}

            {!loading && !error && rom && (
              <>
                {rom.summary && (
                  <Text style={styles.summary}>{rom.summary}</Text>
                )}

                {metadatum?.player_count && (
                  <View style={styles.chipSection}>
                    <Text style={styles.chipLabel}>PLAYERS</Text>
                    <Text style={styles.plainValue}>
                      {metadatum.player_count}
                    </Text>
                  </View>
                )}

                <ChipRow
                  label="Age rating"
                  items={metadatum?.age_ratings ?? []}
                />
                <ChipRow label="Genres" items={metadatum?.genres ?? []} />
                <ChipRow label="Companies" items={metadatum?.companies ?? []} />
                <ChipRow
                  label="Franchises"
                  items={metadatum?.franchises ?? []}
                />
                <ChipRow
                  label="Collections"
                  items={metadatum?.collections ?? []}
                />
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const COVER_WIDTH = 260;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 32, paddingBottom: 48 },
  hero: { flexDirection: 'row', gap: 28 },
  cover: {
    width: COVER_WIDTH,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  metaText: { color: colors.textMuted, fontSize: 15 },
  regionBadge: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  regionText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: colors.accent,
    marginTop: 4,
    marginBottom: 24,
  },
  playButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  metadataLoading: { alignItems: 'flex-start', marginTop: 8 },
  metadataError: { marginTop: 8 },
  error: { color: colors.danger, fontSize: 15, marginBottom: 12 },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryButtonText: { color: colors.textPrimary, fontWeight: '600' },
  summary: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 900,
  },
  chipSection: { marginBottom: 18 },
  chipLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  plainValue: { color: colors.textPrimary, fontSize: 14 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: colors.surfaceSolid,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
});
