import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SayvelaBrand } from "./SayvelaBrand";

describe("SayvelaBrand", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the inline mark and the wordmark", () => {
    render(<SayvelaBrand />);

    expect(screen.getByRole("img", { name: "Sayvela" })).not.toBeNull();
    expect(screen.getByText("SAYVELA")).not.toBeNull();
  });

  it("can render the mark on its own", () => {
    render(<SayvelaBrand wordmark={false} />);

    expect(screen.getByRole("img", { name: "Sayvela" })).not.toBeNull();
    expect(screen.queryByText("SAYVELA")).toBeNull();
  });
});
