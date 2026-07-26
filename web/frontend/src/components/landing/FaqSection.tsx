"use client";

const items = [
  {
    question: "How does Sayvela process audio sources?",
    answer:
      "Our omni-channel architecture captures and processes system and microphone audio in parallel with near-zero latency.",
  },
  {
    question: "How does speaker diarization work?",
    answer:
      "AI identifies and labels each speaker automatically, producing clear, accurate meeting notes.",
  },
  {
    question: "Can Sayvela speak translated content?",
    answer:
      "Yes. Neural TTS plays translations in a natural voice to keep conversations flowing.",
  },
  {
    question: "How secure is the platform?",
    answer:
      "Zero Trust security, end-to-end encryption, and screen-capture protection keep your data private.",
  },
];

export default function FaqSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
      <div className="flex flex-col gap-4">
        <div className="section-eyebrow">FAQ</div>
        <h2 className="max-w-2xl text-3xl font-semibold text-white sm:text-4xl">
          Everything you need to know before you start
        </h2>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {items.map((item) => (
          <article key={item.question} className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-white/70">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
