import { isEmailValid, isPasswordStrong, isNotEmpty, isMobileValid } from '../utils/validation';

describe('Validation Utility Functions', () => {
  test('validates correct email', () => {
    expect(isEmailValid('test@gmail.com')).toBe(true);
  });

  test('invalidates incorrect email', () => {
    expect(isEmailValid('testgmail.com')).toBe(false);
  });

  test('validates strong password length', () => {
    expect(isPasswordStrong('secure123')).toBe(true);
  });

  test('invalidates weak password length', () => {
    expect(isPasswordStrong('pass')).toBe(false);
  });

  test('validates non-empty string', () => {
    expect(isNotEmpty('Hello')).toBe(true);
  });

  test('invalidates empty or whitespace-only string', () => {
    expect(isNotEmpty('   ')).toBe(false);
  });

  test('validates correct mobile number', () => {
    expect(isMobileValid('9876543210')).toBe(true);
  });

  test('invalidates incorrect mobile number', () => {
    expect(isMobileValid('98765')).toBe(false);
  });
});
