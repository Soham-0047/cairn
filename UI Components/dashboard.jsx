/* Dashboard — 12 week path */
const { useState: dUseState, useEffect: dUseEffect } = React;

const PATH = [
  { phase: 'Phase 1 · Foundations', weeks: [
    { n:1, title:'Python + PyTorch tensors', deliverable:'Notebook: tensor ops cheatsheet', status:'completed' },
    { n:2, title:'Autograd & training loops', deliverable:'Reproduce MLP from scratch', status:'completed' },
    { n:3, title:'CNNs, classification, evaluation', deliverable:'Ship: CIFAR-10 web demo', status:'completed' },
  ]},
  { phase: 'Phase 2 · Modern LLM stack', weeks: [
    { n:4, title:'Transformers from scratch', deliverable:'Mini-GPT, 1M params', status:'completed' },
    { n:5, title:'Pretraining vs fine-tuning', deliverable:'LoRA on a Gemma 4B', status:'completed' },
    { n:6, title:'Retrieval & embeddings', deliverable:'Build a RAG over PDFs', status:'completed' },
    { n:7, title:'Agentic loops + tool use', deliverable:'Ship: Codex Studio v0', status:'in-progress' },
  ]},
  { phase: 'Phase 3 · Production craft', weeks: [
    { n:8, title:'Evals: structured benchmarks', deliverable:'Eval harness w/ 3 datasets', status:'locked' },
    { n:9, title:'Latency, batching, streaming', deliverable:'Sub-500ms agent runs', status:'locked' },
    { n:10, title:'Vision: multimodal Gemma', deliverable:'Ship: Screenshot critic', status:'locked' },
    { n:11, title:'Deploy + monitor + cost', deliverable:'Production deploy w/ traces', status:'locked' },
    { n:12, title:'Capstone + portfolio polish', deliverable:'Ship + write up', status:'locked' },
  ]},
];

const Dashboard = ({ navigate }) => {
  const completed = PATH.flatMap(p=>p.weeks).filter(w => w.status==='completed').length;
  const total = PATH.flatMap(p=>p.weeks).length;
  const pct = Math.round(completed/total*100);
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-0)' }}>
      <Sidebar navigate={navigate} route="dashboard"/>
      <main style={{ flex:1, minWidth:0 }}>
        <Topbar title="Your 12-week path" subtitle="AI Engineer track" right={
          <MagneticButton variant="ghost" onClick={()=>navigate('projects-new')}>
            <Icon name="plus" size={14}/> New submission
          </MagneticButton>
        }/>
        <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 320px', gap: 32, padding: 32 }} className="dash-grid">
          <div>
            <DashHero pct={pct} completed={completed} total={total}/>
            <Timeline/>
          </div>
          <RightRail navigate={navigate}/>
        </div>
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside { display: none; }
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const DashHero = ({ pct, completed, total }) => (
  <div className="card" style={{ padding: 28, display:'flex', alignItems:'center', gap: 28, position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at right, rgba(99,102,241,0.15), transparent 60%)' }}/>
    <ProgressRing value={pct} size={160} label="path complete" sublabel={`${completed} / ${total} weeks`}/>
    <div style={{ position:'relative' }}>
      <div className="pill pill-mint" style={{ marginBottom:12 }}>
        <span className="dot" style={{background:'#6ee7b7', boxShadow:'0 0 8px #34D399'}}/>
        On track · 4 days ahead
      </div>
      <h2 className="serif" style={{ fontSize: 36, margin:0, letterSpacing:'-.02em' }}>
        You're <i>halfway</i> there, Ada.
      </h2>
      <p style={{ color:'var(--text-mid)', fontSize:15, marginTop: 10, maxWidth: 480, lineHeight:1.5 }}>
        Six weeks down. The path adapts to what you actually shipped — your evaluation scores nudge upcoming milestones.
      </p>
      <div style={{ display:'flex', gap: 10, marginTop: 18 }}>
        <KPIChip label="Verified credentials" value={2} icon="badge" accent="#6ee7b7"/>
        <KPIChip label="Avg eval score" value={87} suffix="/100" icon="spark" accent="#a5b4fc"/>
        <KPIChip label="Hours logged" value={84} icon="route" accent="#fdba74"/>
      </div>
    </div>
  </div>
);

const Timeline = () => {
  return (
    <div style={{ marginTop: 32 }}>
      {PATH.map((phase, pi) => (
        <div key={phase.phase} style={{ marginBottom: 32 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 14, marginBottom: 18 }}>
            <div className="serif" style={{ fontSize: 24, letterSpacing:'-.02em' }}>{phase.phase}</div>
            <div style={{ flex:1, height:1, background:'var(--border)' }}/>
            <span className="pill">{phase.weeks.length} weeks</span>
          </div>
          <div style={{ position:'relative', paddingLeft: 28 }}>
            <div style={{ position:'absolute', left: 10, top: 6, bottom: 6, width: 2, background:'linear-gradient(180deg, var(--border-strong), var(--border) 80%, transparent)' }}/>
            {phase.weeks.map((w, wi) => <WeekNode key={w.n} week={w} delay={pi*200 + wi*80}/>)}
          </div>
        </div>
      ))}
    </div>
  );
};

const WeekNode = ({ week, delay }) => {
  const [expanded, setExpanded] = dUseState(week.status==='in-progress');
  const statusColor = week.status==='completed' ? '#6ee7b7' : week.status==='in-progress' ? '#a5b4fc' : 'var(--text-lo)';
  return (
    <div style={{
      position:'relative', marginBottom: 14,
      animation: `fadeUp .5s ${delay}ms both`,
    }}>
      {/* Node dot */}
      <div style={{ position:'absolute', left:-23, top: 22, width: 14, height: 14, borderRadius: 999,
        background: week.status==='completed' ? 'linear-gradient(135deg, #34D399, #6ee7b7)' : week.status==='in-progress' ? 'linear-gradient(135deg, #6366F1, #818CF8)' : 'var(--bg-2)',
        boxShadow: week.status==='in-progress' ? '0 0 0 4px rgba(99,102,241,0.2), 0 0 14px rgba(99,102,241,0.5)' : week.status==='completed' ? '0 0 0 4px rgba(52,211,153,0.15)' : 'inset 0 0 0 1px var(--border-strong)',
      }}/>
      <button onClick={()=>setExpanded(x=>!x)} className="card" style={{
        width:'100%', textAlign:'left', padding:'18px 20px', background: week.status==='in-progress' ? 'linear-gradient(180deg, color-mix(in srgb, var(--primary) 8%, var(--bg-1)), var(--bg-1))' : 'var(--bg-1)',
        border:'none', cursor:'pointer', position:'relative', overflow:'hidden',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', minWidth: 60 }}>WEEK {String(week.n).padStart(2,'0')}</div>
          <div style={{ flex:1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 20, letterSpacing:'-.015em' }}>{week.title}</div>
            <div style={{ fontSize: 13, color:'var(--text-mid)', marginTop: 4 }}>
              <Icon name="cube" size={11} style={{ verticalAlign:'middle', marginRight:6, color:'var(--text-lo)' }}/>
              {week.deliverable}
            </div>
          </div>
          <span className="pill" style={{ color: statusColor, boxShadow: `inset 0 0 0 1px ${week.status==='completed'?'rgba(52,211,153,0.3)':week.status==='in-progress'?'rgba(99,102,241,0.4)':'var(--border-strong)'}`, background: week.status==='completed'?'rgba(52,211,153,0.08)':week.status==='in-progress'?'rgba(99,102,241,0.08)':'var(--bg-2)' }}>
            <span className="dot" style={{ background: statusColor, boxShadow: week.status!=='locked' ? `0 0 8px ${statusColor}` : 'none' }}/>
            {week.status === 'in-progress' ? 'in progress' : week.status}
          </span>
          <Icon name="chevron-down" size={14} style={{ color:'var(--text-mid)', transform: expanded?'rotate(180deg)':'rotate(0)', transition:'transform .3s' }}/>
        </div>
      </button>
      <div style={{ maxHeight: expanded ? 600 : 0, overflow:'hidden', transition:'max-height .4s cubic-bezier(.16,1,.3,1)' }}>
        <WeekDetail week={week}/>
      </div>
    </div>
  );
};

const WeekDetail = ({ week }) => {
  const resources = [
    { src:'youtube.com', title:'3Blue1Brown · Neural networks', hrs: 1.5, type:'video' },
    { src:'arxiv.org', title:'Attention is all you need (revisited)', hrs: 2.0, type:'paper' },
    { src:'github.com', title:'Karpathy · build-nanogpt walkthrough', hrs: 4.0, type:'build' },
    { src:'gemma.dev', title:'Gemma 4 fine-tuning guide', hrs: 1.0, type:'docs' },
  ];
  return (
    <div style={{ padding: '14px 20px 20px', display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 20 }} className="wd-grid">
      <div>
        <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 10 }}>Curated free resources</div>
        {resources.map((r, i) => (
          <a key={i} href="#" onClick={e=>e.preventDefault()} style={{
            display:'flex', alignItems:'center', gap:14, padding:'10px 12px', borderRadius:10, background:'var(--bg-2)',
            boxShadow:'inset 0 0 0 1px var(--border)', marginBottom: 8, transition:'background .2s',
          }} onMouseEnter={e=>e.currentTarget.style.background='var(--bg-3)'} onMouseLeave={e=>e.currentTarget.style.background='var(--bg-2)'}>
            <div style={{ width: 28, height:28, borderRadius:6, background:'var(--bg-0)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 }}>
              <Icon name={r.type==='video'?'play':r.type==='paper'?'cube':r.type==='build'?'github':'globe'} size={13} style={{ color:'var(--text-mid)'}}/>
            </div>
            <div style={{ flex:1, minWidth: 0 }}>
              <div style={{ fontSize:13, color:'var(--text-hi)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
              <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', marginTop: 2 }}>{r.src} · ~{r.hrs}h</div>
            </div>
            <span className="pill" style={{ fontSize:10 }}>{r.type}</span>
            <Icon name="arrow-up-right" size={12} style={{ color:'var(--text-mid)'}}/>
          </a>
        ))}
      </div>
      <div>
        <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 10 }}>Deliverable</div>
        <div className="card" style={{ padding: 16, background:'var(--bg-2)' }}>
          <div className="serif italic" style={{ fontSize: 18 }}>{week.deliverable}</div>
          <p style={{ color:'var(--text-mid)', fontSize:13, marginTop: 8, lineHeight:1.6 }}>Submit a GitHub repo + 3-4 screenshots. We'll run multimodal eval and mint a credential if you score ≥0.65.</p>
          {week.status === 'in-progress' && (
            <div style={{ marginTop: 14 }}>
              <MagneticButton variant="primary">
                <Icon name="upload" size={14}/> Submit project
              </MagneticButton>
            </div>
          )}
          {week.status === 'completed' && (
            <div style={{ marginTop: 14, display:'flex', gap:8 }}>
              <span className="pill pill-mint"><Icon name="check" size={11}/> credential minted</span>
              <a href="#" className="pill">view eval →</a>
            </div>
          )}
        </div>
      </div>
      <style>{`@media (max-width: 760px){ .wd-grid { grid-template-columns: 1fr !important; }}`}</style>
    </div>
  );
};

const RightRail = ({ navigate }) => (
  <aside style={{ position:'sticky', top: 100, alignSelf:'flex-start' }}>
    {/* Next up */}
    <div className="gbc" style={{ marginBottom: 16 }}>
      <div className="gbc-inner" style={{ padding: 20 }}>
        <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em' }}>Up next · Week 7</div>
        <div className="serif" style={{ fontSize: 24, marginTop: 8, lineHeight:1.1 }}>Ship Codex Studio v0</div>
        <p style={{ color:'var(--text-mid)', fontSize:13, marginTop: 10, lineHeight:1.6 }}>An agentic coding assistant. Should call 2+ tools, stream answers, and ship a working web UI.</p>
        <div style={{ marginTop: 16, display:'flex', gap:8 }}>
          <MagneticButton onClick={()=>navigate('projects-new')}>Submit <Icon name="arrow-right" size={14}/></MagneticButton>
        </div>
      </div>
    </div>
    {/* Coach */}
    <div className="card" style={{ padding: 20, marginBottom: 16 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom: 12 }}>
        <div style={{ width:28, height:28, borderRadius:999, background:'linear-gradient(135deg, #6366F1, #34D399)', display:'flex', alignItems:'center', justifyContent:'center'}}>
          <Icon name="sparkles" size={14} style={{color:'#fff'}}/>
        </div>
        <div>
          <div style={{ fontSize:14 }}>Coach Gemma</div>
          <div style={{ fontSize:11, color:'var(--text-mid)' }}>your weekly nudge</div>
        </div>
      </div>
      <p style={{ fontSize:14, lineHeight:1.6, color:'var(--text-hi)', margin:0 }}>
        <span className="italic" style={{ color:'var(--text-mid)' }}>"Your last eval had thin tests. For week 7, add a small eval harness alongside the demo — recruiters love it."</span>
      </p>
      <button className="btn-magnetic btn-ghost" style={{ marginTop: 12, padding:'6px 12px', fontSize:12 }}>Ask a question →</button>
    </div>
    {/* This week */}
    <div className="card" style={{ padding: 20 }}>
      <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 12 }}>This week</div>
      {[
        ['Mon','Read agent loop primer','done'],
        ['Tue','Build CLI prototype','done'],
        ['Wed','Wire tool calls','done'],
        ['Thu','UI scaffold','progress'],
        ['Fri','Polish + screenshots','todo'],
        ['Sat','Submit to Cairn','todo'],
      ].map(([d,t,s]) => (
        <div key={d} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderTop:'1px solid var(--border)' }}>
          <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', width: 30 }}>{d}</div>
          <div style={{ flex:1, fontSize:13, color: s==='done'?'var(--text-mid)':'var(--text-hi)', textDecoration: s==='done'?'line-through':'none' }}>{t}</div>
          {s==='progress' ? <span style={{ width:8, height:8, borderRadius:999, background:'#a5b4fc', boxShadow:'0 0 8px #818CF8'}}/> :
           s==='done' ? <Icon name="check" size={12} style={{ color:'#6ee7b7'}}/> :
           <span style={{ width:8, height:8, borderRadius:999, border:'1px solid var(--border-strong)' }}/>}
        </div>
      ))}
    </div>
  </aside>
);

Object.assign(window, { Dashboard });
