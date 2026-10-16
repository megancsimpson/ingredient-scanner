// Replace Expo's image tool with a fake, since there are no real photos in
// a test. It records how the photo was resized and saved.
jest.mock('expo-image-manipulator', () => {
  const saveAsync = jest.fn();
  const context = { resize: jest.fn(), renderAsync: jest.fn(() => Promise.resolve({ saveAsync })) };
  return {
    ImageManipulator: { manipulate: jest.fn(() => context) },
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
    // For the tests to look at
    __fake: { context, saveAsync },
  };
});

import { ImageManipulator, __fake } from 'expo-image-manipulator';
import { preparePhoto } from '../src/utils/preparePhoto';

const { context, saveAsync } = __fake;

beforeEach(() => {
  jest.clearAllMocks();
  saveAsync.mockResolvedValue({ base64: 'shrunk-photo-base64' });
});

describe('preparePhoto', () => {
  test('shrinks a wide photo to 2000 px wide, keeping its shape', async () => {
    await preparePhoto({ uri: 'file:///photo.jpg', width: 4032, height: 3024 });

    expect(ImageManipulator.manipulate).toHaveBeenCalledWith('file:///photo.jpg');
    // Only one side is given, so the other shrinks to match
    expect(context.resize).toHaveBeenCalledWith({ width: 2000 });
  });

  test('shrinks a tall photo to 2000 px high', async () => {
    await preparePhoto({ uri: 'file:///photo.jpg', width: 3024, height: 4032 });

    expect(context.resize).toHaveBeenCalledWith({ height: 2000 });
  });

  test('shrinks a square photo by its width', async () => {
    await preparePhoto({ uri: 'file:///photo.jpg', width: 3000, height: 3000 });

    expect(context.resize).toHaveBeenCalledWith({ width: 2000 });
  });

  test.each([
    ['smaller than 2000 px', 1600, 1200],
    ['exactly 2000 px', 2000, 1500],
  ])("doesn't resize a photo %s (never enlarges)", async (_, width, height) => {
    await preparePhoto({ uri: 'file:///photo.jpg', width, height });

    expect(context.resize).not.toHaveBeenCalled();
  });

  test('saves it as a JPEG and returns the base64 text to send to the server', async () => {
    const result = await preparePhoto({ uri: 'file:///photo.jpg', width: 4032, height: 3024 });

    expect(saveAsync).toHaveBeenCalledWith({ format: 'jpeg', compress: 0.8, base64: true });
    expect(result).toBe('shrunk-photo-base64');
  });
});
