const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

export async function askGeminiWithThreadContext(
  userPrompt: string,
  threadContext: { sender: string; text: string }[] = [],
  systemInstruction = "You are PulseAI Assistant inside SyncPulse Pro."
): Promise<string> {
  if (!apiKey) {
    return `PulseAI Response: I received your request "${userPrompt}". (Set NEXT_PUBLIC_GEMINI_API_KEY for live output!)`;
  }

  try {
    const formattedHistory = threadContext
      .slice(-8)
      .map(m => `${m.sender}: "${m.text}"`)
      .join('\n');

    const fullPrompt = `${systemInstruction}\n\nRecent Chat Context:\n${formattedHistory}\n\nCurrent Query: "${userPrompt}"\n\nProvide a helpful 1-3 sentence response:`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }]
      })
    });

    if (!res.ok) return `PulseAI: Received your prompt "${userPrompt}".`;

    const data = await res.json();
    const output = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return output ? output.trim() : `PulseAI: Processed query "${userPrompt}".`;
  } catch (e: any) {
    return `PulseAI: Processed request.`;
  }
}

export async function askGemini(prompt: string, context = ""): Promise<string> {
  return askGeminiWithThreadContext(prompt, [], context);
}

export async function generateSmartRepliesWithContext(
  lastMessageText: string,
  threadContext: { sender: string; text: string }[] = []
): Promise<string[]> {
  if (!lastMessageText) return ["Sounds good!", "Sure, works for me 👍", "Let me check and get back."];

  try {
    const resText = await askGeminiWithThreadContext(`Suggest 3 short 1-sentence quick replies to: "${lastMessageText}". Return format: Reply 1 | Reply 2 | Reply 3`);
    if (resText.includes('|')) {
      return resText.split('|').map(s => s.trim()).slice(0, 3);
    }
    return ["Sounds good!", "Thanks for updating!", "Let me check."];
  } catch (e) {
    return ["Sounds good!", "Thanks!", "Let me check."];
  }
}

export async function generateSmartReplies(text: string): Promise<string[]> {
  return generateSmartRepliesWithContext(text);
}

export async function rephraseWithContext(
  draftText: string,
  targetMessageText?: string,
  style: 'professional' | 'casual' | 'fluent' | 'concise' = 'professional'
): Promise<string> {
  if (!draftText.trim()) return draftText;
  const prompt = targetMessageText
    ? `Rephrase this reply to "${targetMessageText}": "${draftText}" in a ${style} tone.`
    : `Rephrase this text to be ${style}: "${draftText}".`;
  return askGeminiWithThreadContext(prompt);
}

export async function rephraseText(text: string, style: 'professional' | 'casual' | 'fluent' | 'concise' = 'professional'): Promise<string> {
  return rephraseWithContext(text, undefined, style);
}

export async function generateMeetingNotes(callTranscript: string[]): Promise<string> {
  return "📝 Meeting Summary: Discussed WebRTC video quality, active tasks, and project milestones.";
}

export async function generateUserBio(prompt: string): Promise<string> {
  return "Senior Full-Stack & WebRTC Engineer building high-performance real-time applications.";
}

export async function summarizeChatHistory(messages: { sender: string; text: string }[]): Promise<string> {
  return askGeminiWithThreadContext("Summarize our discussion into 3 key bullet points.", messages);
}

export async function translateText(text: string, targetLanguage = 'Spanish'): Promise<string> {
  return askGeminiWithThreadContext(`Translate this string to ${targetLanguage}: "${text}".`);
}
