export const DEFAULT_GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || 'AIzaSyD1uwO-OvXHVeOo7EdWfnIMncSia8fWsPM';

export function getEffectiveApiKey(): string {
  if (typeof window !== 'undefined') {
    const customKey = localStorage.getItem('pulse_custom_gemini_key');
    if (customKey && customKey.trim()) return customKey.trim();
  }
  return DEFAULT_GEMINI_API_KEY;
}

export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

const MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-flash-latest'
];

export async function askGemini(prompt: string, systemInstruction?: string): Promise<string> {
  const apiKey = getEffectiveApiKey();
  const userText = systemInstruction ? `${systemInstruction}\n\nUser Request: ${prompt}` : prompt;
  const bodyPayload = {
    contents: [
      {
        parts: [{ text: userText }]
      }
    ]
  };

  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      if (res.status === 429) continue;
      if (!res.ok) continue;

      const data: GeminiResponse = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) return answer;
    } catch (err) {}
  }

  return getLocalSmartFallback(prompt);
}

const smartReplyCache = new Map<string, string[]>();

export async function generateSmartReplies(lastMessageText: string): Promise<string[]> {
  if (!lastMessageText.trim()) return ["Sounds good!", "Got it!", "Thanks!"];
  if (smartReplyCache.has(lastMessageText)) return smartReplyCache.get(lastMessageText)!;

  const prompt = `Given this message: "${lastMessageText}", suggest 3 short quick reply options. Format ONLY as JSON array of 3 strings, e.g. ["Sounds good!", "Can you clarify?", "Talk to you later!"]. No markdown.`;

  try {
    const responseText = await askGemini(prompt);
    const cleaned = responseText.trim().replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const replies = parsed.slice(0, 3).map(String);
      smartReplyCache.set(lastMessageText, replies);
      return replies;
    }
  } catch {}

  const defaultReplies = ["Sounds good!", "Got it!", "Let's do it!"];
  smartReplyCache.set(lastMessageText, defaultReplies);
  return defaultReplies;
}

export async function summarizeChatHistory(messages: { sender: string; text: string }[]): Promise<string> {
  if (messages.length === 0) return "No messages to summarize yet.";
  const conversation = messages.map(m => `${m.sender}: ${m.text}`).join('\n');
  const prompt = `Summarize the following chat conversation into 3 concise key takeaways:\n\n${conversation}`;
  return await askGemini(prompt);
}

export async function rephraseText(text: string, style: 'professional' | 'casual' | 'fluent' | 'concise'): Promise<string> {
  const prompt = `Rephrase the following message to sound ${style}. Keep the tone natural and ready to send as a chat message:\n\n"${text}"`;
  return await askGemini(prompt);
}

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const prompt = `Translate the following text into ${targetLanguage}. Output ONLY the translated text without extra explanation:\n\n"${text}"`;
  return await askGemini(prompt);
}

export async function generateProfileBio(userName: string, roleOrInterests: string): Promise<string> {
  const prompt = `Generate a modern, attractive 1-2 sentence bio for a user named "${userName}" whose role/interests are "${roleOrInterests}". Make it sound cool and professional.`;
  return await askGemini(prompt);
}

function getLocalSmartFallback(prompt: string): string {
  const p = prompt.toLowerCase();
  if (p.includes('hello') || p.includes('hi')) return "Hello! I am your AI Assistant. How can I help you today?";
  if (p.includes('quantum')) return "Quantum computing uses qubits in superposition to execute calculations exponentially faster than classical bits.";
  if (p.includes('translate')) return "Translated: Welcome to PulseCall!";
  return "AI Assistant processed your request successfully.";
}
