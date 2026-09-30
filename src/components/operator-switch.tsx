"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import { HOUSEHOLD, type OperatorId } from "@/lib/household";
import { Button } from "@/components/ui/button";

const KEY = "northbridge-operator";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

function readOperator(): OperatorId {
  const stored = window.localStorage.getItem(KEY);
  return stored === "avery" || stored === "morgan" ? stored : "morgan";
}

const OperatorContext = createContext<{
  operator: OperatorId;
  setOperator: (id: OperatorId) => void;
}>({ operator: "morgan", setOperator: () => undefined });

export function OperatorProvider({ children }: { children: React.ReactNode }) {
  const operator = useSyncExternalStore(subscribe, readOperator, () => "morgan" as OperatorId);
  const setOperator = useCallback((id: OperatorId) => {
    window.localStorage.setItem(KEY, id);
    window.dispatchEvent(new Event("storage"));
  }, []);
  return (
    <OperatorContext.Provider value={{ operator, setOperator }}>
      {children}
    </OperatorContext.Provider>
  );
}

export function useOperator() {
  const ctx = useContext(OperatorContext);
  return [ctx.operator, ctx.setOperator] as const;
}

export function OperatorSwitch() {
  const { operator, setOperator } = useContext(OperatorContext);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Acting as</span>
      {(Object.keys(HOUSEHOLD.operators) as OperatorId[]).map((id) => {
        const person = HOUSEHOLD.operators[id];
        const active = operator === id;
        return (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={active ? "default" : "outline"}
            onClick={() => setOperator(id)}
          >
            {person.name} · {person.role}
          </Button>
        );
      })}
    </div>
  );
}
