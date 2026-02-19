import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { AnalyzeApiResponse } from "@/lib/api";

interface AnalysisResultContextValue {
  result: AnalysisResult | null;
  apiResponse: AnalyzeApiResponse | null;
  setResult: (result: AnalysisResult) => void;
  setResultAndApi: (result: AnalysisResult, apiResponse: AnalyzeApiResponse) => void;
  clearResult: () => void;
}

const AnalysisResultContext = createContext<AnalysisResultContextValue | null>(null);

export function AnalysisResultProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<AnalysisResult | null>(null);
  const [apiResponse, setApiResponseState] = useState<AnalyzeApiResponse | null>(null);

  const setResult = useCallback((value: AnalysisResult) => {
    setResultState(value);
    setApiResponseState(null);
  }, []);

  const setResultAndApi = useCallback((value: AnalysisResult, api: AnalyzeApiResponse) => {
    setResultState(value);
    setApiResponseState(api);
  }, []);

  const clearResult = useCallback(() => {
    setResultState(null);
    setApiResponseState(null);
  }, []);

  return (
    <AnalysisResultContext.Provider
      value={{ result, apiResponse, setResult, setResultAndApi, clearResult }}
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
