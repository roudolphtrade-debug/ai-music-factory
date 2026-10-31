import { useEffect } from "react";
import { useI18n } from "./context";
import { demoPageHead, type DemoPage } from "./demo-details";

/** Server heads use French; the active browser language is only available after hydration. */
export function useDemoPageMetadata(page: DemoPage) {
  const { lang } = useI18n();
  useEffect(() => {
    const previousTitle = document.title;
    const head = demoPageHead(page, lang);
    const title = head.meta[0].title!;
    document.title = title;
    const changes: { node: HTMLMetaElement; before: string | null; value: string }[] = [];
    for (const meta of head.meta) {
      if (!meta.content) continue;
      const selector = meta.property
        ? `meta[property="${meta.property}"]`
        : `meta[name="${meta.name}"]`;
      const node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) continue; // HeadContent owns creation and removal of route metadata.
      changes.push({ node, before: node.getAttribute("content"), value: meta.content });
      node.setAttribute("content", meta.content);
    }
    return () => {
      if (document.title === title) document.title = previousTitle;
      for (const { node, before, value } of changes) {
        if (node.isConnected && node.getAttribute("content") === value) {
          if (before === null) node.removeAttribute("content");
          else node.setAttribute("content", before);
        }
      }
    };
  }, [lang, page]);
}
