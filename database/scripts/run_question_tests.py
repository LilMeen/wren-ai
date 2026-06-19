"""
run_question_tests.py — Auto-test questions from question_test.md against Wren AI.

Flow per test case:
  1. Submit question → createAskingTask
  2. Poll askingTask until FINISHED/FAILED (max 60s)
  3. Extract SQL from candidates[0].sql
  4. Print generated SQL + comparison hints
  5. Optionally update status in question_test.md (--update-md)

Usage:
    py -3.10 database/scripts/run_question_tests.py                     # test all untested [ ]
    py -3.10 database/scripts/run_question_tests.py --all               # test all (including ✅/❌)
    py -3.10 database/scripts/run_question_tests.py --id T-PRK-01      # single test
    py -3.10 database/scripts/run_question_tests.py --domain parking    # filter by domain
    py -3.10 database/scripts/run_question_tests.py --update-md        # write pass/fail back to MD
    py -3.10 database/scripts/run_question_tests.py --dry-run          # parse only, no API calls
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
TEST_MD = ROOT / "database" / "docs" / "question_test.md"
ENDPOINT = "http://74.48.140.178:27668/api/graphql"

POLL_INTERVAL = 2   # seconds between polls
POLL_TIMEOUT  = 90  # seconds max per question

# ── GraphQL ───────────────────────────────────────────────────────────────────

CREATE_ASKING = """
mutation CreateAskingTask($data: AskingTaskInput!) {
  createAskingTask(data: $data) { id }
}
"""

POLL_ASKING = """
query AskingTask($taskId: String!) {
  askingTask(taskId: $taskId) {
    status
    error { code message }
    candidates { type sql }
    rephrasedQuestion
  }
}
"""


def gql(query: str, variables: dict | None = None, retries: int = 3) -> dict[str, Any]:
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    last_exc: Exception | None = None
    for attempt in range(retries):
        if attempt > 0:
            time.sleep(5 * attempt)
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            raise RuntimeError(f"HTTP {exc.code}: {exc.read().decode()[:300]}") from exc
        except (TimeoutError, ConnectionResetError, OSError) as exc:
            last_exc = exc
            continue
        result = json.loads(body)
        if result.get("errors"):
            raise RuntimeError(json.dumps(result["errors"], ensure_ascii=False))
        return result["data"]
    raise RuntimeError(f"Network error after {retries} attempts: {last_exc}")


def ask(question: str) -> dict:
    """Submit question, poll until done, return {status, sql, error, rephrased}."""
    data = gql(CREATE_ASKING, {"data": {"question": question}})
    task_id = data["createAskingTask"]["id"]

    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        time.sleep(POLL_INTERVAL)
        result = gql(POLL_ASKING, {"taskId": task_id})["askingTask"]
        status = result["status"]
        if status in ("FINISHED", "FAILED", "STOPPED"):
            sql = None
            if result.get("candidates"):
                sql = result["candidates"][0]["sql"]
            return {
                "status": status,
                "sql": sql,
                "error": result.get("error"),
                "rephrased": result.get("rephrasedQuestion", ""),
            }
    return {"status": "TIMEOUT", "sql": None, "error": None, "rephrased": ""}


# ── Markdown parser ───────────────────────────────────────────────────────────

DOMAIN_HEADER = re.compile(r"^## (.+)$", re.MULTILINE)
TEST_ID = re.compile(r"^### (T-[A-Z]+-\d+)$", re.MULTILINE)
STATUS_LINE = re.compile(r"- \*\*Status:\*\* `(\[.*?\])`")
QUESTION_LINE = re.compile(r"- \*\*Question:\*\* (.+)")
SQL_BLOCK = re.compile(r"```sql\n(.*?)```", re.DOTALL)


def parse_tests(md: str) -> list[dict]:
    """Parse question_test.md into list of test case dicts."""
    tests = []
    current_domain = "Unknown"

    # Split by test headers
    sections = re.split(r"(?=^### T-)", md, flags=re.MULTILINE)

    for section in sections:
        # Track domain heading before the section
        domain_match = DOMAIN_HEADER.findall(section)
        if domain_match:
            current_domain = domain_match[-1]

        id_match = TEST_ID.match(section.strip())
        if not id_match:
            # Not a test section — check for domain updates only
            for m in DOMAIN_HEADER.finditer(section):
                current_domain = m.group(1)
            continue

        test_id = id_match.group(1)
        status_m = STATUS_LINE.search(section)
        question_m = QUESTION_LINE.search(section)
        sql_blocks = SQL_BLOCK.findall(section)

        status = status_m.group(1) if status_m else "[ ]"
        question = question_m.group(1).strip() if question_m else ""
        expected_sql = sql_blocks[0].strip() if sql_blocks else ""

        tests.append({
            "id": test_id,
            "domain": current_domain,
            "status": status,
            "question": question,
            "expected_sql": expected_sql,
            "raw": section,
        })

    return tests


def normalize_sql(sql: str) -> str:
    """Lowercase and collapse whitespace for rough comparison."""
    return " ".join(sql.lower().split())


def check_pass(generated: str, expected: str) -> tuple[str, list[str]]:
    """
    Quick heuristic pass/fail based on key SQL elements.
    Returns (verdict, [issues]).
    """
    if not generated:
        return "❌", ["No SQL generated"]

    gen = normalize_sql(generated)
    exp = normalize_sql(expected)

    issues = []

    # Extract key tokens from expected SQL
    # Tables referenced
    tables = re.findall(r"(?:from|join)\s+[\w.]+", exp)
    for t in tables:
        tbl = t.split()[-1].replace("sdp_golden.", "").replace("sdp_near_realtime.", "").replace('"', "")
        if tbl and tbl not in gen:
            issues.append(f"Missing table: {tbl}")

    # Key WHERE conditions
    key_conditions = [
        ("history_state = 'completed'", "Missing: history_state = 'COMPLETED'"),
        ("check_out_date_key", "Using check_in instead of check_out for revenue"),
    ]
    if "check_out_date_key" in exp:
        if "check_out_date_key" not in gen:
            issues.append("Wrong date key: should use check_out_date_key")

    if "history_state" in exp and "history_state" not in gen:
        issues.append("Missing: history_state filter")

    if "like '%camera%'" in exp and "like" not in gen and "camera" in exp:
        issues.append("Should use LIKE for device_type, not exact match")

    if "max(tsDt)" in exp and "max" not in gen and "latest" not in gen:
        issues.append("Missing latest record pattern (MAX tsDt)")

    if issues:
        return "⚠" if len(issues) <= 1 else "❌", issues

    return "✅", []


# ── MD updater ────────────────────────────────────────────────────────────────

def update_md_status(md: str, test_id: str, new_status: str, generated_sql: str | None) -> str:
    """Replace status line for a given test ID in the markdown."""
    # Find the section for this test
    pattern = re.compile(
        rf"(### {re.escape(test_id)}\n.*?- \*\*Status:\*\* )`(\[.*?\])`",
        re.DOTALL,
    )
    replacement = rf"\1`{new_status}`"
    updated = pattern.sub(replacement, md)
    return updated


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id",        help="Run single test by ID (e.g. T-PRK-01)")
    parser.add_argument("--domain",    help="Filter by domain keyword (e.g. parking, device)")
    parser.add_argument("--all",       action="store_true", help="Include already-tested cases")
    parser.add_argument("--update-md", action="store_true", help="Write results back to question_test.md")
    parser.add_argument("--dry-run",   action="store_true", help="Parse MD only, no API calls")
    parser.add_argument("--delay",     type=float, default=1.5, help="Delay between questions (s)")
    args = parser.parse_args()

    md = TEST_MD.read_text(encoding="utf-8")
    tests = parse_tests(md)
    print(f"Parsed {len(tests)} test cases from {TEST_MD.name}\n")

    # Filter
    if args.id:
        tests = [t for t in tests if t["id"] == args.id]
    if args.domain:
        tests = [t for t in tests if args.domain.lower() in t["domain"].lower()
                                  or args.domain.lower() in t["id"].lower()]
    if not args.all and not args.id:
        tests = [t for t in tests if t["status"] == "[ ]"]

    if not tests:
        print("No matching test cases.")
        return 0

    print(f"Running {len(tests)} test(s)...\n")
    print("=" * 80)

    results = []
    updated_md = md

    for i, test in enumerate(tests, 1):
        tid   = test["id"]
        q     = test["question"]
        exp   = test["expected_sql"]
        print(f"\n[{i}/{len(tests)}] {tid} — {q}")
        print("-" * 60)

        if args.dry_run:
            print("  [dry-run] skipping API call")
            continue

        try:
            result = ask(q)
        except RuntimeError as exc:
            print(f"  ERROR: {exc}")
            results.append({"id": tid, "verdict": "❌", "issues": [str(exc)]})
            continue

        if result["status"] != "FINISHED":
            print(f"  Status: {result['status']}")
            if result.get("error"):
                print(f"  Error: {result['error']}")
            results.append({"id": tid, "verdict": "❌", "issues": [result["status"]]})
            continue

        gen_sql = result["sql"] or ""
        rephrased = result.get("rephrased", "")

        if rephrased:
            print(f"  Rephrased: {rephrased}")

        verdict, issues = check_pass(gen_sql, exp)

        print(f"\n  Generated SQL:")
        for line in gen_sql.strip().splitlines():
            print(f"    {line}")

        if exp:
            print(f"\n  Expected SQL (key pattern):")
            for line in exp.strip().splitlines()[:8]:
                print(f"    {line}")

        print(f"\n  Verdict: {verdict}")
        if issues:
            for issue in issues:
                print(f"    ⚠  {issue}")

        results.append({"id": tid, "verdict": verdict, "issues": issues, "sql": gen_sql})

        if args.update_md:
            updated_md = update_md_status(updated_md, tid, verdict, gen_sql)

        if i < len(tests):
            time.sleep(args.delay)

    # Summary
    print("\n" + "=" * 80)
    print(f"\nSUMMARY ({len(results)} tested):")
    pass_c  = sum(1 for r in results if r["verdict"] == "✅")
    warn_c  = sum(1 for r in results if r["verdict"] == "⚠")
    fail_c  = sum(1 for r in results if r["verdict"] == "❌")
    print(f"  ✅ Pass : {pass_c}")
    print(f"  ⚠  Warn : {warn_c}")
    print(f"  ❌ Fail : {fail_c}")

    if args.update_md and not args.dry_run:
        # Update summary table counts in MD
        TEST_MD.write_text(updated_md, encoding="utf-8")
        print(f"\nUpdated: {TEST_MD}")

    return 0 if fail_c == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
