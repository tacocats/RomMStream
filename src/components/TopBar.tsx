import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { FocusablePressable } from './FocusablePressable';
import { GamepadIcon, HomeIcon, SearchIcon } from './icons';

export type MainTab = 'Home' | 'Platforms' | 'Search';

export const MAIN_TABS: MainTab[] = ['Home', 'Platforms', 'Search'];

const ICONS: Record<MainTab, typeof HomeIcon> = {
  Home: HomeIcon,
  Platforms: GamepadIcon,
  Search: SearchIcon,
};

interface Props {
  active: MainTab;
  onSelect: (tab: MainTab) => void;
  onSettings: () => void;
  onSignOut: () => void;
}

/**
 * Pill-style tab bar across the top of the main screen. The active tab is
 * drawn solid; the TV focus ring is separate so a focused tab is always
 * distinguishable from the selected one.
 */
export function TopBar({ active, onSelect, onSettings, onSignOut }: Props) {
  return (
    <View style={styles.bar} testID="top-bar">
      <View style={styles.side} />

      <View style={styles.pills}>
        {MAIN_TABS.map(tab => {
          const Icon = ICONS[tab];
          const isActive = tab === active;
          return (
            <FocusablePressable
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[styles.pill, isActive && styles.pillActive]}
              focusedStyle={
                isActive ? styles.pillActiveFocused : styles.pillFocused
              }
              onPress={() => onSelect(tab)}
              testID={`tab-${tab.toLowerCase()}`}
            >
              <Icon color={isActive ? colors.background : colors.textMuted} />
              <Text
                style={[styles.pillText, isActive && styles.pillTextActive]}
              >
                {tab}
              </Text>
            </FocusablePressable>
          );
        })}
      </View>

      <View style={[styles.side, styles.actions]}>
        <FocusablePressable
          style={styles.action}
          onPress={onSettings}
          testID="settings-button"
        >
          <Text style={styles.actionText}>Settings</Text>
        </FocusablePressable>
        <FocusablePressable
          style={styles.action}
          onPress={onSignOut}
          testID="sign-out-button"
        >
          <Text style={styles.actionText}>Sign Out</Text>
        </FocusablePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  // Equal flexible sides keep the pill group centred.
  side: { flex: 1 },
  pills: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  pillActive: { backgroundColor: colors.text },
  pillFocused: {
    backgroundColor: colors.surfaceFocused,
    borderColor: colors.borderFocused,
  },
  pillActiveFocused: {
    backgroundColor: colors.text,
    borderColor: colors.borderFocused,
  },
  pillText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  pillTextActive: { color: colors.background },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  action: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { color: colors.text, fontWeight: '600' },
});
