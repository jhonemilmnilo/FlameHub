import Image from "next/image";
import React from "react";

export function FlameHubLogo({ className = "w-20 h-24" }: { className?: string }) {
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <Image
        src="/images/unnamed.png"
        alt="FlameHub Logo"
        width={140}
        height={160}
        priority
        className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
      />
    </div>
  );
}
