import { formatDate } from '../src/utils/formatDate';

// Puts the real date formatting back after each test, even if one fails
afterEach(() => jest.restoreAllMocks());

describe('formatDate', () => {
  test("uses the phone's own language and region, with a short month", () => {
    // The result depends on the phone's settings ("Oct 10, 2026" in the US,
    // "10 Oct 2026" in the UK), so this checks what it asks for instead
    const toLocale = jest.spyOn(Date.prototype, 'toLocaleDateString');

    formatDate('2026-10-10T12:00:00Z');

    expect(toLocale).toHaveBeenCalledWith(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  });

  test('formats a date from the server in US English as "Oct 10, 2026"', () => {
    // Pretend the phone is set to US English, and use midday so the day is
    // the same in every time zone
    const original = Date.prototype.toLocaleDateString;
    jest
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockImplementation(function (locale, options) {
        return original.call(this, 'en-US', options);
      });

    expect(formatDate('2026-10-10T12:00:00Z')).toBe('Oct 10, 2026');
    expect(formatDate(new Date(2026, 0, 5))).toBe('Jan 5, 2026');
  });

  test.each([
    ['text that is not a date', 'not a date'],
    ['nothing', undefined],
  ])('gives an empty string for %s instead of "Invalid Date"', (_, value) => {
    expect(formatDate(value)).toBe('');
  });
});
