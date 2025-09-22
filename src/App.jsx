import React, { useState } from 'react'
import './styles.css'

const START_YEAR = 2020
const END_YEAR = 2100
const ROUNDS = 8
const START_WIDTH = 50 // ft

// Difficulty presets (baseline loss & starting budget)
const DIFFICULTIES = {
  easy:   { label: 'Easy',   baseline: -8,  budget: 220 },
  normal: { label: 'Normal', baseline: -10, budget: 200 },
  hard:   { label: 'Hard',   baseline: -12, budget: 180 },
}

const OPTIONS = {
  NONE:     {key:'NONE',     title:'Do Nothing',           cost:0,   desc:'Draw a Wild Card (random event).'},
  NOURISH:  {key:'NOURISH',  title:'Beach Nourishment',    cost:15,  desc:'Reduce loss by 5 ft this decade.'},
  DUNES:    {key:'DUNES',    title:'Dune Restoration',     cost:5,   desc:'Reduce loss by 2 ft this decade.'},
  REEF:     {key:'REEF',     title:'Artificial Reef',      cost:100, desc:'Reduce base loss to –5 ft/dec for 30 years.'},
  SEAWALL:  {key:'SEAWALL',  title:'Seawall / Armoring',   cost:150, desc:'Set base loss to –20 ft/dec permanently.'},
  RETREAT:  {key:'RETREAT',  title:'Managed Retreat',      cost:150, desc:'0 ft loss for the next 3 decades.'},
}
const ORDER = ['NOURISH','DUNES','REEF','SEAWALL','RETREAT','NONE']

// Photo backgrounds (swap for your own anytime)
const MOVE_BG = {
  NOURISH:  'https://images.unsplash.com/photo-1533636721434-0e2d61030955?q=80&w=1600&auto=format&fit=crop',
  DUNES:    'https://images.unsplash.com/photo-1519046904884-53103b34b206?q=80&w=1600&auto=format&fit=crop',
  REEF:     'https://images.unsplash.com/photo-1501117716987-c8eab02b8cc2?q=80&w=1600&auto=format&fit=crop',
  SEAWALL:  'https://images.unsplash.com/photo-1544551763-7ef4200b69c3?q=80&w=1600&auto=format&fit=crop',
  RETREAT:  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1600&auto=format&fit=crop',
  NONE:     'https://images.unsplash.com/photo-1503435824048-a799a3a84bf7?q=80&w=1600&auto=format&fit=crop',
}

const WILDCARDS = [
  { key: 'STORM',     name: '100-Year Storm',     text: 'A powerful storm slams the coast.',                    img: 'https://images.unsplash.com/photo-1501630834273-4b5604d2ee31?q=80&w=2000&auto=format&fit=crop' },
  { key: 'RECALL',    name: 'Recall',             text: 'Your policy decision is overturned.',                 img: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2000&auto=format&fit=crop' },
  { key: 'LA_NINA',   name: 'La Niña Year',       text: 'Unusually calm ocean conditions this year.',          img: 'https://images.unsplash.com/photo-1501959915551-4e8a04a2b59a?q=80&w=2000&auto=format&fit=crop' },
  { key: 'KING_TIDE', name: 'King Tide Flooding', text: 'Extreme high tides flood streets and infrastructure.', img: 'https://images.unsplash.com/photo-1522512115668-c09775d6f424?q=80&w=2000&auto=format&fit=crop' },
  { key: 'EMISSIONS', name: 'Emissions Reduction',text: 'Global shift lowers long-term sea-level rise rate.',  img: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa7?q=80&w=2000&auto=format&fit=crop' },
]

function prettyMoney(m){ return `$${m.toFixed(0)}M` }

export default function App(){
  const [difficulty, setDifficulty] = useState('normal')
  const [selected, setSelected] = useState('NOURISH')

  function initialState(diffKey = difficulty){
    const diff = DIFFICULTIES[diffKey]
    return {
      year: START_YEAR,
      round: 1,
      width: START_WIDTH,
      budget: diff.budget,
      baseBaseline: diff.baseline, // –8/–10/–12; EMISSIONS may improve to –5
      reefBuilt: false,
      reefRoundsLeft: 0,    // 3 rounds when built
      seawallBuilt: false,
      retreatRoundsLeft: 0, // 3 rounds when chosen
      lastRate: null,
      lastBaseRate: null,
      log: [`Start ${START_YEAR}: Beach=${START_WIDTH} ft, Budget=${prettyMoney(diff.budget)}, Baseline ${diff.baseline} ft/dec.`],
      gameOver: false,
      victory: false,
      history: [{year:START_YEAR, width:START_WIDTH, budget:diff.budget}],
      past: [],
    }
  }
  const [s, setS] = useState(initialState())

  // Wild-card modal state
  const [wildModal, setWildModal] = useState(null)

  const badge = s.gameOver
    ? (s.victory ? <span className="badge green">Finished 🎉</span> : <span className="badge red">Game Over</span>)
    : <span className="badge blue">Round {s.round}/{ROUNDS}</span>

  // Priority: Retreat (0) > Seawall (–20) > Reef active (max(base, –5)) > Baseline
  function currentBaseRate(state){
    if (state.retreatRoundsLeft > 0) return 0
    if (state.seawallBuilt) return -20
    let base = state.baseBaseline
    if (state.reefRoundsLeft > 0) base = Math.max(base, -5)
    return base
  }

  function computeThisDecade(choice, state){
    const baseRate = currentBaseRate(state)
    let rate = baseRate
    let cost = 0
    const notes = []

    switch (choice){
      case 'NOURISH':
        cost -= OPTIONS.NOURISH.cost
        rate = baseRate + 5
        notes.push('Beach Nourishment: reduced loss by 5 ft this decade.')
        break
      case 'DUNES':
        cost -= OPTIONS.DUNES.cost
        rate = baseRate + 2
        notes.push('Dune Restoration: reduced loss by 2 ft this decade.')
        break
      case 'REEF': {
        if (!state.reefBuilt){
          cost -= OPTIONS.REEF.cost
          notes.push('Built Artificial Reef: base loss becomes –5 ft/dec for 30 years.')
          if (state.retreatRoundsLeft === 0 && !state.seawallBuilt){
            rate = Math.max(baseRate, -5)
          }
        } else {
          notes.push(state.reefRoundsLeft > 0 ? 'Reef already active.' : 'Reef effect ended.')
          rate = baseRate
        }
        break
      }
      case 'SEAWALL':
        if (!state.seawallBuilt){
          cost -= OPTIONS.SEAWALL.cost
          notes.push('Built Seawall: base loss becomes –20 ft/dec permanently.')
        } else {
          notes.push('Seawall already built.')
        }
        rate = baseRate
        break
      case 'RETREAT':
        cost -= OPTIONS.RETREAT.cost
        notes.push('Managed Retreat: 0 ft loss for this and the next 2 decades.')
        rate = 0
        break
      default:
        notes.push('Chose to do nothing → draw a Wild Card.')
    }
    return { baseRate, rate, cost, notes }
  }

  function drawWild(){ return WILDCARDS[Math.floor(Math.random() * WILDCARDS.length)] }

  function applyWild(card, state, baseCalc){
    let { rate, cost } = baseCalc
    const notes = [`Wild Card: ${card.name}.`]
    let why = ''
    let futureNote = ''
    let budgetChange = 0
    let widthChangeFromWild = 0

    switch(card.key){
      case 'STORM':
        widthChangeFromWild = -20
        rate += -20
        why = 'Storm surge + large swell erode dunes and the active beach face.'
        notes.push('100-Year Storm → additional –20 ft this decade.')
        break
      case 'RECALL':
        if (state.lastRate !== null && state.lastBaseRate !== null){
          const improvement = state.lastRate - state.lastBaseRate // (-5) - (-10) = +5
          widthChangeFromWild = -improvement
          rate += -improvement
          why = 'Policy reversal removes last decade’s management benefit.'
          notes.push('Recall → reversed last decade’s management benefit on width.')
        } else {
          why = 'No prior management to reverse this time.'
          notes.push('Recall had no effect (no prior management recorded).')
        }
        break
      case 'LA_NINA':
        widthChangeFromWild = -rate
        rate = 0
        why = 'Cooler equatorial Pacific → calmer wave climate → minimal erosion.'
        notes.push('La Niña → 0 ft change this decade.')
        break
      case 'KING_TIDE':
        budgetChange = -30
        cost += -30
        why = 'Emergency response and repairs during extreme high tide.'
        notes.push('King Tide → –$30M budget immediately.')
        break
      case 'EMISSIONS':
        futureNote = 'Baseline improves to –5 ft/decade from now on (long-term benefit).'
        why = 'Rapid decarbonization slows sea-level rise and wave energy over time.'
        notes.push('Emissions cut → baseline improves to –5 ft/decade from now on.')
        break
    }

    return { rate, cost, notes, why, futureNote, budgetChange, widthChangeFromWild }
  }

  function pushPast(snapshot){
    const copy = JSON.parse(JSON.stringify(snapshot))
    const past = (snapshot.past || []).slice(-20)
    copy.past = [...past, { ...snapshot, past: [] }]
    return copy
  }

  function undo(){
    if (!s.past || s.past.length === 0) return
    const prev = s.past[s.past.length - 1]
    setS({ ...prev, past: s.past.slice(0, -1) })
  }

  function nextTurn(choice){
    if (s.gameOver) return

    let working = pushPast(s)
    const baseCalc = computeThisDecade(choice, working)
    let { baseRate, rate, cost, notes } = baseCalc

    // persistent toggles & timers
    let reefBuilt = working.reefBuilt
    let reefRoundsLeft = working.reefRoundsLeft
    let seawallBuilt = working.seawallBuilt
    let retreatRoundsLeft = working.retreatRoundsLeft
    let baseBaseline = working.baseBaseline

    if (choice === 'REEF' && !reefBuilt){ reefBuilt = true; reefRoundsLeft = 3 }
    if (choice === 'SEAWALL' && !seawallBuilt){ seawallBuilt = true }
    if (choice === 'RETREAT'){ retreatRoundsLeft = 3 }

    let drawn = null
    let wildExtras = null
    if (choice === 'NONE'){
      drawn = drawWild()
      const applied = applyWild(drawn, working, baseCalc)
      rate = applied.rate
      cost += applied.cost
      notes = [...notes, ...applied.notes]
      wildExtras = applied
      if (drawn.key === 'EMISSIONS') baseBaseline = Math.max(baseBaseline, -5)
    }

    const budgetDelta = cost
    const newBudget = working.budget + cost
    const newWidth = Math.max(0, working.width + rate)

    // timers tick AFTER applying this decade
    if (reefRoundsLeft > 0) reefRoundsLeft -= 1
    if (retreatRoundsLeft > 0) retreatRoundsLeft -= 1

    const lines = []
    const label = OPTIONS[choice]?.title || 'Action'
    lines.push(`Year ${working.year}–${working.year+10}: ${label}.`)
    notes.forEach(n => lines.push(`• ${n}`))
    lines.push(`• Base rate: ${baseRate} ft; final change this decade: ${rate} ft`)
    lines.push(`• Budget: ${prettyMoney(working.budget)} → ${prettyMoney(newBudget)}`)
    lines.push(`• Width: ${working.width} ft → ${newWidth} ft`)

    const reachedEnd = working.round >= ROUNDS
    const lost = (newWidth <= 0) || (newBudget <= 0)
    const victory = !lost && reachedEnd
    const gameOver = lost || reachedEnd

    const nextState = {
      ...working,
      year: working.year + 10,
      round: working.round + 1,
      width: newWidth,
      budget: newBudget,
      baseBaseline,
      reefBuilt,
      reefRoundsLeft,
      seawallBuilt,
      retreatRoundsLeft,
      lastRate: rate,
      lastBaseRate: baseRate,
      log: [lines.join('\n'), ...working.log],
      gameOver,
      victory,
      history: [...working.history, {year:working.year+10, width:newWidth, budget:newBudget}],
    }
    setS(nextState)

    // Show wild-card modal
    if (drawn && wildExtras){
      const widthChangeThisDecade = rate
      const widthFromWild = wildExtras.widthChangeFromWild || 0
      const budgetFromWild = wildExtras.budgetChange || 0
      setWildModal({
        name: drawn.name,
        text: drawn.text,
        img: drawn.img,
        widthChangeThisDecade,
        widthFromWild,
        budgetChangeThisDecade: budgetDelta,
        budgetFromWild,
        why: wildExtras.why,
        futureNote: wildExtras.futureNote,
        newWidth,
        newBudget,
        decadeRange: `${working.year}–${working.year+10}`,
      })
    } else {
      setWildModal(null)
    }
  }

  function resetGame(newDiff = difficulty){
    setS(initialState(newDiff))
    setSelected('NOURISH')
    setWildModal(null)
  }

  // Beach visual width mapping
  const sandPct = Math.max(0, Math.min(100, (s.width/START_WIDTH)*50))

  const EndScreen = () => (
    <div className="modal-backdrop">
      <div className="modal">
        <h2 style={{marginTop:0}}>{s.victory ? 'You finished the plan! 🏖️' : 'Game over 😞'}</h2>
        <p>Final year: {s.year}. Width: {s.width} ft. Budget: {prettyMoney(s.budget)}.</p>
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginTop:8}}>
          <button className="primary" onClick={()=>resetGame()}>Play again</button>
        </div>
      </div>
    </div>
  )

  const WildModal = () => {
    if (!wildModal) return null
    const {
      name, text, img, why, futureNote,
      widthChangeThisDecade, widthFromWild,
      budgetChangeThisDecade, budgetFromWild,
      decadeRange, newWidth, newBudget
    } = wildModal

    // Less text, big visual; details tucked away
    return (
      <div className="modal-backdrop strong">
        <div className="wild-frame pop">
          <div className="wild-photo" style={{ backgroundImage: `url('${img}')` }} />
          <div className="wild-sheet">
            <div className="wild-title">{name}</div>
            <div className="wild-sub">{text}</div>

            <div className="impact-grid">
              <div className={'impact-tile ' + (widthChangeThisDecade >= 0 ? 'good' : 'bad')}>
                <div className="impact-label">Beach</div>
                <div className="impact-value">{widthChangeThisDecade >= 0 ? '+' : ''}{widthChangeThisDecade} ft</div>
              </div>
              <div className={'impact-tile ' + (budgetChangeThisDecade >= 0 ? 'good' : 'bad')}>
                <div className="impact-label">Budget</div>
                <div className="impact-value">{budgetChangeThisDecade >= 0 ? '+' : ''}{prettyMoney(budgetChangeThisDecade)}</div>
              </div>
            </div>

            <div className="wild-mini">
              Wild-card contribution → Beach {widthFromWild >= 0 ? '+' : ''}{widthFromWild} ft • Budget {budgetFromWild >= 0 ? '+' : ''}{prettyMoney(budgetFromWild)}
            </div>

            {(why || futureNote) && (
              <details className="why-details">
                <summary>Why this result?</summary>
                {why && <div className="why-text">{why}</div>}
                {futureNote && <div className="future-text">{futureNote}</div>}
              </details>
            )}

            <div className="wild-actions">
              <button className="primary" onClick={()=>setWildModal(null)}>Continue</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Save the Beach!</div>
          <div style={{color:'#475569', fontSize:12}}>
            Survive to {END_YEAR} without the beach or the budget hitting zero.
          </div>
        </div>
        {badge}
      </div>

      {/* Settings: Difficulty + Undo */}
      <div className="card" style={{marginBottom:16}}>
        <div className="header"><h3>Settings</h3></div>
        <div className="content" style={{display:'flex', gap:12, flexWrap:'wrap', alignItems:'center'}}>
          <div>
            <div style={{fontSize:12, color:'#64748b'}}>Difficulty</div>
            <div style={{display:'flex', gap:6}}>
              {Object.entries(DIFFICULTIES).map(([key, cfg])=>(
                <button
                  key={key}
                  className={key===difficulty ? 'primary' : 'btn'}
                  onClick={()=>{ setDifficulty(key); resetGame(key) }}>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{marginLeft:'auto'}}>
            <button className="secondary" onClick={undo} disabled={!s.past || s.past.length===0}>Undo decade</button>
            <button className="secondary" onClick={()=>resetGame()}>Reset</button>
          </div>
        </div>
      </div>

      <div className="grid">
        {/* STATUS */}
        <div className="card">
          <div className="header"><h3>Current Status</h3></div>
          <div className="content">
            <div className="stats">
              <Stat label="Year" value={`${s.year}`} />
              <Stat label="Beach Width" value={`${s.width} ft`} />
              <Stat label="Budget" value={prettyMoney(s.budget)} />
              <Stat label="Base (this turn)" value={`${currentBaseRate(s)} ft/dec`} />
              <Stat label="Reef left" value={`${s.reefRoundsLeft} rounds`} />
              <Stat label="Seawall?" value={s.seawallBuilt ? 'Yes' : 'No'} />
              <Stat label="Retreat left" value={`${s.retreatRoundsLeft} rounds`} />
              <Stat label="Round" value={`${s.round}/${ROUNDS}`} />
            </div>

            {/* TOP-DOWN COASTAL VISUAL */}
            <div className="coast">
              <div className="water"></div>
              <div className="sand" style={{width: sandPct + '%'}}></div>
              <div className="neighborhood"></div>
            </div>
          </div>
        </div>

        {/* ACTIONS (photo backgrounds inline) */}
        <div className="card">
          <div className="header"><h3>Choose Your Move</h3></div>
          <div className="content">
            <div className="option-grid">
              {ORDER.map(key => {
                const o = OPTIONS[key]
                const isSel = selected === key
                const bg = MOVE_BG[key]
                return (
                  <div
                    key={key}
                    className={'option-card photo' + (isSel ? ' selected' : '')}
                    onClick={()=>!s.gameOver && setSelected(key)}
                    style={{
                      backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,.15), rgba(0,0,0,.55)), url('${bg}')`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}
                  >
                    <div className="option-top">
                      <div className="option-title">{o.title}</div>
                      <div className="cost-pill">{o.cost > 0 ? `–$${o.cost}M` : '—'}</div>
                    </div>
                    <div className="option-meta">{o.desc}</div>
                  </div>
                )
              })}
            </div>
            <div className="actions">
              <button className="primary" disabled={s.gameOver} onClick={()=>nextTurn(selected)}>Advance Decade</button>
              <button className="secondary" onClick={()=>resetGame()}>Reset</button>
            </div>
          </div>
        </div>
      </div>

      {/* LOG */}
      <div className="card" style={{marginTop:16}}>
        <div className="header"><h3>Decade Log</h3></div>
        <div className="content">
          <div className="log">
            {s.log.map((entry,i)=>(<div key={i} className="log-entry">{entry}</div>))}
          </div>
        </div>
      </div>

      {s.gameOver && <EndScreen/>}
      <WildModal/>
    </div>
  )
}

function Stat({label, value}){
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}
