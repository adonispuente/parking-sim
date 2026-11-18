import React, { useEffect, useRef, useState } from 'react';
import Scene from './Scene.jsx';
import SimulationControls from './SimulationControls.jsx';
import { serviceOptions } from './sundayServices.js';

import { openParkingCapacity } from './parkingAvailability.js';
import LayoutSidebar from './editor/LayoutSidebar.jsx';
import ObjectInspector from './editor/ObjectInspector.jsx';
import TrafficDashboard from './operations/TrafficDashboard.jsx';
import { TOOLS } from './editor/tools.js';
import { initialLayout, makeItem, deleteItem, stats } from './model.js';
import useLayoutDraft from './editor/useLayoutDraft.js';

import { tracedLayout } from './tracedMap.js';
import clearPhotoUrl from '../images/Clear Image.png';

export default function App() {
  const { layout, saved, canUndo, edit, undo: undoDraft } = useLayoutDraft();
  const [selectedId, setSelectedId] = useState(null);
  const [tool, setTool] = useState('select'),
    [reference, setReference] = useState(false),
    [running, setRunning] = useState(false);
  const [presentation, setPresentation] = useState('world');
  const traced = presentation === 'trace',
    world = presentation === 'world';
  const [showLabels, setShowLabels] = useState(false),
    [showOccupancy, setShowOccupancy] = useState(true);
  const [showPhoto, setShowPhoto] = useState(false);
  const [cameraFocus, setCameraFocus] = useState('campus'),
    [cameraReset, setCameraReset] = useState(0);
  function setTraced(value) {
    setPresentation(value ? 'trace' : 'draft');
  }
  function toggleSatellite() {
    if (!reference) setView('top');
    setReference((v) => !v);
  }
  function changePresentation(mode) {
    setPresentation(mode);
    setReference(false);
    setSelectedId(null);
    setTool('select');
    setView(mode === 'world' ? '3d' : 'top');
    setZoom(1);
    setCameraFocus('campus');
    setCameraReset((v) => v + 1);
  }
  const [trafficRates, setTrafficRates] = useState([18, 18, 0]),
    [trafficReset, setTrafficReset] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(5);
  const [playbackState, setPlaybackState] = useState({
    clock: 0,
    seeking: false,
    target: 0,
    completed: 0,
    error: '',
  });
  const updatePlayback = (patch) => setPlaybackState((state) => ({ ...state, ...patch }));
  function invalidateReplay() {
    setRunning(false);
  }
  const [trafficOptions, setTrafficOptions] = useState(() => {
    const service = serviceOptions('eleven');
    return {
      autoContinue: true,
      initialOccupancy: { ...service.initialOccupancy },
      badgePercent: 5,
      phase: 'arrival',
      service: { enabled: true, ...service },
      zonePreferences: { a: 'auto', b: 'auto', c: 'auto' },
      shuttles: {
        enabled: true,
        activeCount: service.activeBuses,
        bFullPercent: 100,
        randomDwell: true,
        dwellSeconds: 45,
        cDirection: 'auto',
        bStop: 'circuit',
        dispatchMode: 'demand',
        dispatchDuringDepartures: service.transition,
      },
    };
  });
  const [trafficStats, setTrafficStats] = useState({
    active: 0,
    entered: [0, 0],
    exited: [0, 0],
    waiting: [0, 0],
  });
  const [view, setView] = useState('3d'),
    [zoom, setZoom] = useState(1),
    [showRoutes, setShowRoutes] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const messageTimer = useRef(null);
  const selected = layout.items.find((i) => i.id === selectedId),
    totals = stats(layout);
  const lots = layout.items.filter((i) => i.type === 'lot');
  const positions = layout.items.filter((i) => i.type === 'position');
  const openCapacity = openParkingCapacity(
    lots,
    trafficStats.occupancy ?? trafficOptions.initialOccupancy,
    trafficStats.reserved,
    trafficStats,
  );

  useEffect(() => () => clearTimeout(messageTimer.current), []);

  function notify(text) {
    setMessage(text);
    clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setMessage(''), 6000);
  }
  function update(id, patch) {
    edit((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  }
  function place(x, z) {
    if (tool === 'move' && selected) {
      update(selected.id, { x: +x.toFixed(1), z: +z.toFixed(1) });
      setTool('select');
      notify('Object moved.');
      return;
    }
    if (tool === 'select' || tool === 'move') return;
    if (layout.items.length >= 400) {
      notify('Layout limit reached (400 objects).');
      return;
    }
    const object = makeItem(
      tool,
      +x.toFixed(1),
      +z.toFixed(1),
      selected?.type === 'lot' ? selected.id : (lots[0]?.id ?? ''),
    );
    edit((current) => ({ ...current, items: [...current.items, object] }));
    setSelectedId(object.id);
    setTool('select');
    notify(
      `${object.type === 'spaces' ? 'Parking row' : 'Object'} placed. Adjust it in the inspector.`,
    );
  }
  function choose(id) {
    setSelectedId(id);
    setTool('select');
  }
  function undo() {
    if (!canUndo) return;
    undoDraft();
    setTool('select');
    notify('Last edit undone.');
  }
  function remove() {
    if (!selected) return;
    edit((current) => deleteItem(current, selected.id));
    setSelectedId(null);
    setTool('select');
  }
  function resetTraffic() {
    setRunning(false);
    setTrafficReset((version) => version + 1);
  }

  function changeTrafficRate(index, value) {
    setTrafficRates((rates) => rates.map((rate, i) => (i === index ? value : rate)));
  }

  function confirmTraceUpdate() {
    setConfirmation({
      title: 'Apply updated LabelMe map?',
      description:
        'Replaces the old generated map geometry with the updated source trace. Existing custom objects and lot operating settings remain. Undo can restore this draft.',
      action: () => {
        edit(tracedLayout);
        setTraced(false);
        setSelectedId(null);
        setRunning(false);
        notify('Updated LabelMe geometry applied. Undo restores the previous draft.');
      },
    });
  }

  return (
    <div className={`app ${world ? 'world-app' : ''}`}>
      <header className="header">
        <a className="brand" href="./" aria-label="Parking Flow home">
          <span className="brand-icon">
            P<span>↗</span>
          </span>
          <span>
            parking<span className="brand-light">flow</span>
            <small>HOPE CITY / CAMPUS SIMULATOR</small>
          </span>
        </a>
        <div className="project-heading">
          <span className="eyebrow">YOUR CAMPUS</span>
          <strong>{layout.name}</strong>
        </div>
        <span className={`save-state ${saved === 'Local saving unavailable' ? 'unsaved' : ''}`}>
          <i />
          {saved}
        </span>
      </header>

      <SimulationControls
        options={trafficOptions}
        setOptions={setTrafficOptions}
        stats={trafficStats}
        running={running}
        onToggle={() => setRunning((v) => !v)}
        speed={playbackSpeed}
        onSpeed={setPlaybackSpeed}
        onReset={resetTraffic}
      >
        <div className="map-quick-controls" role="group" aria-label="Map visibility">
          <button aria-pressed={reference} onClick={toggleSatellite}>
            Satellite overlay
          </button>
          <button aria-pressed={showRoutes} onClick={() => setShowRoutes((v) => !v)}>
            Routes
          </button>
          <button aria-pressed={showOccupancy} onClick={() => setShowOccupancy((v) => !v)}>
            Lot fullness
          </button>
        </div>
      </SimulationControls>

      <div className="workspace">
        <LayoutSidebar
          world={world}
          totals={totals}
          openCapacity={openCapacity}
          lots={lots}
          positions={positions}
          items={layout.items}
          selectedId={selectedId}
          onSelect={choose}
          onUpdate={update}
          traced={traced}
          onToggleTrace={() => setTraced(!traced)}
          reference={reference}
          onToggleSatellite={toggleSatellite}
          onApplyTrace={confirmTraceUpdate}
        />

        <main className="map-area">
          <Scene
            layout={layout}
            selectedId={selectedId}
            tool={world || traced ? 'select' : tool}
            reference={reference}
            traced={traced}
            world={world}
            showLabels={showLabels || !world}
            showOccupancy={showOccupancy}
            cameraFocus={cameraFocus}
            cameraReset={cameraReset}
            running={running}
            playbackSpeed={playbackSpeed}
            onPlaybackState={updatePlayback}
            onReplayInvalidated={invalidateReplay}
            trafficRates={trafficRates}
            trafficReset={trafficReset}
            trafficOptions={trafficOptions}
            onTrafficStats={setTrafficStats}
            view={view}
            zoom={zoom}
            showRoutes={showRoutes}
            onPick={world ? () => {} : setSelectedId}
            onPlace={world ? () => {} : place}
          />
          {view === 'top' && (
            <div className="north">
              <span>Ｎ</span>
              <div>↑</div>
            </div>
          )}
          <div className="view-controls">
            <div className="segmented">
              <button aria-pressed={view === 'top'} onClick={() => setView('top')}>
                Top
              </button>
              <button aria-pressed={view === '3d'} onClick={() => setView('3d')}>
                3D
              </button>
            </div>
            <div className="zoom-controls">
              <button aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(5, z + 0.3))}>
                +
              </button>
              <button aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}>
                −
              </button>
              <button
                aria-label="Reset camera"
                onClick={() => {
                  setZoom(1);
                  setCameraFocus('campus');
                  setCameraReset((v) => v + 1);
                }}
              >
                ⌖
              </button>
            </div>
          </div>
          {world && (
            <>
              <div className="world-bottom">
                <div className="world-focus" role="group" aria-label="Camera focus">
                  {[
                    ['campus', 'Campus'],
                    ['a', 'Alpha'],
                    ['b', 'Bravo'],
                    ['c', 'Charlie'],
                  ].map(([id, title]) => (
                    <button
                      key={id}
                      aria-pressed={cameraFocus === id}
                      onClick={() => {
                        setCameraFocus(id);
                        setZoom(id === 'campus' ? 1 : 2.2);
                        setCameraReset((v) => v + 1);
                      }}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              {showPhoto && (
                <figure className="photo-reference" id="clear-photo">
                  <figcaption>
                    <strong>Clear satellite photo · reference only</strong>
                    <span>
                      Different extent and scale from the approved trace. Not aligned to this map.
                    </span>
                    <button aria-label="Close clear photo" onClick={() => setShowPhoto(false)}>
                      ×
                    </button>
                  </figcaption>
                  <img
                    src={clearPhotoUrl}
                    alt="Clearer satellite photo of the Hope City campus, three upper-row buildings and surrounding lots"
                    loading="lazy"
                  />
                </figure>
              )}
            </>
          )}
          {!world && (
            <div className="map-caption">
              <span className="caption-rule" />
              <span>
                {traced ? 'IMAGE-PIXEL TRACE · NOT TRAFFIC RULES' : 'SCHEMATIC ONLY · NOT TO SCALE'}
              </span>
            </div>
          )}
          <div className="map-bottom" hidden={world}>
            <div className="tool-hint">
              {tool === 'select'
                ? 'Drag to pan · pinch to zoom · tap to inspect'
                : tool === 'move'
                  ? 'Tap the new location for the selected object'
                  : `Tap the map to place ${tool === 'spaces' ? 'a parking row' : `a ${tool}`}`}
              <button disabled={!canUndo} onClick={undo} aria-label="Undo last edit">
                ↶ Undo
              </button>
            </div>
            <div className="toolbar" aria-label="Layout tools">
              {TOOLS.map(([id, icon, name]) => (
                <button
                  key={id}
                  className={tool === id ? 'chosen' : ''}
                  aria-pressed={tool === id}
                  onClick={() => setTool(id)}
                >
                  <span className="tool-icon">{icon}</span>
                  <span>{name}</span>
                </button>
              ))}
            </div>
          </div>
        </main>

        <TrafficDashboard
          trafficOptions={trafficOptions}
          setTrafficOptions={setTrafficOptions}
          trafficStats={trafficStats}
          trafficRates={trafficRates}
          onChangeRate={changeTrafficRate}
          onReset={resetTraffic}
          onRun={() => setRunning(true)}
          playbackState={playbackState}
        >
          <section className="map-settings" aria-label="Map display settings">
            <strong>Map display</strong>
            <div className="presentation-switch" role="group" aria-label="Presentation mode">
              {[
                ['world', '3D World'],
                ['trace', 'Source trace'],
                ['draft', 'Layout editor'],
              ].map(([id, title]) => (
                <button
                  key={id}
                  aria-pressed={presentation === id}
                  onClick={() => changePresentation(id)}
                >
                  {title}
                </button>
              ))}
            </div>
            <div className="world-options">
              <button aria-pressed={showLabels} onClick={() => setShowLabels((v) => !v)}>
                Labels
              </button>
              <button
                aria-pressed={showPhoto}
                aria-controls="clear-photo"
                onClick={() => setShowPhoto((v) => !v)}
              >
                Clear photo
              </button>
            </div>
          </section>
        </TrafficDashboard>

        {selected && (
          <ObjectInspector
            key={selected.id}
            selected={selected}
            lots={lots}
            tool={tool}
            onUpdate={(patch) => update(selected.id, patch)}
            onClose={() => choose(null)}
            onToggleMove={() => setTool(tool === 'move' ? 'select' : 'move')}
            onRemove={remove}
          />
        )}
      </div>
      <footer className="footer">
        <span>
          <strong>LAYOUT FIRST.</strong> Confidence follows.
        </span>
        <span>
          {totals.marked} drawn spaces <b>·</b> *User-supplied capacities · 1,584 total <b>·</b>{' '}
          Draft v0.1
        </span>
        <button
          onClick={() =>
            setConfirmation({
              title: 'Reset to starter layout?',
              description:
                'This replaces your current layout with the provisional screenshot-based starter. Use Undo after resetting to restore the current layout.',
              action: () => {
                edit(initialLayout);
                setSelectedId(null);
                setRunning(false);
                notify('Starter layout restored.');
              },
            })
          }
        >
          Reset draft
        </button>
        <blockquote className="header-verse footer-verse">
          <cite>Colossians 3:23</cite>
          <p>
            "Whatever you do, work at it with all your heart, as working for the Lord, not for human
            masters."
          </p>
        </blockquote>
      </footer>
      {message && (
        <div className="toast" role="status">
          {message}
          <button aria-label="Dismiss message" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
      {confirmation && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-description"
          >
            <h2 id="confirm-title">{confirmation.title}</h2>
            <p id="confirm-description">{confirmation.description}</p>
            <div>
              <button className="button subtle" autoFocus onClick={() => setConfirmation(null)}>
                Cancel
              </button>
              <button
                className="button dark"
                onClick={() => {
                  confirmation.action();
                  setConfirmation(null);
                }}
              >
                Replace layout
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
