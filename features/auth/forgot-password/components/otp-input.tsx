"use client";

import {
  ChangeEvent,
  ClipboardEvent,
  KeyboardEvent,
  PointerEvent,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

interface OtpInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
  name?: string;
  onBlur?: () => void;
}

function clampActiveIndex(index: number, length: number) {
  return Math.min(Math.max(index, 0), length - 1);
}

export function OtpInput({
  id,
  label,
  value,
  onChange,
  length = 6,
  disabled = false,
  error,
  name,
  onBlur,
}: OtpInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const normalizedValue = value.replace(/\D/g, "").slice(0, length);
  const labelId = `${id}-label`;
  const errorId = error ? `${id}-error` : undefined;

  function setSelection(start: number, end = start) {
    inputRef.current?.focus();
    inputRef.current?.setSelectionRange(start, end);
    setActiveIndex(clampActiveIndex(start, length));
  }

  function selectSlot(index: number) {
    if (disabled) return;

    const position = Math.min(index, normalizedValue.length);
    const hasDigit = position < normalizedValue.length;
    setSelection(position, hasDigit ? position + 1 : position);
  }

  function restoreSelection(position: number) {
    requestAnimationFrame(() => {
      inputRef.current?.setSelectionRange(position, position);
    });
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const rawValue = input.value;
    const rawCursor = input.selectionStart ?? rawValue.length;
    const invalidBeforeCursor = rawValue
      .slice(0, rawCursor)
      .replace(/\d/g, "").length;
    const nextValue = rawValue.replace(/\D/g, "").slice(0, length);
    const nextCursor = Math.min(
      Math.max(rawCursor - invalidBeforeCursor, 0),
      nextValue.length,
    );

    onChange(nextValue);
    setActiveIndex(clampActiveIndex(nextCursor, length));
    restoreSelection(nextCursor);
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();

    const pastedDigits = event.clipboardData
      .getData("text")
      .replace(/\D/g, "");

    if (!pastedDigits) return;

    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? normalizedValue.length;
    const selectionEnd = input.selectionEnd ?? selectionStart;
    const isCompleteCode = pastedDigits.length >= length;
    const nextValue = isCompleteCode
      ? pastedDigits.slice(0, length)
      : [
          normalizedValue.slice(0, selectionStart),
          pastedDigits,
          normalizedValue.slice(selectionEnd),
        ]
          .join("")
          .slice(0, length);
    const nextCursor = isCompleteCode
      ? nextValue.length
      : Math.min(selectionStart + pastedDigits.length, nextValue.length);

    onChange(nextValue);
    setActiveIndex(clampActiveIndex(nextCursor, length));
    restoreSelection(nextCursor);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      selectSlot(activeIndex - 1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      selectSlot(activeIndex + 1);
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLInputElement>) {
    event.preventDefault();

    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = event.clientX - bounds.left;
    const clickedIndex = Math.floor((relativeX / bounds.width) * length);
    selectSlot(clampActiveIndex(clickedIndex, length));
  }

  return (
    <div className="flex flex-col gap-2.5">
      <label
        id={labelId}
        htmlFor={id}
        className="select-none text-sm font-medium text-[#f3eadc]"
      >
        {label}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          value={normalizedValue}
          disabled={disabled}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={length}
          aria-labelledby={labelId}
          aria-describedby={errorId}
          aria-invalid={Boolean(error)}
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0 disabled:cursor-not-allowed"
          onChange={handleChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onFocus={(event) => {
            setIsFocused(true);
            const cursor = event.currentTarget.selectionStart ?? 0;
            setActiveIndex(clampActiveIndex(cursor, length));
          }}
          onSelect={(event) => {
            const cursor = event.currentTarget.selectionStart ?? 0;
            setActiveIndex(clampActiveIndex(cursor, length));
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />

        <div
          aria-hidden="true"
          className="grid grid-cols-6 gap-2 sm:gap-3"
        >
          {Array.from({ length }, (_, index) => {
            const digit = normalizedValue[index] ?? "";
            const isActive = isFocused && index === activeIndex;

            return (
              <span
                key={index}
                className={cn(
                  "flex aspect-square min-w-0 items-center justify-center rounded-xl border bg-[#222226] text-xl font-semibold tabular-nums text-[#fffdf9]",
                  "transition-[border-color,background-color,box-shadow,opacity] duration-200",
                  digit && "border-[#8e744a] bg-[#25231f]",
                  error && "border-red-400/70 bg-red-400/[0.06]",
                  isActive &&
                    "border-[#d8bd84] bg-[#29261f] shadow-[inset_0_0_0_1px_rgba(216,189,132,0.45)]",
                  disabled && "opacity-60",
                  "sm:text-2xl",
                )}
              >
                {digit}
              </span>
            );
          })}
        </div>
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1 text-xs font-medium !text-red-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
