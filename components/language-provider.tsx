"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { translateToCantonese } from "@/lib/cantonese";

export type Language = "en" | "zh-HK";

type LanguageContextType = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

function subscribeToLanguage(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("obs-language-change", onChange);

  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("obs-language-change", onChange);
  };
}

function getStoredLanguage(): Language {
  return localStorage.getItem("obs-language") === "zh-HK" ? "zh-HK" : "en";
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const language = useSyncExternalStore(
    subscribeToLanguage,
    getStoredLanguage,
    () => "en"
  );

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute("data-language", language);
  }, [language]);

  useEffect(() => {
    const textRecords = new WeakMap<Text, { source: string; output: string }>();
    const trackedText = new Set<Text>();
    const attributeRecords = new WeakMap<
      HTMLElement,
      Map<string, { source: string; output: string }>
    >();
    const trackedElements = new Set<HTMLElement>();
    const attributes = ["aria-label", "placeholder", "title"];

    function isExcluded(element: Element | null) {
      return Boolean(
        element?.closest("[data-no-translate], script, style, code, pre")
      );
    }

    function translateTextNode(textNode: Text) {
      if (isExcluded(textNode.parentElement)) {
        return;
      }

      const current = textNode.nodeValue ?? "";
      const previous = textRecords.get(textNode);

      if (previous?.output === current) {
        return;
      }

      const source = previous && current === previous.source ? previous.source : current;
      const output = translateToCantonese(source);
      textRecords.set(textNode, { source, output });
      trackedText.add(textNode);

      if (output !== current) {
        textNode.nodeValue = output;
      }
    }

    function translateAttributes(element: HTMLElement) {
      if (isExcluded(element)) {
        return;
      }

      const records = attributeRecords.get(element) ?? new Map();

      for (const attribute of attributes) {
        const current = element.getAttribute(attribute);
        if (!current) {
          continue;
        }

        const previous = records.get(attribute);
        if (previous?.output === current) {
          continue;
        }

        const source = previous && current === previous.source ? previous.source : current;
        const output = translateToCantonese(source);
        records.set(attribute, { source, output });

        if (output !== current) {
          element.setAttribute(attribute, output);
        }
      }

      if (records.size > 0) {
        attributeRecords.set(element, records);
        trackedElements.add(element);
      }
    }

    function translateTree(root: Node) {
      if (root.nodeType === Node.TEXT_NODE) {
        translateTextNode(root as Text);
        return;
      }

      if (!(root instanceof HTMLElement) || isExcluded(root)) {
        return;
      }

      translateAttributes(root);
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
      );

      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.nodeType === Node.TEXT_NODE) {
          translateTextNode(node as Text);
        } else if (node instanceof HTMLElement) {
          translateAttributes(node);
        }
      }
    }

    function restoreEnglish() {
      for (const textNode of trackedText) {
        const record = textRecords.get(textNode);
        if (record && textNode.isConnected && textNode.nodeValue === record.output) {
          textNode.nodeValue = record.source;
        }
      }

      for (const element of trackedElements) {
        const records = attributeRecords.get(element);
        if (!records || !element.isConnected) {
          continue;
        }

        for (const [attribute, record] of records) {
          if (element.getAttribute(attribute) === record.output) {
            element.setAttribute(attribute, record.source);
          }
        }
      }
    }

    if (language === "en") {
      restoreEnglish();
      return;
    }

    const originalConfirm = window.confirm.bind(window);
    window.confirm = (message?: string) =>
      originalConfirm(translateToCantonese(String(message ?? "")));

    translateTree(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          translateTextNode(mutation.target as Text);
        } else if (mutation.type === "attributes") {
          translateAttributes(mutation.target as HTMLElement);
        } else {
          mutation.addedNodes.forEach(translateTree);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: attributes,
    });

    return () => {
      observer.disconnect();
      window.confirm = originalConfirm;
      restoreEnglish();
    };
  }, [language]);

  function setLanguage(nextLanguage: Language) {
    document.documentElement.lang = nextLanguage;
    document.documentElement.setAttribute("data-language", nextLanguage);
    localStorage.setItem("obs-language", nextLanguage);
    window.dispatchEvent(new Event("obs-language-change"));
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}