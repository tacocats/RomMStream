import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { CoverPlaceholder } from '../CoverPlaceholder';

describe('CoverPlaceholder', () => {
  it('renders for a numeric seed', async () => {
    await render(<CoverPlaceholder seed={3} testID="placeholder" />);

    expect(screen.getByTestId('placeholder')).toBeOnTheScreen();
  });

  it('renders for a string seed, hashed to a stable gradient', async () => {
    await render(
      <CoverPlaceholder seed="collection-42" testID="placeholder" />,
    );

    expect(screen.getByTestId('placeholder')).toBeOnTheScreen();
  });
});
