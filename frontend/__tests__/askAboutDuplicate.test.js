import { Alert } from 'react-native';
import { askAboutDuplicate } from '../src/utils/askAboutDuplicate';

// The phone's own alert can't open in a test, so Alert.alert is replaced
// with a fake that records what it was asked to show
beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());

const duplicate = { productName: 'Night Cream', brand: 'Acme', createdAt: '2026-10-10T12:00:00Z' };

/** What the alert was asked to show: { title, message, buttons, options }. */
function shownAlert() {
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  const [title, message, buttons, options] = Alert.alert.mock.calls[0];
  return { title, message, buttons, options };
}

/** Taps the button with this text, as the user would. */
function tap(text) {
  shownAlert()
    .buttons.find((button) => button.text === text)
    .onPress();
}

describe('askAboutDuplicate', () => {
  test('names the saved product and its brand', () => {
    askAboutDuplicate(duplicate, 'save');

    const { title, message } = shownAlert();
    expect(title).toBe('Already saved');
    expect(message).toMatch(/^You saved "Night Cream" \(Acme\) on .+\. Replace it with these results, or keep both\?$/);
  });

  test('leaves out the brand when the saved product has none', () => {
    askAboutDuplicate({ productName: 'Night Cream', createdAt: '2026-10-10T12:00:00Z' }, 'save');

    expect(shownAlert().message).toMatch(/^You saved "Night Cream" on /);
  });

  test('says "this product" when editing', () => {
    askAboutDuplicate(duplicate, 'edit');

    expect(shownAlert().message).toContain('Replace it with this product, or keep both?');
  });

  test('has three buttons (the most Android allows), with Replace in red', () => {
    askAboutDuplicate(duplicate, 'save');

    const { buttons } = shownAlert();
    expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Keep both', 'Replace']);
    expect(buttons.find((b) => b.text === 'Cancel').style).toBe('cancel');
    // Red on iOS, since Replace deletes the other product
    expect(buttons.find((b) => b.text === 'Replace').style).toBe('destructive');
  });

  test.each([
    ['Cancel', 'cancel'],
    ['Keep both', 'keep'],
    ['Replace', 'replace'],
  ])('answers "%s" with %p', async (text, answer) => {
    const choice = askAboutDuplicate(duplicate, 'save');

    tap(text);

    await expect(choice).resolves.toBe(answer);
  });

  test('counts closing the alert without choosing (Android) as Cancel', async () => {
    const choice = askAboutDuplicate(duplicate, 'save');

    const { options } = shownAlert();
    expect(options.cancelable).toBe(true);
    options.onDismiss();

    await expect(choice).resolves.toBe('cancel');
  });
});
