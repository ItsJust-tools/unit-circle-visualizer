'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import { ToolShell, useTool, ImportExport } from '@itsjust/core';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { toolConfig, templateBaseVersion, Canvas, Toolbar, Sidebar, trigSummary } from '@/tool';
import { unitCircleTool } from '@/tool/tool-definition';
import { withHistory } from '@/tool/tool-definition';
import type { ToolState } from '@/tool/types';

export default function ToolClient() {
  const ToolShellCompat = ToolShell as unknown as ComponentType<Record<string, unknown>> & {
    Toolbar?: ComponentType<{ children?: ReactNode }>;
    Body?: ComponentType<{ children?: ReactNode }>;
    Sidebar?: ComponentType<{ children?: ReactNode }>;
    Canvas?: ComponentType<{ children?: ReactNode }>;
    StatusBar?: ComponentType<{ children?: ReactNode }>;
  };
  const canvasRef = useRef<HTMLDivElement>(null);
  const tool = useTool<ToolState>(unitCircleTool, canvasRef);
  const setToolData = tool.state.setData;
  const showToast = tool.toast;
  const [isSharing, setIsSharing] = useState(false);
  const hasLoadedSharedState = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth > 768 && toolConfig.features.sidebar
  );

  const title = toolConfig.name;
  const state = tool.state.data;

  useEffect(() => {
    if (hasLoadedSharedState.current) return;
    hasLoadedSharedState.current = true;
    const params = new URLSearchParams(window.location.search);
    const encodedState = params.get('state');
    const rawAngle = params.get('angle');
    const rawUnit = params.get('unit');
    const rawTangent = params.get('tangent');

    if (!encodedState && rawAngle === null && rawUnit === null && rawTangent === null) return;

    try {
      let next: ToolState | null = null;

      if (encodedState) {
        const serialized = decompressFromEncodedURIComponent(encodedState);
        if (!serialized) throw new Error('Invalid shared URL');
        const parsed: unknown = JSON.parse(serialized);
        const deserialized = unitCircleTool.deserialize(parsed);
        if (!deserialized.success) throw new Error(deserialized.error);
        next = deserialized.data;
      }

      const current: ToolState = next ?? state;
      const patched: ToolState = { ...current };
      if (rawAngle !== null) {
        const deg = Number(rawAngle);
        if (Number.isFinite(deg)) patched.angleDeg = deg;
      }
      if (rawUnit === 'deg' || rawUnit === 'rad') patched.unit = rawUnit;
      if (rawTangent === '0' || rawTangent === '1') patched.showTangent = rawTangent === '1';

      const changed = JSON.stringify(patched) !== JSON.stringify(state) || next !== null;
      if (changed) {
        setToolData(() => patched);
        showToast('Loaded state from shared URL', 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load shared URL';
      showToast(message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopyResult = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(trigSummary(state));
      showToast('Values copied to clipboard', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy values';
      showToast(message, 'error');
    }
  }, [showToast, state]);

  const handleShare = useCallback(async () => {
    setIsSharing(true);
    try {
      const serialized = unitCircleTool.serialize(state);
      const encodedState = compressToEncodedURIComponent(serialized);
      if (!encodedState) throw new Error('Failed to encode state for URL');
      const url = new URL(window.location.href);
      url.searchParams.set('state', encodedState);
      url.searchParams.set('tool', toolConfig.id);
      url.searchParams.set('angle', String(state.angleDeg));
      url.searchParams.set('unit', state.unit);
      url.searchParams.set('tangent', state.showTangent ? '1' : '0');
      window.history.replaceState(null, '', url.toString());

      const shareUrl = url.toString();
      if (navigator.share) {
        try {
          await navigator.share({ title, url: shareUrl });
          showToast('Shared URL ready', 'success');
          return;
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') return;
        }
      }
      await navigator.clipboard.writeText(shareUrl);
      showToast('Share URL copied to clipboard', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create share URL';
      showToast(message, 'error');
    } finally {
      setIsSharing(false);
    }
  }, [showToast, state, title]);

  const toolbarContent = (
    <>
      <Toolbar
        state={state}
        onChange={(next) => setToolData(() => next)}
        onClear={() => setToolData((prev) => ({ ...prev, history: [] }))}
        onCopy={() => void handleCopyResult()}
      />
      <ImportExport
        formats={tool.supportedFormats}
        onExport={tool.handleExport}
        onImport={tool.importFromFile}
        isImporting={tool.isImporting}
        onShare={handleShare}
        isSharing={isSharing}
      />
    </>
  );

  const sidebarContent = <Sidebar state={state} onChange={(next) => setToolData(() => next)} />;

  const canvasContent = (
    <div ref={canvasRef}>
      <Canvas
        state={state}
        onChange={(next) => setToolData(() => next)}
        onSaveSnapshot={(text) => setToolData((prev) => withHistory(prev, text))}
      />
    </div>
  );

  const statusBarContent = (
    <>
      <span
        className={`status-slot status-slot-state ${tool.state.isDirty ? 'status-unsaved' : 'status-saved'}`}
      >
        {tool.state.isDirty ? (
          <>
            <span className="status-saving-dot" />
            Unsaved
          </>
        ) : tool.state.lastSaved ? (
          <>Saved {tool.state.lastSaved}</>
        ) : (
          'Ready'
        )}
      </span>
      <span className="status-slot status-slot-unit">{state.unit}</span>
      <span className="status-slot status-slot-summary" data-testid="status-summary">
        Angle {state.angleDeg}° — {state.showTangent ? 'tangent on' : 'tangent off'} —{' '}
        {state.history.length} snapshots
      </span>
      <span className="status-slot status-slot-tool-version">Tool v{toolConfig.version}</span>
      <span className="status-slot status-slot-template-version">
        Template v{templateBaseVersion}
      </span>
    </>
  );

  const hasLegacySections = Boolean(
    ToolShellCompat.Toolbar &&
    ToolShellCompat.Body &&
    ToolShellCompat.Sidebar &&
    ToolShellCompat.Canvas &&
    ToolShellCompat.StatusBar
  );

  return (
    <ToolShellCompat
      config={toolConfig}
      sidebarOpen={sidebarOpen}
      onSidebarChange={setSidebarOpen}
      toolbar={toolbarContent}
      sidebar={sidebarContent}
      canvas={canvasContent}
      statusBar={statusBarContent}
    >
      {hasLegacySections
        ? (() => {
            const ToolbarSection = ToolShellCompat.Toolbar as ComponentType<{
              children?: ReactNode;
            }>;
            const BodySection = ToolShellCompat.Body as ComponentType<{ children?: ReactNode }>;
            const SidebarSection = ToolShellCompat.Sidebar as ComponentType<{
              children?: ReactNode;
            }>;
            const CanvasSection = ToolShellCompat.Canvas as ComponentType<{
              children?: ReactNode;
            }>;
            const StatusBarSection = ToolShellCompat.StatusBar as ComponentType<{
              children?: ReactNode;
            }>;
            return (
              <>
                <ToolbarSection>{toolbarContent}</ToolbarSection>
                <BodySection>
                  <SidebarSection>{sidebarContent}</SidebarSection>
                  <CanvasSection>{canvasContent}</CanvasSection>
                </BodySection>
                <StatusBarSection>{statusBarContent}</StatusBarSection>
              </>
            );
          })()
        : null}
    </ToolShellCompat>
  );
}
