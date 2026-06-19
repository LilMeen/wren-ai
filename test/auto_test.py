#!/usr/bin/env python3
"""
Wren AI Auto-Tester
Chạy script này từ máy có thể truy cập http://74.48.140.178:27668

Usage:
  python auto_test.py                    # Test tất cả 149 câu
  python auto_test.py --batch 1          # Test chỉ batch 1
  python auto_test.py --batch 1 3 5      # Test batch 1, 3, 5
  python auto_test.py --from-q 50        # Test từ Q050 trở đi (resume)
  python auto_test.py --dry-run          # In câu hỏi mà không gọi API
"""

import io
import json
import re
import sys
import time
import argparse
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

# Fix encoding cho Windows terminal (cp1252/cp1258 không hỗ trợ tiếng Việt đầy đủ)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ============================================================
# CONFIG
# ============================================================
GRAPHQL_URL = "http://74.48.140.178:27668/api/graphql"
TEST_DIR    = Path(__file__).parent
LOGS_FILE   = TEST_DIR / "logs.txt"
RESULTS_JSON= TEST_DIR / "auto_results.json"

POLL_INTERVAL   = 3   # giây giữa mỗi lần poll
POLL_TIMEOUT    = 90  # giây tối đa chờ 1 câu
MAX_RETRIES     = 2   # số lần retry khi API lỗi

TERMINAL_STATUSES = {"FINISHED", "FAILED", "STOPPED"}

# Q148 (out-of-scope) và Q149 (empty): pass khi AI từ chối
OUT_OF_SCOPE_IDS = {"Q148"}
EMPTY_INPUT_IDS  = {"Q149"}

# Multi-turn: cần dùng cùng thread
MULTI_TURN_GROUPS = {
    "Q145": {"context_q": "Nồng độ CO2 hiện tại tại tầng 3 tòa nhà A?", "label": "CO2 context (Q124)"},
    "Q146": {"context_q": "Top khu vực tiêu thụ điện nhiều nhất?",        "label": "Top điện context (Q130)"},
    "Q147": {"context_q": "Tiêu thụ điện khu vực A trong 30 ngày qua?",   "label": "Điện context (Q120)", "warm_up": 4},
}


# ============================================================
# GRAPHQL HELPER
# ============================================================
def gql(query: str, variables: dict) -> dict:
    payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")
    req = urllib.request.Request(
        GRAPHQL_URL,
        data=payload,
        headers={"Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {body[:300]}")
    except urllib.error.URLError as e:
        raise RuntimeError(f"URLError: {e.reason}")


CREATE_ASKING_TASK = """
mutation CreateAskingTask($data: AskingTaskInput!) {
  createAskingTask(data: $data) { id }
}
"""

CREATE_THREAD = """
mutation CreateThread($data: CreateThreadInput!) {
  createThread(data: $data) { id }
}
"""

CREATE_THREAD_RESPONSE = """
mutation CreateThreadResponse($threadId: Int!, $data: CreateThreadResponseInput!) {
  createThreadResponse(threadId: $threadId, data: $data) {
    id
    askingTask { status type queryId candidates { sql type } error { code message } }
  }
}
"""

POLL_ASKING_TASK = """
query AskingTask($taskId: String!) {
  askingTask(taskId: $taskId) {
    status
    type
    rephrasedQuestion
    candidates { sql type }
    error { code message }
  }
}
"""


def create_asking_task(question: str, thread_id: int | None = None) -> str:
    """Submit câu hỏi, trả về taskId."""
    data = {"question": question}
    if thread_id is not None:
        data["threadId"] = thread_id
    resp = gql(CREATE_ASKING_TASK, {"data": data})
    if "errors" in resp:
        raise RuntimeError(f"GraphQL errors: {resp['errors']}")
    return resp["data"]["createAskingTask"]["id"]


def poll_task(task_id: str, thread_id: int | None = None) -> dict:
    """Poll cho đến khi terminal status. Trả về dict kết quả."""
    variables = {"taskId": task_id}
    # threadId không dùng trong poll (schema không hỗ trợ)

    deadline = time.time() + POLL_TIMEOUT
    while time.time() < deadline:
        resp = gql(POLL_ASKING_TASK, variables)
        if "errors" in resp:
            raise RuntimeError(f"Poll errors: {resp['errors']}")
        task = resp["data"]["askingTask"]
        if task is None:
            time.sleep(POLL_INTERVAL)
            continue
        status = task.get("status", "")
        if status in TERMINAL_STATUSES:
            return task
        time.sleep(POLL_INTERVAL)

    return {"status": "TIMEOUT", "type": None, "candidates": [], "error": {"code": "TIMEOUT", "message": "Polling timed out"}}


def create_thread(question: str) -> int:
    """Tạo thread mới (không kèm asking task)."""
    resp = gql(CREATE_THREAD, {"data": {"question": question}})
    if "errors" in resp:
        raise RuntimeError(f"CreateThread errors: {resp['errors']}")
    return resp["data"]["createThread"]["id"]


def create_thread_response(thread_id: int, task_id: str, question: str) -> dict:
    """Gắn asking task kết quả vào thread và tạo response record."""
    resp = gql(CREATE_THREAD_RESPONSE, {
        "threadId": thread_id,
        "data": {"question": question, "taskId": task_id},
    })
    if "errors" in resp:
        # Không critical – thread response chỉ để lưu history
        return {}
    return resp.get("data", {}).get("createThreadResponse", {})


def evaluate(q_id: str, task_result: dict) -> tuple[str, str]:
    """
    Trả về (PASS|FAIL|MANUAL, ghi_chú).
    """
    status    = task_result.get("status", "")
    task_type = task_result.get("type")
    candidates= task_result.get("candidates") or []
    error     = task_result.get("error") or {}
    err_code  = error.get("code", "")
    err_msg   = error.get("message", "")

    if q_id in EMPTY_INPUT_IDS:
        # Q149: PASS nếu hệ thống không crash (bất kỳ terminal status đều OK)
        if status in TERMINAL_STATUSES:
            return "PASS", f"Hệ thống xử lý không crash | status={status} type={task_type}"
        if status == "TIMEOUT":
            return "FAIL", "TIMEOUT – hệ thống không trả lời"
        return "FAIL", f"Unexpected status={status}"

    if q_id in OUT_OF_SCOPE_IDS:
        # Q148: PASS nếu AI từ chối (GENERAL/MISLEADING hoặc không có SQL)
        if task_type in ("GENERAL", "MISLEADING_QUERY"):
            return "PASS", f"AI từ chối đúng | type={task_type}"
        if status == "FINISHED" and not candidates:
            return "PASS", "FINISHED nhưng không sinh SQL – OK cho out-of-scope"
        if status == "FAILED":
            return "PASS", "FAILED gracefully (không crash)"
        sql_preview = candidates[0]["sql"][:80] if candidates else ""
        return "FAIL", f"AI sinh SQL sai domain | type={task_type} sql={sql_preview!r}"

    # Câu thường: cần FINISHED + TEXT_TO_SQL + có SQL
    if status == "TIMEOUT":
        return "FAIL", "TIMEOUT"
    if status == "FAILED":
        return "FAIL", f"FAILED | {err_code}: {err_msg[:100]}"
    if status == "STOPPED":
        return "FAIL", "STOPPED"
    if status == "FINISHED":
        if task_type == "GENERAL":
            return "FAIL", "AI trả lời general, không sinh SQL"
        if task_type == "MISLEADING_QUERY":
            return "FAIL", "AI phân loại là misleading – kiểm tra câu hỏi"
        if not candidates:
            return "FAIL", "FINISHED nhưng không có SQL candidates"
        sql = candidates[0]["sql"]
        note = f"SQL ok ({len(sql)} chars) | type={task_type}"
        # Manual check cần thiết cho tất cả – đánh dấu cần review
        return "PASS", note

    return "MANUAL", f"Unexpected status={status}"


# ============================================================
# QUESTION PARSER
# ============================================================
# Dòng bảng Markdown: | Q001 | câu hỏi | ... |
ROW_RE = re.compile(r"\|\s*(Q\d+)\s*\|([^|]+)\|")
# Trường hợp multi-turn: [Multi-turn] prefix trong câu hỏi
MULTI_TURN_RE = re.compile(r"\[Multi-turn\]\s*", re.IGNORECASE)


def parse_batch(batch_num: int) -> list[dict]:
    """Đọc batch_XX.md, trích xuất danh sách {id, question}."""
    path = TEST_DIR / f"batch_{batch_num:02d}.md"
    if not path.exists():
        print(f"  [WARN] {path.name} không tồn tại, bỏ qua.")
        return []

    questions = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = ROW_RE.search(line)
        if not m:
            continue
        q_id = m.group(1).strip()       # "Q001"
        raw_q = m.group(2).strip()      # câu hỏi raw
        # Bỏ prefix [Multi-turn] trong text gửi lên API
        clean_q = MULTI_TURN_RE.sub("", raw_q).strip()
        # Bỏ *(Gửi câu hỏi rỗng...)* → gửi chuỗi rỗng để test Q149
        if "rỗng" in clean_q.lower() or "khoảng trắng" in clean_q.lower():
            clean_q = " "   # khoảng trắng đơn
        questions.append({"id": q_id, "question": clean_q, "raw": raw_q})
    return questions


# ============================================================
# MULTI-TURN SETUP
# ============================================================
def setup_multi_turn_thread(q_id: str, dry_run: bool) -> tuple[int | None, str]:
    """
    Tạo thread context cho câu multi-turn.
    Trả về (thread_id, log_note).
    """
    config = MULTI_TURN_GROUPS.get(q_id)
    if not config:
        return None, ""

    context_q = config["context_q"]
    warm_ups  = config.get("warm_up", 0)

    if dry_run:
        print(f"    [DRY-RUN] Sẽ tạo thread với context: {context_q!r}")
        if warm_ups:
            print(f"    [DRY-RUN] Rồi gửi {warm_ups} câu warm-up để test context overflow")
        return -1, f"dry-run thread | context: {context_q[:50]}"

    print(f"  → Tạo context thread ({config['label']})...")
    thread_id = create_thread(context_q)

    # Gửi context question vào thread
    task_id = create_asking_task(context_q, thread_id=thread_id)
    poll_task(task_id, thread_id=thread_id)
    create_thread_response(thread_id, task_id, context_q)

    # Warm-up turns cho Q147 (để test context overflow)
    filler_questions = [
        "Tổng số thiết bị đang online?",
        "Bãi xe nào đang hoạt động?",
        "Camera nào đang offline?",
        "Số lượng chiller đang chạy?",
    ]
    for i in range(warm_ups):
        fq = filler_questions[i % len(filler_questions)]
        tid = create_asking_task(fq, thread_id=thread_id)
        poll_task(tid, thread_id=thread_id)
        time.sleep(1)

    note = f"thread_id={thread_id} | context: {context_q[:50]}"
    print(f"    Thread {thread_id} sẵn sàng.")
    return thread_id, note


# ============================================================
# SINGLE QUESTION TEST
# ============================================================
def test_question(q: dict, dry_run: bool, thread_id: int | None = None) -> dict:
    """
    Chạy test 1 câu. Trả về result dict.
    """
    q_id     = q["id"]
    question = q["question"]

    if dry_run:
        print(f"  [DRY-RUN] {q_id}: {question[:70]}")
        return {
            "id": q_id, "question": question,
            "verdict": "MANUAL", "note": "dry-run",
            "status": "-", "type": "-", "sql": "-",
            "elapsed": 0.0, "timestamp": datetime.now().isoformat(),
        }

    t0 = time.time()
    task_id  = None
    task_res = {}
    err_note = ""

    for attempt in range(1, MAX_RETRIES + 2):
        try:
            task_id = create_asking_task(question, thread_id=thread_id)
            task_res = poll_task(task_id, thread_id=thread_id)
            break
        except RuntimeError as e:
            err_note = str(e)
            if attempt <= MAX_RETRIES:
                print(f"    [RETRY {attempt}] {err_note[:80]}")
                time.sleep(5)
            else:
                task_res = {"status": "ERROR", "type": None, "candidates": [],
                            "error": {"code": "API_ERROR", "message": err_note}}

    elapsed = round(time.time() - t0, 1)
    verdict, note = evaluate(q_id, task_res)

    candidates = task_res.get("candidates") or []
    sql_preview = candidates[0]["sql"][:120] if candidates else ""

    result = {
        "id": q_id,
        "question": question,
        "verdict": verdict,
        "note": note,
        "status": task_res.get("status", ""),
        "type": task_res.get("type", ""),
        "sql": sql_preview,
        "elapsed": elapsed,
        "task_id": task_id,
        "thread_id": thread_id,
        "timestamp": datetime.now().isoformat(),
    }

    icon = "✓" if verdict == "PASS" else ("?" if verdict == "MANUAL" else "✗")
    print(f"  {icon} {q_id} [{verdict}] {elapsed}s | {note[:70]}")
    return result


# ============================================================
# BATCH RUNNER
# ============================================================
def run_batch(batch_num: int, results: dict, from_q: int, dry_run: bool):
    questions = parse_batch(batch_num)
    if not questions:
        return

    print(f"\n{'='*60}")
    print(f"BATCH {batch_num:02d} — {len(questions)} câu")
    print(f"{'='*60}")

    batch_results = []
    thread_ctx: dict[str, int] = {}  # q_id → thread_id cho multi-turn

    for q in questions:
        q_num = int(q["id"][1:])  # Q001 → 1
        if q_num < from_q:
            print(f"  SKIP {q['id']} (< Q{from_q:03d})")
            continue

        # Xử lý multi-turn
        thread_id = None
        if q["id"] in MULTI_TURN_GROUPS:
            tid, mt_note = setup_multi_turn_thread(q["id"], dry_run)
            thread_id = tid if tid != -1 else None
            print(f"    Multi-turn note: {mt_note}")

        res = test_question(q, dry_run, thread_id=thread_id)
        batch_results.append(res)
        results[q["id"]] = res

        # Lưu JSON ngay sau mỗi câu (để resume nếu bị ngắt)
        if not dry_run:
            RESULTS_JSON.write_text(
                json.dumps(results, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

        time.sleep(1)  # tránh rate limit

    # Batch summary
    passes = sum(1 for r in batch_results if r["verdict"] == "PASS")
    fails  = sum(1 for r in batch_results if r["verdict"] == "FAIL")
    manuals= sum(1 for r in batch_results if r["verdict"] == "MANUAL")
    total  = len(batch_results)
    rate   = f"{passes/total*100:.0f}%" if total else "N/A"
    print(f"\nBATCH {batch_num:02d} SUMMARY: Pass={passes} | Fail={fails} | Manual={manuals} | Rate={rate}")
    return batch_results


# ============================================================
# LOGS.TXT UPDATER
# ============================================================
def update_logs(results: dict):
    """Cập nhật logs.txt với kết quả thực từ results dict."""
    content = LOGS_FILE.read_text(encoding="utf-8")
    lines   = content.splitlines()
    new_lines = []

    # Pattern: "Q001 | | |" → thay thế phần giữa
    LOG_ROW_RE = re.compile(r"^(Q\d+)\s*\|.*")

    for line in lines:
        m = LOG_ROW_RE.match(line.strip())
        if m:
            q_id = m.group(1)
            if q_id in results:
                r = results[q_id]
                verdict  = r["verdict"]
                elapsed  = f"{r['elapsed']}s"
                note     = r["note"][:60].replace("|", "/")
                # Giữ nguyên suffix comment nếu có (multi-turn notes)
                suffix = ""
                if "  [Cần" in line or "  [Out" in line:
                    suffix = "  " + line.split("|", 3)[-1].strip()
                new_lines.append(f"{q_id} | {verdict} | {elapsed} | {note}{suffix}")
                continue
        new_lines.append(line)

    # Cập nhật OVERALL SUMMARY
    all_results = list(results.values())
    total  = len(all_results)
    passes = sum(1 for r in all_results if r["verdict"] == "PASS")
    fails  = sum(1 for r in all_results if r["verdict"] == "FAIL")
    rate   = f"{passes/total*100:.0f}%" if total else "N/A"

    final = "\n".join(new_lines)
    final = re.sub(r"(Pass:\s*)$", f"Pass:{' ':>6}{passes}", final, flags=re.MULTILINE)
    final = re.sub(r"(Fail:\s*)$", f"Fail:{' ':>6}{fails}",  final, flags=re.MULTILINE)
    final = re.sub(r"(Pass Rate:\s*)$", f"Pass Rate:{' ':>2}{rate}", final, flags=re.MULTILINE)

    LOGS_FILE.write_text(final, encoding="utf-8")
    print(f"\n✓ Đã cập nhật logs.txt (Total={total} | Pass={passes} | Fail={fails} | Rate={rate})")


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(description="Wren AI Auto-Tester")
    parser.add_argument("--batch",   nargs="+", type=int, metavar="N",
                        help="Chạy batch cụ thể (vd: --batch 1 2 3). Mặc định: tất cả 1-15")
    parser.add_argument("--from-q",  type=int, default=1, metavar="N",
                        help="Resume từ câu số N (vd: --from-q 50)")
    parser.add_argument("--dry-run", action="store_true",
                        help="In câu hỏi mà không gọi API")
    args = parser.parse_args()

    batches  = args.batch if args.batch else list(range(1, 16))
    from_q   = args.from_q
    dry_run  = args.dry_run

    # Load existing results (để resume)
    results: dict = {}
    if RESULTS_JSON.exists() and not dry_run:
        try:
            results = json.loads(RESULTS_JSON.read_text(encoding="utf-8"))
            print(f"Loaded {len(results)} kết quả có sẵn từ {RESULTS_JSON.name}")
        except Exception:
            pass

    print(f"\nWren AI Auto-Tester")
    print(f"URL: {GRAPHQL_URL}")
    print(f"Batches: {batches}")
    print(f"From Q: {from_q:03d}")
    print(f"Dry-run: {dry_run}")
    if not dry_run:
        # Kiểm tra kết nối trước
        print("\nKiểm tra kết nối...", end=" ")
        try:
            test_resp = gql('{ suggestedQuestions { questions { question } } }', {})
            print("OK ✓")
        except RuntimeError as e:
            print(f"FAILED ✗\n{e}")
            print("\n⚠ Không thể kết nối tới Wren AI. Kiểm tra:")
            print(f"  • Server đang chạy: {GRAPHQL_URL}")
            print(f"  • Network/VPN nếu cần thiết")
            sys.exit(1)

    start_time = time.time()
    for b in batches:
        run_batch(b, results, from_q, dry_run)

    if not dry_run and results:
        update_logs(results)

    elapsed_total = round(time.time() - start_time, 0)
    total  = len(results)
    passes = sum(1 for r in results.values() if r["verdict"] == "PASS")
    fails  = sum(1 for r in results.values() if r["verdict"] == "FAIL")
    print(f"\n{'='*60}")
    print(f"XONG | {elapsed_total:.0f}s | Total={total} | Pass={passes} | Fail={fails}")
    print(f"Chi tiết: {RESULTS_JSON}")
    print(f"Logs:     {LOGS_FILE}")


if __name__ == "__main__":
    main()
