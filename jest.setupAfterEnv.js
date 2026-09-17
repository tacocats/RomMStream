/* eslint-env jest */
// Runs inside the test framework (unlike jest.setup.js), so per-test hooks
// are available here. Every test starts from an empty keychain, empty
// AsyncStorage, and a fetch that fails loudly unless the test mocks it.
const AsyncStorage =
  require('@react-native-async-storage/async-storage').default;
const Keychain = require('react-native-keychain');

beforeEach(async () => {
  global.fetch = jest.fn(() =>
    Promise.reject(new Error('fetch was called without a mocked response')),
  );
  Keychain.__reset();
  await AsyncStorage.clear();
});
