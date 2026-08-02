import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Tekken 8 Tournament Overlay",
  description: "Highly customizable Tekken 8 overlay for OBS and Vercel.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
