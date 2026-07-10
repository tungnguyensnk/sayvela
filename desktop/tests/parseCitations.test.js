import { describe, expect, it } from "vitest";
import { parseCitations, stripCitationMarkers } from "../src/chat/parseCitations.js";

const ref = {
  matched_text: "citeturn0news3",
  type: "grouped_webpages",
  items: [{
    title: "Dự báo thời tiết sáng | 10/07/2026",
    url: "https://hanoionline.vn/a.htm?utm_source=chatgpt.com",
    attribution: "Hanoi Online",
    snippet: "Sáng sớm nay nhiều mây.",
  }],
};

describe("parseCitations", () => {
  it("should parse citation with metadata", () => {
    const out = parseCitations(`hello ${ref.matched_text}`, [ref]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ type: "markdown", text: "hello " });
    expect(out[1].type).toBe("citation");
    expect(out[1].ref.label).toBe("Hanoi Online");
    expect(out[1].ref.count).toBe(1);
  });

  it("should count grouped sources", () => {
    const out = parseCitations(ref.matched_text, [{
      ...ref,
      items: [{
        ...ref.items[0],
        supporting_websites: [{
          title: "Tin môi trường",
          url: "https://moitruong.net.vn/b.html",
          attribution: "moitruong.net.vn",
          snippet: "Chiều tối có mưa rào.",
        }],
      }],
    }]);
    expect(out[0].ref.count).toBe(2);
  });

  it("should clean chatgpt tracking from urls", () => {
    const out = parseCitations(ref.matched_text, [ref]);
    expect(out[0].ref.items[0].url).toBe("https://hanoionline.vn/a.htm");
  });

  it("should not count duplicated source attribution as extra", () => {
    const out = parseCitations(ref.matched_text, [{
      ...ref,
      items: [{
        ...ref.items[0],
        supporting_websites: [{
          title: "Same site",
          url: "https://hanoionline.vn/b.html?utm_source=chatgpt.com",
          attribution: "Hanoi Online",
          snippet: "same source",
        }],
      }],
    }]);
    expect(out[0].ref.count).toBe(1);
  });

  it("should strip hidden invalid references", () => {
    const out = parseCitations(`a ${ref.matched_text} b`, [{ ...ref, type: "hidden", invalid: true }]);
    expect(out).toEqual([{ type: "markdown", text: "a  b" }]);
  });

  it("should strip markers without metadata", () => {
    expect(stripCitationMarkers(`a ${ref.matched_text} b`)).toBe("a  b");
    expect(parseCitations(`a ${ref.matched_text} b`)).toEqual([{ type: "markdown", text: "a  b" }]);
  });

  it("should strip any internal marker shape", () => {
    const marker = "genuiturn0forecast0";
    expect(stripCitationMarkers(`a ${marker} b`)).toBe("a  b");
    expect(parseCitations(`a ${marker} b`)).toEqual([{ type: "markdown", text: "a  b" }]);
  });

  it("should strip incomplete internal marker while streaming", () => {
    const marker = "genuikINv";
    expect(stripCitationMarkers(`a ${marker}\n\nb`)).toBe("a \n\nb");
    expect(parseCitations(`a ${marker}\n\nb`)).toEqual([{ type: "markdown", text: "a \n\nb" }]);
  });

  it("should never render non-web references as pills", () => {
    const marker = "genuikINv";
    const out = parseCitations(`a ${marker} b`, [{ ...ref, matched_text: marker, type: "dil" }]);
    expect(out).toEqual([{ type: "markdown", text: "a  b" }]);
  });

  it("should strip final genui while keeping web citation pill", () => {
    const genui = "genui0Lix";
    const out = parseCitations(`${genui}\n\nweather ${ref.matched_text}`, [
      { ...ref, matched_text: genui, type: "dil" },
      ref,
    ]);
    expect(out[0]).toEqual({ type: "markdown", text: "\n\nweather " });
    expect(out[1].type).toBe("citation");
    expect(JSON.stringify(out)).not.toContain("genui");
    expect(JSON.stringify(out)).not.toContain("");
  });

  it("should strip complete genui json payload with whitespace", () => {
    const marker = "genui{\"weather_widget_v3_with_source\":{\"location\":\"Hanoi, Vietnam\"}}";
    expect(stripCitationMarkers(`a ${marker} b`)).toBe("a  b");
    expect(parseCitations(`a ${marker} b`)).toEqual([{ type: "markdown", text: "a  b" }]);
  });

  it("should keep plain text", () => {
    expect(parseCitations("plain text")).toEqual([{ type: "markdown", text: "plain text" }]);
  });
});
