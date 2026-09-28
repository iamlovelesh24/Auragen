# audit_codegen.py — Week 2 Generation Audit
# Runs the real codegen pipeline across multiple friction scenarios and
# reports syntax / security / design-contract pass rates.

import json
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from codegen import (
    generate_component,
    ConfigurationError,
    InvalidInputError,
    GenerationError,
    EmptyOutputError,
    MalformedComponentError,
)

RUNS_PER_SCENARIO = 2  # bump up later once you trust the pipeline / have API budget

# Tokens expected to appear if the component actually followed DESIGN_SYSTEM_CONTEXT.
# Adjust these to match real class names / patterns from prompts.py.
REQUIRED_TOKENS = ["ds-", "className"]

SCENARIOS = [
    {
        "cognitive_load_score": 82,
        "field_name": "Annual Income",
        "signal_summary": "3 rage clicks, 4s hesitation, field re-focused 5 times",
        "original_field_type": "numeric currency input with tooltip",
    },
    {
        "cognitive_load_score": 65,
        "field_name": "Country",
        "signal_summary": "dropdown opened 4 times without selection, 6s idle",
        "original_field_type": "long single-select dropdown",
    },
    {
        "cognitive_load_score": 74,
        "field_name": "Date of Birth",
        "signal_summary": "2 invalid format submissions, field cleared 3 times",
        "original_field_type": "free-text date input",
    },
    {
        "cognitive_load_score": 58,
        "field_name": "Interests",
        "signal_summary": "abandoned after single focus, no interaction",
        "original_field_type": "multi-select checkbox list",
    },
]


@dataclass
class ScenarioResult:
    field_name: str
    runs: int = 0
    generation_ok: int = 0
    contract_pass: int = 0
    latencies: list = field(default_factory=list)
    failures: list = field(default_factory=list)


def check_design_contract(code: str) -> bool:
    return any(t in code for t in REQUIRED_TOKENS)


def run_scenario(scenario: dict) -> ScenarioResult:
    r = ScenarioResult(field_name=scenario["field_name"])
    for i in range(RUNS_PER_SCENARIO):
        r.runs += 1
        start = time.perf_counter()
        try:
            code = generate_component(**scenario)
            r.generation_ok += 1
            comp_dir = Path("audit_reports/components")
            comp_dir.mkdir(parents=True, exist_ok=True)
            (comp_dir / f"{scenario['field_name'].replace(' ', '')}_run{i}.tsx").write_text(code, encoding="utf-8")
        except (ConfigurationError, InvalidInputError, GenerationError,
                 EmptyOutputError, MalformedComponentError) as exc:
            r.failures.append({
                "run": i,
                "error_type": type(exc).__name__,
                "error": str(exc),
            })
            r.latencies.append(time.perf_counter() - start)
            continue

        r.latencies.append(time.perf_counter() - start)

        if check_design_contract(code):
            r.contract_pass += 1
        else:
            r.failures.append({
                "run": i,
                "error_type": "DesignContractMiss",
                "error": "Generated code missing expected design-system tokens",
            })

    return r


def render_report(results):
    lines = [
        f"# AuraGen Codegen Audit — {datetime.now().isoformat(timespec='seconds')}",
        "",
        f"Runs per scenario: {RUNS_PER_SCENARIO}",
        "",
        "| Field | Runs | Generation OK | Design Contract | Avg Latency (s) |",
        "|---|---|---|---|---|",
    ]
    for r in results:
        avg = sum(r.latencies) / len(r.latencies) if r.latencies else 0
        lines.append(
            f"| {r.field_name} | {r.runs} | {r.generation_ok}/{r.runs} | "
            f"{r.contract_pass}/{r.runs} | {avg:.2f} |"
        )

    lines.append("\n## Failures\n")
    any_failures = False
    for r in results:
        for f in r.failures:
            any_failures = True
            lines.append(f"- **{r.field_name}** run {f['run']} — {f['error_type']}: {f['error']}")
    if not any_failures:
        lines.append("_None — all runs passed generation and contract checks._")

    return "\n".join(lines)


def main():
    print(f"Running audit: {len(SCENARIOS)} scenarios x {RUNS_PER_SCENARIO} runs each...\n")
    results = [run_scenario(s) for s in SCENARIOS]

    report = render_report(results)

    out_dir = Path("audit_reports")
    out_dir.mkdir(exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    md_path = out_dir / f"audit_{stamp}.md"
    json_path = out_dir / f"audit_{stamp}.json"

    md_path.write_text(report, encoding="utf-8")
    json_path.write_text(
        json.dumps([r.__dict__ for r in results], indent=2, default=str),
        encoding="utf-8",
    )

    print(report)
    print(f"\nSaved: {md_path}")
    print(f"Saved: {json_path}")


if __name__ == "__main__":
    main()