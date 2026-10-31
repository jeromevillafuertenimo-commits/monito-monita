"use client";

// 6-digit PIN input with an eye button to show/hide the digits.
// Hidden by default so nobody can read the PIN over a shoulder.
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot, PinMaskContext } from "@/components/ui/input-otp";

interface PinInputProps {
  value: string;
  onChange: (v: string) => void;
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
  disabled?: boolean;
  slotClassName?: string;
  className?: string;
}

export function PinInput({
  value,
  onChange,
  id,
  ariaLabel = "6-digit PIN",
  invalid,
  disabled,
  slotClassName,
  className,
}: PinInputProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cn("flex w-full min-w-0 items-center gap-2", className)}>
      <PinMaskContext.Provider value={!visible}>
        <InputOTP
          id={id}
          maxLength={6}
          pattern={REGEXP_ONLY_DIGITS}
          value={value}
          onChange={onChange}
          inputMode="numeric"
          autoComplete="off"
          aria-label={ariaLabel}
          aria-invalid={invalid || undefined}
          disabled={disabled}
          containerClassName="min-w-0 flex-1"
        >
          <InputOTPGroup className="w-full max-w-[18rem]">
            {Array.from({ length: 6 }, (_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className={cn("h-12 w-auto min-w-0 flex-1 border-xmas-forest/30 text-lg", slotClassName)}
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </PinMaskContext.Provider>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Itago ang PIN" : "Ipakita ang PIN"}
        aria-pressed={visible}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-xmas-forest hover:bg-accent focus-visible:outline-2 focus-visible:outline-xmas-gold"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}
