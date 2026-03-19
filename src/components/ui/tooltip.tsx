interface TooltipProps {
  content: string;
  children: React.ReactNode;
  className?: string;
}

export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={`relative group/tooltip inline-flex ${className ?? ""}`}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-md bg-popover text-popover-foreground border border-border shadow-md px-2.5 py-1.5 text-xs leading-snug invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 transition-opacity duration-150 motion-reduce:transition-none z-50"
      >
        {content}
      </span>
    </span>
  );
}
