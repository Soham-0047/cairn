/* Shared primitives for Cairn */
const { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } = React;

/* --------------------------- Icons (line) --------------------------- */
const Icon = ({ name, size=18, stroke=1.5, ...p }) => {
  const s = size;
  const c = { width:s, height:s, viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', strokeWidth:stroke, strokeLinecap:'round', strokeLinejoin:'round', ...p };
  switch(name){
    case 'arrow-right': return <svg {...c}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'arrow-up-right': return <svg {...c}><path d="M7 17 17 7M9 7h8v8"/></svg>;
    case 'play': return <svg {...c} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></svg>;
    case 'check': return <svg {...c}><path d="M5 12.5 10 17 19 7"/></svg>;
    case 'x': return <svg {...c}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'spark': return <svg {...c}><path d="M12 3v6M12 15v6M3 12h6M15 12h6M5.6 5.6l4.2 4.2M14.2 14.2l4.2 4.2M18.4 5.6l-4.2 4.2M9.8 14.2 5.6 18.4"/></svg>;
    case 'flame': return <svg {...c}><path d="M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1.5 1-2 3-2 4 0-2-1-5-4-8-1 4-5 6-5 11 0 4 3 7 7 7Z"/></svg>;
    case 'bell': return <svg {...c}><path d="M18 16V11a6 6 0 0 0-12 0v5l-2 2h16l-2-2ZM10 20a2 2 0 0 0 4 0"/></svg>;
    case 'search': return <svg {...c}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
    case 'github': return <svg {...c}><path d="M9 19c-4 1.5-4-2-6-2.5M15 22v-3.5c0-1-.1-1.4-.6-2 3-.4 5.6-1.5 5.6-6.4 0-1.3-.5-2.5-1.3-3.4.1-.4.5-1.8-.1-3.7 0 0-1.1-.4-3.6 1.3a12 12 0 0 0-6 0C6.5 2 5.4 2.5 5.4 2.5c-.6 1.9-.2 3.3-.1 3.7C4.5 7 4 8.2 4 9.5c0 4.9 2.6 6 5.6 6.4-.4.5-.7 1.1-.6 2V22"/></svg>;
    case 'home': return <svg {...c}><path d="M3 11 12 3l9 8M5 10v10h14V10"/></svg>;
    case 'route': return <svg {...c}><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M6 17v-4a4 4 0 0 1 4-4h4a4 4 0 0 0 4-4"/></svg>;
    case 'folder': return <svg {...c}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/></svg>;
    case 'user': return <svg {...c}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>;
    case 'settings': return <svg {...c}><circle cx="12" cy="12" r="3"/><path d="M19 12c0 .4 0 .8-.1 1.2l2 1.6-2 3.4-2.4-.9c-.6.4-1.3.8-2 1l-.4 2.6h-4l-.4-2.6c-.7-.2-1.4-.6-2-1l-2.4.9-2-3.4 2-1.6c-.1-.4-.1-.8-.1-1.2s0-.8.1-1.2l-2-1.6 2-3.4 2.4.9c.6-.4 1.3-.8 2-1L10 3h4l.4 2.6c.7.2 1.4.6 2 1l2.4-.9 2 3.4-2 1.6c.1.4.1.8.1 1.2Z"/></svg>;
    case 'shield': return <svg {...c}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'cube': return <svg {...c}><path d="m21 8-9-5-9 5 9 5 9-5ZM3 8v8l9 5 9-5V8M12 13v8"/></svg>;
    case 'badge': return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="m9 12 2 2 4-4"/></svg>;
    case 'link': return <svg {...c}><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 1 0-7-7l-1 1M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 1 0 7 7l1-1"/></svg>;
    case 'copy': return <svg {...c}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>;
    case 'mail': return <svg {...c}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>;
    case 'eye': return <svg {...c}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'plus': return <svg {...c}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus': return <svg {...c}><path d="M5 12h14"/></svg>;
    case 'chevron': return <svg {...c}><path d="m9 6 6 6-6 6"/></svg>;
    case 'chevron-down': return <svg {...c}><path d="m6 9 6 6 6-6"/></svg>;
    case 'lock': return <svg {...c}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
    case 'upload': return <svg {...c}><path d="M12 16V4m0 0-4 4m4-4 4 4M4 18v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg>;
    case 'image': return <svg {...c}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 16-5-5L5 21"/></svg>;
    case 'globe': return <svg {...c}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>;
    case 'twitter': return <svg {...c}><path d="M4 4 20 20M20 4 4 20"/></svg>;
    case 'linkedin': return <svg {...c}><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 13v4"/></svg>;
    case 'sun': return <svg {...c}><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/></svg>;
    case 'moon': return <svg {...c}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>;
    case 'cmd': return <svg {...c}><path d="M6 8V6a2 2 0 1 1 2 2h8V6a2 2 0 1 1 2 2v8a2 2 0 1 1-2-2H8v2a2 2 0 1 1-2-2v-2a2 2 0 1 1 0-4"/></svg>;
    case 'dot': return <svg {...c}><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>;
    case 'menu': return <svg {...c}><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
    case 'sparkles': return <svg {...c}><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2 2-6Z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z"/></svg>;
    case 'mic': return <svg {...c}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>;
    case 'send': return <svg {...c}><path d="m22 2-11 11M22 2l-7 20-4-9-9-4 20-7Z"/></svg>;
    default: return <svg {...c}><circle cx="12" cy="12" r="9"/></svg>;
  }
};

/* ------------------------ Cairn Logo Mark ------------------------ */
const CairnMark = ({ size=22 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#818CF8"/>
        <stop offset="100%" stopColor="#34D399"/>
      </linearGradient>
    </defs>
    <ellipse cx="16" cy="24" rx="11" ry="3" fill="url(#g1)" opacity=".9"/>
    <ellipse cx="16" cy="17" rx="8" ry="2.6" fill="url(#g1)" opacity=".85"/>
    <ellipse cx="16" cy="11" rx="5.5" ry="2.2" fill="url(#g1)" opacity=".8"/>
    <ellipse cx="16" cy="6" rx="3" ry="1.6" fill="url(#g1)"/>
  </svg>
);

/* ------------------------ Magnetic Button ------------------------ */
const MagneticButton = ({ children, variant='primary', onClick, as='button', href, className='', style, ...rest }) => {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width/2);
    const y = e.clientY - (r.top + r.height/2);
    el.style.transform = `translate(${x*0.18}px, ${y*0.22}px)`;
  };
  const onLeave = () => { if(ref.current) ref.current.style.transform = ''; };
  const cls = `btn-magnetic ${variant==='primary'?'btn-primary':'btn-ghost'} ${className}`;
  const Tag = as;
  return (
    <Tag ref={ref} href={href} className={cls} style={style} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick} data-magnet {...rest}>
      {variant==='primary' && <span className="sheen"/>}
      {children}
    </Tag>
  );
};

/* ------------------------ Aurora Background ------------------------ */
const AuroraBackground = ({ intensity=1 }) => (
  <div style={{position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none'}}>
    <div style={{
      position:'absolute', inset:'-30%',
      background: 'conic-gradient(from 220deg at 50% 50%, #6366F1, #34D399, #FB923C, #8B5CF6, #6366F1)',
      filter: `blur(${80*intensity}px)`, opacity: 0.25*intensity,
      animation: 'auroraDrift 30s ease-in-out infinite',
    }}/>
    <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse at 50% 0%, transparent 0%, var(--bg-0) 70%)'}}/>
    <Orb x="10%" y="20%" size={520} color="rgba(99,102,241,0.35)" dur="14s" delay="0s"/>
    <Orb x="78%" y="55%" size={420} color="rgba(52,211,153,0.22)" dur="18s" delay="-3s" anim="orbDrift2"/>
    <Orb x="50%" y="80%" size={380} color="rgba(251,146,60,0.20)" dur="20s" delay="-8s" anim="orbDrift3"/>
  </div>
);
const Orb = ({ x,y,size,color,dur='14s', delay='0s', anim='orbDrift1'}) => (
  <div style={{
    position:'absolute', left:x, top:y, width:size, height:size, borderRadius:'50%',
    transform:'translate(-50%,-50%)',
    background:`radial-gradient(circle, ${color} 0%, transparent 70%)`,
    filter:'blur(40px)', animation:`${anim} ${dur} ease-in-out infinite`, animationDelay: delay,
  }}/>
);

/* ------------------------ SplitText reveal ------------------------ */
const extractText = (node) => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props && node.props.children !== undefined) return extractText(node.props.children);
  return '';
};
const SplitText = ({ children, delay=0, stagger=30, className='', style }) => {
  const text = extractText(children);
  return (
    <span className={className} style={style}>
      {text.split(' ').map((word, wi) => (
        <span key={wi} style={{ display:'inline-block', whiteSpace:'pre' }}>
          {[...word].map((ch, ci) => (
            <span key={ci} style={{
              display:'inline-block',
              animation:`fadeUp .6s cubic-bezier(.16,1,.3,1) ${delay + (wi*60) + ci*stagger}ms both`,
            }}>{ch}</span>
          ))}
          {wi < text.split(' ').length-1 && <span style={{ display:'inline-block', width:'0.32em' }}>{'\u00A0'}</span>}
        </span>
      ))}
    </span>
  );
};

/* ------------------------ Glassy Cairn 3D-ish ------------------------ */
const CairnStack = () => {
  const [rot, setRot] = useState(0);
  const [tilt, setTilt] = useState({x:0,y:0});
  const ref = useRef(null);
  useEffect(() => {
    let raf, t0 = performance.now();
    const loop = (t) => { setRot(((t - t0) / 60) % 360); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const onMove = (e) => {
    const el = ref.current; if(!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - (r.left + r.width/2)) / r.width) * 30;
    const y = ((e.clientY - (r.top + r.height/2)) / r.height) * 30;
    setTilt({ x: -y, y: x });
  };
  const onLeave = () => setTilt({x:0,y:0});
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
         style={{ width: 360, height: 420, perspective: '1200px' }}>
      <div style={{
        width:'100%', height:'100%', position:'relative',
        transformStyle:'preserve-3d',
        transform:`rotateX(${tilt.x}deg) rotateY(${tilt.y + rot*0.3}deg)`,
        transition:'transform .2s ease',
      }}>
        {[
          {w:200,h:50,top:300, blur:0,  z:60, c1:'#5C5F8A', c2:'#1a1c25'},
          {w:160,h:42,top:248, blur:0,  z:70, c1:'#7378b3', c2:'#23263a'},
          {w:130,h:36,top:202, blur:0,  z:80, c1:'#9aa0e8', c2:'#2e3252'},
          {w:108,h:32,top:160, blur:0,  z:90, c1:'#b8bcf3', c2:'#363a64'},
          {w:84, h:26,top:124, blur:0, z:100, c1:'#c8eedd', c2:'#274b3e'},
          {w:60, h:20,top:94,  blur:0, z:110, c1:'#ffdcb8', c2:'#5c3a1d'},
          {w:36, h:14,top:72,  blur:0, z:120, c1:'#ffffff', c2:'#7c8aff'},
        ].map((s,i)=>(
          <div key={i} style={{
            position:'absolute', left:`calc(50% - ${s.w/2}px)`, top:s.top,
            width:s.w, height:s.h, borderRadius: '50%',
            background:`linear-gradient(135deg, ${s.c1}, ${s.c2})`,
            boxShadow: `0 ${s.h*0.3}px ${s.h*1.2}px rgba(0,0,0,0.45), inset 0 2px 0 rgba(255,255,255,0.35), inset 0 -3px 6px rgba(0,0,0,0.5)`,
            transform: `translateZ(${s.z - 60}px)`,
          }}/>
        ))}
        {/* Floor reflection */}
        <div style={{
          position:'absolute', left:'50%', top: 340, width: 280, height: 30, transform:'translate(-50%,0) rotateX(70deg)',
          background:'radial-gradient(ellipse, rgba(99,102,241,0.5), transparent 70%)', filter:'blur(18px)'
        }}/>
        {/* Floating particles */}
        {Array.from({length:14}).map((_,i)=>(
          <div key={'p'+i} style={{
            position:'absolute',
            left: `${20 + (i*5.7)%70}%`, top: `${10 + (i*7.1)%80}%`,
            width: 4, height: 4, borderRadius:'50%',
            background: i%3===0 ? '#34D399' : i%3===1 ? '#FB923C' : '#a5b4fc',
            opacity: .7,
            transform:`translateZ(${(i%6)*30}px)`,
            boxShadow: '0 0 8px currentColor',
            animation: `orbDrift${(i%3)+1} ${6+i%4}s ease-in-out infinite`,
            animationDelay: `${i*0.3}s`,
          }}/>
        ))}
      </div>
    </div>
  );
};

/* ------------------------ Progress Ring ------------------------ */
const ProgressRing = ({ value=64, size=160, stroke=10, label, sublabel }) => {
  const R = (size - stroke) / 2;
  const C = 2 * Math.PI * R;
  const off = C - (value/100) * C;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf, t0;
    const dur = 1200;
    const step = (t) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / dur);
      setShown(Math.round(p * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div style={{ position:'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={R} stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} fill="none"/>
        <defs>
          <linearGradient id={`pg${size}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#818CF8"/>
            <stop offset="50%" stopColor="#34D399"/>
            <stop offset="100%" stopColor="#FB923C"/>
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={R} stroke={`url(#pg${size})`} strokeWidth={stroke} strokeLinecap="round" fill="none"
          strokeDasharray={C} strokeDashoffset={off}
          style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(.16,1,.3,1)'}}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}>
        <div className="serif" style={{ fontSize: size*0.34, lineHeight:1, color:'var(--text-hi)' }}>{shown}<span style={{fontSize:size*0.16, color:'var(--text-mid)'}}>%</span></div>
        {label && <div style={{ fontSize: 11, color:'var(--text-mid)', marginTop: 6, textTransform:'uppercase', letterSpacing:'.12em' }}>{label}</div>}
        {sublabel && <div style={{ fontSize: 12, color:'var(--text-lo)', marginTop: 4 }}>{sublabel}</div>}
      </div>
    </div>
  );
};

/* ------------------------ Provider chain pill ------------------------ */
const ProviderChain = ({ providers=['Gemma 4 27B','Gemini','DeepSeek'], active=0 }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'4px 6px', borderRadius:999, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border-strong)'}}>
    {providers.map((p,i)=>(
      <React.Fragment key={p}>
        <span style={{
          padding:'4px 10px', borderRadius:999, fontSize:11, fontFamily:'var(--mono)',
          background: i===active ? 'linear-gradient(180deg, rgba(99,102,241,0.25), rgba(99,102,241,0.1))' : 'transparent',
          color: i===active ? '#c7d2fe' : 'var(--text-mid)',
          boxShadow: i===active ? 'inset 0 0 0 1px rgba(99,102,241,0.45)' : 'none',
        }}>
          {i===active && <span style={{display:'inline-block', width:6, height:6, borderRadius:999, background:'#6ee7b7', boxShadow:'0 0 8px #34D399', marginRight:6, verticalAlign:'middle'}}/>}
          {p}
        </span>
        {i<providers.length-1 && <Icon name="chevron" size={10} style={{ color:'var(--text-lo)' }}/>}
      </React.Fragment>
    ))}
  </div>
);

/* ------------------------ Credential Badge ------------------------ */
const CredentialBadge = ({ title='Multimodal AI Engineer', score=92, project='Codex Studio', date='Apr 2026', tilt=true }) => {
  const ref = useRef(null);
  const [t, setT] = useState({x:0,y:0});
  const onMove = (e) => {
    if (!tilt) return;
    const r = ref.current.getBoundingClientRect();
    setT({ x: ((e.clientY - (r.top+r.height/2)) / r.height) * -16, y: ((e.clientX - (r.left+r.width/2)) / r.width) * 16 });
  };
  return (
    <div ref={ref} onMouseMove={onMove} onMouseLeave={()=>setT({x:0,y:0})} style={{
      width: 320, height: 200, borderRadius: 18, position:'relative',
      background: 'linear-gradient(135deg, #1a1d2e 0%, #0e1019 100%)',
      transform: `perspective(900px) rotateX(${t.x}deg) rotateY(${t.y}deg)`,
      transition:'transform .15s ease',
      boxShadow:'0 30px 80px -20px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.08)',
      overflow:'hidden',
    }}>
      <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse at top right, rgba(99,102,241,0.35), transparent 60%)'}}/>
      <div style={{position:'absolute', inset:0, background:'radial-gradient(ellipse at bottom left, rgba(52,211,153,0.18), transparent 60%)'}}/>
      <div style={{position:'absolute', top:18, left:20, display:'flex', alignItems:'center', gap:8}}>
        <CairnMark size={18}/>
        <span style={{fontFamily:'var(--mono)', fontSize:10, letterSpacing:'.18em', color:'var(--text-mid)'}}>CAIRN VERIFIED</span>
      </div>
      <div style={{position:'absolute', top:18, right:20, fontFamily:'var(--mono)', fontSize:10, color:'var(--text-mid)'}}>#0x{Math.floor(score*1234).toString(16).slice(0,6).toUpperCase()}</div>
      <div style={{position:'absolute', left:20, bottom:60}}>
        <div className="serif italic" style={{fontSize:24, color:'#fff', lineHeight:1.1}}>{title}</div>
        <div style={{fontSize:12, color:'var(--text-mid)', marginTop:6}}>{project} · {date}</div>
      </div>
      <div style={{position:'absolute', right:20, bottom:18, textAlign:'right'}}>
        <div className="mono" style={{fontSize:10, color:'var(--text-lo)', letterSpacing:'.1em'}}>SCORE</div>
        <div className="serif" style={{fontSize:30, color:'#6ee7b7', lineHeight:1}}>{score}<span style={{fontSize:14, color:'var(--text-mid)'}}>/100</span></div>
      </div>
      {/* Seal */}
      <div style={{position:'absolute', left:20, bottom:18, width:34, height:34, borderRadius:999, background:'radial-gradient(circle, rgba(52,211,153,0.4), rgba(52,211,153,0.05))', boxShadow:'inset 0 0 0 1px rgba(52,211,153,0.55)', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <Icon name="check" size={16} stroke={2} style={{ color:'#6ee7b7' }}/>
      </div>
      {/* Holographic line */}
      <div style={{
        position:'absolute', inset:0, pointerEvents:'none',
        background: `linear-gradient(${100 + t.y*2}deg, transparent 30%, rgba(255,255,255,0.07) 50%, transparent 70%)`,
      }}/>
    </div>
  );
};

/* ------------------------ Bento Tile ------------------------ */
const BentoTile = ({ children, span={col:1,row:1}, glow=false, className='', style }) => (
  <div className={`card ${className}`} style={{
    gridColumn: `span ${span.col}`, gridRow: `span ${span.row}`,
    padding: 24, overflow:'hidden', position:'relative',
    ...(glow ? { boxShadow:'inset 0 0 0 1px var(--border), 0 0 60px -20px var(--primary-glow)'} : {}),
    ...style,
  }}>
    {children}
  </div>
);

/* ------------------------ KPI Chip with count ------------------------ */
const KPIChip = ({ label, value, suffix='', accent='#a5b4fc', icon, animate=true }) => {
  const [n, setN] = useState(animate ? 0 : value);
  useEffect(() => {
    if (!animate) return;
    let raf, t0; const dur = 1400;
    const step = (t) => {
      if(!t0) t0 = t;
      const p = Math.min(1, (t-t0)/dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p<1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <div className="card" style={{ padding:16, display:'flex', alignItems:'center', gap:12 }}>
      {icon && <div style={{
        width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center',
        background: 'var(--bg-2)', color: accent, boxShadow:'inset 0 0 0 1px var(--border)'
      }}><Icon name={icon} size={18}/></div>}
      <div>
        <div className="serif" style={{ fontSize: 28, lineHeight:1, color:'var(--text-hi)' }}>
          {n}<span style={{ fontSize: 14, color:'var(--text-mid)' }}>{suffix}</span>
        </div>
        <div style={{ fontSize: 12, color:'var(--text-mid)', marginTop:4, textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>
      </div>
    </div>
  );
};

/* ------------------------ Typewriter ------------------------ */
const Typewriter = ({ text='', speed=20, onDone, style, className='', cursor=true }) => {
  const [shown, setShown] = useState('');
  useEffect(() => {
    setShown('');
    let i = 0; let cancelled = false;
    const tick = () => {
      if (cancelled) return;
      if (i <= text.length) {
        setShown(text.slice(0, i));
        i++;
        setTimeout(tick, speed);
      } else if (onDone) onDone();
    };
    tick();
    return () => { cancelled = true; };
  }, [text]);
  return <span className={className} style={style}>{shown}{cursor && shown.length<text.length && <span style={{display:'inline-block', width:2, height:'1em', background:'var(--text-hi)', verticalAlign:'middle', animation:'blink 1s steps(2) infinite'}}/>}</span>;
};

/* ------------------------ Modal ------------------------ */
const Modal = ({ open, onClose, children, width=720 }) => {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position:'fixed', inset:0, zIndex: 80,
      background:'rgba(7,7,11,0.6)', backdropFilter:'blur(8px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
      animation:'fadeUp .25s ease'
    }}>
      <div onClick={e=>e.stopPropagation()} className="card-elev" style={{
        width, maxWidth:'100%', maxHeight:'88vh', overflow:'auto', borderRadius:20, padding: 24,
        animation:'scaleIn .25s cubic-bezier(.16,1,.3,1)'
      }}>
        {children}
      </div>
    </div>
  );
};

/* ------------------------ Toast ------------------------ */
const ToastCtx = React.createContext({ push: ()=>{} });
const ToastProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind='info') => {
    const id = Math.random();
    setItems(x => [...x, { id, msg, kind }]);
    setTimeout(()=> setItems(x => x.filter(t => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div style={{ position:'fixed', top:20, right:20, display:'flex', flexDirection:'column', gap:8, zIndex:1000 }}>
        {items.map(t => (
          <div key={t.id} className="card-elev" style={{
            padding:'10px 14px', borderRadius:12, display:'flex', alignItems:'center', gap:10, minWidth:240,
            animation:'fadeUp .25s ease', backdropFilter:'blur(10px)',
            background: 'color-mix(in srgb, var(--bg-2) 80%, transparent)',
          }}>
            <Icon name={t.kind==='success'?'check':'sparkles'} size={16} style={{ color: t.kind==='success'?'#6ee7b7':'#a5b4fc'}}/>
            <span style={{ fontSize: 14 }}>{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};
const useToast = () => React.useContext(ToastCtx);

/* ------------------------ Tabs (magnetic underline) ------------------------ */
const Tabs = ({ tabs, value, onChange }) => {
  const refs = useRef({});
  const [bar, setBar] = useState({ x:0, w:0 });
  useLayoutEffect(() => {
    const el = refs.current[value];
    if (el) {
      const p = el.parentElement.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setBar({ x: r.left - p.left, w: r.width });
    }
  }, [value, tabs]);
  return (
    <div style={{ position:'relative', display:'inline-flex', gap:4, padding:4, borderRadius:12, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)'}}>
      <div style={{ position:'absolute', left:bar.x, width:bar.w, top:4, bottom:4, background:'var(--bg-0)', boxShadow:'inset 0 0 0 1px var(--border-strong)', borderRadius:8, transition:'left .35s cubic-bezier(.16,1,.3,1), width .35s cubic-bezier(.16,1,.3,1)' }}/>
      {tabs.map(t => (
        <button key={t.value} ref={el => refs.current[t.value]=el} onClick={()=>onChange(t.value)} style={{
          position:'relative', zIndex:1, background:'transparent', border:'none',
          color: value===t.value ? 'var(--text-hi)' : 'var(--text-mid)',
          padding:'8px 14px', fontSize:13, fontWeight:500, borderRadius:8,
        }}>{t.label}</button>
      ))}
    </div>
  );
};

/* ------------------------ Top Nav (landing) ------------------------ */
const TopNav = ({ navigate, route, theme, setTheme }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', f, { passive:true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const links = [
    ['How it works', 'landing#how'],
    ['Evaluation','landing#eval'],
    ['Portfolio','example'],
    ['Pricing','landing#pricing'],
  ];
  return (
    <nav className={scrolled?'nav-blur':''} style={{
      position:'fixed', top:0, left:0, right:0, zIndex:60,
      transition:'all .3s ease', padding: scrolled ? '12px 0' : '20px 0',
    }}>
      <div className="container" style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} style={{display:'flex', alignItems:'center', gap:10}}>
          <CairnMark size={22}/>
          <span className="serif" style={{ fontSize: 22, letterSpacing:'-.02em' }}>Cairn</span>
          <span className="pill" style={{ marginLeft:8 }}>beta</span>
        </a>
        <div style={{ display:'flex', alignItems:'center', gap:28 }} className="nav-links">
          {links.map(([l,r]) => (
            <a key={l} href="#" onClick={e=>{e.preventDefault();
              if (r.includes('#')) { const id = r.split('#')[1]; const el = document.getElementById(id); if (el) el.scrollIntoView({behavior:'smooth'}); }
              else navigate(r);
            }} style={{ fontSize:14, color:'var(--text-mid)' }}>{l}</a>
          ))}
          <a href="#" onClick={e=>{e.preventDefault(); navigate('onboarding');}} style={{ fontSize:14, color:'var(--text-mid)' }}>Sign in</a>
          <button onClick={()=>setTheme(theme==='dark'?'light':'dark')} className="btn-magnetic btn-ghost" style={{ padding:'8px 10px' }} aria-label="Toggle theme">
            <Icon name={theme==='dark'?'sun':'moon'} size={14}/>
          </button>
          <MagneticButton onClick={()=>navigate('onboarding')}>Start your path <Icon name="arrow-right" size={14}/></MagneticButton>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .nav-links a:not(:last-child), .nav-links button:not(:last-child) { display: none; }
        }
      `}</style>
    </nav>
  );
};

/* ------------------------ Sidebar (app shell) ------------------------ */
const Sidebar = ({ navigate, route }) => {
  const items = [
    ['landing','Home','home'],
    ['dashboard','Path','route'],
    ['projects-new','Submit','plus'],
    ['projects-detail','Projects','folder'],
    ['example','Portfolio','user'],
    ['admin','Admin','settings'],
  ];
  return (
    <aside style={{
      width: 240, flex:'0 0 240px', padding:'20px 16px',
      borderRight:'1px solid var(--border)', background:'var(--bg-0)',
      position:'sticky', top:0, height:'100vh', overflow:'auto'
    }}>
      <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} style={{display:'flex', alignItems:'center', gap:10, padding:'8px 8px 20px'}}>
        <CairnMark size={22}/>
        <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
      </a>
      <div style={{ marginBottom: 8, padding:'0 8px', fontSize: 11, color:'var(--text-lo)', textTransform:'uppercase', letterSpacing:'.14em' }}>Workspace</div>
      {items.map(([r, label, ico]) => (
        <a key={r} href="#" onClick={e=>{e.preventDefault(); navigate(r);}} style={{
          display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:8,
          color: route===r ? 'var(--text-hi)' : 'var(--text-mid)',
          background: route===r ? 'var(--bg-2)' : 'transparent',
          fontSize:14, marginBottom:2,
          boxShadow: route===r ? 'inset 0 0 0 1px var(--border-strong)' : 'none',
        }}>
          <Icon name={ico} size={16}/> {label}
          {r==='projects-new' && <span className="pill pill-mint" style={{marginLeft:'auto', fontSize:10}}>new</span>}
        </a>
      ))}
      <div style={{ marginTop: 24, padding: 14, borderRadius: 12, background:'var(--bg-2)', boxShadow:'inset 0 0 0 1px var(--border)'}}>
        <div style={{ fontSize:12, color:'var(--text-mid)', marginBottom:6 }}>Current path</div>
        <div className="serif italic" style={{ fontSize: 18, lineHeight:1.2 }}>AI Engineer</div>
        <div style={{ marginTop:10, height:6, borderRadius:999, background:'var(--bg-0)', overflow:'hidden'}}>
          <div style={{ width:'52%', height:'100%', background:'linear-gradient(90deg, var(--primary), var(--mint))' }}/>
        </div>
        <div style={{ marginTop:6, fontSize:11, color:'var(--text-mid)' }}>Week 7 of 12</div>
      </div>
      <div style={{ position:'absolute', bottom:20, left:16, right:16, display:'flex', alignItems:'center', gap:10, padding:'10px', borderRadius:10, background:'var(--bg-1)', boxShadow:'inset 0 0 0 1px var(--border)'}}>
        <div style={{ width:32, height:32, borderRadius:999, background:'linear-gradient(135deg, #6366F1, #34D399)'}}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, color:'var(--text-hi)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Ada Park</div>
          <div style={{ fontSize:11, color:'var(--text-mid)' }}>ada@cairn.dev</div>
        </div>
        <Icon name="settings" size={14} style={{ color:'var(--text-mid)' }}/>
      </div>
    </aside>
  );
};

/* ------------------------ Topbar (app) ------------------------ */
const Topbar = ({ title, subtitle, right }) => (
  <header style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 32px', borderBottom:'1px solid var(--border)', background:'color-mix(in srgb, var(--bg-0) 80%, transparent)', backdropFilter:'blur(12px)', position:'sticky', top:0, zIndex:30 }}>
    <div>
      <div style={{ fontSize:12, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em' }}>{subtitle}</div>
      <h1 className="serif" style={{ fontSize: 30, margin:0, letterSpacing:'-.02em' }}>{title}</h1>
    </div>
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <div className="pill" style={{ gap:8 }}><Icon name="flame" size={12} style={{color:'#fb923c'}}/> 7 day streak</div>
      <div className="pill" style={{ gap:8 }}><Icon name="sparkles" size={12} style={{color:'#a5b4fc'}}/> 1,240 XP</div>
      <button className="btn-magnetic btn-ghost" style={{ padding:8 }}><Icon name="search" size={14}/></button>
      <button className="btn-magnetic btn-ghost" style={{ padding:8, position:'relative' }}>
        <Icon name="bell" size={14}/>
        <span style={{ position:'absolute', top:6, right:6, width:6, height:6, borderRadius:999, background:'#FB923C', boxShadow:'0 0 8px #FB923C' }}/>
      </button>
      {right}
    </div>
  </header>
);

/* ------------------------ Footer ------------------------ */
const Footer = ({ navigate }) => (
  <footer style={{ borderTop:'1px solid var(--border)', marginTop: 120, padding:'80px 0 40px', position:'relative', overflow:'hidden' }}>
    <div className="container">
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr', gap:48, paddingBottom:60 }} className="footer-grid">
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <CairnMark size={22}/>
            <span className="serif" style={{ fontSize:24 }}>Cairn</span>
          </div>
          <p style={{ color:'var(--text-mid)', fontSize:14, maxWidth: 360, lineHeight:1.6 }}>
            Verified paths from free tutorials to real careers. Built on Gemma 4, open evaluation, and signed credentials you can actually share.
          </p>
          <div style={{ display:'flex', gap:8, marginTop:18 }}>
            <a className="pill" style={{padding:8}} href="#"><Icon name="twitter" size={14}/></a>
            <a className="pill" style={{padding:8}} href="#"><Icon name="github" size={14}/></a>
            <a className="pill" style={{padding:8}} href="#"><Icon name="linkedin" size={14}/></a>
          </div>
        </div>
        {[
          ['Product',['Roadmap','Evaluation','Credentials','Portfolio','Pricing']],
          ['Learners',['Paths library','Resources','Discord','Changelog']],
          ['Recruiters',['Browse talent','Verify badge','Hire faster']],
          ['Company',['About','Blog','Careers','Privacy','Terms']],
        ].map(([h, items]) => (
          <div key={h}>
            <div style={{ fontSize:12, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom:14 }}>{h}</div>
            {items.map(i => <a key={i} href="#" style={{ display:'block', fontSize:14, color:'var(--text-hi)', marginBottom:8, opacity:.85 }}>{i}</a>)}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:'1px solid var(--border)', paddingTop:24, fontSize:12, color:'var(--text-mid)' }}>
        <div>© 2026 Cairn Labs. Verified paths, not promises.</div>
        <div style={{ display:'flex', gap:18 }}>
          <span>v1.4.0 · Gemma 4 · 27B/12B/4B routed</span>
          <span style={{ display:'flex', alignItems:'center', gap:6 }}><span style={{ width:6, height:6, background:'#34D399', borderRadius:999, boxShadow:'0 0 8px #34D399'}}/> All systems normal</span>
        </div>
      </div>
      {/* Big watermark */}
      <div className="serif italic" aria-hidden="true" style={{
        position:'relative', fontSize:'clamp(160px, 28vw, 380px)', lineHeight:.9, color:'transparent',
        background:'linear-gradient(180deg, color-mix(in srgb, var(--text-hi) 6%, transparent) 0%, transparent 80%)',
        WebkitBackgroundClip:'text', backgroundClip:'text',
        textAlign:'center', marginTop: 40, userSelect:'none'
      }}>Cairn</div>
    </div>
    <style>{`
      @media (max-width: 900px) {
        .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
      }
    `}</style>
  </footer>
);

Object.assign(window, {
  Icon, CairnMark, MagneticButton, AuroraBackground, SplitText, CairnStack,
  ProgressRing, ProviderChain, CredentialBadge, BentoTile, KPIChip, Typewriter,
  Modal, ToastProvider, useToast, Tabs, TopNav, Sidebar, Topbar, Footer,
});
