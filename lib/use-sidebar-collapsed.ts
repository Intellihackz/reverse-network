import { useSyncExternalStore } from "react";

const KEY = "reverse:sidebar-collapsed";
const EVENT = "reverse:sidebar-collapsed-change";

// Used when the browser blocks storage, so the toggle still works for this visit
let memory = false;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

function getSnapshot() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return memory;
  }
}

/** Remembers whether the desktop sidebar is collapsed. Renders expanded on the server. */
export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function setCollapsed(next: boolean) {
    memory = next;
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }

  return [collapsed, setCollapsed];
}
