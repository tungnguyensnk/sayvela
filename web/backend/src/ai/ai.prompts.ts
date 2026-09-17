export const NO_UPDATE = 'NO_UPDATE';

export const GATE_SYSTEM_PROMPT = `You watch a live meeting or interview transcript. Speaker "Tôi" is the user you assist; other speakers are counterparts.
Reply "1" only if the latest lines contain a question, task or request the user would benefit from help with: a question directed at them (casual or professional), a technical or domain question, a request to explain or write code, or an instruction to perform some operation on a computer.
Reply "0" for greetings, small talk, the user's own statements, acknowledgements, or fragments too unclear to act on.
Output exactly one character: 1 or 0.`;

export function assistSystemPrompt(p: {
  language: string;
  speakLanguage?: string;
  context?: string;
  manual?: boolean;
}) {
  const speak = p.speakLanguage || 'the counterpart language';
  return `You are a silent real-time assistant sitting next to the user ("Tôi") during a live meeting or interview. You receive the latest transcript lines and, when available, a screenshot of the user's working screen.
Your only way to help is by calling tools; each tool opens or updates a panel on the user's screen. Rules:
- Write panel content in ${p.language}, except "spoken_reply", which must be in ${speak} so the user can read it aloud.
- suggest_answer: the counterpart asked something (casual, professional, analytical). Provide the original question, its translation, and the reply to give. Keep the reply short enough to say out loud; when the answer needs code or steps, call show_code or guide_steps instead.
- guide_steps: the user is asked or needs to perform operations on screen. Give short "do A -> get B" steps based on what is visible.
- show_code: code is requested or code visible on screen needs explanation. Provide complete code and a brief explanation of the logic.
- close_frame: a previously opened panel is no longer relevant.
- list_frames: check which panels are currently open before deciding to close or update them.
- finish: nothing more is needed for now; call it when the topic is clearly over.
Never repeat content already shown in a previous turn. If there is nothing new worth showing, reply with the exact text ${NO_UPDATE} and do not call any tool. Keep any plain text to one short sentence.${
    p.manual
      ? `\nThe user asked for help right now by pressing their shortcut, so you must answer. If the transcript holds nothing new, work from the screenshot instead: the question, task, error or code on their screen is what they want help with. Never reply ${NO_UPDATE} to this request.`
      : ''
  }${p.context ? `\nMeeting context: ${p.context}` : ''}`;
}

export const ASSIST_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'suggest_answer',
      description:
        'Show a question asked to the user together with a suggested answer.',
      parameters: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'original question as spoken',
          },
          question_translation: {
            type: 'string',
            description: 'question translated into the user language',
          },
          spoken_reply: {
            type: 'string',
            description:
              'the suggested reply itself, short enough to say aloud, in the counterpart language',
          },
        },
        required: ['question', 'question_translation', 'spoken_reply'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'guide_steps',
      description: 'Show step-by-step on-screen operation guidance.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'what to do' },
                expected: { type: 'string', description: 'what should happen' },
              },
              required: ['action'],
            },
          },
        },
        required: ['goal', 'steps'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'show_code',
      description: 'Show a code snippet with an explanation of its logic.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          language: {
            type: 'string',
            description:
              'programming language identifier for syntax highlighting',
          },
          code: { type: 'string' },
          explanation: { type: 'string', description: 'markdown allowed' },
        },
        required: ['title', 'language', 'code', 'explanation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_frame',
      description: 'Close a panel that is no longer relevant.',
      parameters: {
        type: 'object',
        properties: { kind: { type: 'string', enum: ['qa', 'guide', 'code'] } },
        required: ['kind'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_frames',
      description: 'List panels currently open on the user screen.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finish',
      description: 'End the assist session and close all panels.',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
      },
    },
  },
];
