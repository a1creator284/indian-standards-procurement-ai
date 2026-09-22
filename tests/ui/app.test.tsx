// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { installApiFetchMock, installBrowserShims } from './setup';
import type * as PdfModule from '@/services/pdf';

// React Flow needs real layout; the canvas is replaced by a light stub so the page logic is still exercised.
vi.mock('@/components/graph/StandardsGraph', () => ({
  StandardsGraph: ({ graph }: { graph: { nodes: unknown[]; edges: unknown[] } }) => <div data-testid="graph-stub">{graph.nodes.length} nodes / {graph.edges.length} edges</div>,
  GraphLegend: () => <div data-testid="graph-legend" />,
}));

// PDF extraction is exercised through a controllable stub (pdf.js needs a real browser canvas).
vi.mock('@/services/pdf', async () => {
  const actual = await vi.importActual<typeof PdfModule>('@/services/pdf');
  return {
    ...actual,
    extractPdfText: vi.fn(async (file: File, maxMb: number, onProgress?: (d: number, t: number) => void) => {
      actual.validatePdfFile(file, maxMb);
      if (file.name === 'scanned.pdf') throw new actual.PdfError('No selectable text was found — this looks like a scanned PDF.', 'needs-ocr');
      onProgress?.(1, 2);
      onProgress?.(2, 2);
      const text = 'Supply of PVC insulated copper cables 2.5 sq mm as per IS 694:1990. Quantity 5000 m.';
      return { text, pageCount: 2, pagesWithText: 2, fileName: file.name, sizeBytes: file.size, needsOcr: false, preview: text };
    }),
  };
});

import App from '@/App';

async function renderAt(path: string) {
  window.history.pushState({}, '', path);
  const utils = render(<App />);
  return utils;
}

const user = userEvent.setup();

describe('IS Copilot UI', () => {
  beforeAll(() => {
    installBrowserShims();
    installApiFetchMock();
  });
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders the dashboard with its primary actions and live system status', async () => {
    await renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Make every tender easier/);
    expect(screen.getByRole('link', { name: /Start an analysis/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Upload tender/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText(/Demo mode/).length).toBeGreaterThan(0));
    expect(await screen.findByText(/No analyses yet/)).toBeInTheDocument();
  });

  it('shows empty states on analysis-dependent pages and a 404 page', async () => {
    await renderAt('/results');
    expect(await screen.findByText('No analysis yet')).toBeInTheDocument();
    cleanup();
    await renderAt('/gaps');
    expect(await screen.findByText('No analysis to review')).toBeInTheDocument();
    cleanup();
    await renderAt('/spec');
    expect(await screen.findByText('No analysis selected')).toBeInTheDocument();
    cleanup();
    await renderAt('/graph');
    expect(await screen.findByText('No graph to display yet')).toBeInTheDocument();
    cleanup();
    await renderAt('/history');
    expect(await screen.findByText('No searches yet')).toBeInTheDocument();
    cleanup();
    await renderAt('/does-not-exist');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });

  it('navigates through the sidebar', async () => {
    await renderAt('/');
    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByRole('link', { name: /Analyze Specification/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Turn a procurement brief into standards-ready evidence/ })).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: /Standards Explorer/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Standards Explorer/ })).toBeInTheDocument();
    await user.click(within(nav).getByRole('link', { name: /Search History/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Search History/ })).toBeInTheDocument();
  });

  it('runs the judge demo flow: analyze → results → certification → gaps → graph → spec → history', async () => {
    await renderAt('/');
    await user.click(screen.getByRole('link', { name: /Start an analysis/ }));
    await user.click(screen.getByText(/LED street lighting/i));
    const textarea = screen.getByLabelText(/Describe the product/) as HTMLTextAreaElement;
    expect(textarea.value).toMatch(/LED street lighting system/);
    await user.click(screen.getByRole('button', { name: /Analyze Standards/ }));

    // Results page
    expect(await screen.findByRole('heading', { level: 1, name: /Analysis results/ }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getAllByText('IS 10322 (Part 5/Sec 3)').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Very High/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Recommended because the input specifies/).length).toBeGreaterThan(0);
    expect(screen.getByText('Why it is relevant')).toBeInTheDocument();
    expect(screen.getByText('AI Recommendation Confidence')).toBeInTheDocument();
    expect(screen.getAllByText('Demo dataset').length).toBeGreaterThan(0);
    expect(screen.getByText('Extracted requirements (7)')).toBeInTheDocument();

    // Certification tab
    await user.click(screen.getByRole('tab', { name: /Certification/ }));
    expect((await screen.findAllByText(/Compulsory Registration Scheme/)).length).toBeGreaterThan(0);
    expect(screen.getByText(/not a legal determination/)).toBeInTheDocument();

    // Gaps tab
    await user.click(screen.getByRole('tab', { name: /Potential Gaps/ }));
    expect(await screen.findByText(/No safety requirements found in the input/)).toBeInTheDocument();
    expect(screen.getAllByText('Suggested action').length).toBeGreaterThan(0);

    // Outdated tab — no references in this query
    await user.click(screen.getByRole('tab', { name: /Outdated References/ }));
    expect(await screen.findByText(/No standard references found in the input/)).toBeInTheDocument();

    // Graph tab
    await user.click(screen.getByRole('tab', { name: /Knowledge Graph/ }));
    expect(await screen.findByTestId('graph-stub')).toHaveTextContent(/nodes/);

    // Open a standard detail drawer from the top recommendation
    await user.click(screen.getByRole('tab', { name: /Top Recommended/ }));
    await user.click(screen.getByRole('button', { name: /Open standard details/ }));
    expect(await screen.findByText('Scope summary (representative)')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    // Spec page
    await user.click(screen.getByRole('button', { name: /Generate Standards-Ready Specification/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Standards-Ready Specification/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Generate specification/ }));
    expect(await screen.findByText('3. Applicable Standards (AI-recommended)')).toBeInTheDocument();
    expect(screen.getAllByText(/AI-generated draft/).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /^Edit$/ })[0]);
    expect(screen.getByLabelText(/Edit 1\. Product/)).toBeInTheDocument();

    // Gap analysis page for the same analysis
    const nav = screen.getByRole('navigation');
    await user.click(within(nav).getByRole('link', { name: /Gap Analysis/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Tender Gap Analysis/ })).toBeInTheDocument();
    expect(screen.getAllByText(/high priority/).length).toBeGreaterThan(0);

    // Graph page
    await user.click(within(nav).getByRole('link', { name: /Relationship Graph/ }));
    expect(await screen.findByTestId('graph-stub')).toBeInTheDocument();
    expect(screen.getByText(/Click any node/)).toBeInTheDocument();

    // History page lists the analysis and can reopen it
    await user.click(within(nav).getByRole('link', { name: /Search History/ }));
    expect(await screen.findByText(/Stored in this browser/)).toBeInTheDocument();
    expect(screen.getByText('IS 10322 (Part 5/Sec 3)')).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Reopen' }));
    expect(await screen.findByRole('heading', { level: 1, name: /Analysis results/ })).toBeInTheDocument();
  }, 30000);

  it('checks outdated references for pasted tender clauses', async () => {
    await renderAt('/analyze');
    const textarea = await screen.findByLabelText(/Describe the product/);
    await user.type(textarea, 'PVC cables as per IS 694:1990 and switchgear as per IS 13947');
    await user.click(screen.getByRole('button', { name: /Analyze Standards/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Analysis results/ }, { timeout: 8000 })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Outdated References/ }));
    expect(await screen.findByText('Potentially outdated')).toBeInTheDocument();
    expect(screen.getByText('Superseded (indexed)')).toBeInTheDocument();
    expect(screen.getByText(/does not confirm official currency/)).toBeInTheDocument();
  }, 20000);

  it('explorer searches, filters and opens details', async () => {
    await renderAt('/explorer');
    expect(await screen.findByText('IS 73')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Search standards'), 'xlpe');
    expect(await screen.findByText('IS 7098 (Part 1)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('IS 73')).not.toBeInTheDocument());
    await user.click(screen.getByText('IS 7098 (Part 1)'));
    expect((await screen.findAllByText(/Crosslinked polyethylene/)).length).toBeGreaterThan(1);
    expect(await screen.findByText('Relationships')).toBeInTheDocument();
  });

  it('handles PDF upload states: validation, progress, preview, scanned-PDF error', async () => {
    await renderAt('/upload');
    const input = (await screen.findByLabelText('Choose a PDF file')) as HTMLInputElement;
    const anyFile = userEvent.setup({ applyAccept: false });

    await anyFile.upload(input, new File(['x'], 'notes.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Only PDF files are supported.')).toBeInTheDocument();

    await user.upload(input, new File(['%PDF'], 'scanned.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Scanned PDF detected')).toBeInTheDocument();

    await user.upload(input, new File(['%PDF-1.4 tender'], 'tender.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('tender.pdf')).toBeInTheDocument();
    expect(screen.getByText('Document preview')).toBeInTheDocument();
    expect(screen.getByText(/IS 694:1990/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Analyze Tender/ }));
    expect(await screen.findByRole('heading', { level: 1, name: /Analysis results/ }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText('PDF')).toBeInTheDocument();
  }, 20000);

  it('copilot panel answers grounded questions', async () => {
    await renderAt('/');
    await user.click(await screen.findByRole('button', { name: /Ask Copilot/ }));
    expect(await screen.findByText('IS Copilot Assistant')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Ask the assistant'), 'standards for solar inverter');
    await user.keyboard('{Enter}');
    expect(await screen.findByText(/Closest indexed standards/)).toBeInTheDocument();
    expect(screen.getAllByText('IS 16221 (Part 2)').length).toBeGreaterThan(0);
  });
});
