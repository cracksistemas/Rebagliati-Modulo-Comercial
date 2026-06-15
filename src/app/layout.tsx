import type { Metadata } from "next";
import "./globals.css";
import "@/components/goals/goals.css";
import "@/components/sales/sales.css";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Rebagliati Modulo Comercial",
  description: "Ranking, control de ventas y mapa comercial interno",
  icons: {
    icon: "/brand/favicon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
