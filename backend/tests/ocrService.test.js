const { extractText, textWithParagraphs } = require('../services/ocrService');

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

describe('extractText', () => {
  // Replace fetch with a fake, so no photo is sent to Google and each test
  // chooses Google's answer
  beforeEach(() => {
    process.env.GOOGLE_VISION_API_KEY = 'test-key';
    jest.spyOn(global, 'fetch');
    // The service logs Google's errors for the developer; keep test output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.GOOGLE_VISION_API_KEY;
  });

  /** A fake answer from Google with the given HTTP status and JSON body. */
  const googleAnswers = (status, body) => {
    fetch.mockResolvedValue(new Response(JSON.stringify(body), { status }));
  };

  test("returns the text Google read, with Vision's paragraphs", async () => {
    googleAnswers(200, {
      responses: [
        {
          fullTextAnnotation: annotation(
            [[word('Ingredients:', 'SPACE'), word('Water', 'LINE_BREAK')]],
            [[word('Acme', 'SPACE'), word('Inc.', 'LINE_BREAK')]]
          ),
        },
      ],
    });

    expect(await extractText('abc123')).toBe('Ingredients: Water\n\nAcme Inc.');
  });

  test('asks Google for dense text detection, with the key and the photo', async () => {
    googleAnswers(200, { responses: [{}] });

    await extractText('abc123');

    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('https://vision.googleapis.com/v1/images:annotate?key=test-key');
    const request = JSON.parse(options.body).requests[0];
    expect(request.image).toEqual({ content: 'abc123' });
    expect(request.features).toEqual([{ type: 'DOCUMENT_TEXT_DETECTION' }]);
    // Gives up instead of waiting forever if Google doesn't answer
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });

  test('returns an empty string when Google finds no text', async () => {
    // Google leaves out fullTextAnnotation when there is no text
    googleAnswers(200, { responses: [{}] });

    expect(await extractText('abc123')).toBe('');
  });

  test("answers 503 without calling Google when the key isn't set", async () => {
    delete process.env.GOOGLE_VISION_API_KEY;

    await expect(extractText('abc123')).rejects.toMatchObject({
      status: 503,
      message: 'Photo scanning is not available right now. Try pasting the list instead.',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([
    ["can't be reached", new TypeError('fetch failed')],
    ['takes too long to answer', new DOMException('The operation timed out.', 'TimeoutError')],
  ])('answers 502 when Google %s', async (_, error) => {
    fetch.mockRejectedValue(error);

    await expect(extractText('abc123')).rejects.toMatchObject({
      status: 502,
      message: "Couldn't read the photo right now. Please try again.",
    });
  });

  test('answers 502 when Google refuses the whole request, without passing on the details', async () => {
    // e.g. a wrong key, billing turned off, or a call from an IP address the
    // key isn't allowed to be used from
    googleAnswers(403, { error: { code: 7, message: 'The provided API key has an IP address restriction.' } });

    const error = await extractText('abc123').catch((err) => err);

    expect(error).toMatchObject({ status: 502, message: "Couldn't read the photo right now. Please try again." });
    // The details are logged for the developer instead
    expect(console.error).toHaveBeenCalledWith(
      'Google Vision error:',
      403,
      'The provided API key has an IP address restriction.'
    );
  });

  test("answers 400 when Google says the file isn't a readable image", async () => {
    // Vision answers 200 overall, with an error for the image (code 3)
    googleAnswers(200, { responses: [{ error: { code: 3, message: 'Bad image data.' } }] });

    await expect(extractText('not-a-photo')).rejects.toMatchObject({
      status: 400,
      message: "That photo couldn't be read. Please try a different photo.",
    });
  });

  test('answers 502 for any other problem with the image', async () => {
    googleAnswers(200, { responses: [{ error: { code: 13, message: 'Internal error.' } }] });

    await expect(extractText('abc123')).rejects.toMatchObject({ status: 502 });
  });

  test("answers 502 when Google's answer isn't JSON", async () => {
    fetch.mockResolvedValue(new Response('<html>Service Unavailable</html>', { status: 503 }));

    await expect(extractText('abc123')).rejects.toMatchObject({ status: 502 });
  });
});
