// Basic end-to-end smoke test: the app boots to the login screen and the
// sign-in flow reports a failure when the server can't be reached. Needs no
// RomM server: 10.0.2.2 is the emulator's host loopback and port 9 is closed.
describe('Login screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('shows the sign-in form', async () => {
    await expect(element(by.text('RommStream'))).toBeVisible();
    await expect(element(by.id('login-server-url'))).toBeVisible();
    await expect(element(by.id('login-username'))).toBeVisible();
    await expect(element(by.id('login-password'))).toBeVisible();
    await expect(element(by.id('login-submit'))).toBeVisible();
  });

  it('reports a failure when the server cannot be reached', async () => {
    // Typing opens the TV's on-screen keyboard over the lower half of the
    // form, so close it with the IME action after each field before moving
    // on. The password field's IME action submits the form, the same handler
    // the Sign In button calls.
    await element(by.id('login-server-url')).typeText('http://10.0.2.2:9');
    await element(by.id('login-server-url')).tapReturnKey();
    await element(by.id('login-username')).typeText('player');
    await element(by.id('login-username')).tapReturnKey();
    await element(by.id('login-password')).typeText('secret');
    await element(by.id('login-password')).tapReturnKey();

    await waitFor(element(by.id('login-error')))
      .toBeVisible()
      .withTimeout(30000);
  });
});
