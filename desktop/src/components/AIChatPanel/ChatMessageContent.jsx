import { Markdown } from "@astryxdesign/core/Markdown";

export function ChatMessageContent({ text, isStreaming }) {
  return (
    <Markdown density="compact" isStreaming={isStreaming} autolink="gfm">
      {text}
    </Markdown>
  );
}
