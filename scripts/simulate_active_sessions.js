/*
  Simulate fetching /api/mikrotik/active-sessions to trigger activation logic.
  Usage: node scripts/simulate_active_sessions.js [URL]
  Example: node scripts/simulate_active_sessions.js http://localhost:5173/api/mikrotik/active-sessions
*/

const url = process.argv[2] || "http://localhost:5173/api/mikrotik/active-sessions";

async function run() {
  try {
    console.log(`Calling ${url} ...`);
    const res = await fetch(url, { method: "GET" });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(text);
  } catch (err) {
    console.error("Failed to call active-sessions endpoint:", err);
    process.exit(1);
  }
}

run();
