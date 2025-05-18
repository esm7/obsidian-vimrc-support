import { LINK_REGEX } from "motions/jumpToLink";
import { describe, test, expect } from "vitest";

function expectMatchesForLines(contentLines: string[], expectedMatches: string[]): void {
  expect(getMatches(contentLines)).toEqual(expectedMatches);
}

function getMatches(contentLines: string[]): string[] {
  const content = contentLines.join("\n");
  return [...content.matchAll(LINK_REGEX)].map((match) => match[0]);
}

function testSingleLinkLine(link: string): void {
  const lineWithLink = makeLineWithLink(link);
  expectMatchesForLines([lineWithLink], [link]);
}

function testSingleMarkdownLinkLine(displayText: string): void {
  const markdownLink = makeExampleHttpsMarkdownLink(displayText);
  testSingleLinkLine(markdownLink);
}

function makeMarkdownLink(displayText: string, link: string): string {
  return `[${displayText}](${link})`;
}

function makeExampleHttpMarkdownLink(displayText: string): string {
  return makeMarkdownLink(displayText, EXAMPLE_HTTP_URL);
}

function makeExampleHttpsMarkdownLink(displayText: string): string {
  return makeMarkdownLink(displayText, EXAMPLE_HTTPS_URL);
}

function makeLineWithLink(link: string): string {
  return `Check out this link: ${link} - click it!`;
}

function makeLineWithMultipleLinks(links: string[]): string {
  return `Check out these links: ${links.join(" | ")} - click any of them!`;
}

const WIKILINK_TEXT = "[[Some internal note]]";

const EXAMPLE_HTTP_URL = "http://example.com";
const EXAMPLE_HTTPS_URL = "https://example.com";

const MARKDOWN_HTTP_LINK = makeExampleHttpMarkdownLink("example");
const MARKDOWN_HTTPS_LINK = makeExampleHttpsMarkdownLink("example");

describe("regex matching links", () => {
  describe("wikilink", () => {
    test("simple wikilink", () => testSingleLinkLine(WIKILINK_TEXT));
    test("escaped open bracket makes wikilink invalid", () => {
      expectMatchesForLines([`\\${WIKILINK_TEXT}`], []);
    });
    describe("shouldn't be matched over multiple lines", () => {
      test("split after first open bracket", () => {
        const firstLine = "Check out this link: [";
        const secondLine = `[Some internal note]] - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split after second open bracket", () => {
        const firstLine = "Check out this link: [[";
        const secondLine = `Some internal note]] - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split in middle of text", () => {
        const firstLine = "Check out this link: [[Some internal";
        const secondLine = ` note]] - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split before first close bracket", () => {
        const firstLine = "Check out this link: [[Some internal note";
        const secondLine = `]] - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split before second close bracket", () => {
        const firstLine = "Check out this link: [[Some internal note]";
        const secondLine = `] - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
    });
  });

  describe("markdown link", () => {
    describe("simple display text", () => {
      test("http", () => testSingleLinkLine(MARKDOWN_HTTP_LINK));
      test("https", () => testSingleLinkLine(MARKDOWN_HTTPS_LINK));
    });
    describe("square brackets inside display text", () => {
      describe("escaped square brackets", () => {
        describe("escaped open bracket", () => {
          test("at start", () => testSingleMarkdownLinkLine("\\[some display text"));
          test("in middle", () => testSingleMarkdownLinkLine("some display \\[ text"));
          test("at end", () => testSingleMarkdownLinkLine("some display text \\["));
        });
        describe("escaped close bracket", () => {
          test("at start", () => testSingleMarkdownLinkLine("\\] some display text"));
          test("in middle", () => testSingleMarkdownLinkLine("some display \\] text"));
          test("at end", () => testSingleMarkdownLinkLine("some display text \\]"));
        });
        describe("escaped open and close bracket", () => {
          test("at start", () => testSingleMarkdownLinkLine("\\[ some display \\] text"));
          test("in middle", () => testSingleMarkdownLinkLine("some \\[ display \\] text"));
          test("at end", () => testSingleMarkdownLinkLine("some display \\[ text \\]"));
          test("footnote link", () => testSingleMarkdownLinkLine("\\[2\\]"));
        });
      });
      describe("non-escaped square brackets", () => {
        test("non-escaped open bracket should become the start of the markdown link", () => {
          const markdownLink = `[some display [ text](${EXAMPLE_HTTPS_URL})`;
          expectMatchesForLines(
            [makeLineWithLink(markdownLink)],
            [`[ text](${EXAMPLE_HTTPS_URL})`]
          );
        });
        test("non-escaped close bracket should invalidate the markdown link", () => {
          const markdownLink = `[some display ] text](${EXAMPLE_HTTPS_URL})`;
          // Markdown link isn't valid, so the regex just matches the url as a standalone url
          expectMatchesForLines([makeLineWithLink(markdownLink)], [`${EXAMPLE_HTTPS_URL})`]);
        });
        test("non-escaped footnote attempt should end up being a wikilink plus standalone url", () => {
          const markdownLink = makeExampleHttpsMarkdownLink("[2]");
          const lineWithLink = makeLineWithLink(markdownLink);
          expectMatchesForLines([lineWithLink], ["[[2]]", `${EXAMPLE_HTTPS_URL})`]);
        });
      });
    });
    describe("square brackets before markdown link", () => {
      test("single open bracket before markdown link shouldn't affect link match", () => {
        const baseLineWithLink = makeLineWithLink(MARKDOWN_HTTP_LINK);
        const fullLineWithLink = `some text [ ${baseLineWithLink}`;
        expectMatchesForLines([fullLineWithLink], [MARKDOWN_HTTP_LINK]);
      });
      test("single close bracket before markdown link shouldn't affect link match", () => {
        const baseLineWithLink = makeLineWithLink(MARKDOWN_HTTP_LINK);
        const fullLineWithLink = `some text ] ${baseLineWithLink}`;
        expectMatchesForLines([fullLineWithLink], [MARKDOWN_HTTP_LINK]);
      });
      test("open and closed bracket before markdown link shouldn't affect link match", () => {
        const baseLineWithLink = makeLineWithLink(MARKDOWN_HTTP_LINK);
        const fullLineWithLink = `[some] text ${baseLineWithLink}`;
        expectMatchesForLines([fullLineWithLink], [MARKDOWN_HTTP_LINK]);
      });
    });
    describe("markdown link across lines shouldn't be matched", () => {
      test("split before ] should just match the url as a standalone url", () => {
        const firstLine = "Check out this link: [example";
        const secondLine = `](${EXAMPLE_HTTPS_URL}) - click it!`;
        const expectedMatch = `${EXAMPLE_HTTPS_URL})`; // it'll include the closing parenthesis
        expectMatchesForLines([firstLine, secondLine], [expectedMatch]);
      });
      test("split after ] should just match the url as a standalone url", () => {
        const firstLine = "Check out this link: [example]";
        const secondLine = `(${EXAMPLE_HTTPS_URL}) - click it!`;
        const expectedMatch = `${EXAMPLE_HTTPS_URL})`; // it'll include the opening parenthesis
        expectMatchesForLines([firstLine, secondLine], [expectedMatch]);
      });
      test("split after ( should just match the url as a standalone url", () => {
        const firstLine = "Check out this link: [example](";
        const secondLine = `${EXAMPLE_HTTPS_URL}) - click it!`;
        const expectedMatch = `${EXAMPLE_HTTPS_URL})`; // it'll include the closing parenthesis
        expectMatchesForLines([firstLine, secondLine], [expectedMatch]);
      });
    });
  });

  describe("standalone URL", () => {
    describe("various protocols", () => {
      test("http", () => testSingleLinkLine(EXAMPLE_HTTP_URL));
      test("https", () => testSingleLinkLine(EXAMPLE_HTTPS_URL));
      test("ftp", () => testSingleLinkLine("ftp://example.com"));
      test("file", () => testSingleLinkLine("file://example/path/to/file"));
      test("chrome extensions", () => testSingleLinkLine("chrome://extensions"));
      test("chrome settings", () => testSingleLinkLine("chrome://settings"));
      test("chrome bookmarks", () => testSingleLinkLine("chrome://bookmarks"));
      test("chrome history", () => testSingleLinkLine("chrome://history"));
      test("chrome downloads", () => testSingleLinkLine("chrome://downloads"));
      test("chrome flags", () => testSingleLinkLine("chrome://flags"));
    });
    describe("shouldn't be matched over multiple lines", () => {
      test("split before colon", () => {
        const firstLine = "Check out this link: http";
        const secondLine = `://example.com - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split after colon", () => {
        const firstLine = "Check out this link: http:";
        const secondLine = `//example.com - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split between slashes", () => {
        const firstLine = "Check out this link: http:/";
        const secondLine = `/example.com - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
      test("split after slashes", () => {
        const firstLine = "Check out this link: http://";
        const secondLine = `example.com - click it!`;
        expectMatchesForLines([firstLine, secondLine], []);
      });
    });
  });

  describe("multiple link types", () => {
    const linkOrderings = [
      [WIKILINK_TEXT, MARKDOWN_HTTP_LINK, EXAMPLE_HTTP_URL],
      [WIKILINK_TEXT, MARKDOWN_HTTPS_LINK, EXAMPLE_HTTPS_URL],
      [WIKILINK_TEXT, EXAMPLE_HTTP_URL, MARKDOWN_HTTP_LINK],
      [WIKILINK_TEXT, EXAMPLE_HTTPS_URL, MARKDOWN_HTTPS_LINK],
      [MARKDOWN_HTTP_LINK, WIKILINK_TEXT, EXAMPLE_HTTP_URL],
      [MARKDOWN_HTTPS_LINK, WIKILINK_TEXT, EXAMPLE_HTTPS_URL],
      [MARKDOWN_HTTP_LINK, EXAMPLE_HTTP_URL, WIKILINK_TEXT],
      [MARKDOWN_HTTPS_LINK, EXAMPLE_HTTPS_URL, WIKILINK_TEXT],
      [EXAMPLE_HTTP_URL, WIKILINK_TEXT, MARKDOWN_HTTP_LINK],
      [EXAMPLE_HTTPS_URL, WIKILINK_TEXT, MARKDOWN_HTTPS_LINK],
      [EXAMPLE_HTTP_URL, MARKDOWN_HTTP_LINK, WIKILINK_TEXT],
      [EXAMPLE_HTTPS_URL, MARKDOWN_HTTPS_LINK, WIKILINK_TEXT],
    ];
    test("various orderings of multiple link types within a line", () => {
      for (const links of linkOrderings) {
        const multiLinkLine = makeLineWithMultipleLinks(links);
        expectMatchesForLines([multiLinkLine], links);
      }
    });
    test("various orderings of multiple link types across lines", () => {
      for (const links of linkOrderings) {
        const separateLines = links.map((link) => makeLineWithLink(link));
        expectMatchesForLines(separateLines, links);
      }
    });
  });

  describe("interaction with other markdown", () => {
    function makeBulletPoint(text: string): string {
      return `- ${text}`;
    }
    describe("bullet point", () => {
      test("wikilink alone", () => {
        const wikilinkBulletPoint = makeBulletPoint(WIKILINK_TEXT);
        expectMatchesForLines([wikilinkBulletPoint], [WIKILINK_TEXT]);
      });
      test("wikilink with other text", () => {
        const wikilinkBulletPoint = makeBulletPoint(makeLineWithLink(WIKILINK_TEXT));
        expectMatchesForLines([wikilinkBulletPoint], [WIKILINK_TEXT]);
      });
      test("markdown link alone", () => {
        const markdownLinkBulletPoint = makeBulletPoint(MARKDOWN_HTTP_LINK);
        expectMatchesForLines([markdownLinkBulletPoint], [MARKDOWN_HTTP_LINK]);
      });
      test("markdown link with other text", () => {
        const markdownLinkBulletPoint = makeBulletPoint(makeLineWithLink(MARKDOWN_HTTP_LINK));
        expectMatchesForLines([markdownLinkBulletPoint], [MARKDOWN_HTTP_LINK]);
      });
      test("standalone URL alone", () => {
        const standaloneUrlBulletPoint = makeBulletPoint(EXAMPLE_HTTP_URL);
        expectMatchesForLines([standaloneUrlBulletPoint], [EXAMPLE_HTTP_URL]);
      });
      test("standalone URL with other text", () => {
        const standaloneUrlBulletPoint = makeBulletPoint(makeLineWithLink(EXAMPLE_HTTP_URL));
        expectMatchesForLines([standaloneUrlBulletPoint], [EXAMPLE_HTTP_URL]);
      });
    });

    function makeUncheckedCheckbox(text: string): string {
      return `- [ ] ${text}`;
    }
    function makeCheckedCheckbox(text: string): string {
      return `- [x] ${text}`;
    }
    describe("unchecked checkbox", () => {
      test("wikilink alone", () => {
        const wikilinkCheckbox = makeUncheckedCheckbox(WIKILINK_TEXT);
        expectMatchesForLines([wikilinkCheckbox], [WIKILINK_TEXT]);
      });
      test("wikilink with other text", () => {
        const wikilinkCheckbox = makeUncheckedCheckbox(makeLineWithLink(WIKILINK_TEXT));
        expectMatchesForLines([wikilinkCheckbox], [WIKILINK_TEXT]);
      });
      test("markdown link alone", () => {
        const markdownLinkCheckbox = makeUncheckedCheckbox(MARKDOWN_HTTP_LINK);
        expectMatchesForLines([markdownLinkCheckbox], [MARKDOWN_HTTP_LINK]);
      });
      test("markdown link with other text", () => {
        const markdownLinkCheckbox = makeUncheckedCheckbox(makeLineWithLink(MARKDOWN_HTTP_LINK));
        expectMatchesForLines([markdownLinkCheckbox], [MARKDOWN_HTTP_LINK]);
      });
      test("standalone URL alone", () => {
        const standaloneUrlCheckbox = makeUncheckedCheckbox(EXAMPLE_HTTP_URL);
        expectMatchesForLines([standaloneUrlCheckbox], [EXAMPLE_HTTP_URL]);
      });
      test("standalone URL with other text", () => {
        const standaloneUrlCheckbox = makeUncheckedCheckbox(makeLineWithLink(EXAMPLE_HTTP_URL));
        expectMatchesForLines([standaloneUrlCheckbox], [EXAMPLE_HTTP_URL]);
      });
    });
    describe("checked checkbox", () => {
      test("wikilink alone", () => {
        const wikilinkCheckbox = makeCheckedCheckbox(WIKILINK_TEXT);
        expectMatchesForLines([wikilinkCheckbox], [WIKILINK_TEXT]);
      });
      test("wikilink with other text", () => {
        const wikilinkCheckbox = makeCheckedCheckbox(makeLineWithLink(WIKILINK_TEXT));
        expectMatchesForLines([wikilinkCheckbox], [WIKILINK_TEXT]);
      });
      test("markdown link alone", () => {
        const markdownLinkCheckbox = makeCheckedCheckbox(MARKDOWN_HTTP_LINK);
        expectMatchesForLines([markdownLinkCheckbox], [MARKDOWN_HTTP_LINK]);
      });
      test("markdown link with other text", () => {
        const markdownLinkCheckbox = makeCheckedCheckbox(makeLineWithLink(MARKDOWN_HTTP_LINK));
        expectMatchesForLines([markdownLinkCheckbox], [MARKDOWN_HTTP_LINK]);
      });
      test("standalone URL alone", () => {
        const standaloneUrlCheckbox = makeCheckedCheckbox(EXAMPLE_HTTP_URL);
        expectMatchesForLines([standaloneUrlCheckbox], [EXAMPLE_HTTP_URL]);
      });
      test("standalone URL with other text", () => {
        const standaloneUrlCheckbox = makeCheckedCheckbox(makeLineWithLink(EXAMPLE_HTTP_URL));
        expectMatchesForLines([standaloneUrlCheckbox], [EXAMPLE_HTTP_URL]);
      });
    });
  });
});
