import { Alert } from 'react-native';
import { formatDate } from './formatDate';

/**
 * Asks what to do when a product with the same name and brand is already
 * saved (the server's 409 response). Used when saving a new product and
 * when editing one. Shows the phone's own alert (three buttons is the most
 * Android allows) and waits for the answer.
 *
 *   const choice = await askAboutDuplicate(err.data.duplicate, 'save');
 *
 * @param {{ productName: string, brand?: string, createdAt: string }} duplicate
 *   the product that's already saved
 * @param {'save' | 'edit'} action  only changes the wording
 * @returns {Promise<'replace' | 'keep' | 'cancel'>}
 */
export function askAboutDuplicate(duplicate, action) {
  const name = duplicate.brand
    ? `"${duplicate.productName}" (${duplicate.brand})`
    : `"${duplicate.productName}"`;
  const replaceWith = action === 'edit' ? 'this product' : 'these results';

  return new Promise((resolve) => {
    Alert.alert(
      'Already saved',
      `You saved ${name} on ${formatDate(duplicate.createdAt)}. Replace it with ${replaceWith}, or keep both?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve('cancel') },
        { text: 'Keep both', onPress: () => resolve('keep') },
        // Red on iOS, since it deletes the other product
        { text: 'Replace', style: 'destructive', onPress: () => resolve('replace') },
      ],
      // Android: tapping outside the alert closes it, which counts as Cancel
      { cancelable: true, onDismiss: () => resolve('cancel') }
    );
  });
}
