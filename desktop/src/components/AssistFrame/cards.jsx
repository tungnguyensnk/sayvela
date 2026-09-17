import { Markdown } from "@astryxdesign/core/Markdown";

function Body({ children }) {
  return <div className="af-card-body">{children}</div>;
}

export function QaCard({ item }) {
  return (
    <Body>
      <div className="af-question">{item.question}</div>
      {item.question_translation ? (
        <div className="af-question-tr">{item.question_translation}</div>
      ) : null}
      {item.spoken_reply ? (
        <div className="af-spoken">
          <span className="af-spoken-tag">say</span>
          {item.spoken_reply}
        </div>
      ) : null}
    </Body>
  );
}

export function GuideCard({ item }) {
  const steps = Array.isArray(item.steps) ? item.steps : [];
  return (
    <Body>
      <div className="af-goal">{item.goal}</div>
      <ol className="af-steps">
        {steps.map((step, i) => (
          <li key={`${step?.action ?? i}-${i}`}>
            <span className="af-step-action">{step?.action}</span>
            {step?.expected ? <span className="af-step-expected">→ {step.expected}</span> : null}
          </li>
        ))}
      </ol>
    </Body>
  );
}

export function CodeCard({ item }) {
  return (
    <Body>
      <div className="af-goal">{item.title}</div>
      <Markdown density="compact" autolink="gfm">
        {`\`\`\`${item.language || ""}\n${item.code || ""}\n\`\`\``}
      </Markdown>
      {item.explanation ? (
        <Markdown density="compact" autolink="gfm">
          {item.explanation}
        </Markdown>
      ) : null}
    </Body>
  );
}

export const CARD_COMPONENTS = { qa: QaCard, guide: GuideCard, code: CodeCard };

export const FRAME_META = {
  qa: { title: "Suggested answer", icon: "💬", label: (item) => item.question },
  guide: { title: "How to", icon: "🧭", label: (item) => item.goal },
  code: { title: "Code", icon: "⌨", label: (item) => item.title },
};
