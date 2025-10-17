import "bootstrap/dist/css/bootstrap.min.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "bootstrap/dist/css/bootstrap.min.css";
import "../globals.css";
import "react-datepicker/dist/react-datepicker.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ClientWrapper from "@/components/ClientWrapper"; // Importar ClientWrapper directamente

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Tu Ceproa",
  description: "Aplicación para la gestión y reserva de espacios y equipos.",
  icons: {
    icon: '/assets/FaviconUniva.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-100">
      <body className={`${inter.className} d-flex flex-column h-100`}>
        <ClientWrapper>
          <Header />
          <main className="flex-shrink-0">
            {children}
          </main>
          <Footer />
        </ClientWrapper>
      </body>
    </html>
  );
}
