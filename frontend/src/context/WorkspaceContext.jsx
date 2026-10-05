import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  DOCK_SERVICES,
  WORKSPACE_STORAGE_KEY,
  clampCoordinates,
  isServiceAllowed
} from '../constants/dockConfig';
import { usePersona } from './PersonaContext';

const WorkspaceContext = createContext(null);

export function buildDefaultWindows() {
  const isClient = typeof window !== 'undefined';
  const screenWidth = isClient ? window.innerWidth : 1440;
  const screenHeight = isClient ? window.innerHeight : 900;

  const initial = {};
  let currentZ = 10;

  DOCK_SERVICES.forEach((service, index) => {
    // Determine default opening state
    // On first visit: 'kpis' and 'sentinel' are open for an immediate operational command feel
    const isDefaultOpen = service.id === 'kpis' || (service.id === 'sentinel' && screenWidth >= 1280);

    let defaultX = service.defaultPos.x;
    let defaultY = service.defaultPos.y;
    let defaultWidth = Math.min(service.defaultPos.width, screenWidth - 32);
    let defaultHeight = Math.min(service.defaultPos.height, screenHeight - 140);

    if (service.id === 'sentinel') {
      defaultX = Math.max(20, screenWidth - defaultWidth - 24);
    }

    const clamped = clampCoordinates(
      { x: defaultX, y: defaultY },
      { width: defaultWidth, height: defaultHeight },
      screenWidth,
      screenHeight
    );

    initial[service.id] = {
      id: service.id,
      isOpen: isDefaultOpen,
      isMinimized: false,
      isMaximized: false,
      position: clamped,
      size: { width: defaultWidth, height: defaultHeight },
      prevRect: null,
      zIndex: isDefaultOpen ? ++currentZ : index + 1
    };
  });

  return initial;
}

export function loadStoredWorkspace() {
  if (typeof window === 'undefined') return buildDefaultWindows();
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return buildDefaultWindows();
    const parsed = JSON.parse(raw);
    const defaults = buildDefaultWindows();

    // Merge parsed with defaults in case new services were added
    const merged = {};
    Object.keys(defaults).forEach((key) => {
      if (parsed[key]) {
        merged[key] = {
          ...defaults[key],
          ...parsed[key],
          position: clampCoordinates(
            parsed[key].position || defaults[key].position,
            parsed[key].size || defaults[key].size,
            window.innerWidth,
            window.innerHeight
          )
        };
      } else {
        merged[key] = defaults[key];
      }
    });
    return merged;
  } catch (err) {
    console.warn('Failed to load workspace state from localStorage:', err);
    return buildDefaultWindows();
  }
}

export function WorkspaceProvider({ children }) {
  const { currentRole, profile } = usePersona();
  const [windows, setWindows] = useState(() => loadStoredWorkspace());
  const [highestZIndex, setHighestZIndex] = useState(25);
  const [activeStageEngine, setActiveStageEngine] = useState('tactical_3d'); // 'tactical_3d' | 'cesium_gis'

  // Persist to localStorage on modification
  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(windows));
    } catch {
      // ignore storage quota / sandbox issues
    }
  }, [windows]);

  // Adjust window coordinates on browser viewport resize
  useEffect(() => {
    const handleResize = () => {
      setWindows((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          const win = next[id];
          if (!win.isMaximized) {
            const clamped = clampCoordinates(win.position, win.size, window.innerWidth, window.innerHeight);
            if (clamped.x !== win.position.x || clamped.y !== win.position.y) {
              next[id] = { ...win, position: clamped };
              changed = true;
            }
          }
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const bringToFront = useCallback((id) => {
    setHighestZIndex((prevMax) => {
      const nextZ = prevMax + 1;
      setWindows((prev) => {
        if (!prev[id] || prev[id].zIndex === nextZ) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            zIndex: nextZ
          }
        };
      });
      return nextZ;
    });
  }, []);

  const openWindow = useCallback((id) => {
    setHighestZIndex((prevMax) => {
      const nextZ = prevMax + 1;
      setWindows((prev) => {
        const current = prev[id] || buildDefaultWindows()[id];
        return {
          ...prev,
          [id]: {
            ...current,
            isOpen: true,
            isMinimized: false,
            zIndex: nextZ
          }
        };
      });
      return nextZ;
    });
  }, []);

  const closeWindow = useCallback((id) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isOpen: false
        }
      };
    });
  }, []);

  const minimizeWindow = useCallback((id) => {
    setWindows((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          isMinimized: true
        }
      };
    });
  }, []);

  const restoreWindow = useCallback((id) => {
    setHighestZIndex((prevMax) => {
      const nextZ = prevMax + 1;
      setWindows((prev) => {
        if (!prev[id]) return prev;
        return {
          ...prev,
          [id]: {
            ...prev[id],
            isOpen: true,
            isMinimized: false,
            zIndex: nextZ
          }
        };
      });
      return nextZ;
    });
  }, []);

  const toggleWindow = useCallback((id) => {
    setWindows((prev) => {
      const win = prev[id];
      if (!win || !win.isOpen) {
        // Open it
        const nextZ = highestZIndex + 1;
        setHighestZIndex(nextZ);
        return {
          ...prev,
          [id]: {
            ...(win || buildDefaultWindows()[id]),
            isOpen: true,
            isMinimized: false,
            zIndex: nextZ
          }
        };
      }

      if (win.isMinimized) {
        // Unminimize it
        const nextZ = highestZIndex + 1;
        setHighestZIndex(nextZ);
        return {
          ...prev,
          [id]: {
            ...win,
            isMinimized: false,
            zIndex: nextZ
          }
        };
      }

      // If open & focused at top zIndex -> minimize it
      // If open but not top -> bring to top
      const isTop = win.zIndex >= highestZIndex;
      if (isTop) {
        return {
          ...prev,
          [id]: {
            ...win,
            isMinimized: true
          }
        };
      } else {
        const nextZ = highestZIndex + 1;
        setHighestZIndex(nextZ);
        return {
          ...prev,
          [id]: {
            ...win,
            zIndex: nextZ
          }
        };
      }
    });
  }, [highestZIndex]);

  const toggleMaximize = useCallback((id) => {
    setWindows((prev) => {
      const win = prev[id];
      if (!win) return prev;

      if (!win.isMaximized) {
        // Maximize
        const prevRect = { position: { ...win.position }, size: { ...win.size } };
        const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
        const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
        return {
          ...prev,
          [id]: {
            ...win,
            isMaximized: true,
            isMinimized: false,
            prevRect,
            position: { x: 12, y: 64 },
            size: { width: screenW - 24, height: screenH - 148 }
          }
        };
      } else {
        // Restore to previous bounds
        const restored = win.prevRect || {
          position: win.position,
          size: win.size
        };
        return {
          ...prev,
          [id]: {
            ...win,
            isMaximized: false,
            position: restored.position,
            size: restored.size,
            prevRect: null
          }
        };
      }
    });
  }, []);

  const updatePosition = useCallback((id, x, y) => {
    setWindows((prev) => {
      const win = prev[id];
      if (!win || win.isMaximized) return prev;
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
      const clamped = clampCoordinates({ x, y }, win.size, screenW, screenH);
      return {
        ...prev,
        [id]: {
          ...win,
          position: clamped
        }
      };
    });
  }, []);

  const updateSize = useCallback((id, width, height) => {
    setWindows((prev) => {
      const win = prev[id];
      if (!win || win.isMaximized) return prev;
      const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;
      const screenH = typeof window !== 'undefined' ? window.innerHeight : 900;
      const newWidth = Math.max(340, Math.min(width, screenW - 24));
      const newHeight = Math.max(260, Math.min(height, screenH - 120));
      const clamped = clampCoordinates(win.position, { width: newWidth, height: newHeight }, screenW, screenH);
      return {
        ...prev,
        [id]: {
          ...win,
          position: clamped,
          size: { width: newWidth, height: newHeight }
        }
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    const defaults = buildDefaultWindows();
    setWindows(defaults);
    try {
      localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(defaults));
    } catch {
      // ignore
    }
  }, []);

  const minimizeAll = useCallback(() => {
    setWindows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].isOpen) {
          next[id] = { ...next[id], isMinimized: true };
        }
      });
      return next;
    });
  }, []);

  const restoreAll = useCallback(() => {
    setWindows((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((id) => {
        if (next[id].isOpen) {
          next[id] = { ...next[id], isMinimized: false };
        }
      });
      return next;
    });
  }, []);

  // Quick helper to check if a service is allowed for current persona
  const isAllowed = useCallback((viewRequired) => {
    return isServiceAllowed(currentRole, profile?.permissions, viewRequired);
  }, [currentRole, profile]);

  const value = useMemo(() => ({
    windows,
    highestZIndex,
    activeStageEngine,
    setActiveStageEngine,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    toggleWindow,
    toggleMaximize,
    updatePosition,
    updateSize,
    bringToFront,
    resetLayout,
    minimizeAll,
    restoreAll,
    isAllowed
  }), [
    windows,
    highestZIndex,
    activeStageEngine,
    openWindow,
    closeWindow,
    minimizeWindow,
    restoreWindow,
    toggleWindow,
    toggleMaximize,
    updatePosition,
    updateSize,
    bringToFront,
    resetLayout,
    minimizeAll,
    restoreAll,
    isAllowed
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
