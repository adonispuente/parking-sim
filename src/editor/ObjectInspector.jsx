import React from 'react';
import { ROLES, WORLD } from '../model.js';
import NumberField from './NumberField.jsx';

export default function ObjectInspector({
  selected,
  lots,
  tool,
  onUpdate,
  onClose,
  onToggleMove,
  onRemove,
}) {
  return (
    <aside className="inspector" aria-label="Object inspector">
      <div className="inspector-head">
        <div>
          <span className="eyebrow">OBJECT DETAILS</span>
          <h2>
            {selected.type === 'spaces'
              ? 'Parking row'
              : selected.type[0].toUpperCase() + selected.type.slice(1)}
          </h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>
      <div className="inspector-body">
        <label>
          Name
          <input
            maxLength={200}
            value={selected.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
          />
        </label>
        {selected.type === 'lot' && (
          <>
            <div className="field-pair">
              <NumberField
                label="Capacity"
                value={selected.capacity}
                min={0}
                max={1000}
                integer
                onChange={(v) => onUpdate({ capacity: v })}
              />
              <label>
                Lot color
                <input
                  type="color"
                  value={selected.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                />
              </label>
            </div>
            <button
              className={`lot-toggle ${selected.open ? 'enabled' : ''}`}
              onClick={() => onUpdate({ open: !selected.open })}
            >
              {selected.open ? '● Open to arrivals' : '○ Closed to arrivals'}
              <span>Toggle</span>
            </button>
            <p className="field-note">
              A: 411 · B: 487 · C: 686. Total: 1,584, supplied by you. Drawn spaces are approximate
              and counted separately.
            </p>
          </>
        )}
        {selected.type === 'spaces' && (
          <>
            <NumberField
              label="Spaces in this row"
              value={selected.count}
              min={1}
              max={50}
              integer
              onChange={(v) => onUpdate({ count: v })}
            />
            <label>
              Assigned lot
              <select value={selected.lotId} onChange={(e) => onUpdate({ lotId: e.target.value })}>
                <option value="">Unassigned</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        {selected.type === 'position' && (
          <>
            <label>
              Role
              <select value={selected.role} onChange={(e) => onUpdate({ role: e.target.value })}>
                {[...new Set([...ROLES, selected.role])].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>
            <label>
              Volunteer
              <input
                maxLength={200}
                placeholder="Assign a name"
                value={selected.assignee}
                onChange={(e) => onUpdate({ assignee: e.target.value })}
              />
            </label>
            <label>
              Role instructions
              <textarea
                rows={3}
                maxLength={2000}
                placeholder="What should this person do, and why?"
                value={selected.notes}
                onChange={(e) => onUpdate({ notes: e.target.value })}
              />
            </label>
          </>
        )}
        <div className="section-label">
          PLACEMENT <span>IMAGE-RELATIVE UNITS</span>
        </div>
        <div className="field-pair">
          <NumberField
            label="X · east"
            value={selected.x}
            min={0}
            max={WORLD.width}
            onChange={(v) => onUpdate({ x: v })}
          />
          <NumberField
            label="Y · south"
            value={selected.z}
            min={0}
            max={WORLD.height}
            onChange={(v) => onUpdate({ z: v })}
          />
        </div>
        <div className="field-pair">
          <NumberField
            label={selected.type === 'spaces' ? 'Stall width' : 'Width'}
            value={selected.width}
            min={0.4}
            max={113}
            onChange={(v) => onUpdate({ width: v })}
          />
          <NumberField
            label="Depth"
            value={selected.depth}
            min={0.4}
            max={92}
            onChange={(v) => onUpdate({ depth: v })}
          />
        </div>
        <NumberField
          label="Rotation (degrees)"
          value={selected.rotation}
          min={-360}
          max={360}
          onChange={(v) => onUpdate({ rotation: v })}
        />
        {selected.points && (
          <p className="field-note">
            Satellite-traced shape. Position and rotation move the entire trace; width and depth
            describe its bounds, not a shape-resizing control.
          </p>
        )}
        <button
          className={`button move-button ${tool === 'move' ? 'moving' : ''}`}
          onClick={onToggleMove}
        >
          {tool === 'move' ? 'Cancel move' : '⌖ Move on map'}
        </button>
        <button className="delete-button" onClick={onRemove}>
          Delete {selected.type === 'spaces' ? 'row' : selected.type}
        </button>
      </div>
    </aside>
  );
}
