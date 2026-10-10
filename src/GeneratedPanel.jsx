import React, { useState, useEffect, useRef } from "react";
import * as Babel from "@babel/standalone";
import LLMFallbackBoundary from "../LLMFallbackBoundary";

const API = "http://localhost:8000/generate";

const SCORE_NORMAL = 20;
const SCORE_OVERLOADED = 85;

function useTailwindCdn() {
  useEffect(() => {
    if (document.getElementById("tw-cdn")) return;

    const s = document.createElement("script");
    s.id = "tw-cdn";
    s.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(s);
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
  const [error, setError] = useState(null);
  const [times, setTimes] = useState({});
  const [submitted, setSubmitted] = useState(null);

  const [capturedValues, setCapturedValues] = useState({});

  /*
   * Capture the original DOM only once.
   *
   * This keeps the cache key stable between repeated
   * generation requests.
   */
  const originalDomSnapshot = useRef(null);

  /*
   * Store the generation start time separately so that
   * React re-renders do not affect the measurement.
   */
  const generationStartRef = useRef(null);

  /*
   * Measure actual browser paint after the generated
   * component has been committed to the DOM.
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

  function captureContext() {
    const fieldValues = {};

    document
      .querySelectorAll(
        "input, textarea, select"
      )
      .forEach((field, index) => {
        const key =
          field.name ||
          field.id ||
          `field-${index}`;

        fieldValues[key] = field.value ?? "";
      });

    /*
     * Backend sanitizer expects an HTML string.
     *
     * Use the original DOM snapshot so repeated
     * generation requests can hit the cache.
     */
    const domSnapshot =
      originalDomSnapshot.current ||
      document.documentElement.outerHTML;

    return {
      fieldValues,
      domSnapshot,
    };
  }

  async function generate() {
    const t0 = performance.now();

    generationStartRef.current = t0;
    renderMeasuredRef.current = false;

    const t = {
      t0,
    };

    setStatus("generating");
    setError(null);
    setComp(null);
    setSubmitted(null);
    setTimes({
      t0,
    });

    try {
      const {
        fieldValues,
        domSnapshot,
      } = captureContext();

      setCapturedValues(fieldValues);

      const res = await fetch(API, {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          cognitive_load_score:
            isOverloaded
              ? SCORE_OVERLOADED
              : SCORE_NORMAL,

          field_name: fieldName,

          signal_summary:
            isOverloaded
              ? `high cognitive load on ${fieldName}, long hesitation`
              : `normal activity on ${fieldName}`,

          original_field_type:
            originalFieldType,

          dom_snapshot:
            domSnapshot,

          field_values:
            fieldValues,
        }),
      });

      if (!res.ok) {
        throw new Error(
          `HTTP ${res.status}`
        );
      }

      if (!res.body) {
        throw new Error(
          "Backend returned an empty response body"
        );
      }

      const reader =
        res.body.getReader();

      const decoder =
        new TextDecoder();

      let buf = "";
      let final = null;

      while (true) {
        const {
          value,
          done,
        } = await reader.read();

        if (done) {
          break;
        }

        buf += decoder.decode(
          value,
          {
            stream: true,
          }
        );

        const parts =
          buf.split("\n\n");

        buf =
          parts.pop() || "";

        for (
          const part of parts
        ) {
          if (
            !part.startsWith(
              "data: "
            )
          ) {
            continue;
          }

          const ev =
            JSON.parse(
              part.slice(6)
            );

          if (
            ev.type === "chunk" &&
            t.firstChunk ===
              undefined
          ) {
            t.firstChunk =
              performance.now() -
              t0;
          }

          if (
            ev.type === "final"
          ) {
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
        performance.now() -
        t0;

      if (
        final.status !==
        "valid"
      ) {
        throw new Error(
          `${final.reason}: ${final.message}`
        );
      }

      const C =
        compileTsx(
          final.tsx
        );

      t.compiled =
        performance.now() -
        t0;

      setTimes({
        ...t,
      });

      setGenId(
        (n) => n + 1
      );

      setComp(
        () => C
      );

      setStatus(
        "done"
      );
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

      setStatus(
        "error"
      );
    }
  }

  const f = (v) =>
    v === undefined
      ? "-"
      : `${(
          v / 1000
        ).toFixed(2)}s`;

  return (
    <div
      style={{
        marginTop: 16,
      }}
    >
      <button
        onClick={generate}
        disabled={
          status ===
          "generating"
        }
      >
        {status ===
        "generating"
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
        {f(
          times.firstChunk
        )}{" "}
        | validated final{" "}
        {f(
          times.final
        )}{" "}
        | compiled{" "}
        {f(
          times.compiled
        )}{" "}
        | rendered{" "}
        {f(
          times.rendered
        )}
      </p>

      {Comp && (
        <LLMFallbackBoundary
          key={genId}
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
          {String(
            submitted
          )}
        </p>
      )}
    </div>
  );
}