import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

/**
 * Minimal `navigation` / `route` props for rendering a screen component
 * directly, without a navigator.
 */
export function createScreenProps<R extends keyof RootStackParamList>(
  name: R,
  params: RootStackParamList[R],
) {
  const navigation = {
    navigate: jest.fn(),
    setOptions: jest.fn(),
    goBack: jest.fn(),
  };
  const route = { key: `${name}-key`, name, params };
  const props = { navigation, route } as unknown as NativeStackScreenProps<
    RootStackParamList,
    R
  >;
  return { navigation, route, props };
}
