import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface IconProps {
  color: string;
  size?: number;
}

// Small line icons for the top bar, drawn inline so no icon font is needed.

export function HomeIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GamepadIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 7h10a5 5 0 0 1 4.9 6l-.8 3.3a2 2 0 0 1-3.5.8L15.5 15h-7l-2.1 2.1a2 2 0 0 1-3.5-.8L2.1 13A5 5 0 0 1 7 7Z"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Path
        d="M8 10v4M6 12h4M16 11h.01M18 13h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function SearchIcon({ color, size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13ZM15.5 15.5 20 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
