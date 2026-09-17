import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { RommRom } from '../api/types';
import { RootStackParamList } from '../navigation/types';
import { resolveCoverUrl, RomTile } from './RomTile';

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
        <RomTile
          rom={item}
          serverUrl={serverUrl}
          onPress={() => onSelect(item)}
          hasTVPreferredFocus={autoFocus && index === 0}
          testID={`rom-tile-${item.id}`}
          style={styles.tile}
        />
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

export { resolveCoverUrl };

const styles = StyleSheet.create({
  grid: { paddingBottom: 32 },
  tile: { flex: 1, margin: 8, maxWidth: '20%' },
});
