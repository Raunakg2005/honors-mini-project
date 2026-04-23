import { renderHook, act } from '@testing-library/react-native';
import useCounter from '../hooks/useCounter';

test('custom hook increments', () => {
  const { result } = renderHook(() => useCounter());

  act(() => {
    result.current.increment();
  });

  expect(result.current.count).toBe(1);
});
