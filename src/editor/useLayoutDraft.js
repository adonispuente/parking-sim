import { useEffect, useReducer, useRef, useState } from 'react';
import { SOURCE_PAIR } from '../clearImageSource.js';
import { initialLayout, STORAGE_KEY, validateLayout } from '../model.js';
import { tracedLayout } from '../tracedMap.js';

function loadDraft() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('parking-flow-layout-v1');
    if (stored) {
      const raw = JSON.parse(stored);
      if (raw.sourcePair !== SOURCE_PAIR) {
        return { layout: tracedLayout(raw), history: [], legacyDraft: stored };
      }
      return { layout: validateLayout(raw), history: [] };
    }
  } catch {
    // Use the starter layout if the stored draft cannot be read.
  }
  return { layout: initialLayout(), history: [] };
}

function editDraft(state, action) {
  if (action.type === 'undo') {
    if (!state.history.length) return state;
    return { ...state, layout: state.history.at(-1), history: state.history.slice(0, -1) };
  }
  return {
    ...state,
    layout: action.edit(state.layout),
    history: [...state.history.slice(-29), state.layout],
  };
}

export default function useLayoutDraft() {
  const [{ layout, history, legacyDraft }, dispatch] = useReducer(editDraft, undefined, loadDraft);
  const [saved, setSaved] = useState('Saving…');
  const backedUp = useRef(false);

  useEffect(() => {
    try {
      if (legacyDraft && !backedUp.current) {
        localStorage.setItem(`${STORAGE_KEY}-before-unified-source`, legacyDraft);
        backedUp.current = true;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
      setSaved('Saved on this device');
    } catch {
      setSaved('Local saving unavailable');
    }
  }, [layout, legacyDraft]);

  return {
    layout,
    saved,
    canUndo: history.length > 0,
    edit: (edit) => dispatch({ type: 'edit', edit }),
    undo: () => dispatch({ type: 'undo' }),
  };
}
