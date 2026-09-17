import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { colors } from '../../theme/colors';
import { FocusablePressable } from '../FocusablePressable';

describe('FocusablePressable', () => {
  it('shows the default focused style only while focused', async () => {
    await render(
      <FocusablePressable testID="button">
        <Text>Go</Text>
      </FocusablePressable>,
    );

    expect(screen.getByTestId('button')).toHaveStyle({
      borderColor: 'transparent',
      backgroundColor: colors.surface,
    });

    await fireEvent(screen.getByTestId('button'), 'focus');
    expect(screen.getByTestId('button')).toHaveStyle({
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    });

    await fireEvent(screen.getByTestId('button'), 'blur');
    expect(screen.getByTestId('button')).toHaveStyle({
      borderColor: 'transparent',
      backgroundColor: colors.surface,
    });
  });

  it('lets screens override the focused style', async () => {
    await render(
      <FocusablePressable testID="button" focusedStyle={{ borderColor: 'red' }}>
        <Text>Go</Text>
      </FocusablePressable>,
    );

    await fireEvent(screen.getByTestId('button'), 'focus');

    expect(screen.getByTestId('button')).toHaveStyle({ borderColor: 'red' });
    expect(screen.getByTestId('button')).not.toHaveStyle({
      backgroundColor: colors.accentSoft,
    });
  });

  it('forwards focus, blur and press handlers', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const onPress = jest.fn();
    await render(
      <FocusablePressable
        testID="button"
        onFocus={onFocus}
        onBlur={onBlur}
        onPress={onPress}
      >
        <Text>Go</Text>
      </FocusablePressable>,
    );

    await fireEvent(screen.getByTestId('button'), 'focus');
    await fireEvent(screen.getByTestId('button'), 'blur');
    await fireEvent.press(screen.getByTestId('button'));

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not press while disabled', async () => {
    const onPress = jest.fn();
    await render(
      <FocusablePressable testID="button" onPress={onPress} disabled>
        <Text>Go</Text>
      </FocusablePressable>,
    );

    expect(screen.getByTestId('button')).toBeDisabled();
    await fireEvent.press(screen.getByTestId('button'));

    expect(onPress).not.toHaveBeenCalled();
  });
});
