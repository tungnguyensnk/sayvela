import { createElement, type ImgHTMLAttributes } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SayvelaBrand } from "./SayvelaBrand";

vi.mock("next/image", () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => {
    const nextImageProps = { ...props };
    delete nextImageProps.priority;

    return createElement("img", {
      ...nextImageProps,
      alt: props.alt ?? "",
    });
  },
}));

describe("SayvelaBrand", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the wordmark image", () => {
    render(<SayvelaBrand />);

    expect(screen.getByAltText("Sayvela").getAttribute("src")).toBe(
      "/brand/sayvela-wordmark-dark.svg",
    );
  });
});
