import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppProvider } from '@/context/AppContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { LanguageProvider } from '@/context/LanguageContext';
import { AppShell } from '@/layouts/AppShell';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CardSkeleton } from '@/components/ui';
import { DashboardPage } from '@/pages/DashboardPage';
import { AnalyzePage } from '@/pages/AnalyzePage';
import { ResultsPage } from '@/pages/ResultsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

// Heavier pages (graph, pdf.js, explorer) are code-split.
const UploadPage = lazy(() => import('@/pages/UploadPage').then((m) => ({ default: m.UploadPage })));
const ExplorerPage = lazy(() => import('@/pages/ExplorerPage').then((m) => ({ default: m.ExplorerPage })));
const GraphPage = lazy(() => import('@/pages/GraphPage').then((m) => ({ default: m.GraphPage })));
const GapsPage = lazy(() => import('@/pages/GapsPage').then((m) => ({ default: m.GapsPage })));
const SpecPage = lazy(() => import('@/pages/SpecPage').then((m) => ({ default: m.SpecPage })));
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })));
const ReportsPage = lazy(() => import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

const fallback = (
  <div className="space-y-3">
    <CardSkeleton lines={2} />
    <CardSkeleton />
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AppProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Page><DashboardPage /></Page>} />
                <Route path="analyze" element={<Page><AnalyzePage /></Page>} />
                <Route path="upload" element={<Page><UploadPage /></Page>} />
                <Route path="results/:id?" element={<Page><ResultsPage /></Page>} />
                <Route path="explorer" element={<Page><ExplorerPage /></Page>} />
                <Route path="graph/:id?" element={<Page><GraphPage /></Page>} />
                <Route path="gaps/:id?" element={<Page><GapsPage /></Page>} />
                <Route path="spec/:id?" element={<Page><SpecPage /></Page>} />
                <Route path="history" element={<Page><HistoryPage /></Page>} />
                <Route path="reports" element={<Page><ReportsPage /></Page>} />
                <Route path="about" element={<Page><AboutPage /></Page>} />
                <Route path="settings" element={<Page><SettingsPage /></Page>} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </AppProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary label="Page">
      <Suspense fallback={fallback}>{children}</Suspense>
    </ErrorBoundary>
  );
}
