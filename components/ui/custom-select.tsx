"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  prefix?: string;
}

/**
 * 🌲 FlameHub Shared Custom Select Dropdown Component
 * Features:
 * - Ultra-modern emerald glassmorphism menu card
 * - Smooth fade-in & zoom micro-animations
 * - Click-outside and Escape key auto-dismissal
 * - Keyboard accessible with active check indicators
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  prefix,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-3 bg-[#00472f] hover:bg-[#005237] border text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 shadow-sm transition-all cursor-pointer focus:outline-none ${
          isOpen
            ? "border-[#94d3a2] ring-2 ring-[#94d3a2]/20 bg-[#005237]"
            : "border-[#005a3c] hover:border-[#94d3a2]/50"
        }`}
      >
        <span className="truncate">
          {prefix && <span className="text-emerald-200/60 font-normal mr-1.5">{prefix}:</span>}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-emerald-300 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      {/* Floating Glassmorphic Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-full min-w-[170px] max-h-60 overflow-y-auto bg-[#003825] border border-[#005a3c] rounded-xl shadow-2xl p-1.5 z-40 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md [scrollbar-width:thin] [scrollbar-color:#005a3c_transparent]">
          <div className="space-y-0.5">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs sm:text-sm rounded-lg transition-all text-left cursor-pointer ${
                    isSelected
                      ? "bg-[#004e34] text-white font-bold shadow-xs"
                      : "text-emerald-100/90 hover:text-white hover:bg-[#004e34]/60 font-medium"
                  }`}
                >
                  <span className="truncate">{option.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#94d3a2] shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
