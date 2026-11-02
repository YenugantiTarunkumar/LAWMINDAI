
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import {
  ChevronRight,
  CircleHelp,
  Scale,
  Sparkles,
} from "lucide-react";
import UserNav from "@/components/UserNav";
import SidebarNavigation from "@/components/SidebarNavigation";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LawMind AI | Legal Intelligence Workspace",
  description:
    "AI-assisted contract review, legal analysis and document drafting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <div className="app-shell">
          <aside className="app-sidebar">
            <Link href="/" className="brand">
              <div className="brand-mark">
                <Scale size={21} strokeWidth={2.1} />
              </div>
              <div className="min-w-0">
                <span className="brand-name">LawMind AI</span>
                <span className="brand-caption">LEGAL INTELLIGENCE</span>
              </div>
            </Link>

            <div className="workspace-label">
              <span className="workspace-dot" />
              Personal Workspace
              <ChevronRight size={14} className="ml-auto text-slate-400" />
            </div>

            <SidebarNavigation />

            <div className="sidebar-bottom">
              <div className="sidebar-help">
                <div className="help-icon">
                  <Sparkles size={17} />
                </div>
                <div>
                  <p className="help-title">Legal work, simplified.</p>
                  <p className="help-description">
                    Review documents with AI-assisted insights.
                  </p>
                </div>
              </div>

              <div className="sidebar-user">
                <UserNav />
              </div>

              <div className="sidebar-disclaimer">
                <CircleHelp size={13} />
                <span>AI-assisted information, not legal advice.</span>
              </div>
            </div>
          </aside>

          <div className="app-main">
            <header className="app-header">
              <div className="header-breadcrumb">
                <span>Workspace</span>
                <ChevronRight size={14} />
                <strong>LawMind AI</strong>
              </div>

              <div className="header-actions">
                <div className="system-status">
                  <span className="status-dot" />
                  Workspace ready
                </div>
                <div className="header-divider" />
                <div className="header-avatar" aria-label="LawMind AI">
                  <Scale size={17} />
                </div>
              </div>
            </header>

            <main className="app-content">{children}</main>

            <footer className="app-footer">
              <span>© 2026 LawMind AI</span>
              <span>AI-assisted legal intelligence</span>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
