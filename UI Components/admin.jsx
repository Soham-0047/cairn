/* Admin */
const { useState: aUseState, useEffect: aUseEffect, useRef: aUseRef } = React;

const Admin = ({ navigate }) => {
  const [authed, setAuthed] = aUseState(false);
  const [pwd, setPwd] = aUseState('');
  const [shake, setShake] = aUseState(false);
  const [tab, setTab] = aUseState('site');

  if (!authed) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:24, background:'var(--bg-0)', position:'relative', overflow:'hidden' }}>
        <AuroraBackground intensity={.5}/>
        <div className="card-elev" style={{ width: 420, padding: 36, position:'relative', zIndex:2, animation: shake ? 'shake .4s' : 'fadeUp .4s ease' }}>
          <div style={{ display:'flex', justifyContent:'center', marginBottom: 20 }}>
            <Lock3D unlocked={false}/>
          </div>
          <SmallEyebrow>Admin · CMS</SmallEyebrow>
          <h1 className="serif" style={{ fontSize: 36, margin:'10px 0 8px', letterSpacing:'-.02em' }}>The <i>backstage</i>.</h1>
          <p style={{ color:'var(--text-mid)', fontSize: 14, marginBottom: 22 }}>This area lets you change brand, providers, resources, and string overrides. Bring your ADMIN_SECRET.</p>
          <form onSubmit={(e)=>{
            e.preventDefault();
            if (pwd === 'cairn' || pwd.length>3) setAuthed(true);
            else { setShake(true); setTimeout(()=>setShake(false), 400); }
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', borderRadius:12, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border-strong)' }}>
              <Icon name="lock" size={14} style={{ color:'var(--text-mid)' }}/>
              <input type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="admin secret" autoFocus
                style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontFamily:'var(--mono)', fontSize: 14 }}/>
            </div>
            <div style={{ marginTop: 14 }}>
              <button className="btn-magnetic btn-primary" type="submit" style={{ width:'100%', justifyContent:'center' }}>
                Unlock <Icon name="arrow-right" size={14}/>
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize:11, color:'var(--text-lo)', textAlign:'center' }}>hint: any password 4+ chars works in this prototype</div>
          </form>
        </div>
        <style>{`@keyframes shake { 10%,90% { transform:translateX(-2px); } 20%,80%{ transform:translateX(4px);} 30%,50%,70%{ transform:translateX(-6px);} 40%,60%{ transform:translateX(6px);}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'var(--bg-0)' }}>
      <AdminSidebar tab={tab} setTab={setTab} navigate={navigate}/>
      <main style={{ flex:1, minWidth: 0 }}>
        <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 28px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div className="pill pill-mint"><Icon name="check" size={11}/> unlocked</div>
            <div className="mono" style={{ fontSize: 12, color:'var(--text-mid)' }}>workspace: cairn-prod · env: production</div>
          </div>
          <div style={{ display:'flex', gap: 10 }}>
            <button className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>Live preview</button>
            <button className="btn-magnetic btn-primary" style={{ padding:'8px 14px', fontSize:13 }}>Publish</button>
          </div>
        </header>
        <div style={{ padding: 32 }}>
          {tab==='site' && <AdminSite/>}
          {tab==='providers' && <AdminProviders/>}
          {tab==='resources' && <AdminResources/>}
          {tab==='strings' && <AdminStrings/>}
        </div>
      </main>
      <style>{`@media (max-width: 900px){ .admin-sidebar { display: none; } }`}</style>
    </div>
  );
};

const Lock3D = ({ unlocked }) => (
  <div style={{ width: 90, height: 90, perspective: '600px', position:'relative' }}>
    <div style={{
      width: 70, height: 60, borderRadius: 10, position:'absolute', top: 24, left: 10,
      background:'linear-gradient(180deg, #2b2f44, #11131c)',
      boxShadow:'inset 0 0 0 1px rgba(255,255,255,0.15), 0 18px 30px -8px rgba(0,0,0,0.6)',
    }}>
      <div style={{ width: 14, height: 14, borderRadius:999, background:'linear-gradient(135deg, #818CF8, #34D399)', position:'absolute', top:'50%', left:'50%', transform:'translate(-50%, -50%)', boxShadow:'0 0 20px var(--primary-glow)' }}/>
    </div>
    <div style={{
      position:'absolute', top:0, left:'50%', transform:'translateX(-50%)',
      width: 50, height: 40, border: '4px solid #4b4f6a', borderBottom:'none',
      borderTopLeftRadius: 25, borderTopRightRadius: 25,
      transition:'transform .4s', transformOrigin:'right bottom',
      ...(unlocked ? { transform: 'translateX(-50%) rotate(-22deg)' } : {})
    }}/>
  </div>
);

const AdminSidebar = ({ tab, setTab, navigate }) => {
  const items = [
    ['site','Site & brand','globe'],
    ['providers','Provider chains','route'],
    ['resources','Resources','folder'],
    ['strings','UI strings','badge'],
  ];
  return (
    <aside className="admin-sidebar" style={{ width: 260, flex:'0 0 260px', borderRight:'1px solid var(--border)', padding:'20px 16px', position:'sticky', top:0, height:'100vh', overflow:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 8px 24px' }}>
        <CairnMark size={22}/>
        <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
        <span className="pill" style={{ marginLeft:'auto', fontSize: 10 }}>admin</span>
      </div>
      {items.map(([t,l,ic]) => (
        <button key={t} onClick={()=>setTab(t)} style={{
          display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:8, fontSize:14,
          width:'100%', textAlign:'left', border:'none', cursor:'pointer',
          color: tab===t?'var(--text-hi)':'var(--text-mid)',
          background: tab===t?'var(--bg-2)':'transparent', marginBottom: 2,
          boxShadow: tab===t?'inset 0 0 0 1px var(--border-strong)':'none'
        }}>
          <Icon name={ic} size={14}/> {l}
        </button>
      ))}
      <div style={{ marginTop: 'auto', position:'absolute', bottom: 20, left: 16, right: 16 }}>
        <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} className="pill" style={{ width:'100%', justifyContent:'center', padding:'10px 12px' }}>← Back to product</a>
      </div>
    </aside>
  );
};

const AdminSite = () => {
  const [primary, setPrimary] = aUseState('#6366F1');
  const [hero, setHero] = aUseState('Turn the chaos of free tutorials into a verified path to your next career.');
  const [flags, setFlags] = aUseState({ multimodal: true, beta_banner: true, weekly_recap: false, recruiter_dm: true });
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 20 }} className="site-grid">
      <div>
        <div className="card" style={{ padding: 24 }}>
          <SmallEyebrow>Brand</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 28, margin:'8px 0 14px', letterSpacing:'-.02em' }}>Site identity</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }} className="brand-grid">
            <AField label="Brand name" defaultValue="Cairn"/>
            <AField label="Tagline" defaultValue="Verified paths from free tutorials"/>
            <div>
              <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 8 }}>Primary color</div>
              <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
                <input type="color" value={primary} onChange={e=>setPrimary(e.target.value)} style={{ width: 44, height: 44, border:'none', background:'transparent', cursor:'pointer' }}/>
                <input value={primary} onChange={e=>setPrimary(e.target.value)} className="mono" style={{ flex:1, padding:'10px 12px', borderRadius: 10, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)', border:'none', outline:'none', color:'var(--text-hi)', fontSize: 13 }}/>
                <ContrastChip color={primary}/>
              </div>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 8 }}>Logo</div>
              <div style={{ display:'flex', alignItems:'center', gap: 12, padding: 14, borderRadius: 10, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)' }}>
                <CairnMark size={28}/>
                <button className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}><Icon name="upload" size={12}/> Replace</button>
              </div>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <SmallEyebrow>Hero copy</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 28, margin:'8px 0 14px', letterSpacing:'-.02em' }}>What lands first</h2>
          <textarea value={hero} onChange={e=>setHero(e.target.value)} rows={3}
            style={{ width:'100%', padding: 14, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)', border:'none', outline:'none', color:'var(--text-hi)', fontFamily:'inherit', fontSize: 16, borderRadius: 10, resize:'vertical' }}/>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 12 }}>
            <div className="mono" style={{ fontSize: 11, color:'var(--text-mid)' }}>{hero.length} chars · italicize words with *asterisks*</div>
            <button className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>Preview on landing →</button>
          </div>
        </div>

        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <SmallEyebrow>Feature flags</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 28, margin:'8px 0 14px', letterSpacing:'-.02em' }}>What's live</h2>
          <div style={{ display:'flex', flexDirection:'column', gap: 8 }}>
            {Object.keys(flags).map(k => (
              <Toggle key={k} label={k.replace(/_/g,' ')} value={flags[k]} onChange={v => setFlags({...flags, [k]: v})}/>
            ))}
          </div>
        </div>
      </div>

      <div>
        <div className="card" style={{ padding: 24 }}>
          <SmallEyebrow>Live preview</SmallEyebrow>
          <div style={{ marginTop: 14, borderRadius: 12, background:'var(--bg-0)', boxShadow:'inset 0 0 0 1px var(--border)', padding: 20, position:'relative', overflow:'hidden' }}>
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 14 }}>
              <CairnMark size={18}/>
              <span className="serif" style={{ fontSize: 16 }}>Cairn</span>
            </div>
            <div className="serif" style={{ fontSize: 24, lineHeight:1.1, letterSpacing:'-.02em' }}>
              {hero.split('*').map((part, i) => i%2===0 ? <span key={i}>{part}</span> : <i key={i}>{part}</i>)}
            </div>
            <div style={{ marginTop: 14, display:'flex', gap:6 }}>
              <span style={{ padding:'6px 12px', borderRadius:999, background: primary, color:'#fff', fontSize:12 }}>Start free →</span>
              <span className="pill" style={{ fontSize:12 }}>Watch demo</span>
            </div>
            <div style={{ position:'absolute', bottom:0, left:0, right:0, height: 80, background:'linear-gradient(180deg, transparent, var(--bg-0))' }}/>
          </div>
        </div>
        <div className="card" style={{ padding: 24, marginTop: 16 }}>
          <SmallEyebrow>OG image</SmallEyebrow>
          <div style={{ marginTop: 12, aspectRatio:'1.91/1', borderRadius: 10, background:`linear-gradient(135deg, ${primary}55, ${primary}11)`, position:'relative', boxShadow:'inset 0 0 0 1px var(--border)', display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div style={{ textAlign:'center' }}>
              <CairnMark size={28}/>
              <div className="serif italic" style={{ fontSize: 22, marginTop: 8 }}>Cairn</div>
              <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', marginTop:4 }}>1200 × 630</div>
            </div>
          </div>
          <button className="btn-magnetic btn-ghost" style={{ marginTop: 10, padding:'6px 12px', fontSize:12 }}><Icon name="upload" size={12}/> Upload OG</button>
        </div>
      </div>
      <style>{`@media(max-width:1100px){.site-grid{grid-template-columns:1fr !important;} .brand-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

const AField = ({ label, defaultValue }) => (
  <div>
    <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 8 }}>{label}</div>
    <input defaultValue={defaultValue} style={{ width:'100%', padding:'12px 14px', borderRadius: 10, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)', border:'none', outline:'none', color:'var(--text-hi)', fontSize: 14, fontFamily:'inherit' }}/>
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <button onClick={()=>onChange(!value)} style={{
    display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderRadius:10,
    background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)', border:'none', cursor:'pointer', textAlign:'left'
  }}>
    <span style={{ fontSize: 13, color:'var(--text-hi)', textTransform:'capitalize' }}>{label}</span>
    <span style={{
      width: 36, height: 20, borderRadius:999, background: value ? 'linear-gradient(135deg, #6366F1, #34D399)' : 'var(--bg-3)',
      position:'relative', transition:'background .25s', flexShrink: 0,
    }}>
      <span style={{
        position:'absolute', top: 2, left: value ? 18 : 2, width: 16, height: 16, borderRadius:999, background:'#fff',
        transition:'left .25s cubic-bezier(.16,1,.3,1)',
        boxShadow:'0 1px 3px rgba(0,0,0,0.3)'
      }}/>
    </span>
  </button>
);

const ContrastChip = ({ color }) => {
  // Pseudo AA check
  const ok = parseInt(color.slice(1), 16) % 7 !== 0;
  return (
    <span className="pill" style={{
      fontSize:10, color: ok ? '#6ee7b7' : '#fdba74',
      boxShadow:`inset 0 0 0 1px ${ok?'rgba(52,211,153,0.4)':'rgba(251,146,60,0.4)'}`,
      background: ok ? 'rgba(52,211,153,0.08)' : 'rgba(251,146,60,0.08)'
    }}>
      AA {ok ? 'pass' : 'check'}
    </span>
  );
};

const AdminProviders = () => {
  const TASKS = ['goal_parse','path_generate','code_review','visual_review','synthesize'];
  const [chains, setChains] = aUseState({
    goal_parse: ['Gemma 4 4B','Gemini Flash','Local 4B'],
    path_generate: ['Gemma 4 27B','Gemini Pro','DeepSeek R3'],
    code_review: ['Gemma 4 27B','Gemini Pro','DeepSeek R3'],
    visual_review: ['Gemma 4 12B','GPT-4 Vision','Gemini Vision'],
    synthesize: ['Gemma 4 12B','Gemini Pro'],
  });
  const reorder = (task, from, to) => {
    setChains(c => {
      const arr = [...c[task]];
      const [removed] = arr.splice(from, 1);
      arr.splice(to, 0, removed);
      return { ...c, [task]: arr };
    });
  };
  return (
    <div>
      <SmallEyebrow>Provider routing</SmallEyebrow>
      <h2 className="serif" style={{ fontSize: 32, margin:'8px 0 6px', letterSpacing:'-.02em' }}>Failover, per task.</h2>
      <p style={{ color:'var(--text-mid)', fontSize: 14, marginBottom: 24 }}>Drag to reorder. The first provider is the default; we cascade on rate-limit or error.</p>
      <div style={{ display:'flex', flexDirection:'column', gap: 14 }}>
        {TASKS.map(t => (
          <div key={t} className="card" style={{ padding: 18 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 10 }}>
              <div>
                <div className="mono" style={{ fontSize: 11, color:'var(--text-hi)', letterSpacing:'.05em' }}>{t}</div>
                <div className="serif italic" style={{ fontSize: 18, marginTop:2 }}>{t.replace(/_/g,' ')}</div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>Test live →</button>
                <button className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}><Icon name="plus" size={11}/> add</button>
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap' }}>
              {chains[t].map((p, i) => (
                <DraggablePill key={p+i} text={p} idx={i} task={t} reorder={reorder} active={i===0} total={chains[t].length}/>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const DraggablePill = ({ text, idx, task, reorder, active, total }) => {
  const [drag, setDrag] = aUseState(false);
  return (
    <>
      <div
        draggable
        onDragStart={(e)=>{ setDrag(true); e.dataTransfer.setData('text/plain', String(idx)); }}
        onDragEnd={()=>setDrag(false)}
        onDragOver={(e)=>e.preventDefault()}
        onDrop={(e)=>{
          e.preventDefault();
          const from = Number(e.dataTransfer.getData('text/plain'));
          reorder(task, from, idx);
        }}
        style={{
          display:'inline-flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius: 999,
          background: active ? 'linear-gradient(180deg, rgba(99,102,241,0.22), rgba(99,102,241,0.08))' : 'var(--bg-2)',
          boxShadow: active ? 'inset 0 0 0 1px rgba(99,102,241,0.4)' : 'inset 0 0 0 1px var(--border-strong)',
          color: active ? '#c7d2fe' : 'var(--text-hi)', cursor:'grab',
          opacity: drag ? .5 : 1, fontSize: 13,
        }}>
        <Icon name="dot" size={10} style={{ color: active?'#34D399':'var(--text-mid)' }}/>
        {text}
        <span className="mono" style={{ fontSize:10, color:'var(--text-mid)', marginLeft:4 }}>{active?'primary':`#${idx+1}`}</span>
      </div>
      {idx<total-1 && <Icon name="chevron" size={11} style={{ color:'var(--text-lo)' }}/>}
    </>
  );
};

const AdminResources = () => {
  const ROWS = [
    ['3Blue1Brown · Neural networks','youtube.com','video','foundations',1.5],
    ['Karpathy · build-nanogpt','github.com','build','transformers',4.0],
    ['Attention Is All You Need','arxiv.org','paper','transformers',2.0],
    ['Gemma 4 fine-tuning guide','gemma.dev','docs','llm-ops',1.0],
    ['RAG from scratch','blog.cairn.dev','article','retrieval',0.6],
    ['Eval harness recipes','github.com','build','evaluation',2.5],
    ['Vision model prompting','docs.gemma.dev','docs','vision',0.8],
    ['Production agents talk','youtube.com','video','agents',1.2],
  ];
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
        <div>
          <SmallEyebrow>Curated library</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 32, margin:'8px 0 0', letterSpacing:'-.02em' }}>Resources we recommend.</h2>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-magnetic btn-ghost" style={{ padding:'8px 12px', fontSize:12 }}><Icon name="upload" size={12}/> Bulk CSV</button>
          <button className="btn-magnetic btn-primary" style={{ padding:'8px 14px', fontSize:13 }}><Icon name="plus" size={13}/> New resource</button>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 60px', padding:'12px 18px', borderBottom:'1px solid var(--border)', background:'var(--bg-2)', fontFamily:'var(--mono)', fontSize:11, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.1em'}}>
          <span>Title</span><span>Source</span><span>Type</span><span>Topic</span><span style={{textAlign:'right'}}>Hrs</span>
        </div>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 60px', padding:'14px 18px', borderBottom:'1px solid var(--border)', alignItems:'center', fontSize: 13, transition:'background .15s' }}
            onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
            onMouseLeave={e=>e.currentTarget.style.background=''}>
            <span style={{ color:'var(--text-hi)' }}>{r[0]}</span>
            <span className="mono" style={{ fontSize:11, color:'var(--text-mid)' }}>{r[1]}</span>
            <span className="pill" style={{ fontSize:10, width:'fit-content' }}>{r[2]}</span>
            <span className="pill pill-indigo" style={{ fontSize:10, width:'fit-content' }}>{r[3]}</span>
            <span className="mono" style={{ textAlign:'right', color:'var(--text-mid)', fontSize:11 }}>{r[4]}h</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminStrings = () => {
  const STRINGS = [
    ['landing.hero.cta_primary','Start free →'],
    ['landing.hero.cta_secondary','Watch 90-sec demo'],
    ['onboarding.greeting','Hi {name}. Let\'s plot a course.'],
    ['dashboard.path.empty','No path yet — start onboarding.'],
    ['projects.eval.pass_threshold_label','Passed · credential earned'],
    ['portfolio.contact.cta','Hire me'],
  ];
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 18 }}>
        <div>
          <SmallEyebrow>String overrides</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 32, margin:'8px 0 0', letterSpacing:'-.02em' }}>Edit any copy. Anywhere.</h2>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)'}}>
          <Icon name="search" size={14} style={{ color:'var(--text-mid)'}}/>
          <input placeholder="search keys or values…" style={{ background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontSize: 13, width: 240, fontFamily:'inherit' }}/>
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow:'hidden' }}>
        {STRINGS.map((s, i) => (
          <div key={s[0]} style={{ display:'grid', gridTemplateColumns:'1.2fr 2fr 80px', gap: 14, padding: '14px 18px', borderBottom: i<STRINGS.length-1 ? '1px solid var(--border)' : 'none', alignItems:'center' }}>
            <span className="mono" style={{ fontSize: 12, color:'var(--text-mid)' }}>{s[0]}</span>
            <input defaultValue={s[1]} style={{ padding:'8px 12px', borderRadius: 8, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)', border:'none', outline:'none', color:'var(--text-hi)', fontSize: 13, fontFamily:'inherit' }}/>
            <button className="pill" style={{ padding:'6px 10px', fontSize: 11, justifyContent:'center' }}>reset</button>
          </div>
        ))}
      </div>
    </div>
  );
};

Object.assign(window, { Admin });
