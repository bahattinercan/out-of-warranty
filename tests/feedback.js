const assert = require("assert");
const fs = require("fs");
const vm = require("vm");

const controls = {
  "fb-message": { value: "  Test report  " },
  "fb-include-diag": { checked: false },
};
let storageCalls = 0;
const context = vm.createContext({
  document: { getElementById: (id) => controls[id] || null },
  DIAG: { reportText: () => "private diagnostic payload" },
  localStorage: {
    getItem() { storageCalls++; return null; },
    setItem() { storageCalls++; },
  },
  t: (_key, fallback) => fallback,
});
vm.runInContext(fs.readFileSync("js/feedback.js", "utf8"), context);
const feedback = vm.runInContext("GameFeedback", context);

feedback.setCategory("bug");
feedback.setRating(3);
const report = feedback.buildReportText();
assert.match(report, /Test report/);
assert.match(report, /Hata \/ Bug/);
assert.match(report, /★★★☆☆ \(3\/5\)/);
assert.doesNotMatch(report, /private diagnostic payload/);

controls["fb-include-diag"].checked = true;
assert.match(feedback.buildReportText(), /private diagnostic payload/);
assert.strictEqual(storageCalls, 0, "feedback generation must not persist report data");
assert.doesNotMatch(fs.readFileSync("js/feedback.js", "utf8"), /fetch\s*\(|XMLHttpRequest/);

console.log("feedback: report fields, diagnostic opt-in, and no persistent/automatic submission passed");
