const { textWithParagraphs } = require('../services/ocrService');

// Builds a word in Vision's format from its letters; `after` is the break
// that follows the last letter ('SPACE', 'LINE_BREAK', ...)
function word(text, after) {
  const symbols = [...text].map((letter) => ({ text: letter }));
  if (after) symbols[symbols.length - 1].property = { detectedBreak: { type: after } };
  return { symbols };
}

// One page, with each block holding the given paragraphs (arrays of words)
function annotation(...blocks) {
  return {
    text: 'plain text without paragraphs',
    pages: [{ blocks: blocks.map((paragraphs) => ({ paragraphs: paragraphs.map((words) => ({ words })) })) }],
  };
}

describe('textWithParagraphs', () => {
  test('puts a blank line between paragraphs', () => {
    const result = textWithParagraphs(
      annotation(
        [[word('Ingredients:', 'SPACE'), word('Water,', 'SPACE'), word('Glycerin', 'LINE_BREAK')]],
        [[word('Acme', 'SPACE'), word('Inc.', 'LINE_BREAK')]]
      )
    );
    expect(result).toBe('Ingredients: Water, Glycerin\n\nAcme Inc.');
  });

  test('keeps line breaks inside a paragraph', () => {
    const result = textWithParagraphs(
      annotation([[word('Water,', 'EOL_SURE_SPACE'), word('Glycerin', 'LINE_BREAK')]])
    );
    expect(result).toBe('Water,\nGlycerin');
  });

  test('shows a word split across lines with its hyphen', () => {
    const result = textWithParagraphs(
      annotation([[word('Isopro', 'HYPHEN'), word('pyl', 'SPACE'), word('Myristate', 'LINE_BREAK')]])
    );
    expect(result).toBe('Isopro-\npyl Myristate');
  });

  test('uses the plain text when there is no layout', () => {
    expect(textWithParagraphs({ text: 'Water, Glycerin' })).toBe('Water, Glycerin');
    expect(textWithParagraphs(undefined)).toBe('');
  });
});
