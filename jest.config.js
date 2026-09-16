module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(?:.pnpm/)?(@react-native(?:-community)?|@react-native-async-storage|react-native|@react-navigation|react-native-.*)/)',
  ],
};
