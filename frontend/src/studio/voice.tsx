import { useEffect, useRef, useState } from "react";
import { Notice } from "./ui";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult:
    | ((event: {
        results: {
          [index: number]: {
            isFinal: boolean;
            [index: number]: { transcript: string };
          };
          length: number;
        };
        resultIndex: number;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function VoiceControls({
  onTranscript,
  lastReply,
  disabled = false,
}: {
  onTranscript: (text: string) => void;
  lastReply: string;
  disabled?: boolean;
}) {
  const [consent, setConsent] = useState(false),
    [listening, setListening] = useState(false),
    [error, setError] = useState(""),
    [latency, setLatency] = useState<number | null>(null),
    [speaking, setSpeaking] = useState(false);
  const recognition = useRef<Recognition | null>(null),
    started = useRef(0);
  const speech =
    typeof window !== "undefined" ? (window as SpeechWindow) : null;
  const Constructor =
    speech?.SpeechRecognition || speech?.webkitSpeechRecognition;
  useEffect(
    () => () => {
      recognition.current?.abort();
      window.speechSynthesis?.cancel();
    },
    [],
  );
  function listen() {
    if (listening) {
      recognition.current?.stop();
      return;
    }
    if (!Constructor || !consent) return;
    const current = new Constructor();
    recognition.current = current;
    current.lang = "en-IN";
    current.continuous = false;
    current.interimResults = false;
    current.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++)
        if (event.results[i].isFinal) {
          onTranscript(event.results[i][0].transcript);
          setLatency(Math.round(performance.now() - started.current));
        }
    };
    current.onerror = (event) => {
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. Type your response below, or allow access in browser settings."
          : `Speech recognition stopped (${event.error}). Retry or use typed chat.`,
      );
      setListening(false);
    };
    current.onend = () => setListening(false);
    try {
      setError("");
      started.current = performance.now();
      current.start();
      setListening(true);
    } catch {
      setError("Voice could not start. Typed chat remains available.");
    }
  }
  function speak() {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speaking) {
      setSpeaking(false);
      return;
    }
    const text = new SpeechSynthesisUtterance(lastReply);
    text.onend = () => setSpeaking(false);
    text.onerror = () => {
      setSpeaking(false);
      setError("Audio playback failed. Read the transcript instead.");
    };
    setSpeaking(true);
    window.speechSynthesis.speak(text);
  }
  return (
    <details className="st-voice">
      <summary>Optional voice controls</summary>
      <label>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => {
            setConsent(e.target.checked);
            if (!e.target.checked) {
              recognition.current?.abort();
              window.speechSynthesis?.cancel();
              setSpeaking(false);
            }
          }}
        />
        I agree to use my browser’s speech service. Audio may be processed by
        its provider; Coding Hubs does not record or retain audio.
      </label>
      <div className="st-actions">
        <button
          disabled={!Constructor || !consent || disabled}
          onClick={listen}
        >
          {listening ? "Stop microphone" : "Dictate a response"}
        </button>
        <button
          disabled={!consent || !lastReply || !speech?.speechSynthesis}
          onClick={speak}
        >
          {speaking ? "Stop playback" : "Read last reply"}
        </button>
      </div>
      {!Constructor && (
        <p className="st-fine">
          Speech recognition is unavailable in this browser. Typed chat is ready
          below.
        </p>
      )}
      {latency !== null && (
        <p className="st-fine">
          Last recognition turn: {latency} ms from microphone start.
        </p>
      )}
      {error && <Notice error>{error}</Notice>}
    </details>
  );
}
