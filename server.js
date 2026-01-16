function safeBody(text) {
  let t = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const soften = [
    ["error", "an error noticed during a quick review"],
    ["glitch", "a small glitch observed during normal use"],
    ["screenshot", "a screenshot prepared to explain it clearly"],
    ["rank", "current ranking visibility based on recent checks"],
    ["report", "the report details are shared below for context"],
    ["price list", "the pricing details are included below for reference"]
  ];

  soften.forEach(([word, sentence]) => {
    const re = new RegExp(`(^|\\n)\\s*${word}\\s*(?=\\n|$)`, "gi");
    t = t.replace(re, `$1${sentence}`);
  });

  // ✅ FINAL SAFE FOOTER (EXACT AS REQUESTED)
  const footer =
    "\n\nVerified for clarity secured\n" +
    "_____________________________";

  return t + footer;
}
