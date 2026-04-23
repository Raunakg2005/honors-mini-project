import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Counter from '../components/Counter';

test('button click updates state', () => {
  const { getByText, getByTestId } = render(<Counter />);
  
  fireEvent.press(getByText('Increment'));

  expect(getByTestId('count').props.children.join('')).toBe('Count: 1');
});
