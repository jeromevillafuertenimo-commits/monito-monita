"use client";

// Searchable combobox (Combobox / Searchable Dropdown / Type-ahead Filter).
// Used for the Color and Flower/Animal pickers — the lists are long
// (40–100 items), so participants can TYPE to filter (e.g. "gum" → Gumamela)
// instead of scrolling. Elderly-friendly: large tap targets (min-h-11),
// text-base font, keyboard support (type + ↑↓ + Enter), and a clear
// "walang nahanap" empty state.
import { useState } from "react";
import { Check, ChevronsUpDown, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

interface ComboboxProps {
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  /** Accessible label for the trigger button (e.g. "Color ng identity code"). */
  label?: string;
  className?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder = "I-type para maghanap…",
  emptyText = "Walang nahanap na tugma.",
  disabled = false,
  invalid = false,
  id,
  label,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          type="button"
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid || undefined}
          aria-label={label}
          className={cn(
            "w-full min-h-11 justify-between rounded-lg px-3 text-left text-base font-normal",
            !value && "text-muted-foreground",
            invalid && "border-destructive focus-visible:ring-destructive",
            className
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-[var(--radix-popover-trigger-width)] min-w-[240px] rounded-lg border-xmas-forest/20 p-0 shadow-lg"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-11 text-base"
            aria-label={searchPlaceholder}
          />
          <CommandList className="nice-scroll max-h-[min(20rem,45vh)]">
            <CommandEmpty className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
              <SearchX className="h-6 w-6 opacity-50" aria-hidden />
              <span>{emptyText}</span>
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const selected = value === option;
                return (
                  <CommandItem
                    key={option}
                    value={option}
                    onSelect={() => {
                      onChange(option);
                      setOpen(false);
                    }}
                    className={cn(
                      "min-h-11 cursor-pointer rounded-md px-3 text-base",
                      selected && "bg-xmas-forest/10"
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-1 h-4 w-4 shrink-0",
                        selected ? "text-xmas-forest opacity-100" : "opacity-0"
                      )}
                      aria-hidden
                    />
                    <span className={cn("font-medium", selected && "text-xmas-forest")}>
                      {option}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
