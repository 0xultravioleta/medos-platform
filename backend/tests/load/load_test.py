"""Simple async load test for MedOS endpoints.

Usage:
    python tests/load/load_test.py --target http://localhost:8000 --users 10 --duration 30
"""

from __future__ import annotations

import argparse
import asyncio
import time

ENDPOINTS = [
    ("GET", "/health"),
    ("GET", "/api/v1/patients"),
    ("GET", "/mcp/tools"),
]


async def _make_request(
    session,
    method: str,
    url: str,
    results: list[dict],
) -> None:
    """Make a single HTTP request and record the result."""
    start = time.perf_counter()
    try:
        if method == "GET":
            resp = await session.get(url)
        else:
            resp = await session.get(url)
        elapsed_ms = (time.perf_counter() - start) * 1000
        results.append({
            "url": url,
            "status": resp.status_code,
            "latency_ms": elapsed_ms,
            "success": 200 <= resp.status_code < 500,
        })
    except Exception as exc:
        elapsed_ms = (time.perf_counter() - start) * 1000
        results.append({
            "url": url,
            "status": 0,
            "latency_ms": elapsed_ms,
            "success": False,
            "error": str(exc),
        })


async def _worker(
    session,
    target: str,
    results: list[dict],
    stop_event: asyncio.Event,
) -> None:
    """Continuously send requests until stop_event is set."""
    while not stop_event.is_set():
        for method, path in ENDPOINTS:
            if stop_event.is_set():
                break
            url = f"{target.rstrip('/')}{path}"
            await _make_request(session, method, url, results)
            await asyncio.sleep(0.01)


def _percentile(data: list[float], p: float) -> float:
    """Calculate percentile from a list of values."""
    if not data:
        return 0.0
    sorted_data = sorted(data)
    k = (len(sorted_data) - 1) * (p / 100.0)
    f = int(k)
    c = f + 1
    if c >= len(sorted_data):
        return sorted_data[f]
    d = k - f
    return sorted_data[f] + d * (sorted_data[c] - sorted_data[f])


def _print_report(results: list[dict], duration: float) -> dict:
    """Print and return the load test report."""
    total = len(results)
    successes = sum(1 for r in results if r["success"])
    failures = total - successes
    success_rate = (successes / total * 100) if total > 0 else 0
    latencies = [r["latency_ms"] for r in results]

    p50 = _percentile(latencies, 50)
    p95 = _percentile(latencies, 95)
    p99 = _percentile(latencies, 99)
    rps = total / duration if duration > 0 else 0

    report = {
        "total_requests": total,
        "successes": successes,
        "failures": failures,
        "success_rate_percent": round(success_rate, 2),
        "p50_ms": round(p50, 2),
        "p95_ms": round(p95, 2),
        "p99_ms": round(p99, 2),
        "rps": round(rps, 2),
        "duration_seconds": round(duration, 2),
    }

    print("\n" + "=" * 60)
    print("  MedOS Load Test Report")
    print("=" * 60)
    print(f"  Duration:        {report['duration_seconds']}s")
    print(f"  Total Requests:  {report['total_requests']}")
    print(f"  Successes:       {report['successes']}")
    print(f"  Failures:        {report['failures']}")
    print(f"  Success Rate:    {report['success_rate_percent']}%")
    print(f"  Throughput:      {report['rps']} RPS")
    print(f"  Latency p50:     {report['p50_ms']}ms")
    print(f"  Latency p95:     {report['p95_ms']}ms")
    print(f"  Latency p99:     {report['p99_ms']}ms")
    print("=" * 60 + "\n")

    return report


async def run_load_test(target: str, users: int, duration: int) -> dict:
    """Run the load test with the given parameters."""
    try:
        import httpx
    except ImportError as exc:
        raise RuntimeError(
            "httpx is required for load testing. Install with: pip install httpx"
        ) from exc

    results: list[dict] = []
    stop_event = asyncio.Event()

    print(f"Starting load test: {users} users, {duration}s, target={target}")
    print(f"Endpoints: {[e[1] for e in ENDPOINTS]}")

    start_time = time.perf_counter()
    async with httpx.AsyncClient(timeout=10.0) as session:
        workers = [
            asyncio.create_task(_worker(session, target, results, stop_event))
            for _ in range(users)
        ]

        await asyncio.sleep(duration)
        stop_event.set()

        # Give workers a moment to finish current requests
        await asyncio.sleep(0.5)
        for w in workers:
            w.cancel()

    elapsed = time.perf_counter() - start_time
    return _print_report(results, elapsed)


def main() -> None:
    """CLI entrypoint."""
    parser = argparse.ArgumentParser(description="MedOS Load Test")
    parser.add_argument(
        "--target",
        default="http://localhost:8000",
        help="Base URL to test (default: http://localhost:8000)",
    )
    parser.add_argument(
        "--users",
        type=int,
        default=10,
        help="Number of concurrent users (default: 10)",
    )
    parser.add_argument(
        "--duration",
        type=int,
        default=30,
        help="Test duration in seconds (default: 30)",
    )
    args = parser.parse_args()
    asyncio.run(run_load_test(args.target, args.users, args.duration))


if __name__ == "__main__":
    main()
