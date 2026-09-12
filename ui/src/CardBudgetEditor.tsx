import { useState } from 'react'

const DEPTH_BUDGETS = {
  quick: { max_child_cards: 0, effort_ceiling: 3, max_feature_size: 'S', addenda: 'none' },
  standard: { max_child_cards: 3, effort_ceiling: 15, max_feature_size: 'L', addenda: 'obvious' },
  deep: { max_child_cards: 8, effort_ceiling: 40, max_feature_size: 'XL', addenda: 'proactive' },
}

function modeFor(budget) {
  if (!budget) return 'depth'
  if (budget.max_child_cards === 'unlimited' && budget.effort_ceiling === 'unlimited') return 'unlimited'
  return 'custom'
}

export function CardBudgetEditor({ budget, depth, onSave }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(modeFor(budget))
  const [custom, setCustom] = useState(
    modeFor(budget) === 'custom' ? { ...budget } : { ...(DEPTH_BUDGETS[depth] || DEPTH_BUDGETS.standard) },
  )

  const begin = () => {
    const nextMode = modeFor(budget)
    setMode(nextMode)
    setCustom(nextMode === 'custom'
      ? { ...budget }
      : { ...(DEPTH_BUDGETS[depth] || DEPTH_BUDGETS.standard) })
    setOpen(true)
  }
  const save = () => {
    if (mode === 'depth') onSave(undefined)
    else if (mode === 'unlimited') onSave({
      max_child_cards: 'unlimited', effort_ceiling: 'unlimited',
      max_feature_size: 'XL', addenda: 'proactive',
    })
    else onSave({ ...custom })
    setOpen(false)
  }

  const label = modeFor(budget) === 'depth' ? 'budget: depth'
    : modeFor(budget) === 'unlimited' ? 'budget: unlimited' : 'budget: custom'

  return <div className="relative">
    <button type="button" onClick={begin} title="Edit this card's explicit budget override"
      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ color: budget ? 'var(--accent)' : 'var(--muted)', border: `1px solid ${budget ? 'color-mix(in srgb, var(--accent) 45%, var(--border))' : 'var(--border)'}`, background: budget ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent' }}>
      {label}
    </button>
    {open && <div className="absolute z-40 mt-1 left-0 w-72 rounded-lg p-3 flex flex-col gap-2"
      style={{ background: 'var(--bg-elevated, var(--card))', border: '1px solid var(--border-strong, var(--border))', boxShadow: '0 12px 36px rgba(0,0,0,.35)' }}>
      <div className="text-[11px] font-semibold" style={{ color: 'var(--text)' }}>Card budget override</div>
      <div className="grid grid-cols-3 gap-1">
        {['depth', 'custom', 'unlimited'].map(value => <button key={value} type="button" onClick={() => setMode(value)}
          className="text-[10px] px-2 py-1 rounded font-semibold"
          style={{ color: mode === value ? 'var(--bg)' : 'var(--muted)', background: mode === value ? 'var(--accent)' : 'var(--bg-hover, var(--border))' }}>
          {value === 'depth' ? 'follow depth' : value}
        </button>)}
      </div>
      {mode === 'depth' && <div className="text-[10px]" style={{ color: 'var(--muted)' }}>
        Removes <code>card.budget</code>; effective budget follows {depth || 'standard'} depth.
      </div>}
      {mode === 'unlimited' && <div className="text-[10px]" style={{ color: 'var(--warn)' }}>
        Literal unlimited child/effort caps · XL · proactive addenda.
      </div>}
      {mode === 'custom' && <div className="grid grid-cols-2 gap-2">
        <label className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>Child cards
          <input type="number" min={0} value={custom.max_child_cards}
            onChange={event => setCustom(value => ({ ...value, max_child_cards: Math.max(0, Number(event.target.value) || 0) }))}
            className="mt-0.5 w-full px-2 py-1 rounded text-[11px]" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </label>
        <label className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>Effort ceiling
          <input type="number" min={0} value={custom.effort_ceiling}
            onChange={event => setCustom(value => ({ ...value, effort_ceiling: Math.max(0, Number(event.target.value) || 0) }))}
            className="mt-0.5 w-full px-2 py-1 rounded text-[11px]" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }} />
        </label>
        <label className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>Max feature
          <select value={custom.max_feature_size} onChange={event => setCustom(value => ({ ...value, max_feature_size: event.target.value }))}
            className="mt-0.5 w-full px-2 py-1 rounded text-[11px]" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {['S', 'M', 'L', 'XL'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="text-[9px] uppercase" style={{ color: 'var(--muted)' }}>Addenda
          <select value={custom.addenda} onChange={event => setCustom(value => ({ ...value, addenda: event.target.value }))}
            className="mt-0.5 w-full px-2 py-1 rounded text-[11px]" style={{ background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {['none', 'obvious', 'proactive'].map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>}
      <div className="flex justify-end gap-2 mt-1">
        <button type="button" onClick={() => setOpen(false)} className="text-[10px] px-2 py-1" style={{ color: 'var(--muted)' }}>Cancel</button>
        <button type="button" onClick={save} className="text-[10px] px-2 py-1 rounded font-semibold" style={{ background: 'var(--accent)', color: 'var(--bg)' }}>Save budget</button>
      </div>
    </div>}
  </div>
}
