 test("PHASE5-3: verify() recomputes the whole chain and detects tampering", async () => {
  const fs = await import("fs");
  const { readAll, getLogPath } = await import("../services/auditLog.js");
  const all = readAll();
  if(all.length === 0) return;
  const before = verify();
  assert.equal(before.ok, true, `verify must pass on clean chain, got: ${before.status}`);
  const logPath = getLogPath ? getLogPath() : "data/sovereign-audit.jsonl";
  const original = fs.readFileSync(logPath, "utf8");
  try {
    const lines = original.trim().split("\n");
    const lastEntry = JSON.parse(lines[lines.length - 1]);
    lastEntry.response = lastEntry.response + "X";
    lines[lines.length - 1] = JSON.stringify(lastEntry);
    fs.writeFileSync(logPath, lines.join("\n") + "\n", "utf8");
    const after = verify();
    assert.equal(after.ok, false, "verify MUST detect tampered entry");
  } finally {
    // restore clean chain for next test run
    fs.writeFileSync(logPath, original, "utf8");
  }
});