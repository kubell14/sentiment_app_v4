import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "./ui/tooltip";

export interface InfoTooltipProps {
  /** Explanation text shown on hover/focus. Keep it plain-English. */
  text: string;
  /** Optional className for the trigger icon. */
  className?: string;
  /** Accessible label; defaults to "More information". */
  label?: string;
}

/**
 * Small "ⓘ" affordance that reveals a methodology explanation on hover/focus.
 * Use this instead of a static subtitle so the chart/metric stays uncluttered
 * for a leadership audience while the "how is this calculated" detail stays one
 * hover away.
 */
export function InfoTooltip({ text, className, label = "More information" }: InfoTooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={`inline-flex items-center justify-center text-muted-foreground/70 hover:text-foreground transition-colors align-middle ${className ?? ""}`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs bg-popover text-popover-foreground border border-border shadow-md text-xs leading-relaxed">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
