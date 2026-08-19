"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Check } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface SearchableDropdownProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  error?: string;
  disabled?: boolean;
}

/**
 * 🎨 FlameHub Searchable Emerald Combobox / Dropdown Component
 * Features:
 * - Live dynamic search filtering (by name, code, or description)
 * - Click-outside & Escape key listeners
 * - Emerald glassmorphism design with high-contrast text
 * - Auto-scrollable with badges
 */
export function SearchableDropdown({
  name,
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  error,
  disabled = false,
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Filter options dynamically
  const filteredOptions = options.filter((opt) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      opt.label.toLowerCase().includes(query) ||
      opt.value.toLowerCase().includes(query) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(query))
    );
  });

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auto-focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    } else {
      setSearchQuery("");
    }
  }, [isOpen]);

  // Handle keyboard navigation (Escape to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Hidden native input for form compatibility */}
      <input type="hidden" name={name} value={value} />

      {/* Main Dropdown Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-[#00462e] border ${
          error
            ? "border-rose-400 ring-1 ring-rose-400/80 bg-[#401212]/30"
            : "border-[#22c55e]/40 focus:ring-1 focus:ring-[#22c55e] focus:border-[#22c55e]"
        } rounded-lg px-3.5 py-2.5 text-sm text-white flex items-center justify-between transition-all cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <div className="flex items-center gap-2 truncate pr-2">
          {selectedOption ? (
            <>
              {selectedOption.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-black uppercase rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                  {selectedOption.badge}
                </span>
              )}
              <span className="truncate text-white font-medium text-xs sm:text-sm">
                {selectedOption.label}
              </span>
            </>
          ) : (
            <span className="text-white/40 text-xs sm:text-sm">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={`w-4 h-4 text-emerald-300 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-emerald-400" : ""
          }`}
        />
      </button>

      {/* Floating Searchable Menu Panel */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-[#003825] border border-emerald-500/40 rounded-md shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-md animate-fadeIn">
          {/* Search Input Bar */}
          <div className="p-2 border-b border-emerald-500/20 bg-[#002f1f]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-emerald-400/70" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-[#00462e] border border-emerald-500/30 rounded px-2.5 py-1.5 pl-8 text-xs text-white placeholder-white/40 focus:outline-none focus:border-emerald-400 transition-all"
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-emerald-500/30 scrollbar-track-transparent">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-emerald-600/30 text-emerald-200 font-semibold"
                        : "text-white/90 hover:bg-emerald-500/20 hover:text-white"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        {option.badge && (
                          <span className="px-1 py-0.2 text-[9px] font-bold uppercase rounded bg-emerald-500/25 text-emerald-300 shrink-0">
                            {option.badge}
                          </span>
                        )}
                        <span className="truncate">{option.label}</span>
                      </div>
                      {option.subLabel && (
                        <span className="text-[10px] text-white/50 truncate">
                          {option.subLabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-4 text-center text-xs text-white/40">
                No matching departments found
              </div>
            )}
          </div>
        </div>
      )}

      {error && <p className="text-xs text-rose-300 mt-1">{error}</p>}
    </div>
  );
}
