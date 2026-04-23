import { add, subtract, multiply, divide } from '../utils/math';

describe('Math Utility Functions', () => {
  test('adds two numbers', () => {
    expect(add(5, 3)).toBe(8);
  });

  test('subtracts two numbers', () => {
    expect(subtract(10, 4)).toBe(6);
  });

  test('multiplies two numbers', () => {
    expect(multiply(4, 3)).toBe(12);
  });

  test('divides two numbers', () => {
    expect(divide(10, 2)).toBe(5);
  });

  test('handles division by zero', () => {
    expect(divide(10, 0)).toBe('Cannot divide by zero');
  });
});
