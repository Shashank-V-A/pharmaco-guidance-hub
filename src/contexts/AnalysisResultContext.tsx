import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult } from "@/types/analysis";

interface AnalysisResultContextValue {
  result: AnalysisResult | null;
  setResult: (result: AnalysisResult) => void;
  clearResult: () => void;
}

const AnalysisResultContext = createContext<AnalysisResultContextValue | null>(null);

export function AnalysisResultProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<AnalysisResult | null>(null);

  const setResult = useCallback((value: AnalysisResult) => {
    setResultState(value);
  }, []);

  const clearResult = useCallback(() => {
    setResultState(null);
  }, []);

  return (
    <AnalysisResultContext.Provider
      value={{ result, setResult, clearResult }}
    >
      {children}
    </AnalysisResultContext.Provider>
  );
}

export function useAnalysisResult() {
  const ctx = useContext(AnalysisResultContext);
  if (!ctx) {
    throw new Error("useAnalysisResult must be used within AnalysisResultProvider");
  }
  return ctx;
}
