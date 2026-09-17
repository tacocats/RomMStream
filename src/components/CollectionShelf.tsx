import React from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { RommCollection } from '../api/types';
import { colors } from '../theme/colors';
import { CoverPlaceholder } from './CoverPlaceholder';
import { FocusablePressable } from './FocusablePressable';
import { resolveCoverUrl } from './RomTile';

interface Props {
  title: string;
  collections: RommCollection[];
  serverUrl: string;
  onSelect: (collection: RommCollection) => void;
  testID: string;
}

const TILE_WIDTH = 200;

/** A horizontal row of collection cards, for the home screen. */
export function CollectionShelf({
  title,
  collections,
  serverUrl,
  onSelect,
  testID,
}: Props) {
  if (collections.length === 0) {
    return null;
  }

  return (
    <View style={styles.shelf} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={collections}
        keyExtractor={item => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        renderItem={({ item }) => (
          <FocusablePressable
            style={styles.tile}
            testID={`${testID}-tile-${item.id}`}
            onPress={() => onSelect(item)}
          >
            <View style={styles.cover}>
              {item.url_cover ? (
                <Image
                  source={{ uri: resolveCoverUrl(serverUrl, item.url_cover) }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              ) : (
                <CoverPlaceholder seed={item.id} />
              )}
              <View style={styles.countBadge}>
                <Text style={styles.countText} numberOfLines={1}>
                  {`${item.rom_count} ${
                    item.rom_count === 1 ? 'game' : 'games'
                  }`}
                </Text>
              </View>
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </FocusablePressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { marginBottom: 28 },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  row: { paddingRight: 32 },
  tile: { width: TILE_WIDTH, marginRight: 14, overflow: 'hidden' },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    backgroundColor: colors.border,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  countBadge: {
    alignSelf: 'flex-start',
    margin: 8,
    backgroundColor: colors.badgeBg,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  countText: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
  },
  name: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
  },
});
