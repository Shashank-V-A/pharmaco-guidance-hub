interface Variant {
  rsid: string;
  gene: string;
  allele: string;
  function: string;
}

interface VariantTableProps {
  variants: Variant[];
}

export function VariantTable({ variants }: VariantTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              rsID
            </th>
            <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Gene
            </th>
            <th className="pb-2 pr-4 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Allele
            </th>
            <th className="pb-2 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Function
            </th>
          </tr>
        </thead>
        <tbody>
          {variants.map((v) => (
            <tr key={v.rsid} className="border-b border-border/50 last:border-0">
              <td className="py-2.5 pr-4 font-mono text-xs text-primary">{v.rsid}</td>
              <td className="py-2.5 pr-4 font-medium">{v.gene}</td>
              <td className="py-2.5 pr-4 font-mono text-xs">{v.allele}</td>
              <td className="py-2.5 text-muted-foreground">{v.function}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
