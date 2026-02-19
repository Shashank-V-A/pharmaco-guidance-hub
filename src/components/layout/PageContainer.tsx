import { ReactNode } from "react";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = "" }: PageContainerProps) {
  return (
    <main className={`flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 ${className}`}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </main>
  );
}
