import type { ReactNode } from "react";

function isHeading(block: string) {
  if (block.length > 90 || block.includes("\n")) return false;
  const letters = block.replace(/[^A-Za-zÀ-ÿ]/g, "");
  return block.endsWith(":") || (letters.length > 3 && letters === letters.toUpperCase());
}

export function OpportunityDescription({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const content: ReactNode[] = [];
  let list: string[] = [];

  function flushList() {
    if (list.length === 0) return;
    content.push(<ul className="description-list" key={`list-${content.length}`}>{list.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>);
    list = [];
  }

  for (const block of blocks) {
    if (/^[*•-]\s+/.test(block)) {
      list.push(block.replace(/^[*•-]\s+/, ""));
      continue;
    }
    flushList();
    if (isHeading(block)) content.push(<h3 key={`heading-${content.length}`}>{block.replace(/:$/, "")}</h3>);
    else content.push(<p key={`paragraph-${content.length}`}>{block.replace(/:([A-Za-zÀ-ÿ])/g, ": $1")}</p>);
  }
  flushList();

  return <div className="description-body">{content}</div>;
}
