global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve({ name: 'Kirti' }),
  })
);

test('mock API call', async () => {
  const response = await fetch('https://dummyapi.com');
  const data = await response.json();

  expect(data.name).toBe('Kirti');
});
