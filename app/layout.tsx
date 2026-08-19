import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "FlameHub | University Social Community",
  description: "Connect, share, and stay updated with your campus network on FlameHub.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jakarta.variable} font-sans h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
