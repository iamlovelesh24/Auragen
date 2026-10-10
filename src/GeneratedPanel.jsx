import React, { useState, useEffect, useRef } from "react";
import * as Babel from "@babel/standalone";
import LLMFallbackBoundary from "../LLMFallbackBoundary";

const API =
  import.meta.env.VITE_API_URL || "http://localhost:8000/generate";

const SCORE_NORMAL = 20;
const SCORE_OVERLOADED = 85;

function useTailwindCdn() {
  useEffect(() => {
    if (document.getElementById("tw-cdn")) return;

    const s = document.createElement("script");
    s.id = "tw-cdn";
    s.src = "https://cdn.tailwindcss.com";
    s.async = true;

    document.head.appendChild(s);

    return () => {};
  }, []);
}

function compileTsx(tsx) {
  const { code } = Babel.transform(tsx, {
    filename: "Generated.tsx",
    presets: [
      "typescript",
      ["react", { runtime: "classic" }],
    ],
    plugins: ["transform-modules-commonjs"],
  });

  const module = { exports: {} };

  const requireShim = (name) => {
    if (name === "react") return React;

    throw new Error(`Import not allowed: ${name}`);
  };

  new Function(
    "React",
    "require",
    "module",
    "exports",
    code
  )(
    React,
    requireShim,
    module,
    module.exports
  );

  if (
    typeof module.exports.default !== "function"
  ) {
    throw new Error(
      "Generated code has no default component export"
    );
  }

  return module.exports.default;
}

export default function GeneratedPanel({
  isOverloaded,
  fieldName = "email",
  originalFieldType = "text",
}) {
  useTailwindCdn();

  const [status, setStatus] = useState("idle");
  const [Comp, setComp] = useState(null);
  const [genId, setGenId] = useState(0);
  const [error, setError] = useState("");
  const [times, setTimes] = useState({});
  const [submitted, setSubmitted] = useState(null);
  const [capturedValues, setCapturedValues] = useState({});

  /*
   * Capture the original DOM only once.
   *
   * This keeps the backend cache key stable
   * between repeated generation requests.
   */
  const originalDomSnapshot = useRef(null);

  /*
   * Store generation start time separately so
   * React re-renders do not affect measurements.
   */
  const generationStartRef = useRef(null);

  /*
   * Prevent render time from being measured more
   * than once for a generation.
   */
  const renderMeasuredRef = useRef(false);

  useEffect(() => {
    if (originalDomSnapshot.current === null) {
      originalDomSnapshot.current =
        document.documentElement.outerHTML;
    }
  }, []);

  useEffect(() => {
    if (
      Comp &&
      times.compiled !== undefined &&
      generationStartRef.current !== null &&
      !renderMeasuredRef.current
    ) {
      renderMeasuredRef.current = true;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const rendered =
            performance.now() -
            generationStartRef.current;

          setTimes((t) => ({
            ...t,
            rendered,
          }));
        });
      });
    }
  }, [Comp, times.compiled]);

  async function generate() {
    setStatus("generating");
    setError("");
    setComp(null);
    setSubmitted(null);

    const t0 = performance.now();

    generationStartRef.current = t0;
    renderMeasuredRef.current = false;

    const t = {
      t0,
      firstChunk: undefined,
      final: undefined,
      compiled: undefined,
      rendered: undefined,
    };

    try {
      /*
       * Capture current field values at generation time.
       */
      const values = {};

      document
        .querySelectorAll(
          "input, textarea, select"
        )
        .forEach((el) => {
          if (el.name) {
            values[el.name] = el.value;
          } else if (el.id) {
            values[el.id] = el.value;
          }
        });

      setCapturedValues(values);

      /*
       * Use the original DOM snapshot captured once,
       * rather than the dynamically changed DOM.
       */
      const domSnapshot =
        originalDomSnapshot.current ||
        document.documentElement.outerHTML;

      const cognitive_load_score = isOverloaded
        ? SCORE_OVERLOADED
        : SCORE_NORMAL;

      const signal_summary = isOverloaded
        ? "User appears overloaded and is struggling with the current field."
        : "User is operating normally.";

      const response = await fetch(API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cognitive_load_score,
          field_name: fieldName,
          signal_summary,
          original_field_type: originalFieldType,
          max_retries: 2,
          dom_snapshot: domSnapshot,
          field_values: values,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `AuraGen backend returned HTTP ${response.status}`
        );
      }

      if (!response.body) {
        throw new Error(
          "AuraGen backend returned no streaming response."
        );
      }

      const reader =
        response.body.getReader();

      const decoder = new TextDecoder();

      let buf = "";
      let final = null;

      while (true) {
        const { value, done } =
          await reader.read();

        if (done) {
          break;
        }

        buf += decoder.decode(value, {
          stream: true,
        });

        const parts = buf.split("\n\n");

        buf = parts.pop() || "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) {
            continue;
          }

          const ev = JSON.parse(
            part.slice(6)
          );

          if (
            ev.type === "chunk" &&
            t.firstChunk === undefined
          ) {
            t.firstChunk =
              performance.now() - t0;
          }

          if (ev.type === "final") {
            final = ev;
          }
        }
      }

      if (!final) {
        throw new Error(
          "Stream ended without a final event"
        );
      }

      t.final =
        performance.now() - t0;

      if (final.status !== "valid") {
        throw new Error(
          `${final.reason}: ${final.message}`
        );
      }

      /*
       * Compile and validate the generated TSX
       * before rendering it.
       */
      const C = compileTsx(final.tsx);

      t.compiled =
        performance.now() - t0;

      setTimes({
        ...t,
      });

      /*
       * Increment generation ID so the fallback
       * boundary gets a fresh generation identity.
       */
      setGenId((n) => n + 1);

      setComp(() => C);

      setStatus("done");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Cannot connect to AuraGen's backend. Please make sure the backend server is running on port 8000, then try again."
          : String(
              e.message || e
            )
      );

      setTimes({
        ...t,
      });

      setStatus("error");
    }
  }

  const f = (v) =>
    v === undefined
      ? "-"
      : `${(v / 1000).toFixed(2)}s`;

  return (
    <div
      style={{
        marginTop: 16,
      }}
    >
      <button
        onClick={generate}
        disabled={
          status === "generating"
        }
      >
        {status === "generating"
          ? "Generating..."
          : "Generate redesign"}
      </button>

      {error && (
        <p
          style={{
            color: "crimson",
          }}
        >
          Error: {error}
        </p>
      )}

      <p
        style={{
          fontSize: 12,
        }}
      >
        first chunk{" "}
        {f(times.firstChunk)}{" "}
        | validated final{" "}
        {f(times.final)}{" "}
        | compiled{" "}
        {f(times.compiled)}{" "}
        | rendered{" "}
        {f(times.rendered)}
      </p>

      {Comp && (
        <LLMFallbackBoundary
          key={genId}
          generationKey={genId}
        >
          <Comp
            initialValues={
              capturedValues
            }
            onNext={
              setSubmitted
            }
            onBack={() => {}}
          />
        </LLMFallbackBoundary>
      )}

      {submitted && (
        <p>
          onNext received:{" "}
          {String(submitted)}
        </p>
      )}
    </div>
  );
}