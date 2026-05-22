/* Projects — submit + results */
const { useState: pUseState, useEffect: pUseEffect, useRef: pUseRef } = React;

/* ===================== /projects/new ===================== */
const ProjectsNew = ({ navigate }) => {
  const [url, setUrl] = pUseState('github.com/adapark/codex-studio');
  const [validating, setValidating] = pUseState(false);
  const [valid, setValid] = pUseState(true);
  const [shots, setShots] = pUseState([
    { id:1, name:'home.png', tone:'#6366F1' },
    { id:2, name:'chat.png', tone:'#34D399' },
    { id:3, name:'tools.png', tone:'#FB923C' },
  ]);
  const [tags, setTags] = pUseState(['RAG','Streaming','Vision','Agents']);
  const [scanning, setScanning] = pUseState(false);

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-0)' }}>
      <Sidebar navigate={navigate} route="projects-new"/>
      <main style={{ flex:1, minWidth:0 }}>
        <Topbar title="Submit a project" subtitle="Week 7 deliverable · Codex Studio v0" right={
          <span className="pill"><Icon name="cmd" size={11}/> <span className="kbd">⌘</span> <span className="kbd">K</span></span>
        }/>
        {scanning ? (
          <EvaluationScene onDone={()=>{ navigate('projects-detail'); }}/>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24, padding: 32 }} className="new-grid">
            {/* LEFT: input */}
            <div>
              <div className="card" style={{ padding: 24 }}>
                <SmallEyebrow>01 · Repository</SmallEyebrow>
                <div style={{ marginTop: 12 }}>
                  <div style={{
                    display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderRadius:12,
                    background:'var(--bg-2)', boxShadow: valid ? 'inset 0 0 0 1px rgba(52,211,153,0.3)' : 'inset 0 0 0 1px var(--border-strong)',
                    fontFamily:'var(--mono)', fontSize: 14,
                  }}>
                    <span style={{ color:'var(--text-mid)' }}>gh:</span>
                    <input value={url} onChange={e=>{ setUrl(e.target.value); setValid(e.target.value.startsWith('github.com/')); }} style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontFamily:'inherit', fontSize:14 }}/>
                    {validating ? <span style={{ width:14, height:14, border:'2px solid rgba(255,255,255,0.2)', borderTopColor:'#a5b4fc', borderRadius:999, animation:'spin 1s linear infinite' }}/> :
                     valid ? <Icon name="check" size={14} style={{ color:'#6ee7b7' }}/> : <Icon name="x" size={14} style={{ color:'#f87171' }}/>}
                  </div>
                </div>
                {valid && (
                  <div style={{ marginTop: 14, padding: 14, borderRadius: 12, background:'var(--bg-0)', boxShadow:'inset 0 0 0 1px var(--border)', animation:'fadeUp .3s ease' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:38, height:38, borderRadius:10, background:'linear-gradient(135deg, #6366F1, #34D399)', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <Icon name="github" size={18} style={{ color:'#fff' }}/>
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize: 15 }}>adapark / codex-studio</div>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop: 4, fontSize:11, color:'var(--text-mid)' }}>
                          <span style={{display:'flex', alignItems:'center', gap:4}}><span style={{ width:8, height:8, borderRadius:999, background:'#3178c6'}}/> TypeScript</span>
                          <span>· Python</span>
                          <span>· ★ 12</span>
                          <span>· updated 2h ago</span>
                        </div>
                      </div>
                      <span className="pill pill-mint" style={{ fontSize:10 }}>public</span>
                    </div>
                    <div style={{ marginTop: 10, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 8 }}>
                      <MiniStat label="commits" value="142"/>
                      <MiniStat label="tests" value="96%"/>
                      <MiniStat label="branches" value="4"/>
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 24, marginTop: 16 }}>
                <SmallEyebrow>02 · Screenshots (up to 4)</SmallEyebrow>
                <ShotsDropzone shots={shots} setShots={setShots}/>
              </div>

              <div className="card" style={{ padding: 24, marginTop: 16 }}>
                <SmallEyebrow>03 · Skills demonstrated</SmallEyebrow>
                <div style={{ marginTop: 12, display:'flex', flexWrap:'wrap', gap: 6 }}>
                  {tags.map(t => (
                    <span key={t} className="pill pill-indigo" style={{ padding:'6px 12px', fontSize:12 }}>
                      {t}
                      <button onClick={()=>setTags(tags.filter(x=>x!==t))} style={{ background:'none', border:'none', color:'inherit', opacity:.5, cursor:'pointer', padding:0 }}>
                        <Icon name="x" size={10}/>
                      </button>
                    </span>
                  ))}
                  <input placeholder="+ add" onKeyDown={e=>{ if(e.key==='Enter' && e.target.value.trim()) { setTags([...tags, e.target.value.trim()]); e.target.value=''; }}}
                    style={{ background:'transparent', border:'none', outline:'none', fontSize:12, padding:'6px 8px', color:'var(--text-hi)', minWidth: 80, fontFamily:'inherit' }}/>
                </div>
              </div>

              <div style={{ marginTop: 24, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div className="mono" style={{ fontSize:11, color:'var(--text-mid)' }}>~ 2-4 min eval · Gemma 4 27B + 12B</div>
                <MagneticButton onClick={()=>setScanning(true)}>
                  <Icon name="sparkles" size={14}/> Submit for evaluation
                </MagneticButton>
              </div>
            </div>

            {/* RIGHT: preview */}
            <div>
              <div className="card" style={{ padding: 0, overflow:'hidden', position:'sticky', top: 100 }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
                  <SmallEyebrow>Preview · what we'll evaluate</SmallEyebrow>
                  <span style={{ flex:1 }}/>
                  <span className="pill" style={{ fontSize:10 }}>live</span>
                </div>
                <div style={{ padding: 18 }}>
                  <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', marginBottom: 8 }}>Repo tree</div>
                  <div className="code-block" style={{ background:'var(--bg-0)', borderRadius: 10, padding: 14, boxShadow:'inset 0 0 0 1px var(--border)', maxHeight: 220, overflow:'auto', fontSize:12 }}>
                    {[
                      ['📁 src/', 0],
                      ['  📄 agent.py', 1],
                      ['  📄 tools.py', 1],
                      ['  📁 ui/', 1],
                      ['    📄 App.tsx', 2],
                      ['    📄 ChatPane.tsx', 2],
                      ['📁 evals/', 0],
                      ['  📄 retrieval.json', 1],
                      ['📄 README.md', 0],
                      ['📄 pyproject.toml', 0],
                    ].map(([f, d], i) => (
                      <div key={i} style={{ color: i%3===0?'var(--text-hi)':'var(--text-mid)', paddingLeft: d*10 }}>{f}</div>
                    ))}
                  </div>
                  <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', marginTop: 16, marginBottom: 8 }}>Screenshots</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
                    {shots.slice(0,4).map(s => (
                      <div key={s.id} style={{ aspectRatio:'16/10', borderRadius:8, background:`linear-gradient(135deg, ${s.tone}55, ${s.tone}11)`, boxShadow:'inset 0 0 0 1px var(--border)', display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
                        <Icon name="image" size={20} style={{ color: s.tone, opacity:.7 }}/>
                        <div className="mono" style={{ position:'absolute', bottom: 6, left: 8, fontSize:10, color:'var(--text-mid)' }}>{s.name}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', marginTop: 16, marginBottom: 8 }}>Eval plan</div>
                  <div style={{ display:'flex', flexDirection:'column', gap: 6 }}>
                    {[
                      ['Structural scan','Gemma 4 4B','~15s'],
                      ['Code review','Gemma 4 27B','~80s'],
                      ['Visual review','Gemma 4 12B','~40s'],
                      ['Synthesize + sign','Gemma 4 12B','~10s'],
                    ].map(([s,m,t], i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, background:'var(--bg-2)' }}>
                        <span className="mono" style={{ fontSize:11, color:'var(--text-mid)', width:18 }}>{i+1}</span>
                        <span style={{ fontSize:13 }}>{s}</span>
                        <span style={{ flex:1 }}/>
                        <span className="mono" style={{ fontSize:10, color:'var(--text-mid)' }}>{m} · {t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside { display: none; }
          .new-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const MiniStat = ({ label, value }) => (
  <div style={{ padding: '8px 10px', borderRadius:8, background:'var(--bg-2)', textAlign:'center' }}>
    <div className="serif" style={{ fontSize: 18 }}>{value}</div>
    <div style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>
  </div>
);

const ShotsDropzone = ({ shots, setShots }) => {
  const [over, setOver] = pUseState(false);
  return (
    <div onDragOver={e=>{ e.preventDefault(); setOver(true); }} onDragLeave={()=>setOver(false)} onDrop={e=>{ e.preventDefault(); setOver(false); }} style={{
      marginTop: 12, borderRadius: 14, padding: 20, border:'1.5px dashed var(--border-strong)',
      background: over ? 'rgba(99,102,241,0.08)' : 'var(--bg-2)',
      transition:'all .2s', textAlign:'center', position:'relative',
    }}>
      {shots.length === 0 ? (
        <>
          <Icon name="upload" size={28} style={{ color:'var(--text-mid)', margin:'8px auto'}}/>
          <div style={{ fontSize:15, marginTop: 6 }}>Drag & drop, or click to browse</div>
          <div style={{ fontSize:12, color:'var(--text-mid)', marginTop:4 }}>PNG, JPG up to 8MB each · 4 max</div>
        </>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8 }}>
          {shots.map(s => (
            <div key={s.id} style={{ aspectRatio:'16/10', borderRadius:8, background:`linear-gradient(135deg, ${s.tone}66, ${s.tone}11)`, boxShadow:'inset 0 0 0 1px var(--border)', position:'relative', overflow:'hidden', cursor:'pointer' }}>
              <Icon name="image" size={22} style={{ color: s.tone, position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}/>
              <button onClick={()=>setShots(shots.filter(x=>x.id!==s.id))} style={{ position:'absolute', top: 4, right: 4, width:20, height:20, borderRadius:999, background:'rgba(0,0,0,.5)', border:'none', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="x" size={10}/>
              </button>
              <div className="mono" style={{ position:'absolute', bottom: 4, left: 6, fontSize:9, color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,.6)' }}>{s.name}</div>
            </div>
          ))}
          {shots.length < 4 && (
            <button onClick={()=>setShots([...shots, { id:Date.now(), name:`shot-${shots.length+1}.png`, tone: ['#6366F1','#34D399','#FB923C','#8B5CF6'][shots.length] }])}
              style={{ aspectRatio:'16/10', borderRadius:8, background:'var(--bg-0)', boxShadow:'inset 0 0 0 1.5px dashed var(--border-strong)', color:'var(--text-mid)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon name="plus" size={20}/>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

/* ===================== Evaluation scene ===================== */
const STAGES = [
  { n:1, name:'Structural', model:'Gemma 4 4B', dur: 2000 },
  { n:2, name:'Code review', model:'Gemma 4 27B', dur: 3200 },
  { n:3, name:'Visual review', model:'Gemma 4 12B', dur: 3000 },
  { n:4, name:'Synthesis', model:'Gemma 4 12B', dur: 1800 },
];

const EvaluationScene = ({ onDone }) => {
  const [stage, setStage] = pUseState(0);
  const [progress, setProgress] = pUseState(0);

  pUseEffect(() => {
    let cancel = false;
    let start = Date.now();
    const total = STAGES.reduce((a,s)=>a+s.dur, 0);
    const tick = () => {
      if (cancel) return;
      const t = Date.now() - start;
      let acc = 0; let s = 0;
      for (let i=0;i<STAGES.length;i++){ if (t < acc + STAGES[i].dur) { s = i; break; } acc += STAGES[i].dur; if (i===STAGES.length-1) s = i+1; }
      setStage(s);
      setProgress(Math.min(1, t/total));
      if (t < total) requestAnimationFrame(tick);
      else setTimeout(()=> !cancel && onDone(), 1500);
    };
    tick();
    return () => { cancel = true; };
  }, []);

  return (
    <div style={{ padding: 40, minHeight:'calc(100vh - 80px)', position:'relative' }}>
      <AuroraBackground intensity={0.4}/>
      <div style={{ position:'relative', zIndex:2, maxWidth: 1100, margin:'0 auto' }}>
        <SmallEyebrow>Evaluating · codex-studio</SmallEyebrow>
        <h2 className="serif" style={{ fontSize:'clamp(32px, 4vw, 48px)', margin:'12px 0 8px', letterSpacing:'-.025em' }}>
          {stage < STAGES.length ? <>Stage {stage+1} · <i>{STAGES[stage]?.name}</i></> : <>Sealing your <i>credential</i>…</>}
        </h2>
        <div style={{ color:'var(--text-mid)', fontSize:15, maxWidth: 600 }}>
          {stage < STAGES.length && <>Running on {STAGES[stage]?.model}. Findings stream in real time.</>}
        </div>

        {/* Pipeline */}
        <div style={{ marginTop: 36, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 12, position:'relative' }} className="pipeline">
          <div style={{ position:'absolute', left:0, right:0, top: 40, height:2, background:'var(--bg-3)', borderRadius:2, zIndex:0 }}/>
          <div style={{ position:'absolute', left:0, top:40, height:2, width: `${progress*100}%`, background:'linear-gradient(90deg, var(--primary), var(--mint), var(--warm))', borderRadius:2, transition:'width .3s ease', boxShadow:'0 0 20px var(--primary-glow)', zIndex:1 }}/>
          {STAGES.map((s, i) => {
            const state = i < stage ? 'done' : i === stage ? 'active' : 'idle';
            return (
              <div key={s.n} style={{ position:'relative', zIndex: 2, textAlign:'center' }}>
                <div style={{
                  margin:'0 auto', width:80, height:80, borderRadius:999,
                  background: state==='active' ? 'linear-gradient(135deg, var(--primary), var(--mint))' : state==='done' ? 'linear-gradient(135deg, #34D399, #6ee7b7)' : 'var(--bg-2)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow: state==='active' ? '0 0 40px var(--primary-glow), inset 0 0 0 2px rgba(255,255,255,0.2)' : state==='done' ? '0 0 30px rgba(52,211,153,0.4)' : 'inset 0 0 0 1px var(--border-strong)',
                  position:'relative',
                }}>
                  {state==='done' ? <Icon name="check" size={28} stroke={2} style={{ color:'#0a0a0f' }}/> :
                   state==='active' ? <div style={{ width:28, height:28, border:'3px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:999, animation:'spin 1s linear infinite' }}/> :
                   <span className="mono" style={{ fontSize: 16, color:'var(--text-lo)' }}>{s.n}</span>}
                </div>
                <div className="serif" style={{ marginTop: 14, fontSize:18, color: state==='idle'?'var(--text-mid)':'var(--text-hi)' }}>{s.name}</div>
                <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', marginTop:4 }}>{s.model}</div>
              </div>
            );
          })}
        </div>

        {/* Stage detail panel */}
        <div style={{ marginTop: 48, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }} className="stage-detail">
          <StageLeftPanel stage={stage}/>
          <StageRightPanel stage={stage}/>
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .pipeline { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .pipeline > div:first-child { display: none !important; }
          .stage-detail { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const StageLeftPanel = ({ stage }) => {
  if (stage === 0) {
    return (
      <div className="card" style={{ padding: 20, animation:'fadeUp .3s ease' }}>
        <SmallEyebrow>Structural · live counts</SmallEyebrow>
        <div style={{ marginTop: 14, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
          <KPIChip label="Commits" value={142} icon="route" accent="#a5b4fc"/>
          <KPIChip label="Test cov." value={96} suffix="%" icon="check" accent="#6ee7b7"/>
          <KPIChip label="Lines (TS)" value={2843} icon="cube" accent="#fdba74"/>
          <KPIChip label="README" value={8.4} icon="badge" accent="#a5b4fc"/>
        </div>
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="card" style={{ padding: 0, animation:'fadeUp .3s ease', overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 10 }}>
          <SmallEyebrow>Repo · src/agent.py</SmallEyebrow>
          <span style={{ flex:1 }}/>
          <ProviderChain providers={['Gemma 4 27B','Gemini']} active={0}/>
        </div>
        <div className="code-block" style={{ padding: 16, fontSize: 12 }}>
          <div><span className="tok-com"># Agent loop with tool routing</span></div>
          <div><span className="tok-kw">class</span> <span className="tok-fn">Agent</span>:</div>
          <div style={{paddingLeft:14}}><span className="tok-kw">def</span> <span className="tok-fn">__init__</span>(self, tools, model):</div>
          <div style={{paddingLeft:28}}>self.tools = tools</div>
          <div style={{paddingLeft:28}}>self.model = model</div>
          <div style={{paddingLeft:14}}><span className="tok-kw">async def</span> <span className="tok-fn">step</span>(self, msgs):</div>
          <div style={{paddingLeft:28}}>resp = <span className="tok-kw">await</span> self.model.<span className="tok-fn">call</span>(msgs)</div>
          <div style={{paddingLeft:28}}><span className="tok-kw">if</span> resp.tool_call:</div>
          <div style={{paddingLeft:42}}>r = <span className="tok-kw">await</span> self.tools[resp.tool](resp.args)</div>
          <div style={{paddingLeft:42}}><span className="tok-kw">return</span> {`{...resp, 'tool_result': r}`}</div>
        </div>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="card" style={{ padding: 18, animation:'fadeUp .3s ease', position:'relative', overflow:'hidden' }}>
        <SmallEyebrow>Visual review · home.png</SmallEyebrow>
        <div style={{ marginTop: 12, position:'relative', aspectRatio:'16/10', borderRadius: 10, background:'linear-gradient(180deg, #131520, #0a0c14)', boxShadow:'inset 0 0 0 1px var(--border)', overflow:'hidden' }}>
          <FakeAppShot/>
          <BoundingBoxes/>
          <div style={{ position:'absolute', left:0, right:0, height:2, background:'linear-gradient(90deg, transparent, #34D399, transparent)', boxShadow:'0 0 14px #34D399', animation:'scan 2.4s linear infinite'}}/>
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 24, animation:'fadeUp .3s ease', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
      <SmallEyebrow>Final score</SmallEyebrow>
      <div style={{ marginTop: 14 }}>
        <ProgressRing value={92} size={180} label="overall" sublabel="passed · credential earned"/>
      </div>
      <Confetti/>
    </div>
  );
};

const STAGE_FINDINGS = [
  ['Structure looks clean — clear separation between agent core, tools, and UI.','#6ee7b7'],
  ['Test coverage is strong on `agent.py` but `tools.py` has no negative path tests.','#fdba74'],
  ['Streaming uses `async generator`, idiomatic. Recommend AbortController on UI side.','#a5b4fc'],
  ['Found 2 minor bugs: race on tool retries; null check missing on empty repo response.','#fdba74'],
  ['Overall: a strong week-7 deliverable. Ship.','#6ee7b7'],
];

const StageRightPanel = ({ stage }) => {
  const [items, setItems] = pUseState([]);
  pUseEffect(() => {
    setItems([]);
    if (stage === 1) {
      STAGE_FINDINGS.forEach((f, i) => {
        setTimeout(()=> setItems(x => [...x, f]), 500 + i*400);
      });
    }
  }, [stage]);

  if (stage === 0) {
    return (
      <div className="card" style={{ padding: 18, animation:'fadeUp .3s ease' }}>
        <SmallEyebrow>Structural · checks</SmallEyebrow>
        <div style={{ marginTop: 12, display:'flex', flexDirection:'column', gap: 8 }}>
          {[
            ['README exists & ≥ 5 sections','ok'],
            ['CI passing on main','ok'],
            ['License declared','ok'],
            ['No secrets in history','ok'],
            ['Has at least one tested entrypoint','ok'],
          ].map(([t,s], i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 8, padding:'8px 12px', borderRadius: 10, background:'var(--bg-2)', animation:`fadeUp .3s ${i*120}ms both` }}>
              <Icon name="check" size={14} style={{ color:'#6ee7b7' }}/>
              <span style={{ fontSize:13, flex:1 }}>{t}</span>
              <span className="mono" style={{ fontSize: 10, color:'var(--text-mid)' }}>OK</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="card" style={{ padding: 18, animation:'fadeUp .3s ease' }}>
        <SmallEyebrow>Streaming critique · Gemma 4 27B</SmallEyebrow>
        <div style={{ marginTop: 12, maxHeight: 280, overflow:'auto', display:'flex', flexDirection:'column', gap: 10 }}>
          {items.map((f, i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius: 10, background:'var(--bg-2)', boxShadow:`inset 0 0 0 1px ${f[1]}30`, animation:'fadeUp .3s ease', display:'flex', gap:10 }}>
              <span style={{ width:8, height:8, borderRadius:999, background: f[1], marginTop:6, flexShrink:0 }}/>
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{f[0]}</span>
            </div>
          ))}
          {items.length < STAGE_FINDINGS.length && (
            <div style={{ padding:'10px 12px', borderRadius:10, background:'var(--bg-2)', color:'var(--text-mid)', fontSize:13 }}>
              <Typewriter text={'streaming…'} speed={50}/>
            </div>
          )}
        </div>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="card" style={{ padding: 18, animation:'fadeUp .3s ease' }}>
        <SmallEyebrow>Visual findings</SmallEyebrow>
        <div style={{ marginTop: 12, display:'flex', flexDirection:'column', gap: 8 }}>
          {[
            ['Hierarchy is clear; H1 dominates above the fold.','#6ee7b7'],
            ['Contrast on muted text is 3.8:1 — below AA on body copy.','#FB923C'],
            ['CTA cluster lacks affordance separation; consider primary + secondary.','#a5b4fc'],
            ['Empty state in tools panel: replace lorem with example invocation.','#fdba74'],
          ].map(([t,c], i) => (
            <div key={i} style={{ padding:'10px 12px', borderRadius:10, background:'var(--bg-2)', display:'flex', alignItems:'flex-start', gap:10, boxShadow:`inset 0 0 0 1px ${c}30`, animation:`fadeUp .3s ${i*120}ms both` }}>
              <span style={{ width:18, height:18, borderRadius:4, background:c, opacity:.25, flexShrink:0 }}/>
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="card" style={{ padding: 18, animation:'fadeUp .3s ease', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative' }}>
      <SmallEyebrow>Credential</SmallEyebrow>
      <div style={{ marginTop: 14, animation:'flipCard 1.2s cubic-bezier(.16,1,.3,1) both' }}>
        <CredentialBadge title="AI Engineer · Week 7" project="Codex Studio v0" score={92}/>
      </div>
      <div style={{ marginTop: 14, fontSize:12, color:'var(--text-mid)' }}>HMAC-signed · verifiable</div>
    </div>
  );
};

const Confetti = () => {
  const dots = Array.from({length: 40}).map((_,i)=> ({
    i, c: ['#6366F1','#34D399','#FB923C','#8B5CF6'][i%4],
    x: (i*37)%100, d: (i%8)*0.05, s: 4 + (i%5)*2,
  }));
  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
      {dots.map(d => (
        <div key={d.i} style={{
          position:'absolute', left:`${d.x}%`, top:-10, width: d.s, height: d.s, background: d.c, borderRadius: d.i%2?2:999,
          animation: `confettiFall 2.4s ${d.d}s ease-out both`, transformOrigin:'center',
        }}/>
      ))}
    </div>
  );
};

const FakeAppShot = () => (
  <div style={{ width:'100%', height:'100%', borderRadius:6, background:'linear-gradient(180deg, #131520 0%, #0a0c14 100%)', overflow:'hidden', position:'relative' }}>
    <div style={{ padding:8, display:'flex', alignItems:'center', gap:6, borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ width:8, height:8, borderRadius:999, background:'#FB923C'}}/>
      <div style={{ width:8, height:8, borderRadius:999, background:'#A1A1AA'}}/>
      <div style={{ width:8, height:8, borderRadius:999, background:'#A1A1AA'}}/>
    </div>
    <div style={{ padding: 18 }}>
      <div className="serif italic" style={{ fontSize:16, color:'#fff' }}>What do you want to build?</div>
      <div style={{ marginTop:8, height: 4, width:'80%', background:'rgba(255,255,255,0.12)', borderRadius:2 }}/>
      <div style={{ marginTop:4, height: 4, width:'50%', background:'rgba(255,255,255,0.07)', borderRadius:2 }}/>
      <div style={{ marginTop: 18, display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        <div style={{ height: 50, borderRadius: 4, background:'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(99,102,241,0.1))' }}/>
        <div style={{ height: 50, borderRadius: 4, background:'linear-gradient(135deg, rgba(52,211,153,0.3), rgba(52,211,153,0.05))' }}/>
      </div>
    </div>
  </div>
);

/* ===================== /projects/[id] ===================== */
const ProjectsDetail = ({ navigate }) => {
  const [tab, setTab] = pUseState('overview');
  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-0)' }}>
      <Sidebar navigate={navigate} route="projects-detail"/>
      <main style={{ flex:1, minWidth:0 }}>
        <Topbar title="Codex Studio v0" subtitle="Project · evaluated 12 min ago" right={
          <span className="pill pill-mint"><Icon name="check" size={11}/> credential minted</span>
        }/>
        <div style={{ padding: 32 }}>
          {/* Hero */}
          <div className="card" style={{ padding: 28, display:'flex', alignItems:'center', gap: 28, position:'relative', overflow:'hidden', marginBottom: 24 }}>
            <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at right, rgba(52,211,153,0.12), transparent 50%)' }}/>
            <ProgressRing value={92} size={140} label="overall"/>
            <div style={{ position:'relative', flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom: 8 }}>
                <a href="#" className="pill"><Icon name="github" size={11}/> adapark/codex-studio</a>
                <span className="pill"><Icon name="link" size={11}/> codex.studio</span>
                <span className="pill pill-mint">Passed · 92/100</span>
              </div>
              <h2 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing:'-.02em' }}>Codex Studio v0</h2>
              <p style={{ color:'var(--text-mid)', fontSize:15, marginTop: 8, maxWidth: 560 }}>An agentic coding assistant: streams Gemma 4 27B, calls 4 tools, and ships a working web UI.</p>
              <div style={{ display:'flex', gap:8, marginTop:16 }}>
                <MagneticButton variant="ghost"><Icon name="link" size={14}/> Share</MagneticButton>
                <MagneticButton variant="ghost"><Icon name="github" size={14}/> Open repo</MagneticButton>
                <MagneticButton><Icon name="sparkles" size={14}/> Re-evaluate</MagneticButton>
              </div>
            </div>
          </div>

          <Tabs value={tab} onChange={setTab} tabs={[
            { label:'Overview', value:'overview' },
            { label:'Code review', value:'code' },
            { label:'Visual review', value:'visual' },
            { label:'Resources', value:'resources' },
            { label:'Credential', value:'credential' },
          ]}/>

          <div style={{ marginTop: 24 }}>
            {tab === 'overview' && <Overview/>}
            {tab === 'code' && <CodeReview/>}
            {tab === 'visual' && <VisualReview/>}
            {tab === 'resources' && <Resources/>}
            {tab === 'credential' && <Credential/>}
          </div>
        </div>
      </main>
      <style>{`@media (max-width: 1100px){ aside{ display:none; }}`}</style>
    </div>
  );
};

const Overview = () => {
  const stages = [
    { n:1, name:'Structural', score:90, model:'Gemma 4 4B', summary:'Repo hygiene clean. 96% test coverage, well-documented README, CI green.' },
    { n:2, name:'Code review', score:88, model:'Gemma 4 27B', summary:'Agent loop is idiomatic. Minor bugs flagged on tool retry race + null check.' },
    { n:3, name:'Visual review', score:94, model:'Gemma 4 12B', summary:'Strong hierarchy, accessible touch targets. Body copy contrast just below AA on muted.' },
    { n:4, name:'Synthesis', score:92, model:'Gemma 4 12B', summary:'Credential issued. 12-week path advanced to Week 8.' },
  ];
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }} className="overview-grid">
      {stages.map(s => (
        <div key={s.n} className="card" style={{ padding: 22 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <SmallEyebrow>Stage {s.n} · {s.name}</SmallEyebrow>
            <ProviderChain providers={[s.model,'Gemini']} active={0}/>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap: 14, marginTop: 10 }}>
            <div className="serif" style={{ fontSize: 44, lineHeight:1, color: s.score>=90?'#6ee7b7':'#a5b4fc' }}>{s.score}<span style={{ fontSize: 16, color:'var(--text-mid)' }}>/100</span></div>
            <div style={{ flex:1, height: 6, borderRadius: 999, background:'var(--bg-2)', overflow:'hidden' }}>
              <div style={{ width:`${s.score}%`, height:'100%', background:'linear-gradient(90deg, var(--primary), var(--mint))', animation:'drawIn 1.2s cubic-bezier(.16,1,.3,1) both', transformOrigin:'left' }}/>
            </div>
          </div>
          <p style={{ color:'var(--text-mid)', fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>{s.summary}</p>
        </div>
      ))}
      <style>{`@media(max-width:900px){.overview-grid{grid-template-columns:1fr !important;}} @keyframes drawIn{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
    </div>
  );
};

const CodeReview = () => {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }} className="code-grid">
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Strengths</SmallEyebrow>
        <div style={{ marginTop: 14 }}>
          {['Clear separation of agent / tools / UI.','Streaming with async generators is idiomatic.','Tests on agent.py cover happy + retry paths.','README walks through the agent loop with a diagram.'].map((t,i)=>(
            <div key={i} style={{ display:'flex', gap: 10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <Icon name="check" size={14} style={{ color:'#6ee7b7', marginTop: 3, flexShrink: 0 }}/>
              <span style={{ fontSize:14 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Weaknesses</SmallEyebrow>
        <div style={{ marginTop: 14 }}>
          {['No negative-path tests on tools.py.','Tool retry has a race on shared state.','UI does not abort in-flight stream on input change.','Minimal evals — add `evals/retrieval.json` is empty.'].map((t,i)=>(
            <div key={i} style={{ display:'flex', gap: 10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <Icon name="minus" size={14} style={{ color:'#fdba74', marginTop: 3, flexShrink: 0 }}/>
              <span style={{ fontSize:14 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 22, gridColumn:'span 2' }}>
        <SmallEyebrow>Meters</SmallEyebrow>
        <div style={{ marginTop: 14, display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16 }} className="meters">
          {[['Originality',82,'#a5b4fc'],['Functionality',95,'#6ee7b7'],['Quality',88,'#fdba74'],['Skill match',91,'#c4b5fd']].map(([l,v,c]) => (
            <div key={l}>
              <div style={{ fontSize:12, color:'var(--text-mid)', marginBottom: 6 }}>{l}</div>
              <div style={{ height:8, borderRadius: 999, background:'var(--bg-2)', overflow:'hidden' }}>
                <div style={{ width:`${v}%`, height:'100%', background:c, animation:'drawIn 1.2s cubic-bezier(.16,1,.3,1) both', transformOrigin:'left'}}/>
              </div>
              <div className="mono" style={{ fontSize:11, color: c, marginTop: 4 }}>{v}/100</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 22, gridColumn:'span 2' }}>
        <SmallEyebrow>Highlighted snippet · src/agent.py:42</SmallEyebrow>
        <div className="code-block" style={{ background:'var(--bg-0)', borderRadius:10, padding: 16, marginTop: 14, boxShadow:'inset 0 0 0 1px var(--border)' }}>
          <div style={{ color:'var(--text-mid)' }}>40 <span className="tok-kw">async def</span> <span className="tok-fn">retry</span>(self, tool, args, n=3):</div>
          <div style={{ color:'var(--text-mid)' }}>41{'    '}<span className="tok-kw">for</span> i <span className="tok-kw">in</span> range(n):</div>
          <div style={{ background:'rgba(251,146,60,0.10)', boxShadow:'inset 4px 0 0 #FB923C', paddingLeft: 0 }}>
            <span style={{ color:'var(--text-mid)' }}>42</span>{'        '}r = <span className="tok-kw">await</span> tool(**args)  <span className="tok-com"># ← race on shared cache</span>
          </div>
          <div style={{ color:'var(--text-mid)' }}>43{'        '}<span className="tok-kw">if</span> r.ok: <span className="tok-kw">return</span> r</div>
          <div style={{ marginTop:10, color:'#fdba74', fontSize:12 }}>Suggestion: wrap `tool` call in a per-call lock keyed by `args`, or pass a fresh cache.</div>
        </div>
      </div>
      <style>{`@media(max-width:900px){.code-grid{grid-template-columns:1fr !important;} .meters{grid-template-columns:1fr 1fr !important;}}`}</style>
    </div>
  );
};

const VisualReview = () => {
  const shots = [
    { id:1, name:'home.png', tone:'#6366F1', polish:'shipped' },
    { id:2, name:'chat.png', tone:'#34D399', polish:'shipped' },
    { id:3, name:'tools.png', tone:'#FB923C', polish:'demo' },
  ];
  const [active, setActive] = pUseState(1);
  const cur = shots.find(s=>s.id===active);
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap: 16 }} className="vis-grid">
      <div>
        <SmallEyebrow>Screenshots</SmallEyebrow>
        <div style={{ marginTop: 12, display:'flex', flexDirection:'column', gap: 10 }}>
          {shots.map(s => (
            <button key={s.id} onClick={()=>setActive(s.id)} className="card" style={{
              padding: 10, display:'flex', alignItems:'center', gap: 12, textAlign:'left',
              border:'none', cursor:'pointer',
              background: active===s.id ? 'var(--bg-2)' : 'var(--bg-1)',
              boxShadow: active===s.id ? `inset 0 0 0 1px ${s.tone}55` : 'inset 0 0 0 1px var(--border)'
            }}>
              <div style={{ width: 56, height: 36, borderRadius: 6, background:`linear-gradient(135deg, ${s.tone}55, ${s.tone}11)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Icon name="image" size={14} style={{ color: s.tone }}/>
              </div>
              <div style={{ flex:1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>{s.name}</div>
                <span className="pill" style={{ fontSize:10, marginTop:4 }}>{s.polish}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap: 10 }}>
          <SmallEyebrow>{cur.name} · annotated</SmallEyebrow>
          <span className="pill pill-indigo" style={{ marginLeft:'auto', fontSize:10 }}>Gemma 4 12B vision</span>
        </div>
        <div style={{ position:'relative', aspectRatio:'16/10', background:'#0a0c14' }}>
          <FakeAppShot/>
          <BoundingBoxes/>
        </div>
        <div style={{ padding: 14, display:'flex', flexDirection:'column', gap: 8 }}>
          {[
            ['Header','Strong scan affordance; logo + nav legible at all breakpoints.','#6ee7b7'],
            ['H1','Editorial weight reads as confident. Pull works.','#a5b4fc'],
            ['CTA cluster','Primary vs secondary not distinct enough; primary needs more weight.','#fdba74'],
          ].map(([h,t,c],i) => (
            <div key={i} style={{ padding:'8px 12px', borderRadius:8, background:'var(--bg-2)', display:'flex', alignItems:'flex-start', gap:10, boxShadow:`inset 0 0 0 1px ${c}30` }}>
              <span style={{ width:14, height:14, borderRadius:3, background:c, opacity:.3, flexShrink:0, marginTop:2 }}/>
              <div>
                <div style={{ fontSize:12, color: c }}>{h}</div>
                <div style={{ fontSize:13, marginTop:2 }}>{t}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style>{`@media(max-width:900px){.vis-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

const Resources = () => (
  <div className="card" style={{ padding: 22 }}>
    <SmallEyebrow>Recommended next reads · based on findings</SmallEyebrow>
    <div style={{ marginTop: 14, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 10 }} className="res-grid">
      {[
        ['Building robust agent retries','blog.cairn.dev','12 min','docs'],
        ['Eval-first AI engineering','arxiv.org','paper','paper'],
        ['Streaming UX patterns','interaction.design','8 min','article'],
        ['Test design for tool-using LLMs','github.com/cairn','build','build'],
      ].map(([t,s,d,k], i)=>(
        <a key={i} href="#" className="card" style={{ padding: 14, display:'flex', alignItems:'center', gap: 12 }}>
          <div style={{ width:32, height:32, borderRadius:8, background:'var(--bg-2)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <Icon name={k==='paper'?'cube':k==='build'?'github':'globe'} size={14} style={{ color:'var(--text-mid)' }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14 }}>{t}</div>
            <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', marginTop:2 }}>{s} · {d}</div>
          </div>
          <Icon name="arrow-up-right" size={14} style={{ color:'var(--text-mid)' }}/>
        </a>
      ))}
    </div>
    <style>{`@media(max-width:760px){.res-grid{grid-template-columns:1fr !important;}}`}</style>
  </div>
);

const Credential = () => {
  const toast = useToast();
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 24, alignItems:'center' }} className="cred-grid">
      <div style={{ display:'flex', justifyContent:'center', padding: 40 }}>
        <CredentialBadge title="AI Engineer · Week 7" project="Codex Studio v0" score={92}/>
      </div>
      <div>
        <SmallEyebrow>Verified credential</SmallEyebrow>
        <h3 className="serif" style={{ fontSize: 36, margin:'10px 0 0', letterSpacing:'-.02em' }}>You shipped something <i>real</i>.</h3>
        <p style={{ color:'var(--text-mid)', fontSize: 15, marginTop: 12, lineHeight:1.6 }}>
          The credential is HMAC-signed and lives on your portfolio at <span className="mono">cairn.dev/u/adapark</span>. Anyone can verify it without an account.
        </p>
        <div style={{ marginTop: 18, padding: 14, borderRadius: 10, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)' }}>
          <div style={{ fontSize:11, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.12em' }}>signed payload</div>
          <div className="mono" style={{ fontSize:11, marginTop: 6, lineHeight: 1.6, color:'var(--text-hi)', wordBreak:'break-all' }}>
            {`{`}<br/>
            {`  "sub": "adapark",`}<br/>
            {`  "project": "codex-studio",`}<br/>
            {`  "score": 92, "stages": [90,88,94,92],`}<br/>
            {`  "iss": "cairn.dev",`}<br/>
            {`  "sig": "e3b0c44298fc1c149afb...9b427"`}<br/>
            {`}`}
          </div>
        </div>
        <div style={{ marginTop: 20, display:'flex', flexWrap:'wrap', gap: 10 }}>
          <MagneticButton onClick={()=>toast.push('Copied portfolio link', 'success')}><Icon name="copy" size={14}/> Copy link</MagneticButton>
          <MagneticButton variant="ghost"><Icon name="linkedin" size={14}/> Add to LinkedIn</MagneticButton>
          <MagneticButton variant="ghost"><Icon name="github" size={14}/> Embed in README</MagneticButton>
        </div>
      </div>
      <style>{`@media(max-width:900px){.cred-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

Object.assign(window, { ProjectsNew, ProjectsDetail });
