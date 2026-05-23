"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/primitives";
import { proxyFetch } from "@/lib/clientFetch";

type State = "idle" | "recording" | "processing" | "error";

/**
 * Mic button that records browser audio via MediaRecorder and POSTs the clip
 * to /api/transcribe. On success it calls `onTranscript` with the text so the
 * parent can drop it into the goal input. The text input remains usable —
 * this is purely additive.
 */
export default function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      // Prefer webm/opus where supported (Chrome/Firefox); Safari falls through
      // to its default mp4/aac container, which Whisper also accepts.
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        void upload(rec.mimeType || "audio/webm");
      };
      recorderRef.current = rec;
      rec.start();
      setState("recording");
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } catch (err) {
      setState("error");
      setError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Mic permission denied"
          : err instanceof Error
          ? err.message
          : "Could not access mic",
      );
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState("processing");
    stopStream();
  }

  async function upload(mimeType: string) {
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      if (blob.size === 0) {
        setState("idle");
        return;
      }
      const form = new FormData();
      const ext = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
      form.append("file", blob, `clip.${ext}`);
      const res = await proxyFetch("/transcribe", { method: "POST", body: form });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || `Transcribe ${res.status}`);
      }
      const data = (await res.json()) as { text: string };
      if (data.text) onTranscript(data.text);
      setState("idle");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Transcription failed");
    }
  }

  const isBusy = state === "recording" || state === "processing";
  const onClick = () => {
    if (disabled) return;
    if (state === "recording") return stop();
    if (state === "processing") return;
    setError(null);
    if (state === "error") {
      setState("idle");
      return;
    }
    void start();
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === "processing"}
        aria-label={state === "recording" ? "Stop recording" : "Start voice input"}
        title={state === "recording" ? "Stop recording" : "Speak your goal"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 999,
          border: "none",
          cursor: disabled || state === "processing" ? "default" : "pointer",
          fontSize: 12,
          fontFamily: "var(--mono)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color:
            state === "recording"
              ? "#fca5a5"
              : state === "processing"
              ? "#a5b4fc"
              : "var(--text-mid)",
          background:
            state === "recording"
              ? "rgba(248,113,113,0.12)"
              : state === "processing"
              ? "rgba(99,102,241,0.12)"
              : "var(--bg-2)",
          boxShadow:
            state === "recording"
              ? "inset 0 0 0 1px rgba(248,113,113,0.4)"
              : state === "processing"
              ? "inset 0 0 0 1px rgba(99,102,241,0.4)"
              : "inset 0 0 0 1px var(--border)",
          opacity: disabled ? 0.5 : 1,
          transition: "all .2s ease",
        }}
      >
        {state === "recording" ? (
          <>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "#f87171",
                animation: "pulseDot 1s ease-in-out infinite",
              }}
            />
            Recording · {elapsed}s · tap to stop
          </>
        ) : state === "processing" ? (
          <>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                border: "2px solid rgba(165,180,252,0.4)",
                borderTopColor: "#a5b4fc",
                animation: "spin 0.8s linear infinite",
                display: "inline-block",
              }}
            />
            Transcribing…
          </>
        ) : (
          <>
            <Icon name="sparkles" size={12} /> Speak your goal
          </>
        )}
      </button>
      {error && state === "error" && (
        <div
          role="alert"
          onClick={() => {
            setError(null);
            setState("idle");
          }}
          style={{
            fontSize: 11,
            color: "#fca5a5",
            padding: "4px 8px",
            borderRadius: 6,
            background: "rgba(248,113,113,0.08)",
            boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
            cursor: "pointer",
            maxWidth: 280,
            textAlign: "right",
          }}
        >
          {error} · tap to dismiss
        </div>
      )}
      <style>{`
        @keyframes pulseDot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.55;transform:scale(.85)} }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
