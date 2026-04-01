import React, { createContext, useContext, useCallback } from "react";

/* ─── Context ─── */

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tab components must be used within <Tabs>");
  return ctx;
}

/* ─── Root ─── */

interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onChange,
  children,
  className = "",
}) => (
  <TabsContext.Provider value={{ activeTab: value, setActiveTab: onChange }}>
    <div className={className}>{children}</div>
  </TabsContext.Provider>
);

/* ─── TabList ─── */

interface TabListProps {
  children: React.ReactNode;
  className?: string;
}

export const TabList: React.FC<TabListProps> = ({
  children,
  className = "",
}) => (
  <div
    role="tablist"
    className={`flex gap-1 rounded-full bg-stone-100/80 p-1 ${className}`}
  >
    {children}
  </div>
);

/* ─── Tab ─── */

interface TabProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Tab: React.FC<TabProps> = ({
  value,
  children,
  icon,
  className = "",
}) => {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      const parent = e.currentTarget.parentElement;
      if (!parent) return;

      const tabs = [
        ...parent.querySelectorAll('[role="tab"]'),
      ] as HTMLButtonElement[];
      const idx = tabs.indexOf(e.currentTarget);

      let next = -1;
      if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
      if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;

      if (next >= 0) {
        e.preventDefault();
        tabs[next].focus();
        tabs[next].click();
      }
    },
    [],
  );

  return (
    <button
      role="tab"
      type="button"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}
      onClick={() => setActiveTab(value)}
      onKeyDown={handleKeyDown}
      className={`flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 select-none ${
        isActive
          ? "bg-white text-stone-900 shadow-sm"
          : "text-stone-500 hover:text-stone-700"
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
};

/* ─── TabPanel ─── */

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  value,
  children,
  className = "",
}) => {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={`animate-fade-in ${className}`}
    >
      {children}
    </div>
  );
};
