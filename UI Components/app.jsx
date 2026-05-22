/* Main app router */
const { useState: appUseState, useEffect: appUseEffect, useCallback: appUseCallback, useRef: appUseRef } = React;

const ROUTES = ['landing','onboarding','dashboard','projects-new','projects-detail','example','admin'];

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accent": "#6366F1",
  "serif": "Instrument Serif",
  "showCursor": true,
  "auroraIntensity": 1.0
}/*EDITMODE-END*/;

const App = () => {
  const [route, setRoute] = appUseState(() => {
    const h = window.location.hash.replace('#','');
    return ROUTES.includes(h) ? h : 'landing';
  });
  const [theme, setTheme] = appUseState('dark');
  const [paletteOpen, setPaletteOpen] = appUseState(false);
  const [konami, setKonami] = appUseState(false);

  const navigate = appUseCallback((r) => {
    if (!ROUTES.includes(r)) return;
    setRoute(r);
    window.history.replaceState({}, '', '#' + r);
    window.scrollTo(0, 0);
  }, []);

  // tweaks
  const [tweaks, setTweak] = window.useTweaks ? window.useTweaks(TWEAK_DEFAULTS) : [TWEAK_DEFAULTS, ()=>{}];
  appUseEffect(()=>{
    document.documentElement.setAttribute('data-theme', tweaks.theme);
    if (tweaks.accent) {
      document.documentElement.style.setProperty('--primary', tweaks.accent);
    }
    if (tweaks.serif) {
      document.documentElement.style.setProperty('--serif', `'${tweaks.serif}', ui-serif, Georgia, serif`);
    }
    if (!tweaks.showCursor) {
      document.getElementById('__ring').style.display='none';
      document.getElementById('__dot').style.display='none';
    } else {
      document.getElementById('__ring').style.display='';
      document.getElementById('__dot').style.display='';
    }
  }, [tweaks]);

  appUseEffect(() => { setTheme(tweaks.theme); }, [tweaks.theme]);

  // hash listener
  appUseEffect(() => {
    const f = () => {
      const h = window.location.hash.replace('#','');
      if (ROUTES.includes(h)) setRoute(h);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);

  // Command palette + konami
  appUseEffect(() => {
    const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    let buf = [];
    const f = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(o => !o);
      }
      buf.push(e.key); if (buf.length > seq.length) buf.shift();
      if (buf.length === seq.length && buf.every((k, i) => k.toLowerCase() === seq[i].toLowerCase())) {
        setKonami(true);
        setTimeout(()=>setKonami(false), 4000);
        console.log('%c👋 Hiring? jobs@cairn.dev', 'font-size: 16px; color: #6ee7b7;');
        buf = [];
      }
    };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  const showNav = route === 'landing';
  const ContentTheme = () => {
    switch(route){
      case 'landing': return <Landing navigate={navigate}/>;
      case 'onboarding': return <Onboarding navigate={navigate}/>;
      case 'dashboard': return <Dashboard navigate={navigate}/>;
      case 'projects-new': return <ProjectsNew navigate={navigate}/>;
      case 'projects-detail': return <ProjectsDetail navigate={navigate}/>;
      case 'example': return <Portfolio navigate={navigate} example/>;
      case 'admin': return <Admin navigate={navigate}/>;
      default: return <Landing navigate={navigate}/>;
    }
  };

  return (
    <ToastProvider>
      {showNav && <TopNav navigate={navigate} route={route} theme={theme} setTheme={(t)=>setTweak('theme', t)}/>}
      <ContentTheme/>
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} navigate={navigate} setTheme={(t)=>setTweak('theme', t)} theme={theme}/>
      <FloatingNav route={route} navigate={navigate}/>
      {konami && <KonamiBurst/>}
      <TweaksPanel title="Tweaks">
        <TweakSection title="Theme">
          <TweakRadio value={tweaks.theme} onChange={v=>setTweak('theme', v)} options={[{value:'dark', label:'Dark'},{value:'light', label:'Light'}]}/>
        </TweakSection>
        <TweakSection title="Brand accent">
          <TweakColor value={tweaks.accent} onChange={v=>setTweak('accent', v)} options={['#6366F1','#34D399','#FB923C','#8B5CF6','#EC4899']}/>
        </TweakSection>
        <TweakSection title="Display serif">
          <TweakSelect value={tweaks.serif} onChange={v=>setTweak('serif', v)} options={[
            { value:'Instrument Serif', label:'Instrument Serif' },
            { value:'Fraunces', label:'Fraunces' },
            { value:'Georgia', label:'Georgia' },
          ]}/>
        </TweakSection>
        <TweakSection title="Aurora intensity">
          <TweakSlider value={tweaks.auroraIntensity} onChange={v=>setTweak('auroraIntensity', v)} min={0} max={1.5} step={0.1}/>
        </TweakSection>
        <TweakSection title="Custom cursor">
          <TweakToggle value={tweaks.showCursor} onChange={v=>setTweak('showCursor', v)} label="Magnetic cursor"/>
        </TweakSection>
        <TweakSection title="Quick jump">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {[
              ['Landing','landing'],['Onboarding','onboarding'],['Dashboard','dashboard'],
              ['Submit','projects-new'],['Eval results','projects-detail'],['Portfolio','example'],
              ['Admin','admin']
            ].map(([l,r]) => (
              <button key={r} onClick={()=>navigate(r)} style={{
                padding:'8px 10px', borderRadius:8, fontSize:12, cursor:'pointer',
                background: route===r?'rgba(99,102,241,0.18)':'var(--bg-2)',
                color: route===r?'#c7d2fe':'var(--text-hi)',
                border:'1px solid var(--border-strong)', fontFamily:'inherit',
              }}>{l}</button>
            ))}
          </div>
        </TweakSection>
      </TweaksPanel>
    </ToastProvider>
  );
};

/* ----------------- Floating breadcrumb / route switcher ----------------- */
const FloatingNav = ({ route, navigate }) => {
  if (route === 'landing') return null;
  const labels = {
    'onboarding':'Onboarding',
    'dashboard':'Dashboard',
    'projects-new':'Submit project',
    'projects-detail':'Evaluation results',
    'example':'Sample portfolio',
    'admin':'Admin',
  };
  const order = ['landing','onboarding','dashboard','projects-new','projects-detail','example','admin'];
  const idx = order.indexOf(route);
  return (
    <div style={{
      position:'fixed', bottom: 24, left:'50%', transform:'translateX(-50%)', zIndex: 70,
      display:'flex', alignItems:'center', gap:6, padding:6, borderRadius: 999,
      background:'color-mix(in srgb, var(--bg-1) 80%, transparent)',
      backdropFilter:'blur(12px)',
      boxShadow:'0 12px 40px -8px rgba(0,0,0,0.5), inset 0 0 0 1px var(--border-strong)'
    }}>
      <button onClick={()=>navigate(order[Math.max(0, idx-1)])} className="pill" style={{ padding:8, cursor:'pointer', border:'none' }}>
        <Icon name="chevron" size={12} style={{ transform:'rotate(180deg)'}}/>
      </button>
      <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} className="pill" style={{ padding:'6px 10px', fontSize:11 }}>
        <CairnMark size={12}/> home
      </a>
      <span className="serif italic" style={{ fontSize: 14, padding:'0 6px' }}>{labels[route]}</span>
      <button onClick={()=>navigate(order[Math.min(order.length-1, idx+1)])} className="pill" style={{ padding:8, cursor:'pointer', border:'none' }}>
        <Icon name="chevron" size={12}/>
      </button>
    </div>
  );
};

/* ----------------- Command Palette ----------------- */
const CommandPalette = ({ open, onClose, navigate, theme, setTheme }) => {
  const [q, setQ] = appUseState('');
  const items = [
    { label:'Go to Landing', icon:'home', action:()=>{ navigate('landing'); onClose(); }, hint:'~' },
    { label:'Start onboarding', icon:'sparkles', action:()=>{ navigate('onboarding'); onClose(); } },
    { label:'Open Dashboard', icon:'route', action:()=>{ navigate('dashboard'); onClose(); } },
    { label:'Submit a project', icon:'plus', action:()=>{ navigate('projects-new'); onClose(); } },
    { label:'View latest evaluation', icon:'badge', action:()=>{ navigate('projects-detail'); onClose(); } },
    { label:'Open sample portfolio', icon:'user', action:()=>{ navigate('example'); onClose(); } },
    { label:'Open Admin CMS', icon:'settings', action:()=>{ navigate('admin'); onClose(); } },
    { label:'Toggle theme', icon:'sun', action:()=>{ setTheme(theme==='dark'?'light':'dark'); onClose(); } },
  ];
  const filtered = items.filter(i => i.label.toLowerCase().includes(q.toLowerCase()));
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:90, background:'rgba(7,7,11,0.55)', backdropFilter:'blur(10px)', display:'flex', alignItems:'flex-start', justifyContent:'center', padding: '15vh 20px 0' }}>
      <div onClick={e=>e.stopPropagation()} className="card-elev" style={{ width: 560, maxWidth:'100%', borderRadius: 16, overflow:'hidden', animation:'scaleIn .2s ease' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
          <Icon name="search" size={16} style={{ color:'var(--text-mid)' }}/>
          <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Search routes, actions, projects…" style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontSize: 16, fontFamily:'inherit' }}/>
          <span className="kbd">ESC</span>
        </div>
        <div style={{ maxHeight: 360, overflow:'auto', padding: 6 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign:'center', color:'var(--text-mid)', fontSize: 14 }}>No matches</div>
          ) : filtered.map((it, i) => (
            <button key={i} onClick={it.action} style={{
              width:'100%', display:'flex', alignItems:'center', gap: 12, padding:'10px 12px', borderRadius:10,
              background: i===0 ? 'var(--bg-2)' : 'transparent', border:'none', cursor:'pointer', textAlign:'left',
            }}
              onMouseEnter={e=>e.currentTarget.style.background='var(--bg-2)'}
              onMouseLeave={e=>e.currentTarget.style.background= i===0?'var(--bg-2)':'transparent'}>
              <Icon name={it.icon} size={14} style={{ color:'var(--text-mid)' }}/>
              <span style={{ flex:1, fontSize: 14, color:'var(--text-hi)' }}>{it.label}</span>
              <span className="kbd">↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ----------------- Konami burst ----------------- */
const KonamiBurst = () => (
  <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex: 1000, overflow:'hidden' }}>
    {Array.from({length: 80}).map((_,i)=>(
      <div key={i} style={{
        position:'absolute', left:`${(i*13)%100}%`, top:-20,
        width: 6, height: 14, borderRadius: 2,
        background: ['#6366F1','#34D399','#FB923C','#8B5CF6','#EC4899'][i%5],
        animation:`confettiFall ${2 + (i%5)*0.3}s ${(i%10)*0.1}s ease-out both`,
      }}/>
    ))}
    <div style={{ position:'absolute', top: 32, left:'50%', transform:'translateX(-50%)', padding:'10px 18px', borderRadius:999, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(10px)', color:'#fff', fontSize: 14, display:'flex', alignItems:'center', gap:8 }}>
      <Icon name="sparkles" size={14} style={{ color:'#6ee7b7'}}/>
      Hiring? <a href="mailto:jobs@cairn.dev" style={{ color:'#a5b4fc', pointerEvents:'auto' }}>jobs@cairn.dev</a>
    </div>
  </div>
);

/* ============ Mount ============ */
ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
