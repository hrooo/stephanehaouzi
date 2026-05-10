import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Coupe du Monde Famille — Paris 2026",
  description:
    "Plateforme de paris familiale pour la Coupe du Monde 2026. Devine les qualifiés et les scores, gagne des points.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
