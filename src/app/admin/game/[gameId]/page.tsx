"use client";

import React, { useState, use, useMemo, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { useAdminRealtime } from "@/lib/hooks/useAdminRealtime";
import { useAuthoritativeTimer } from "@/lib/hooks/useAuthoritativeTimer";
import { formatPoints, formatCountdown } from "@/lib/utils/format";

const SAMPLE_QUESTIONS_TEMPLATE = {
  questions: [
    {
      questionText: "What is the capital of France?",
      options: ["Paris", "Berlin", "Rome", "Madrid"],
      correctAnswer: "Paris",
      countdownSeconds: 30,
      explanation: "Paris is the capital and largest city of France.",
    },
    {
      questionText: "Which is the largest planet in our solar system?",
      options: ["Earth", "Jupiter", "Saturn", "Neptune"],
      correctAnswer: "Jupiter",
      countdownSeconds: 30,
      explanation: "Jupiter is the largest planet in our solar system.",
    },
    {
      questionText: "Who developed the Java programming language?",
      options: ["James Gosling", "Dennis Ritchie", "Bjarne Stroustrup", "Guido van Rossum"],
      correctAnswer: "James Gosling",
      countdownSeconds: 30,
      explanation: "James Gosling led the development of Java at Sun Microsystems.",
    },
    {
      questionText: "Which organ pumps blood throughout the human body?",
      options: ["Brain", "Heart", "Liver", "Lungs"],
      correctAnswer: "Heart",
      countdownSeconds: 30,
      explanation: "The heart pumps blood through the circulatory system.",
    },
    {
      questionText: "Which is the largest ocean on Earth?",
      options: ["Atlantic Ocean", "Indian Ocean", "Pacific Ocean", "Arctic Ocean"],
      correctAnswer: "Pacific Ocean",
      countdownSeconds: 30,
      explanation: "The Pacific Ocean is the largest and deepest ocean on Earth.",
    },
    {
      questionText: "What does CPU stand for?",
      options: [
        "Central Processing Unit",
        "Computer Power Unit",
        "Central Program Utility",
        "Control Processing User",
      ],
      correctAnswer: "Central Processing Unit",
      countdownSeconds: 30,
      explanation: "The CPU executes instructions and performs essential processing operations.",
    },
    {
      questionText: "What is the square root of 144?",
      options: ["10", "11", "12", "14"],
      correctAnswer: "12",
      countdownSeconds: 30,
      explanation: "12 multiplied by 12 equals 144.",
    },
    {
      questionText: "Which planet is known as the Red Planet?",
      options: ["Venus", "Mars", "Mercury", "Saturn"],
      correctAnswer: "Mars",
      countdownSeconds: 30,
      explanation: "Mars appears reddish because its surface contains iron oxide.",
    },
    {
      questionText: "What does HTTP stand for?",
      options: [
        "HyperText Transfer Protocol",
        "High Transfer Text Program",
        "Hyperlink Transmission Process",
        "Host Transfer Protocol",
      ],
      correctAnswer: "HyperText Transfer Protocol",
      countdownSeconds: 30,
      explanation: "HTTP is the application-layer protocol used for transferring web content.",
    },
    {
      questionText: "Which programming language is predominantly used for styling web pages?",
      options: ["HTML", "CSS", "Python", "SQL"],
      correctAnswer: "CSS",
      countdownSeconds: 30,
      explanation: "CSS (Cascading Style Sheets) controls presentation and layout of web pages.",
    },
  ],
};

interface ParsedQuestionItem {
  questionText: string;
  options: string[];
  correctAnswer: string;
  countdownSeconds: number;
  explanation?: string;
}

export default function AdminGameControlPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = use(params);
  const { snapshot, loading, isRefreshing, lastUpdated, error, actionLoading, executeAction, refetch } =
    useAdminRealtime(gameId);

  const { secondsRemaining } = useAuthoritativeTimer(
    snapshot?.questionStartedAt ?? null,
    snapshot?.questionEndsAt ?? null
  );

  // Modal State
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("bulk");
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Single Question Form State
  const [questionText, setQuestionText] = useState("");
  const [optionsStr, setOptionsStr] = useState("Paris, Berlin, Rome, Madrid");
  const [correctAnswer, setCorrectAnswer] = useState("Paris");
  const [explanation, setExplanation] = useState("");
  const [countdownSeconds, setCountdownSeconds] = useState(30);
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Bulk JSON Form State
  const [bulkJsonText, setBulkJsonText] = useState(
    JSON.stringify(SAMPLE_QUESTIONS_TEMPLATE, null, 2)
  );
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [showPreviewList, setShowPreviewList] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Real-time client-side validation of bulk JSON
  const bulkValidation = useMemo<{
    isValid: boolean;
    questions: ParsedQuestionItem[];
    error: string | null;
  }>(() => {
    if (!bulkJsonText.trim()) {
      return { isValid: false, questions: [], error: "Please paste or load JSON questions" };
    }
    try {
      const parsed = JSON.parse(bulkJsonText);
      const rawList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.questions)
        ? parsed.questions
        : [parsed];

      if (!Array.isArray(rawList) || rawList.length === 0) {
        return {
          isValid: false,
          questions: [],
          error: "JSON must contain an array or a 'questions' array with items",
        };
      }

      const validated: ParsedQuestionItem[] = [];
      for (let i = 0; i < rawList.length; i++) {
        const item = rawList[i];
        if (!item || typeof item !== "object") {
          return { isValid: false, questions: [], error: `Question #${i + 1} is not a valid object` };
        }
        if (!item.questionText || typeof item.questionText !== "string" || item.questionText.trim().length < 3) {
          return {
            isValid: false,
            questions: [],
            error: `Question #${i + 1} is missing a valid 'questionText' (at least 3 characters)`,
          };
        }

        let opts: string[] = [];
        if (Array.isArray(item.options)) {
          opts = item.options.map((o: unknown) => String(o).trim()).filter(Boolean);
        } else if (typeof item.options === "string") {
          opts = item.options.split(",").map((s: string) => s.trim()).filter(Boolean);
        }

        if (opts.length < 2) {
          return {
            isValid: false,
            questions: [],
            error: `Question #${i + 1} ("${item.questionText.slice(0, 25)}...") must have at least 2 options`,
          };
        }

        if (!item.correctAnswer || typeof item.correctAnswer !== "string" || !item.correctAnswer.trim()) {
          return {
            isValid: false,
            questions: [],
            error: `Question #${i + 1} ("${item.questionText.slice(0, 25)}...") is missing 'correctAnswer'`,
          };
        }

        const secs = Number(item.countdownSeconds ?? item.timeLimit ?? 30);
        validated.push({
          questionText: item.questionText.trim(),
          options: opts,
          correctAnswer: item.correctAnswer.trim(),
          countdownSeconds: isNaN(secs) || secs < 5 ? 30 : secs,
          explanation: item.explanation ? String(item.explanation).trim() : undefined,
        });
      }

      return { isValid: true, questions: validated, error: null };
    } catch (err) {
      return {
        isValid: false,
        questions: [],
        error: err instanceof Error ? `JSON syntax error: ${err.message}` : "Invalid JSON syntax",
      };
    }
  }, [bulkJsonText]);

  // Handle Single Question Submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = optionsStr.split(",").map((s) => s.trim()).filter(Boolean);
    if (opts.length < 2) {
      setModalError("Please provide at least 2 comma-separated options.");
      return;
    }

    setSubmittingSingle(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: questionText.trim(),
          options: opts,
          correctAnswer: correctAnswer.trim(),
          countdownSeconds,
          explanation: explanation.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddQuestionModal(false);
        setQuestionText("");
        setExplanation("");
        setSuccessToast("Question added successfully!");
        setTimeout(() => setSuccessToast(null), 4000);
        refetch();
      } else {
        setModalError(data.message || "Failed to add question.");
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to connect to server.");
    } finally {
      setSubmittingSingle(false);
    }
  };

  // Handle Bulk JSON Submission
  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkValidation.isValid || bulkValidation.questions.length === 0) {
      setModalError(bulkValidation.error || "Please fix JSON validation errors before submitting.");
      return;
    }

    setSubmittingBulk(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: bulkValidation.questions }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddQuestionModal(false);
        setSuccessToast(`Successfully added ${bulkValidation.questions.length} questions!`);
        setTimeout(() => setSuccessToast(null), 4000);
        refetch();
      } else {
        setModalError(data.message || "Failed to add questions.");
      }
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Failed to connect to server.");
    } finally {
      setSubmittingBulk(false);
    }
  };

  // Handle .json file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkJsonText(text);
        setModalError(null);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleResetGame = async () => {
    setResetting(true);
    try {
      const ok = await executeAction("RESET_GAME");
      if (ok) {
        setShowResetConfirmModal(false);
        setSuccessToast("Game successfully reset! All questions preserved, player records cleared.");
        setTimeout(() => setSuccessToast(null), 5000);
        refetch();
      }
    } finally {
      setResetting(false);
    }
  };

  const exportResults = async () => {
    try {
      const res = await fetch(`/api/admin/games/${gameId}/results`);
      const json = await res.json();
      if (json.success && json.data) {
        const dataStr =
          "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json.data, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `game_${snapshot?.gameCode || gameId}_results.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }
    } catch {
      alert("Failed to export results");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="mt-3 text-xs text-zinc-400 font-mono">Loading host console...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-center max-w-sm">
            <h2 className="text-base font-bold text-white">Game Not Found</h2>
            <Link
              href="/admin"
              className="mt-4 inline-block px-4 py-2 bg-amber-400 text-zinc-950 rounded-lg text-xs font-bold"
            >
              ← Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isLive = snapshot.status === "QUESTION_ACTIVE" || snapshot.status === "FINAL_ROUND";
  const isLobby = snapshot.status === "LOBBY";
  const isDraft = snapshot.status === "DRAFT";
  const isClosed = snapshot.status === "QUESTION_CLOSED";
  const isFinished = snapshot.status === "FINISHED";

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 selection:bg-amber-400 selection:text-zinc-950">
      <Navbar currentGameCode={snapshot.gameCode} gameTitle={snapshot.title} />

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 rounded-xl bg-emerald-950 border border-emerald-600 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-2 animate-fade-in">
          <span className="text-emerald-400 text-sm">✓</span>
          <span>{successToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
            >
              ← Back
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-black text-amber-400 tracking-wider">
                  {snapshot.gameCode}
                </span>
                <span className="text-zinc-600 font-bold">•</span>
                <h1 className="text-base sm:text-lg font-black text-white truncate max-w-md uppercase">
                  {snapshot.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-zinc-400 font-mono">ID: {snapshot.gameId}</p>
                {lastUpdated && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    • Synced: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Host Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* On-Demand Fresh Refresh Button */}
            <button
              onClick={refetch}
              disabled={isRefreshing}
              className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Pull fresh authoritative game state from Neon PostgreSQL"
            >
              <span className={`text-sm ${isRefreshing ? "inline-block animate-spin text-amber-400" : ""}`}>
                ↻
              </span>
              <span>{isRefreshing ? "Refreshing..." : "Refresh Status"}</span>
            </button>
            {isDraft && (
              <button
                onClick={() => executeAction("OPEN_LOBBY")}
                disabled={Boolean(actionLoading)}
                className="h-10 px-4 rounded-xl bg-blue-500 hover:bg-blue-400 text-zinc-950 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Open Lobby
              </button>
            )}

            {(isDraft || isLobby) && (
              <button
                onClick={() => executeAction("START_GAME")}
                disabled={Boolean(actionLoading) || snapshot.totalQuestions === 0}
                className="h-10 px-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-zinc-950 font-black text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-400/20"
                title="Start quiz! Questions will automatically progress 1 by 1 sequentially"
              >
                Start Game ▶
              </button>
            )}

            {isLive && (
              <button
                onClick={() => executeAction("CLOSE_QUESTION")}
                disabled={Boolean(actionLoading)}
                className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Close Question ■
              </button>
            )}

            {isClosed && snapshot.currentQuestionIndex < snapshot.totalQuestions && (
              <button
                onClick={() => executeAction("NEXT_QUESTION")}
                disabled={Boolean(actionLoading)}
                className="h-10 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black text-xs uppercase tracking-wider transition-colors"
              >
                Next Round →
              </button>
            )}

            {isClosed && snapshot.currentQuestionIndex >= snapshot.totalQuestions && !isFinished && (
              <button
                onClick={() => executeAction("FINISH_GAME")}
                disabled={Boolean(actionLoading)}
                className="h-10 px-4 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xs uppercase tracking-wider transition-colors"
              >
                Finalize & Finish Game
              </button>
            )}

            {/* Reset Game Button */}
            <button
              onClick={() => setShowResetConfirmModal(true)}
              disabled={Boolean(actionLoading)}
              className="h-10 px-3.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-700/80 text-rose-300 hover:text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Reset entire game: clear players and scores, keep all questions"
            >
              <span>↺</span> Reset Game
            </button>

            {(isDraft || isLobby) && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowAddQuestionModal(true);
                }}
                className="h-10 px-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-400/10"
              >
                <span>+</span> Add Questions
              </button>
            )}

            <button
              onClick={exportResults}
              className="h-10 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs font-bold"
              title="Export Results JSON"
            >
              Export JSON ⤓
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <span className="font-bold">!</span>
            <span>{error}</span>
          </div>
        )}

        {/* Live Counters Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-6">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Game Status</span>
            <span className="text-sm font-black text-white uppercase mt-0.5 block font-mono">
              {snapshot.status.replace("_", " ")}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Players</span>
            <span className="text-sm font-black text-amber-400 mt-0.5 block font-mono">
              {snapshot.totalPlayers} Joined ({snapshot.activePlayers} Active)
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Submissions</span>
            <span className="text-sm font-black text-emerald-400 mt-0.5 block font-mono">
              {snapshot.submissionCount} Locked / {snapshot.unsubmittedCount} Pending
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800">
            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Current Round</span>
            <span className="text-sm font-black text-zinc-200 mt-0.5 block font-mono">
              {snapshot.currentQuestionIndex} / {snapshot.totalQuestions}
            </span>
          </div>
        </div>

        {/* Active Question Details Card (if in active game round) */}
        {snapshot.currentQuestion && (
          <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                Round {snapshot.currentQuestion.order} of {snapshot.totalQuestions}
              </span>

              {isLive && (
                <div className="px-3 py-1 rounded bg-zinc-950 border border-zinc-700 text-amber-400 font-mono text-xs font-black">
                  ⏱ {formatCountdown(secondsRemaining)}
                </div>
              )}
            </div>

            <h3 className="text-base sm:text-xl font-black text-white mt-3 mb-4 leading-snug">
              {snapshot.currentQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {(snapshot.currentQuestion.options as string[]).map((opt, i) => {
                const isCorrect = opt === snapshot.currentQuestion?.correctAnswer;
                return (
                  <div
                    key={opt}
                    className={`p-3 rounded-xl border flex items-center justify-between font-medium ${
                      isCorrect
                        ? "bg-emerald-950/60 border-emerald-600 text-emerald-300 font-bold"
                        : "bg-zinc-950 border-zinc-800 text-zinc-300"
                    }`}
                  >
                    <span>
                      <strong className="mr-2 text-zinc-500">{String.fromCharCode(65 + i)}.</strong>
                      {opt}
                    </span>
                    {isCorrect && (
                      <span className="text-[10px] uppercase font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                        Correct Answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {snapshot.currentQuestion.explanation && (
              <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-800 pt-2 leading-relaxed">
                <strong className="text-zinc-200">Explanation: </strong>
                {snapshot.currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* Queued Questions List (Host Review) */}
        <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Game Questions ({snapshot.questions?.length ?? snapshot.totalQuestions} Queued)
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Questions will be presented to players in sequence during game rounds.
              </p>
            </div>
            {(isDraft || isLobby) && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowAddQuestionModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 font-bold text-xs transition-colors"
              >
                + Add More
              </button>
            )}
          </div>

          {(!snapshot.questions || snapshot.questions.length === 0) ? (
            <div className="py-8 text-center border border-dashed border-zinc-800 rounded-xl">
              <p className="text-xs text-zinc-400">No questions added to this game yet.</p>
              {(isDraft || isLobby) && (
                <button
                  onClick={() => {
                    setModalError(null);
                    setShowAddQuestionModal(true);
                  }}
                  className="mt-3 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider"
                >
                  Add Questions Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {snapshot.questions.map((q) => (
                <div
                  key={q.id}
                  className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 font-mono font-bold text-amber-400 flex items-center justify-center shrink-0 text-[11px]">
                      {q.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-100 truncate">{q.questionText}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-zinc-400">
                        <span>Options: {q.options.join(" • ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 font-bold text-[10px]">
                      Ans: {q.correctAnswer}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px]">
                      ⏱ {q.timeLimit}s
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Leaderboard Monitoring */}
        <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-300">
              Live Standings ({snapshot.leaderboard.length} Players)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Rank</th>
                  <th className="py-2.5 px-3">Player</th>
                  <th className="py-2.5 px-3">Balance</th>
                  <th className="py-2.5 px-3">Correct / Wrong</th>
                  <th className="py-2.5 px-3">Refills</th>
                  <th className="py-2.5 px-3">Net Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-medium">
                {snapshot.leaderboard.map((p) => (
                  <tr key={p.gamePlayerId} className="hover:bg-zinc-800/50 text-zinc-300">
                    <td className="py-3 px-3 font-mono font-bold text-white">#{p.rank}</td>
                    <td className="py-3 px-3 font-bold text-white">{p.displayName}</td>
                    <td className="py-3 px-3 font-mono text-amber-400 font-bold">
                      {formatPoints(p.balance)}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      <span className="text-emerald-400 font-bold">{p.totalCorrect}</span> /{" "}
                      <span className="text-rose-400 font-bold">{p.totalWrong}</span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 font-mono">
                      {p.refillCount} (-{formatPoints(p.refillFees)})
                    </td>
                    <td className="py-3 px-3 font-mono font-black text-emerald-400">
                      {formatPoints(p.netScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Question Modal (with Single & Bulk JSON Tabs) */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Add Questions
              </h3>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex border-b border-zinc-800 shrink-0 bg-zinc-950/60">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("bulk");
                  setModalError(null);
                }}
                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all flex items-center justify-center gap-2 ${
                  activeTab === "bulk"
                    ? "border-amber-400 text-amber-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <span>JSON Bulk Upload</span>
                {bulkValidation.isValid && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] font-mono">
                    {bulkValidation.questions.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("single");
                  setModalError(null);
                }}
                className={`flex-1 py-3 px-4 text-xs font-black uppercase tracking-wider text-center border-b-2 transition-all ${
                  activeTab === "single"
                    ? "border-amber-400 text-amber-400 bg-zinc-900/40"
                    : "border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Single Question
              </button>
            </div>

            {/* Error Message Alert */}
            {modalError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <span className="font-bold text-rose-400">!</span>
                <span>{modalError}</span>
              </div>
            )}

            {/* Tab 1: Bulk JSON Upload */}
            {activeTab === "bulk" && (
              <form onSubmit={handleBulkSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                {/* Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                    >
                      📁 Upload .json File
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBulkJsonText(JSON.stringify(SAMPLE_QUESTIONS_TEMPLATE, null, 2));
                        setModalError(null);
                      }}
                      className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                    >
                      ↺ Load 10-Question Example
                    </button>

                    <button
                      type="button"
                      onClick={() => setBulkJsonText("")}
                      className="h-8 px-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs font-bold transition-colors"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Live Validation Indicator */}
                  <div>
                    {bulkValidation.isValid ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-400 text-xs font-bold">
                        <span>✓</span> {bulkValidation.questions.length} Questions Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold">
                        <span>✕</span> {bulkValidation.error ? "Syntax / Format Error" : "Waiting for JSON"}
                      </span>
                    )}
                  </div>
                </div>

                {/* JSON Textarea */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1.5 uppercase tracking-wider">
                    Questions JSON Payload
                  </label>
                  <textarea
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    rows={9}
                    placeholder={`{\n  "questions": [\n    {\n      "questionText": "What is the capital of France?",\n      "options": ["Paris", "Berlin", "Rome", "Madrid"],\n      "correctAnswer": "Paris",\n      "countdownSeconds": 30,\n      "explanation": "Paris is the capital of France."\n    }\n  ]\n}`}
                    className="w-full px-3.5 py-3 rounded-xl bg-zinc-900 border border-zinc-700 font-mono text-xs text-zinc-200 outline-none focus:border-amber-400 leading-relaxed resize-y"
                  />
                  {!bulkValidation.isValid && bulkValidation.error && (
                    <p className="text-[11px] text-rose-400 mt-1 font-mono">{bulkValidation.error}</p>
                  )}
                </div>

                {/* Live Question Preview Accordion */}
                {bulkValidation.isValid && bulkValidation.questions.length > 0 && (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                        Questions Preview ({bulkValidation.questions.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowPreviewList(!showPreviewList)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200 font-bold uppercase"
                      >
                        {showPreviewList ? "Collapse ▲" : "Expand ▼"}
                      </button>
                    </div>

                    {showPreviewList && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {bulkValidation.questions.map((q, idx) => (
                          <div
                            key={idx}
                            className="p-2 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-zinc-200 truncate flex-1">
                              <strong className="text-amber-400 mr-1.5 font-mono">#{idx + 1}</strong>
                              {q.questionText}
                            </span>
                            <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700/60 text-emerald-400 font-mono text-[10px] font-bold">
                              ✓ {q.correctAnswer}
                            </span>
                            <span className="shrink-0 text-zinc-500 font-mono text-[10px]">
                              ⏱ {q.countdownSeconds}s
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Bottom Action Buttons */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkValidation.isValid || submittingBulk}
                    className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-zinc-950 text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-400/10"
                  >
                    {submittingBulk
                      ? "Importing Questions..."
                      : `Import ${bulkValidation.questions.length} Questions`}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Single Question Form */}
            {activeTab === "single" && (
              <form onSubmit={handleSingleSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase tracking-wider">
                    Question Text
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    required
                    rows={2}
                    placeholder="Enter trivia question..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase tracking-wider">
                    Options (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    required
                    placeholder="Paris, Berlin, Rome, Madrid"
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase tracking-wider">
                      Exact Correct Answer
                    </label>
                    <input
                      type="text"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      required
                      placeholder="Matches one option exactly"
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase tracking-wider">
                      Countdown Seconds
                    </label>
                    <input
                      type="number"
                      value={countdownSeconds}
                      min={5}
                      max={180}
                      onChange={(e) => setCountdownSeconds(parseInt(e.target.value, 10))}
                      className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 font-mono text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1 uppercase tracking-wider">
                    Explanation (Optional)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Brief reason for the answer"
                    className="w-full h-10 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSingle}
                    className="flex-1 h-11 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-amber-400/10"
                  >
                    {submittingSingle ? "Saving Question..." : "Add Question"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Game Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-zinc-950 border border-rose-800/80 p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-700 text-rose-400 flex items-center justify-center text-2xl mx-auto mb-4 font-bold shadow-lg shadow-rose-950/50">
              ⚠
            </div>
            <h3 className="text-base font-black text-center uppercase tracking-wider text-white">
              Reset Entire Game?
            </h3>
            <p className="text-xs text-zinc-400 text-center mt-2 leading-relaxed">
              This will wipe all player entries, bets, refills, and scores from the database.
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span>✓</span>
                <span>All {snapshot.totalQuestions} questions & options are PRESERVED</span>
              </div>
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <span>✕</span>
                <span>All {snapshot.totalPlayers} player balances & submissions will be REMOVED</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400 font-bold">
                <span>↺</span>
                <span>Game status resets to LOBBY ready for fresh play</span>
              </div>
            </div>

            <div className="flex gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={resetting}
                className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetGame}
                disabled={resetting}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-rose-600/20"
              >
                {resetting ? "Resetting..." : "Yes, Reset Everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
