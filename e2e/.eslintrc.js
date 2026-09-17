// Detox injects its API as globals into the e2e test environment.
module.exports = {
  env: {
    jest: true,
  },
  globals: {
    device: 'readonly',
    element: 'readonly',
    by: 'readonly',
    expect: 'readonly',
    waitFor: 'readonly',
    web: 'readonly',
  },
};
