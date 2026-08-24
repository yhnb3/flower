import React, { useEffect, useRef, useState } from "react";
import { Check, SunMoon, X } from "lucide-react";
import "./ThemeMenu.css";

const themes = [
  { id: "light", name: "기존 라이트", description: "밝고 따뜻한 기본 화면" },
  { id: "navy", name: "네이비 데스크", description: "차분하고 집중하기 좋은 다크" },
  { id: "mauve", name: "모브 잉크", description: "부드럽고 개성 있는 다크" },
];

export default function ThemeMenu({ activeTheme, onThemeChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const optionRefs = useRef([]);
  const activeThemeMeta = themes.find((theme) => theme.id === activeTheme) ?? themes[0];

  useEffect(() => {
    if (!isOpen) return;
    const activeIndex = themes.findIndex((theme) => theme.id === activeThemeMeta.id);
    const focusFrame = window.requestAnimationFrame(() =>
      optionRefs.current[activeIndex]?.focus(),
    );

    function handleEscape(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [activeThemeMeta.id, isOpen]);

  function closeMenu() {
    triggerRef.current?.focus();
    setIsOpen(false);
  }

  function selectTheme(theme) {
    onThemeChange(theme);
    closeMenu();
  }

  function selectOptionWithKeyboard(index) {
    onThemeChange(themes[index].id);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  }

  function moveOptionSelection(index, direction) {
    const nextIndex = (index + direction + themes.length) % themes.length;
    selectOptionWithKeyboard(nextIndex);
  }

  function handlePanelKeyDown(event) {
    if (event.key !== "Tab") return;
    const focusableElements = [
      ...panelRef.current.querySelectorAll('button:not([tabindex="-1"])'),
    ];
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }

  return (
    <div className="theme-menu">
      <button
        ref={triggerRef}
        className="theme-menu-trigger"
        type="button"
        aria-label={`테마 선택, 현재 ${activeThemeMeta.name}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="theme-menu-panel"
        onClick={() => setIsOpen((current) => !current)}
      >
        <SunMoon aria-hidden="true" size={17} />
        테마
      </button>

      {isOpen ? (
        <>
          <button
            className="theme-menu-backdrop"
            type="button"
            aria-label="테마 메뉴 닫기"
            tabIndex={-1}
            onClick={closeMenu}
          />
          <section
            ref={panelRef}
            className="theme-menu-panel"
            id="theme-menu-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="theme-menu-title"
            onKeyDown={handlePanelKeyDown}
          >
            <header className="theme-menu-header">
              <div>
                <h2 id="theme-menu-title">화면 테마</h2>
                <p>선택한 테마는 이 브라우저에 저장됩니다.</p>
              </div>
              <button type="button" aria-label="테마 메뉴 닫기" onClick={closeMenu}>
                <X aria-hidden="true" size={18} />
              </button>
            </header>

            <div className="theme-menu-options" role="radiogroup" aria-label="화면 테마">
              {themes.map((theme, index) => (
                <button
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  className="theme-menu-option"
                  data-theme-option={theme.id}
                  type="button"
                  role="radio"
                  aria-checked={activeTheme === theme.id}
                  tabIndex={activeTheme === theme.id ? 0 : -1}
                  key={theme.id}
                  onClick={() => selectTheme(theme.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                      event.preventDefault();
                      moveOptionSelection(index, 1);
                    }
                    if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                      event.preventDefault();
                      moveOptionSelection(index, -1);
                    }
                    if (event.key === "Home") {
                      event.preventDefault();
                      selectOptionWithKeyboard(0);
                    }
                    if (event.key === "End") {
                      event.preventDefault();
                      selectOptionWithKeyboard(themes.length - 1);
                    }
                  }}
                >
                  <span className="theme-menu-swatches" aria-hidden="true">
                    <span className="theme-menu-swatch is-canvas" />
                    <span className="theme-menu-swatch is-surface" />
                    <span className="theme-menu-swatch is-accent" />
                  </span>
                  <span className="theme-menu-option-copy">
                    <strong>{theme.name}</strong>
                    <small>{theme.description}</small>
                  </span>
                  <span className="theme-menu-check" aria-hidden="true">
                    {activeTheme === theme.id ? <Check size={18} /> : null}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
