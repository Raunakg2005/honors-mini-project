import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(() => Promise.resolve('React Native')),
}));

test('store data', async () => {
  await AsyncStorage.setItem('course', 'React Native');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(
    'course',
    'React Native'
  );
});

test('retrieve data', async () => {
  const value = await AsyncStorage.getItem('course');
  expect(value).toBe('React Native');
});
