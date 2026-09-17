import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchRoms } from '../api/rommClient';
import { RommRom } from '../api/types';
import { useAuth } from '../auth/AuthContext';
import { FocusablePressable } from '../components/FocusablePressable';
import { playerParamsFor, RomGrid } from '../components/RomGrid';
import { MainNavigation } from '../navigation/types';
import { colors } from '../theme/colors';

export const MIN_QUERY_LENGTH = 2;
export const SEARCH_DEBOUNCE_MS = 400;

interface Props {
  navigation: MainNavigation;
}

/** "Search" tab of the main screen: free-text search across the library. */
export function SearchTab({ navigation }: Props) {
  const { withAuth, serverUrl } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RommRom[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Only the most recent request may touch the state: a slow response to an
  // earlier query must not overwrite the results of a later one.
  const requestId = useRef(0);

  const term = query.trim();
  const tooShort = term.length < MIN_QUERY_LENGTH;

  const search = useCallback(
    async (searchTerm: string) => {
      const id = ++requestId.current;
      if (searchTerm.length < MIN_QUERY_LENGTH) {
        setResults(null);
        setError(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const found = await withAuth((url, token) =>
          searchRoms(url, token, searchTerm),
        );
        if (id !== requestId.current) {
          return;
        }
        found.sort((a, b) => a.name.localeCompare(b.name));
        setResults(found);
      } catch (e) {
        if (id !== requestId.current) {
          return;
        }
        setError(e instanceof Error ? e.message : 'Search failed');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    },
    [withAuth],
  );

  // Search as the user types, once they pause for a moment. An explicit
  // submit or retry cancels the pending timer so the same query isn't sent
  // twice.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPending = useCallback(() => {
    if (pending.current !== null) {
      clearTimeout(pending.current);
      pending.current = null;
    }
  }, []);

  useEffect(() => {
    pending.current = setTimeout(() => {
      pending.current = null;
      search(term);
    }, SEARCH_DEBOUNCE_MS);
    return cancelPending;
  }, [term, search, cancelPending]);

  const submit = () => {
    cancelPending();
    search(term);
  };

  return (
    <View style={styles.container} testID="search-tab">
      <Text style={styles.title}>Search</Text>
      <TextInput
        style={styles.input}
        placeholder="Game title"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={submit}
        hasTVPreferredFocus
        testID="search-input"
      />

      {loading && (
        <ActivityIndicator
          style={styles.centerFill}
          color={colors.accent}
          size="large"
          testID="search-loading"
        />
      )}

      {!loading && error && (
        <View style={styles.centerFill}>
          <Text style={styles.error}>{error}</Text>
          <FocusablePressable
            style={styles.retryButton}
            onPress={submit}
            testID="retry-button"
          >
            <Text style={styles.buttonText}>Retry</Text>
          </FocusablePressable>
        </View>
      )}

      {!loading && !error && tooShort && (
        <View style={styles.centerFill}>
          <Text style={styles.hint}>
            {`Type at least ${MIN_QUERY_LENGTH} characters to search your library.`}
          </Text>
        </View>
      )}

      {!loading && !error && !tooShort && results?.length === 0 && (
        <View style={styles.centerFill}>
          <Text style={styles.hint}>{`No games match “${term}”.`}</Text>
        </View>
      )}

      {!loading && !error && !tooShort && results && results.length > 0 && (
        <>
          <Text style={styles.count}>
            {`${results.length} ${results.length === 1 ? 'game' : 'games'}`}
          </Text>
          <RomGrid
            roms={results}
            serverUrl={serverUrl}
            autoFocus={false}
            onSelect={rom =>
              navigation.navigate('Player', playerParamsFor(rom))
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 32, paddingBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    maxWidth: 520,
    marginBottom: 16,
  },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  count: { fontSize: 14, color: colors.textMuted, marginBottom: 8 },
  error: { color: colors.danger, fontSize: 16, marginBottom: 16 },
  retryButton: { paddingHorizontal: 20, paddingVertical: 12 },
  buttonText: { color: colors.text, fontWeight: '600' },
});
