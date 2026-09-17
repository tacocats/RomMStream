import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** "Home" tab of the main screen. Placeholder until it gets real content. */
export function HomeTab() {
  return (
    <View style={styles.container} testID="home-tab">
      <Text style={styles.title}>Hello world</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary },
});
