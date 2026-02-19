import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ExplanationItem {
  title: string;
  content: string;
}

interface ExplanationAccordionProps {
  items: ExplanationItem[];
}

export function ExplanationAccordion({ items }: ExplanationAccordionProps) {
  return (
    <Accordion type="multiple" className="w-full">
      {items.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
          <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
            {item.title}
          </AccordionTrigger>
          <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
            {item.content}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
