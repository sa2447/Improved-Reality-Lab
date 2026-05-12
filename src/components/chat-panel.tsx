"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  createdAt: string;
};

type ComparisonPayload = {
  primaryState: string | null;
  comparedStates: string[];
  affordabilityScore: number | null;
  comparisonData: Record<string, unknown>;
  chartData: {
    labels?: string[];
    coverageRatioSeries?: number[];
    affordabilityGapSeries?: number[];
    monthlyCostSeries?: number[];
    monthlyIncomeSeries?: number[];
  };
};

type ChatResponse = {
  sessionId: string;
  messages: ChatMessage[];
  cacheHit?: boolean;
  error?: string;
  comparison?: ComparisonPayload;
  assistantMessageId?: string;
};

type UserProfile = {
  hourlyWage?: number;
  annualSalary?: number;
  hoursPerWeek?: number;
};

const SESSION_KEY = "improved_project.chat.sessionId";
const PROFILE_KEY = "improved_project.chat.userProfile";

const STARTER_PROMPTS = [
  "What is the average cost of living in NJ?",
  "Compare affordability for NY and NJ at minimum wage.",
  "Which state has the highest coverage ratio: CA, TX, or FL?",
  "What is the minimum wage in Texas?",
];

function newSessionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}`;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatChartValue(value: number, metric: "coverage" | "gap"): string {
  if (metric === "coverage") {
    return value.toFixed(2);
  }

  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

export default function ChatPanel({ isAuthenticated }: { isAuthenticated?: boolean }) {
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const [comparisonByMessageId, setComparisonByMessageId] = useState<Record<string, ComparisonPayload>>({});
  const [chartMetricByMessageId, setChartMetricByMessageId] = useState<Record<string, "coverage" | "gap">>({});
  const [saveStatusByMessageId, setSaveStatusByMessageId] = useState<Record<string, string>>({});
  const [messageHistory, setMessageHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize session and load profile from localStorage
  useEffect(() => {
    const stored = window.localStorage.getItem(SESSION_KEY);
    const initial = stored && stored.length > 0 ? stored : newSessionId();
    setSessionId(initial);
    window.localStorage.setItem(SESSION_KEY, initial);

    const storedProfile = window.localStorage.getItem(PROFILE_KEY);
    if (storedProfile) {
      try {
        setUserProfile(JSON.parse(storedProfile));
      } catch {
        // Silent fallback
      }
    }
  }, []);

  // Load message history on mount
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) {
          return;
        }
        const body = (await res.json()) as { messages?: ChatMessage[] };
        if (!cancelled && Array.isArray(body.messages)) {
          setMessages(body.messages);
        }
      } catch {
        // Silent fallback for first-time sessions
      }
    }

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const validIds = new Set(messages.map((msg) => msg.id));

    setComparisonByMessageId((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => validIds.has(id))),
    );
    setChartMetricByMessageId((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => validIds.has(id))) as Record<
        string,
        "coverage" | "gap"
      >,
    );
    setSaveStatusByMessageId((prev) =>
      Object.fromEntries(Object.entries(prev).filter(([id]) => validIds.has(id))),
    );
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !isSubmitting, [input, isSubmitting]);

  function saveUserProfile(profile: UserProfile) {
    setUserProfile(profile);
    if (isAuthenticated) {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  }

  function selectStarterPrompt(prompt: string) {
    setInput(prompt);
    setError("");
    setHistoryIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Enter to send (without Shift)
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSend) {
        void onSubmit({ preventDefault: () => {} } as FormEvent<HTMLFormElement>);
      }
      return;
    }

    // Arrow up for message history
    if (event.key === "ArrowUp" && input.length === 0) {
      event.preventDefault();
      if (messageHistory.length > 0) {
        const nextIndex = Math.min(historyIndex + 1, messageHistory.length - 1);
        setHistoryIndex(nextIndex);
        setInput(messageHistory[nextIndex]);
      }
      return;
    }

    // Reset history when user starts typing
    if (historyIndex >= 0 && input.length > 0) {
      setHistoryIndex(-1);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    if (!message) {
      return;
    }

    // Check for personal info keywords if not authenticated
    if (!isAuthenticated) {
      const personalKeywords = ["my", "i make", "i earn", "my salary", "my wage", "i have", "based on my"];
      const lowerMsg = message.toLowerCase();
      if (personalKeywords.some((kw) => lowerMsg.includes(kw))) {
        setError("To input personal information, please sign in first.");
        return;
      }
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message,
          userProfile: isAuthenticated ? userProfile : undefined,
        }),
      });

      const body = (await res.json()) as ChatResponse;

      if (!res.ok) {
        setError(body.error ?? "Unable to send chat message.");
        return;
      }

      setCacheHit(Boolean(body.cacheHit));
      setMessages(Array.isArray(body.messages) ? body.messages : []);
      if (body.comparison && body.assistantMessageId) {
        setComparisonByMessageId((prev) => ({ ...prev, [body.assistantMessageId as string]: body.comparison as ComparisonPayload }));
        setChartMetricByMessageId((prev) => ({ ...prev, [body.assistantMessageId as string]: "coverage" }));
        setSaveStatusByMessageId((prev) => ({ ...prev, [body.assistantMessageId as string]: "" }));
      }
      setInput("");
      setHistoryIndex(-1);
      setMessageHistory((prev) => [message, ...prev]);

      if (body.sessionId && body.sessionId !== sessionId) {
        setSessionId(body.sessionId);
        window.localStorage.setItem(SESSION_KEY, body.sessionId);
      }
    } catch {
      setError("Network error while sending message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function saveComparisonForMessage(messageId: string) {
    const comparison = comparisonByMessageId[messageId];

    if (!isAuthenticated || !comparison) {
      return;
    }

    setSaveStatusByMessageId((prev) => ({ ...prev, [messageId]: "Saving..." }));

    try {
      const comparedStates = comparison.comparedStates;
      const payload = {
        name: `${comparedStates.join(" vs ")} Snapshot`,
        primaryState: comparison.primaryState ?? undefined,
        comparedStates,
        affordabilityScore: comparison.affordabilityScore ?? undefined,
        comparisonData: comparison.comparisonData,
        chartData: comparison.chartData,
      };

      const res = await fetch("/api/saved-comparisons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setSaveStatusByMessageId((prev) => ({
          ...prev,
          [messageId]: body.error ?? "Unable to save comparison.",
        }));
        return;
      }

      setSaveStatusByMessageId((prev) => ({ ...prev, [messageId]: "Saved to dashboard." }));
    } catch {
      setSaveStatusByMessageId((prev) => ({
        ...prev,
        [messageId]: "Network error while saving comparison.",
      }));
    }
  }

  return (
    <div className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold">Cost of Living Chat</h2>

      <div className="mb-3 flex flex-wrap gap-2">
        {STARTER_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => selectStarterPrompt(prompt)}
            className="rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
          >
            {prompt}
          </button>
        ))}
      </div>

      {isAuthenticated && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowProfileForm(!showProfileForm)}
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 underline"
          >
            {showProfileForm ? "Hide" : "Add"} personal info
          </button>
          {showProfileForm && (
            <div className="mt-2 space-y-2 rounded border border-zinc-200 bg-zinc-50 p-3">
              <div>
                <label className="block text-xs font-medium text-zinc-700">Hourly wage (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 25.50"
                  value={userProfile.hourlyWage ?? ""}
                  onChange={(e) =>
                    saveUserProfile({
                      ...userProfile,
                      hourlyWage: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded border border-zinc-300 p-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Annual salary (optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="e.g., 75000"
                  value={userProfile.annualSalary ?? ""}
                  onChange={(e) =>
                    saveUserProfile({
                      ...userProfile,
                      annualSalary: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded border border-zinc-300 p-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-700">Hours per week (optional)</label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  placeholder="e.g., 40"
                  value={userProfile.hoursPerWeek ?? ""}
                  onChange={(e) =>
                    saveUserProfile({
                      ...userProfile,
                      hoursPerWeek: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  className="w-full rounded border border-zinc-300 p-1 text-xs"
                />
              </div>
              <p className="text-xs text-zinc-500">This info is saved for this chat session.</p>
            </div>
          )}
        </div>
      )}

      <div className="mb-3 max-h-80 space-y-2 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet. Start by asking a question.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="rounded border border-zinc-200 bg-white p-2">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{msg.role}</p>
              <p className="text-sm text-zinc-800 whitespace-pre-wrap">{msg.content}</p>

              {msg.role === "assistant" && comparisonByMessageId[msg.id] && (() => {
                const comparison = comparisonByMessageId[msg.id];
                const chartLabels = comparison.chartData.labels ?? [];
                const metric = chartMetricByMessageId[msg.id] ?? "coverage";
                const metricSeries =
                  metric === "coverage"
                    ? comparison.chartData.coverageRatioSeries ?? []
                    : comparison.chartData.affordabilityGapSeries ?? [];

                if (chartLabels.length === 0 || metricSeries.length !== chartLabels.length) {
                  return null;
                }

                const maxSeriesValue = Math.max(...metricSeries.map((value) => Math.abs(value)), 0.01);

                return (
                  <div className="mt-3 rounded border border-zinc-200 bg-zinc-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold text-zinc-800">
                        {metric === "coverage" ? "Coverage Ratio" : "Affordability Gap"} Comparison (Bar Graph)
                      </h3>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setChartMetricByMessageId((prev) => ({ ...prev, [msg.id]: "coverage" }))
                          }
                          className={`rounded px-2 py-1 text-xs ${
                            metric === "coverage"
                              ? "bg-blue-600 text-white"
                              : "border border-zinc-300 bg-white text-zinc-700"
                          }`}
                        >
                          Coverage
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setChartMetricByMessageId((prev) => ({ ...prev, [msg.id]: "gap" }))
                          }
                          className={`rounded px-2 py-1 text-xs ${
                            metric === "gap"
                              ? "bg-blue-600 text-white"
                              : "border border-zinc-300 bg-white text-zinc-700"
                          }`}
                        >
                          Gap
                        </button>
                        {isAuthenticated && (
                          <button
                            type="button"
                            onClick={() => void saveComparisonForMessage(msg.id)}
                            className="rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Save
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {chartLabels.map((label, index) => {
                        const value = metricSeries[index] ?? 0;
                        const widthPercent = Math.max(6, (Math.abs(value) / maxSeriesValue) * 100);

                        return (
                          <div key={`${msg.id}-${label}-${metric}`} className="flex items-center gap-2">
                            <div className="w-10 text-xs font-medium text-zinc-700">{label}</div>
                            <div className="h-5 flex-1 rounded bg-zinc-200">
                              <div
                                className={`h-5 rounded ${
                                  metric === "gap" && value < 0 ? "bg-rose-500" : "bg-blue-600"
                                }`}
                                style={{ width: `${widthPercent}%` }}
                                title={`${label}: ${formatChartValue(value, metric)}`}
                              />
                            </div>
                            <div className="w-20 text-right text-xs text-zinc-700">{formatChartValue(value, metric)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {saveStatusByMessageId[msg.id] && (
                      <p className="mt-2 text-xs text-zinc-600">{saveStatusByMessageId[msg.id]}</p>
                    )}
                  </div>
                );
              })()}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="space-y-2" onSubmit={onSubmit}>
        <textarea
          ref={textareaRef}
          className="w-full rounded border border-zinc-300 p-2 text-sm"
          placeholder="Type your question... (Press Enter to send, Shift+Enter for new line)"
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            setHistoryIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          rows={3}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
        {cacheHit !== null && <p className="text-xs text-zinc-500">{cacheHit ? "Cached" : "Fresh"} response</p>}

        <button
          type="submit"
          disabled={!canSend}
          className="inline-block rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {isSubmitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
