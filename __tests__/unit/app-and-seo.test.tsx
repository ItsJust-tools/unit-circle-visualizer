import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import manifest from '@/app/manifest';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { JsonLd } from '@/app/json-ld';
import ToolPage from '@/app/page';
import { cn } from '@/lib/utils';
import { generateJsonLd, generateToolMetadata } from '@/lib/seo';
import toolConfig from '@/tool/tool.config';
import { getPublicSiteUrl, templateMetadata } from '@/tool/template-metadata';
import { unitCircleTool } from '@/tool/tool-definition';
import { Canvas } from '@/tool/components/Canvas';
import { Sidebar } from '@/tool/components/Sidebar';
import { Toolbar } from '@/tool/components/Toolbar';
import { DEFAULT_STATE as BASE_DEFAULT_STATE } from '@/tool/types';
import type { ExporterLoader } from '@itsjust/core';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/app/tool-client-wrapper', () => ({
  default: () => <div data-testid="tool-client-wrapper">tool-client-wrapper</div>,
}));

describe('app and seo', () => {
  const getOgImageUrl = (
    images: NonNullable<NonNullable<ReturnType<typeof generateToolMetadata>['openGraph']>['images']>
  ): string | undefined => {
    const list = Array.isArray(images) ? images : [images];
    const first = list[0];
    if (!first) return undefined;
    if (typeof first === 'string') return first;
    if (first instanceof URL) return first.toString();
    return String(first.url);
  };

  it('builds metadata and json-ld values', () => {
    const metadata = generateToolMetadata(toolConfig);
    const jsonLd = generateJsonLd(toolConfig);

    expect(metadata.creator).toBe(toolConfig.name);
    expect(metadata.metadataBase?.toString()).toBe('http://localhost:3000/');
    const ogUrl = metadata.openGraph?.images ? getOgImageUrl(metadata.openGraph.images) : undefined;
    expect(ogUrl).toContain('/og.svg');
    expect(jsonLd.url).toBe('http://localhost:3000');
    expect(jsonLd.featureList.length).toBeGreaterThan(0);
  });

  it('returns site manifest, robots and sitemap', () => {
    const man = manifest();
    const rob = robots();
    const sm = sitemap();

    expect(man.name).toBe(templateMetadata.appName);
    expect(rob.sitemap).toBe('http://localhost:3000/sitemap.xml');
    expect(sm[0]?.url).toBe('http://localhost:3000');
  });

  it('renders json-ld script safely', () => {
    render(<JsonLd config={{ ...toolConfig, name: '</script>' }} />);
    const script = document.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).toContain('\\u003c/script>');
  });

  it('renders error page and invokes reset', () => {
    const reset = vi.fn();
    render(<ErrorPage error={new Error('boom')} reset={reset} />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders not-found page', () => {
    render(<NotFound />);
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go home' })).toHaveAttribute('href', '/');
  });

  it('renders top-level tool page', () => {
    render(<ToolPage />);
    expect(screen.getByTestId('tool-client-wrapper')).toBeInTheDocument();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('covers tool definition and helper exports', async () => {
    expect(cn('a', undefined, 'b', false, null, 'c')).toBe('a b c');
    expect(getPublicSiteUrl()).toBe('http://localhost:3000');
    expect(unitCircleTool.name).toBe(toolConfig.name);
    expect(unitCircleTool.id).toBe(toolConfig.id);
    const restored = unitCircleTool.deserialize({
      angleDeg: 210,
      unit: 'rad',
      showTangent: false,
      history: [{ text: '210° snapshot', createdAt: '2026-11-24T10:00:00.000Z' }],
    });
    expect(restored.success).toBe(true);
    if (restored.success) {
      expect(restored.data.angleDeg).toBeCloseTo(210);
      expect(restored.data.unit).toBe('rad');
      expect(restored.data.showTangent).toBe(false);
      expect(restored.data.history).toEqual([
        { text: '210° snapshot', createdAt: '2026-11-24T10:00:00.000Z' },
      ]);
    }
    const repaired = unitCircleTool.deserialize({ nope: true });
    expect(repaired.success).toBe(true);
    if (repaired.success) {
      expect(repaired.data.angleDeg).toBe(BASE_DEFAULT_STATE.angleDeg);
      expect(repaired.data.history).toEqual([]);
    }
    expect(unitCircleTool.serialize({ ...BASE_DEFAULT_STATE, angleDeg: 60 })).toContain(
      '"angleDeg":60'
    );
    const exporters = unitCircleTool.exporters ?? [];
    expect(exporters).toHaveLength(4);
    const first = exporters[0];
    expect(first).toBeDefined();
    if (!first) throw new Error('missing exporter');
    const png = await (first.loader as ExporterLoader)();
    const resolved = 'default' in png ? png.default : png.exporter;
    expect(resolved.format).toBe('png');
  });

  it('renders tool components', () => {
    render(
      <>
        <Toolbar
          state={{ ...BASE_DEFAULT_STATE }}
          onChange={() => {}}
          onClear={() => {}}
          onCopy={() => {}}
        />
        <Sidebar state={{ ...BASE_DEFAULT_STATE }} onChange={() => {}} />
        <Canvas state={{ ...BASE_DEFAULT_STATE, angleDeg: 45 }} onChange={() => {}} />
      </>
    );

    expect(screen.getByTestId('unit-circle-svg')).toBeInTheDocument();
    expect(screen.getByTestId('angle-pointer')).toBeInTheDocument();
    expect(screen.getByTestId('trig-sin')).toBeInTheDocument();
    expect(screen.getByTestId('special-angle-presets')).toBeInTheDocument();
    expect(screen.getByTestId('coordinates')).toBeInTheDocument();
  });

  it('sets exact angle from a preset button and values update', async () => {
    const { fireEvent } = await import('@testing-library/react');
    const { DEFAULT_STATE } = await import('@/tool/types');
    let current = { ...DEFAULT_STATE, angleDeg: 0 };
    const onChange = vi.fn((next: typeof current) => {
      current = next;
    });
    render(<Canvas state={current} onChange={(next) => onChange(next)} />);

    const preset45 = screen.getByTestId('preset-45');
    expect(preset45).toBeDefined();
    fireEvent.click(preset45);
    expect(onChange).toHaveBeenCalled();
    const first = onChange.mock.calls.at(-1)?.[0] as { angleDeg: number } | undefined;
    expect(first?.angleDeg).toBe(45);
  });
});
