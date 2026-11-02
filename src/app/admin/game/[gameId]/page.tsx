"use client";

import React, { useState, use, useMemo, useRef } from "react";
import Link from "next/link";
import { Navbar } from "@/components/common/Navbar";
import { useAdminRealtime } from "@/lib/hooks/useAdminRealtime";
import { useAuthoritativeTimer } from "@/lib/hooks/useAuthoritativeTimer";
import { formatPoints, formatCountdown } from "@/lib/utils/format";
import {
  RotateCw,
  Play,
  ChevronDown,
  ArrowRight,
  RotateCcw,
  Plus,
  Download,
  Gamepad2,
  Users,
  BookOpen,
  Flag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  X,
  FileText,
  Check,
  ExternalLink,
  Timer,
  Trophy,
  Upload,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"single" | "bulk">("single");
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
      <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
        <Navbar variant="host" />
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-3 border-[#6C5CE7] border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-xs text-[#6B6A78] font-bold">Loading host console...</p>
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
        <Navbar variant="host" />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="p-8 rounded-3xl bg-white border border-[#EAE7F2] shadow-xl text-center max-w-sm">
            <h2 className="text-lg font-black text-[#191820]">Game Not Found</h2>
            <Link
              href="/admin"
              className="mt-4 inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#FF7417] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:bg-[#e6640e] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Admin</span>
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
    <div className="min-h-screen flex flex-col bg-[#F7F6F2] text-[#191820]">
      <Navbar variant="host" currentGameCode={snapshot.gameCode} gameTitle={snapshot.title} />

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-2xl bg-[#EAF9F2] border border-[#A7F3D0] text-[#22B978] text-xs font-black shadow-xl flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-[#22B978] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Top Control Bar (Matching Screenshots 5, 8, 14) */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-[#EAE7F2]">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="px-3 py-2 rounded-xl bg-white hover:bg-[#F0EEFF] border border-[#EAE7F2] text-[#191820] text-xs font-bold transition-all shadow-sm inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#6C5CE7]" />
              <span>Back</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xl font-black text-[#FF7417] tracking-wider">
                  {snapshot.gameCode}
                </span>
                <span className="text-[#DDD6FE] font-bold">•</span>
                <h1 className="text-base sm:text-lg font-black text-[#191820] truncate max-w-md uppercase">
                  {snapshot.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-[11px] text-[#6B6A78] font-mono">ID: {snapshot.gameId}</p>
                {lastUpdated && (
                  <span className="text-[11px] text-[#A09EB1] font-mono">
                    • Synced: {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Host Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
            {/* On-Demand Refresh Button */}
            <button
              onClick={refetch}
              disabled={isRefreshing}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] border border-[#DDD6FE] text-[#6C5CE7] text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50 shrink-0"
              title="Pull fresh authoritative game state from database"
            >
              <RotateCw className={`w-3.5 h-3.5 shrink-0 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>{isRefreshing ? "Refreshing..." : "Refresh Status"}</span>
            </button>

            {isDraft && (
              <button
                onClick={() => executeAction("OPEN_LOBBY")}
                disabled={Boolean(actionLoading)}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#6C5CE7] hover:bg-[#5b4cdb] text-white font-black text-xs uppercase tracking-wider transition-all shadow-sm active:scale-95 shrink-0"
              >
                OPEN LOBBY
              </button>
            )}

            {(isDraft || isLobby) && (
              <button
                onClick={() => executeAction("START_GAME")}
                disabled={Boolean(actionLoading) || snapshot.totalQuestions === 0}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#22B978] hover:bg-[#1fa36a] disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
                title="Start quiz! Questions will automatically progress sequentially"
              >
                <Play className="w-3.5 h-3.5 shrink-0 fill-current" />
                <span>START GAME</span>
              </button>
            )}

            {isLive && (
              <button
                onClick={() => executeAction("CLOSE_QUESTION")}
                disabled={Boolean(actionLoading)}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <span>CLOSE QUESTION</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}

            {isClosed && snapshot.currentQuestionIndex < snapshot.totalQuestions && (
              <button
                onClick={() => executeAction("NEXT_QUESTION")}
                disabled={Boolean(actionLoading)}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <span>Next Round</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}

            {isClosed && snapshot.currentQuestionIndex >= snapshot.totalQuestions && !isFinished && (
              <button
                onClick={() => executeAction("FINISH_GAME")}
                disabled={Boolean(actionLoading)}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#6C5CE7] hover:bg-[#5b4cdb] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 shrink-0"
              >
                Finalize & Finish Game
              </button>
            )}

            {/* Reset Game Button */}
            <button
              onClick={() => setShowResetConfirmModal(true)}
              disabled={Boolean(actionLoading)}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-[#FDEEEC] hover:bg-[#FCA5A5]/30 border border-[#FCA5A5] text-[#EF5350] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              title="Reset entire game: clear players and scores, keep all questions"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>RESET GAME</span>
            </button>

            {(isDraft || isLobby) && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowAddQuestionModal(true);
                }}
                className="h-9 sm:h-10 px-3.5 sm:px-4 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md active:scale-95 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>ADD QUESTIONS</span>
              </button>
            )}

            <button
              onClick={exportResults}
              className="h-9 sm:h-10 px-3 sm:px-3.5 rounded-xl bg-white hover:bg-[#F0EEFF] border border-[#EAE7F2] text-[#6C5CE7] text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0"
              title="Export Results JSON"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* 4 Metric Cards Strip (Matching Screenshots 5, 8, 14) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 my-5 sm:my-6">
          {/* Card 1: Game Status */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] text-[#6B6A78] font-black uppercase tracking-wider block truncate">
                GAME STATUS
              </span>
              <span className="inline-block mt-0.5 truncate max-w-full">
                {isLive ? (
                  <span className="text-[11px] sm:text-xs font-black text-[#6C5CE7] uppercase font-mono">
                    QUESTION ACTIVE
                  </span>
                ) : isLobby ? (
                  <span className="text-[11px] sm:text-xs font-black text-[#22B978] uppercase font-mono">
                    LOBBY
                  </span>
                ) : (
                  <span className="text-[11px] sm:text-xs font-black text-[#6C5CE7] uppercase font-mono">
                    {snapshot.status.replace("_", " ")}
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Card 2: Players */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] text-[#6B6A78] font-black uppercase tracking-wider block truncate">
                PLAYERS
              </span>
              <span className="text-[11px] sm:text-sm font-black text-[#FF7417] mt-0.5 block font-mono truncate">
                {snapshot.totalPlayers} Joined ({snapshot.activePlayers} Active)
              </span>
            </div>
          </div>

          {/* Card 3: Submissions */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] text-[#6B6A78] font-black uppercase tracking-wider block truncate">
                SUBMISSIONS
              </span>
              <span className="text-[11px] sm:text-sm font-black text-[#22B978] mt-0.5 block font-mono truncate">
                {snapshot.submissionCount} Locked / {snapshot.unsubmittedCount} Pending
              </span>
            </div>
          </div>

          {/* Card 4: Current Round */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center shrink-0">
              <Flag className="w-4 h-4 sm:w-5 sm:h-5 text-[#6C5CE7]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] sm:text-[10px] text-[#6B6A78] font-black uppercase tracking-wider block truncate">
                CURRENT ROUND
              </span>
              <span className="text-[11px] sm:text-sm font-black text-[#191820] mt-0.5 block font-mono truncate">
                {snapshot.currentQuestionIndex} / {snapshot.totalQuestions}
              </span>
            </div>
          </div>
        </div>

        {/* Active Question Details Card (Matching Screenshot 8) */}
        {snapshot.currentQuestion && (
          <div className="mb-6 p-6 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-[#EAE7F2]">
              <span className="px-3.5 py-1 rounded-full bg-[#6C5CE7] text-white text-xs font-black uppercase tracking-wider">
                ROUND {snapshot.currentQuestion.order} OF {snapshot.totalQuestions}
              </span>

              {isLive && (
                <div className="px-3.5 py-1 rounded-full bg-[#FFF3E8] border border-[#FFD9BE] text-[#FF7417] font-mono text-xs font-black flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5 text-[#FF7417]" />
                  <span>{formatCountdown(secondsRemaining)}</span>
                </div>
              )}
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-[#191820] mt-4 mb-5 leading-snug">
              {snapshot.currentQuestion.questionText}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {(snapshot.currentQuestion.options as string[]).map((opt, i) => {
                const isCorrect = opt === snapshot.currentQuestion?.correctAnswer;
                return (
                  <div
                    key={opt}
                    className={`p-4 rounded-2xl border flex items-center justify-between font-bold transition-all ${
                      isCorrect
                        ? "bg-[#EAF9F2] border-[#22B978] text-[#22B978]"
                        : "bg-white border-[#EAE7F2] text-[#191820]"
                    }`}
                  >
                    <span>
                      <strong className="mr-2 text-[#6C5CE7]">{String.fromCharCode(65 + i)}.</strong>
                      {opt}
                    </span>
                    {isCorrect && (
                      <span className="text-[11px] uppercase font-black text-white bg-[#22B978] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Check className="w-3 h-3 text-white" />
                        <span>CORRECT ANSWER</span>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {snapshot.currentQuestion.explanation && (
              <p className="text-xs text-[#6B6A78] mt-4 border-t border-[#EAE7F2] pt-3 leading-relaxed">
                <strong className="text-[#6C5CE7] font-bold">Explanation: </strong>
                {snapshot.currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {/* Queued Questions List (Matching Screenshots 5 & 14) */}
        <div className="mb-6 p-6 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-[#6C5CE7] rounded-full" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#191820]">
                  GAME QUESTIONS ({snapshot.questions?.length ?? snapshot.totalQuestions} QUEUED)
                </h3>
                <p className="text-xs text-[#6B6A78] mt-0.5">
                  Questions will be presented to players in sequence during game rounds.
                </p>
              </div>
            </div>
            {(isDraft || isLobby) && (
              <button
                onClick={() => {
                  setModalError(null);
                  setShowAddQuestionModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More</span>
              </button>
            )}
          </div>

          {(!snapshot.questions || snapshot.questions.length === 0) ? (
            <div className="py-12 text-center rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2]">
              <div className="w-14 h-14 rounded-2xl bg-[#F0EEFF] text-[#6C5CE7] flex items-center justify-center mx-auto mb-3">
                <FileText className="w-7 h-7 text-[#6C5CE7]" />
              </div>
              <p className="text-sm font-bold text-[#191820]">No questions added to this game yet.</p>
              {(isDraft || isLobby) && (
                <button
                  onClick={() => {
                    setModalError(null);
                    setShowAddQuestionModal(true);
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider shadow-md active:scale-95 inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD QUESTIONS NOW</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {snapshot.questions.map((q) => (
                <div
                  key={q.id}
                  className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <span className="w-8 h-8 rounded-full bg-[#F0EEFF] border border-[#DDD6FE] font-mono font-black text-[#6C5CE7] flex items-center justify-center shrink-0 text-xs">
                      {q.order}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-extrabold text-[#191820] text-sm truncate">{q.questionText}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-[#6B6A78]">
                        <span>Options: {q.options.join(" • ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center font-mono">
                    <span className="px-3 py-1 rounded-full bg-[#EAF9F2] border border-[#A7F3D0] text-[#22B978] font-bold text-[11px]">
                      Ans: {q.correctAnswer}
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-[#F0EEFF] border border-[#DDD6FE] text-[#6C5CE7] text-[11px] font-bold flex items-center gap-1">
                      <Timer className="w-3 h-3 text-[#6C5CE7]" />
                      <span>{q.timeLimit}s</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Standings Table (Matching Screenshots 12 & 14) */}
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#EAE7F2] shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-5 h-5 text-[#6C5CE7]" />
            <h3 className="text-sm font-black uppercase tracking-wider text-[#191820]">
              LIVE STANDINGS ({snapshot.leaderboard.length} PLAYERS)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-[#F0EEFF] text-[#6C5CE7] uppercase tracking-wider font-extrabold rounded-xl">
                  <th className="py-3 px-4 rounded-l-xl">RANK</th>
                  <th className="py-3 px-4">PLAYER</th>
                  <th className="py-3 px-4">BALANCE</th>
                  <th className="py-3 px-4">CORRECT / WRONG</th>
                  <th className="py-3 px-4">REFILLS</th>
                  <th className="py-3 px-4 rounded-r-xl">NET SCORE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE7F2] font-semibold">
                {snapshot.leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#6B6A78] italic">
                      Waiting for players to join
                    </td>
                  </tr>
                ) : (
                  snapshot.leaderboard.map((p) => (
                    <tr key={p.gamePlayerId} className="hover:bg-[#F7F6F2] text-[#191820]">
                      <td className="py-3.5 px-4 font-mono font-black text-[#6C5CE7]">#{p.rank}</td>
                      <td className="py-3.5 px-4 font-bold text-[#191820]">{p.displayName}</td>
                      <td className="py-3.5 px-4 font-mono text-[#FF7417] font-black text-sm">
                        ₹{formatPoints(p.balance)}
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span className="text-[#22B978] font-bold">{p.totalCorrect}</span> /{" "}
                        <span className="text-[#EF5350] font-bold">{p.totalWrong}</span>
                      </td>
                      <td className="py-3.5 px-4 text-[#6B6A78] font-mono">
                        {p.refillCount}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-black text-[#22B978] text-sm">
                        ₹{formatPoints(p.netScore)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add Question Modal (Matching Screenshot 15) */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191820]/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white border border-[#EAE7F2] shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#EAE7F2] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6C5CE7] text-white flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-base font-black text-[#191820]">
                  Add questions
                </h3>
              </div>
              <button
                onClick={() => setShowAddQuestionModal(false)}
                className="w-8 h-8 rounded-xl bg-[#F0EEFF] text-[#6C5CE7] hover:bg-[#E9E5FF] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab Switcher (Matching Screenshot 15) */}
            <div className="flex gap-2 p-4 bg-[#F7F6F2] border-b border-[#EAE7F2] shrink-0">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("bulk");
                  setModalError(null);
                }}
                className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                  activeTab === "bulk"
                    ? "bg-[#6C5CE7] text-white shadow-sm"
                    : "bg-[#F0EEFF] text-[#6C5CE7] hover:bg-[#E9E5FF]"
                }`}
              >
                <span>JSON BULK UPLOAD</span>
                <span className="px-2 py-0.5 rounded-full bg-[#FF7417] text-white text-[10px] font-mono font-black">
                  10
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("single");
                  setModalError(null);
                }}
                className={`flex-1 py-2.5 px-4 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center ${
                  activeTab === "single"
                    ? "bg-[#6C5CE7] text-white shadow-sm"
                    : "bg-[#F0EEFF] text-[#6C5CE7] hover:bg-[#E9E5FF]"
                }`}
              >
                SINGLE QUESTION
              </button>
            </div>

            {/* Error Message Alert */}
            {modalError && (
              <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF5350] shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            {/* Tab 1: Bulk JSON Upload */}
            {activeTab === "bulk" && (
              <form onSubmit={handleBulkSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                      className="h-9 px-3 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] border border-[#DDD6FE] text-[#6C5CE7] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload .json File</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setBulkJsonText(JSON.stringify(SAMPLE_QUESTIONS_TEMPLATE, null, 2));
                        setModalError(null);
                      }}
                      className="h-9 px-3 rounded-xl bg-[#F0EEFF] hover:bg-[#E9E5FF] border border-[#DDD6FE] text-[#6C5CE7] text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Load 5-Question Template</span>
                    </button>
                  </div>

                  <div>
                    {bulkValidation.isValid ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF9F2] border border-[#A7F3D0] text-[#22B978] text-xs font-bold">
                        <Check className="w-3.5 h-3.5 text-[#22B978]" />
                        <span>{bulkValidation.questions.length} Ready</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] text-xs font-bold">
                        <X className="w-3.5 h-3.5 text-[#EF5350]" />
                        <span>{bulkValidation.error ? "Format Error" : "Waiting for JSON"}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#191820] mb-1.5 uppercase tracking-wider">
                    QUESTIONS JSON PAYLOAD
                  </label>
                  <textarea
                    value={bulkJsonText}
                    onChange={(e) => setBulkJsonText(e.target.value)}
                    rows={8}
                    placeholder={`{\n  "questions": [\n    {\n      "questionText": "What is the capital of France?",\n      "options": ["Paris", "Berlin", "Rome", "Madrid"],\n      "correctAnswer": "Paris",\n      "countdownSeconds": 30,\n      "explanation": "Paris is the capital of France."\n    }\n  ]\n}`}
                    className="w-full px-4 py-3 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] font-mono text-xs text-[#191820] outline-none focus:border-[#6C5CE7] leading-relaxed resize-y"
                  />
                  {!bulkValidation.isValid && bulkValidation.error && (
                    <p className="text-[11px] text-[#EF5350] mt-1 font-mono font-bold">{bulkValidation.error}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#EAE7F2]">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="flex-1 h-12 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!bulkValidation.isValid || submittingBulk}
                    className="flex-1 h-12 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    {submittingBulk
                      ? "Importing Questions..."
                      : `Import ${bulkValidation.questions.length} Questions`}
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Single Question Form (Matching Screenshot 15) */}
            {activeTab === "single" && (
              <form onSubmit={handleSingleSubmit} className="flex-1 flex flex-col p-6 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#191820] mb-1.5 uppercase tracking-wider">
                    QUESTION TEXT
                  </label>
                  <textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    required
                    rows={2}
                    placeholder="Enter trivia question..."
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-xs font-bold text-[#191820] outline-none focus:border-[#6C5CE7] placeholder:text-[#A09EB1]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-[#191820] mb-1.5 uppercase tracking-wider">
                    OPTIONS (COMMA-SEPARATED)
                  </label>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    required
                    placeholder="Paris, Berlin, Rome, Madrid"
                    className="w-full h-11 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-xs font-bold text-[#191820] outline-none focus:border-[#6C5CE7] placeholder:text-[#A09EB1]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-[#191820] mb-1.5 uppercase tracking-wider">
                      EXACT CORRECT ANSWER
                    </label>
                    <input
                      type="text"
                      value={correctAnswer}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      required
                      placeholder="Paris"
                      className="w-full h-11 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-xs font-bold text-[#191820] outline-none focus:border-[#6C5CE7] placeholder:text-[#A09EB1]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-[#191820] mb-1.5 uppercase tracking-wider">
                      COUNTDOWN SECONDS
                    </label>
                    <input
                      type="number"
                      value={countdownSeconds}
                      min={5}
                      max={180}
                      onChange={(e) => setCountdownSeconds(parseInt(e.target.value, 10))}
                      className="w-full h-11 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] font-mono text-xs font-bold text-[#191820] outline-none focus:border-[#6C5CE7]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#191820] mb-1.5 uppercase tracking-wider">
                    EXPLANATION (OPTIONAL)
                  </label>
                  <input
                    type="text"
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Brief reason for the answer"
                    className="w-full h-11 px-4 rounded-2xl bg-[#F4F1FF] border border-[#DDD6FE] text-xs font-bold text-[#191820] outline-none focus:border-[#6C5CE7] placeholder:text-[#A09EB1]"
                  />
                </div>

                <div className="flex gap-3 pt-3 border-t border-[#EAE7F2]">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionModal(false)}
                    className="flex-1 h-12 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingSingle}
                    className="flex-1 h-12 rounded-2xl bg-[#FF7417] hover:bg-[#e6640e] text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                  >
                    {submittingSingle ? "Saving..." : "+ Add question"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Reset Game Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#191820]/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#EAE7F2] p-7 shadow-2xl relative text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FDEEEC] border border-[#FCA5A5] text-[#EF5350] flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-[#EF5350]" />
            </div>
            <h3 className="text-xl font-black text-[#191820] uppercase tracking-tight">
              Reset Entire Game?
            </h3>
            <p className="text-xs text-[#6B6A78] mt-2 leading-relaxed">
              This will wipe all player entries, bets, refills, and scores from the database.
            </p>

            <div className="mt-5 p-4 rounded-2xl bg-[#F7F6F2] border border-[#EAE7F2] text-xs space-y-2.5 text-left">
              <div className="flex items-center gap-2 text-[#22B978] font-bold">
                <Check className="w-4 h-4 text-[#22B978] shrink-0" />
                <span>All {snapshot.totalQuestions} questions & options are PRESERVED</span>
              </div>
              <div className="flex items-center gap-2 text-[#EF5350] font-bold">
                <X className="w-4 h-4 text-[#EF5350] shrink-0" />
                <span>All {snapshot.totalPlayers} player balances & submissions will be REMOVED</span>
              </div>
              <div className="flex items-center gap-2 text-[#6C5CE7] font-bold">
                <RotateCcw className="w-4 h-4 text-[#6C5CE7] shrink-0" />
                <span>Game status resets to LOBBY ready for fresh play</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={resetting}
                className="flex-1 h-12 rounded-2xl bg-[#F0EEFF] hover:bg-[#E9E5FF] text-[#6C5CE7] text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetGame}
                disabled={resetting}
                className="flex-1 h-12 rounded-2xl bg-[#EF5350] hover:bg-[#dc2626] disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
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
