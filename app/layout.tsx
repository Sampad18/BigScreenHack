import type { Metadata } from "next";
import { Anton, Condiment, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });
const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });
const condiment = Condiment({ weight: "400", subsets: ["latin"], variable: "--font-condiment" });

export const metadata: Metadata = {
  title: "Helmet.io — AI-Compliant Video Generation",
  description: "Create legally compliant AI videos with automated rule checking",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} ${anton.variable} ${condiment.variable} bg-[#010828] text-[#EFF4FF] min-h-screen`}>
        {children}
        <Toaster theme="dark" position="top-right" richColors />
      </body>
    </html>
  );
}
