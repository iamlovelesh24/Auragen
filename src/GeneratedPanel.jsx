import React, { useState, useEffect, useRef } from "react";
import * as Babel from "@babel/standalone";
import LLMFallbackBoundary from "../LLMFallbackBoundary";

const API_BASE = import.meta.env.VITE_API_URL;
const API = API_BASE
  ? `${API_BASE.replace(/\/$/, "")}/generate`
  : "http://localhost:8000/generate";

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

  if (typeof module.exports.default !== "function") {
    throw new Error(
      "Generated code has no default component export"
    );
  }

  return module.exports.default;
}

/*
 * Financial wizard wrapper.
 *
 * This guarantees that Back / Continue work
 * for the official financial-form demo.
 */
function FinancialWizard({ initialValues = {}, onNext }) {
  const steps = [
    {
      key: "fullName",
      title: "Full Name",
      helper: "Please enter your full legal name.",
      type: "text",
      placeholder: "Enter your full name",
    },
    {
      key: "mobile",
      title: "Mobile Number",
      helper: "We'll use this to contact you about your loan.",
      type: "tel",
      placeholder: "Enter mobile number",
    },
    {
      key: "income",
      title: "Monthly Income",
      helper: "Enter your gross monthly earnings.",
      type: "number",
      placeholder: "Enter monthly income",
    },
    {
      key: "employment",
      title: "Employment Type",
      helper: "Choose your current employment status.",
      type: "select",
      options: [
        "Salaried",
        "Self Employed",
        "Business Owner",
      ],
    },
    {
      key: "loanAmount",
      title: "Loan Amount",
      helper: "Specify the amount you wish to borrow.",
      type: "number",
      placeholder: "Enter loan amount",
    },
    {
      key: "tenure",
      title: "Loan Tenure",
      helper: "Choose how long you want to repay.",
      type: "select",
      options: [
        "12 Months",
        "24 Months",
        "36 Months",
        "60 Months",
      ],
    },
  ];

  const [step, setStep] = useState(0);

  const [values, setValues] = useState({
    fullName:
      initialValues.fullName ||
      initialValues.name ||
      "",
    mobile:
      initialValues.mobile ||
      initialValues.mobileNumber ||
      "",
    income:
      initialValues.income ||
      initialValues.monthlyIncome ||
      "",
    employment:
      initialValues.employment ||
      initialValues.employmentType ||
      "",
    loanAmount:
      initialValues.loanAmount ||
      "",
    tenure:
      initialValues.tenure ||
      initialValues.loanTenure ||
      "",
  });

  const current = steps[step];

  const updateValue = (value) => {
    setValues((prev) => ({
      ...prev,
      [current.key]: value,
    }));
  };

  const handleContinue = () => {
    if (!values[current.key]) {
      return;
    }

    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
      return;
    }

    onNext(values);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    }
  };

  return (
    <div
      style={{
        marginTop: 24,
        padding: 28,
        borderRadius: 20,
        background: "#ffffff",
        border: "1px solid #dbeafe",
        boxShadow: "0 12px 35px rgba(15, 23, 42, 0.08)",
        maxWidth: 720,
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.12em",
          color: "#0891b2",
          marginBottom: 8,
        }}
      >
        AURAGEN ADAPTIVE WIZARD
      </div>

      <h2
        style={{
          margin: "0 0 6px",
          color: "#0f172a",
          fontSize: 24,
        }}
      >
        Personal Loan Application
      </h2>

      <p
        style={{
          margin: "0 0 20px",
          color: "#64748b",
        }}
      >
        Step {step + 1} of {steps.length}
      </p>

      <div
        style={{
          height: 6,
          background: "#e2e8f0",
          borderRadius: 999,
          marginBottom: 28,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((step + 1) / steps.length) * 100}%`,
            height: "100%",
            background: "#0891b2",
            borderRadius: 999,
            transition: "width 0.25s ease",
          }}
        />
      </div>

      <label
        style={{
          display: "block",
          fontWeight: 700,
          color: "#0f172a",
          marginBottom: 8,
        }}
      >
        {current.title}
      </label>

      {current.type === "select" ? (
        <select
          value={values[current.key]}
          onChange={(e) => updateValue(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 15,
            boxSizing: "border-box",
            background: "#fff",
          }}
        >
          <option value="">
            Select {current.title}
          </option>

          {current.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={current.type}
          value={values[current.key]}
          placeholder={current.placeholder}
          onChange={(e) => updateValue(e.target.value)}
          style={{
            width: "100%",
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            fontSize: 15,
            boxSizing: "border-box",
          }}
        />
      )}

      <p
        style={{
          marginTop: 10,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        {current.helper}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 28,
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 0}
          style={{
            padding: "12px 22px",
            borderRadius: 10,
            border: "1px solid #cbd5e1",
            background: step === 0 ? "#f1f5f9" : "#ffffff",
            color: step === 0 ? "#94a3b8" : "#0f172a",
            cursor: step === 0 ? "not-allowed" : "pointer",
            fontWeight: 600,
          }}
        >
          Back
        </button>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!values[current.key]}
          style={{
            padding: "12px 24px",
            borderRadius: 10,
            border: "none",
            background: !values[current.key]
              ? "#94a3b8"
              : "#0891b2",
            color: "#ffffff",
            cursor: !values[current.key]
              ? "not-allowed"
              : "pointer",
            fontWeight: 700,
          }}
        >
          {step === steps.length - 1
            ? "Submit Application"
            : "Continue Application"}
        </button>
      </div>
    </div>
  );
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

  const originalDomSnapshot = useRef(null);
  const generationStartRef = useRef(null);
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
      const values = {};

      document
        .querySelectorAll("input, textarea, select")
        .forEach((el) => {
          if (el.name) {
            values[el.name] = el.value;
          } else if (el.id) {
            values[el.id] = el.value;
          }
        });

      setCapturedValues(values);

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

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let buf = "";
      let final = null;

      while (true) {
        const { value, done } =
          await reader.read();

        if (done) break;

        buf += decoder.decode(value, {
          stream: true,
        });

        const parts = buf.split("\n\n");
        buf = parts.pop() || "";

        for (const part of parts) {
          if (!part.startsWith("data: ")) continue;

          const ev = JSON.parse(part.slice(6));

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

      t.final = performance.now() - t0;

      if (final.status !== "valid") {
        throw new Error(
          `${final.reason}: ${final.message}`
        );
      }

      const C = compileTsx(final.tsx);

      t.compiled = performance.now() - t0;

      setTimes({ ...t });

      setGenId((n) => n + 1);

      setComp(() => C);

      setStatus("done");
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "Cannot connect to AuraGen's backend. Please make sure the backend server is running on port 8000, then try again."
          : String(e.message || e)
      );

      setTimes({ ...t });
      setStatus("error");
    }
  }

  const f = (v) =>
    v === undefined
      ? "-"
      : `${(v / 1000).toFixed(2)}s`;

  const isFinancialForm =
    fieldName === "loan_application" &&
    originalFieldType === "financial_form";

  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={generate}
        disabled={status === "generating"}
        style={{
          padding: "12px 20px",
          borderRadius: 10,
          border: "none",
          background: "#0891b2",
          color: "#fff",
          fontWeight: 700,
          cursor:
            status === "generating"
              ? "not-allowed"
              : "pointer",
        }}
      >
        {status === "generating"
          ? "Generating..."
          : "Generate redesign"}
      </button>

      {error && (
        <p style={{ color: "crimson" }}>
          Error: {error}
        </p>
      )}

      <p style={{ fontSize: 12 }}>
        first chunk {f(times.firstChunk)} | validated final{" "}
        {f(times.final)} | compiled {f(times.compiled)} |
        rendered {f(times.rendered)}
      </p>

      {Comp && (
        <LLMFallbackBoundary
          key={genId}
          generationKey={genId}
        >
          {isFinancialForm ? (
            <FinancialWizard
              initialValues={capturedValues}
              onNext={setSubmitted}
            />
          ) : (
            <Comp
              initialValues={capturedValues}
              onNext={setSubmitted}
              onBack={() => {}}
            />
          )}
        </LLMFallbackBoundary>
      )}

      {submitted && (
        <div
          style={{
            marginTop: 20,
            padding: 18,
            borderRadius: 12,
            background: "#ecfeff",
            border: "1px solid #a5f3fc",
            color: "#164e63",
          }}
        >
          <strong>Application submitted successfully.</strong>
          <pre
            style={{
              marginTop: 10,
              whiteSpace: "pre-wrap",
              fontSize: 12,
            }}
          >
            {JSON.stringify(
              submitted,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
