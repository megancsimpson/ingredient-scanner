/**
 * Workaround for a React Native 0.86 bug on iPhone (3x screens):
 * https://github.com/react/react-native/issues/58970
 *
 * Wrapped text with a fixed lineHeight can be drawn as one clipped line
 * when it sits about 2048 points down a scrolling page. A rounding error
 * makes its box a tiny fraction too short for its lines, so iOS stops
 * wrapping. This happened to the disclaimer below long ingredient lists.
 *
 * A tiny bottom padding keeps the box from landing on that exact size.
 * It's far too small to see. Add it to the style of long text that can end
 * up far down a scrolling page:
 *
 *   text: { fontSize: 13, lineHeight: 18, ...TEXT_WRAP_FIX },
 *
 * Remove it (and this file) once React Native includes the fix.
 */
export const TEXT_WRAP_FIX = { paddingBottom: 0.01 };
