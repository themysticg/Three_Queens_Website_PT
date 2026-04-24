export function parseStoredAnswers(value: string | null | undefined): Record<string, string> {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).map(([key, entry]) => [key, typeof entry === "string" ? entry : String(entry ?? "")])
    );
  } catch {
    return {};
  }
}

export function buildWhitelistAnswerMap(application: {
  answers?: string | null;
  inGameName: string;
  age: number;
  timezone: string;
  experience: string;
  motivation: string;
  characterStory: string | null;
  additionalInfo: string | null;
}): Record<string, string> {
  const stored = parseStoredAnswers(application.answers);

  return {
    inGameName: stored.inGameName ?? application.inGameName ?? "",
    age: stored.age ?? String(application.age ?? ""),
    timezone: stored.timezone ?? application.timezone ?? "",
    experience: stored.experience ?? application.experience ?? "",
    motivation: stored.motivation ?? application.motivation ?? "",
    characterStory: stored.characterStory ?? application.characterStory ?? "",
    additionalInfo: stored.additionalInfo ?? application.additionalInfo ?? "",
    ...stored,
  };
}
