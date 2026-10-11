import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Longest side of the photo sent for OCR. Phone cameras take photos around
// 4000 px wide (several MB); 2000 px keeps small label text readable while
// making the upload about 10 times smaller and faster.
const MAX_SIDE = 2000;

/**
 * Shrinks a photo and turns it into a base64 JPEG, ready to send to the
 * server for OCR.
 *
 * @param {{ uri: string, width: number, height: number }} photo
 *   from the camera or the photo library
 * @returns {Promise<string>} base64 JPEG
 */
export async function preparePhoto({ uri, width, height }) {
  const context = ImageManipulator.manipulate(uri);

  // Only shrink, never enlarge; keep the shape by setting just one side
  if (Math.max(width, height) > MAX_SIDE) {
    context.resize(width >= height ? { width: MAX_SIDE } : { height: MAX_SIDE });
  }

  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  return result.base64;
}
