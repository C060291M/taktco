import React from "react";

// A deliberately small markdown renderer - just **bold** and "- bullet"
// lines, which is all TAKTCO AI's replies actually use. Not a full markdown
// parser (no headers, links, code blocks) - if the AI ever needs those,
// upgrade to react-markdown then, but this covers what's actually shown
// today without adding a new dependency.
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map(function (part, i) {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return React.createElement("strong", { key: i, className: "font-semibold" }, part.slice(2, -2));
    }
    return part;
  });
}

export function MarkdownLite({ text }: { text: string }) {
  const lines = text.split("\n");
  return React.createElement(
    React.Fragment,
    {},
    ...lines.map(function (line, i) {
      const trimmed = line.trim();
      if (trimmed.startsWith("- ")) {
        return React.createElement(
          "div",
          { key: i, className: "flex gap-1.5" },
          React.createElement("span", {}, "\u2022"),
          React.createElement("span", {}, renderInline(trimmed.slice(2)))
        );
      }
      if (trimmed === "") {
        return React.createElement("div", { key: i, className: "h-2" });
      }
      return React.createElement("div", { key: i }, renderInline(line));
    })
  );
}
