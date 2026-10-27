import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Minus,
  Maximize2,
  Minimize2,
  X,
  GripHorizontal,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { usePersona } from '../../context/PersonaContext';
import ErrorBoundary from '../../components/ErrorBoundary';

export default function GlassPanel({
  id,
  title,
  shortLabel,
  icon: Icon,
  themeColor = '#ff5400',
  viewRequired,
  badgeText,
  children
}) {
  const {
    windows,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    toggleMaximize,
    updatePosition,
    updateSize,
    bringToFront,
    isAllowed
  } = useWorkspace();

  const { currentRole, profile, switchPersona } = usePersona();

  const win = windows[id];
  const isPanelOpen = win?.isOpen;
  const isMinimized = win?.isMinimized;
  const isMaximized = win?.isMaximized;
  const position = win?.position || { x: 30, y: 70 };
  const size = win?.size || { width: 640, height: 580 };
  const zIndex = win?.zIndex || 10;

  const panelRef = useRef(null);
  const dragStartRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // Resize handling
  const [isResizing, setIsResizing] = useState(false);
  const resizeStartRef = useRef(null);

  // Dragging handlers with viewport boundary clamping
  const handleMouseDown = useCallback((e) => {
    // Only drag from header bar or drag handle, not buttons or inputs
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    bringToFront(id);
    if (isMaximized) return; // cannot drag when maximized

    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y
    };
  }, [bringToFront, id, isMaximized, position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      updatePosition(id, dragStartRef.current.posX + dx, dragStartRef.current.posY + dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, id, updatePosition]);

  // Corner resize drag handlers
  const handleResizeStart = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    bringToFront(id);
    if (isMaximized) return;

    setIsResizing(true);
    resizeStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      width: size.width,
      height: size.height
    };
  }, [bringToFront, id, isMaximized, size]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      if (!resizeStartRef.current) return;
      const dw = e.clientX - resizeStartRef.current.mouseX;
      const dh = e.clientY - resizeStartRef.current.mouseY;
      updateSize(id, resizeStartRef.current.width + dw, resizeStartRef.current.height + dh);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, id, updateSize]);

  if (!isPanelOpen) return null;

  const allowed = isAllowed(viewRequired);

  // Minimized Floating Pill View (supports drag repositioning across canvas)
  if (isMinimized) {
    return (
      <div
        ref={panelRef}
        onMouseDown={handleMouseDown}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex
        }}
        className="fixed cyber-glass rounded-xl px-3 py-1.5 border border-slate-700/80 shadow-2xl flex items-center gap-2 cursor-grab active:cursor-grabbing hover:border-cyan-400/60 transition-all select-none pointer-events-auto"
      >
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: themeColor, boxShadow: `0 0 8px ${themeColor}` }}
        />
        {Icon && <Icon className="w-3.5 h-3.5 text-slate-300" />}
        <span className="text-xs font-bold text-white tracking-wide">
          {shortLabel || title}
        </span>
        <div className="flex items-center gap-1 ml-1.5 pl-1.5 border-l border-slate-700">
          <button
            onClick={() => restoreWindow(id)}
            className="w-5 h-5 rounded hover:bg-slate-700/60 flex items-center justify-center text-slate-400 hover:text-white transition"
            title="Restore window"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={() => closeWindow(id)}
            className="w-5 h-5 rounded hover:bg-rose-600/30 flex items-center justify-center text-rose-300 hover:text-white transition"
            title="Close window"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  // Maximized View Dimensions
  const computedStyle = isMaximized
    ? {
        left: '16px',
        top: '68px',
        width: 'calc(100vw - 32px)',
        height: 'calc(100vh - 148px)',
        zIndex
      }
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex
      };

  return (
    <div
      ref={panelRef}
      onMouseDown={() => bringToFront(id)}
      style={computedStyle}
      className="fixed cyber-glass rounded-2xl border border-slate-700/60 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85)] backdrop-blur-2xl flex flex-col pointer-events-auto select-text animate-in fade-in zoom-in-[0.98] duration-150"
    >
      {/* Precision Draggable Title Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        className={`px-4 py-3 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/40 rounded-t-2xl select-none ${
          isMaximized ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}aa` }}
          />
          {Icon && <Icon className="w-4 h-4 text-slate-200 shrink-0" />}
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>{title}</span>
            {badgeText && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 font-semibold">
                {badgeText}
              </span>
            )}
          </h2>
        </div>

        {/* Window Window Controls (Minimize, Maximize/Restore, Close) */}
        <div className="flex items-center gap-1 pointer-events-auto">
          {!isMaximized && (
            <div className="hidden sm:flex text-slate-500 mr-2">
              <GripHorizontal className="w-4 h-4 opacity-50" />
            </div>
          )}
          <button
            onClick={() => minimizeWindow(id)}
            className="w-7 h-7 rounded-lg hover:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            title="Minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMaximize(id)}
            className="w-7 h-7 rounded-lg hover:bg-slate-800/80 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
            title={isMaximized ? 'Restore Down' : 'Maximize'}
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            onClick={() => closeWindow(id)}
            className="w-7 h-7 rounded-lg hover:bg-rose-600/30 flex items-center justify-center text-rose-300 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Panel Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 relative custom-scrollbar">
        <ErrorBoundary name={`Service Panel: ${title}`}>
          {!allowed ? (
            <div className="h-full min-h-[280px] flex flex-col items-center justify-center text-center p-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xl">
                <Lock className="w-7 h-7" />
              </div>
              <div className="max-w-sm">
                <h3 className="text-base font-bold text-white">Access Restricted (RBAC)</h3>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  The <span className="text-slate-200 font-semibold">{title}</span> service requires{' '}
                  <span className="font-mono text-cyan-400 font-bold">{viewRequired}</span> clearance.
                  Your current active role is{' '}
                  <span className="text-rose-400 font-semibold uppercase">{profile?.title || currentRole}</span>.
                </p>
              </div>
              <button
                onClick={() => switchPersona('admin')}
                className="mt-2 text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white flex items-center gap-2 shadow-lg shadow-rose-900/30 transition cursor-pointer"
              >
                <span>Elevate to Administrator</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            children
          )}
        </ErrorBoundary>
      </div>

      {/* Resize Grip Handle (Corner SE, hidden when maximized) */}
      {!isMaximized && (
        <div
          onMouseDown={handleResizeStart}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5 z-20 group"
          title="Drag to resize panel"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-slate-600 group-hover:border-cyan-400 transition" />
        </div>
      )}
    </div>
  );
}
