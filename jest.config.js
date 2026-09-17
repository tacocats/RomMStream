module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setupAfterEnv.js'],
  // react-native-tvos nests its own @react-native-tvos/* packages (e.g.
  // virtualized-lists behind FlatList) under node_modules/react-native, so
  // they need transforming too.
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(@react-native(?:-community|-tvos)?|@react-native-async-storage|react-native|@react-navigation|react-native-.*)/)',
  ],
  // Detox e2e specs live in ./e2e and run under their own Jest config.
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  clearMocks: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/testUtils/**',
    '!src/**/types.ts',
  ],
};
