/* Public portfolio /u/[handle] (used for /example too) */
const { useState: poUseState, useEffect: poUseEffect, useRef: poUseRef } = React;

const PROJECTS = [
  { t:'Codex Studio', score:92, tags:['Agents','RAG','Streaming'], stage:'shipped', when:'Week 7', tone:'#6366F1' },
  { t:'NoteShelf', score:88, tags:['Next.js','tRPC','Postgres'], stage:'shipped', when:'Week 5', tone:'#34D399' },
  { t:'Echo Buddy', score:81, tags:['Whisper','Eleven','Realtime'], stage:'demo', when:'Week 4', tone:'#FB923C' },
  { t:'PaperCanvas', score:95, tags:['Three.js','GLSL','Shaders'], stage:'shipped', when:'Week 6', tone:'#8B5CF6' },
  { t:'EvalKit', score:84, tags:['Python','Datasets'], stage:'demo', when:'Week 3', tone:'#EC4899' },
  { t:'Mini-GPT', score:79, tags:['PyTorch','Attention'], stage:'prototype', when:'Week 4', tone:'#A5B4FC' },
];

const SKILLS = [
  { n:'PyTorch', x:50, y:50, r:34, c:'#6366F1' },
  { n:'LangChain', x:30, y:30, r:22, c:'#34D399' },
  { n:'RAG', x:70, y:35, r:20, c:'#FB923C' },
  { n:'Vision', x:78, y:62, r:18, c:'#8B5CF6' },
  { n:'Eval', x:22, y:62, r:18, c:'#A5B4FC' },
  { n:'Streaming', x:55, y:78, r:16, c:'#6ee7b7' },
  { n:'Agents', x:42, y:18, r:18, c:'#fdba74' },
  { n:'Three.js', x:88, y:80, r:14, c:'#EC4899' },
];

const Portfolio = ({ navigate, example=false }) => {
  const [activeShot, setActiveShot] = poUseState(null);
  const toast = useToast();
  return (
    <div style={{ background:'var(--bg-0)', minHeight:'100vh', position:'relative' }}>
      {example && (
        <div style={{
          position:'sticky', top:0, zIndex:50, padding:'12px 24px',
          background:'color-mix(in srgb, var(--bg-0) 80%, transparent)', backdropFilter:'blur(10px)',
          borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'var(--text-mid)' }}>
            <span className="pill pill-indigo">SAMPLE</span>
            This is a sample portfolio. Build yours in 12 weeks.
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} className="btn-magnetic btn-ghost" style={{ padding:'6px 12px', fontSize:12 }}>← Cairn home</a>
            <MagneticButton onClick={()=>navigate('onboarding')}>Build mine <Icon name="arrow-right" size={12}/></MagneticButton>
          </div>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding:'80px 24px 40px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.18), transparent 60%)'}}/>
        <div className="container" style={{ position:'relative', zIndex:2, maxWidth: 1080 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap: 32, flexWrap:'wrap' }}>
            <div style={{ position:'relative' }}>
              <div style={{ width: 120, height: 120, borderRadius:999, background:'linear-gradient(135deg, #FB923C, #8B5CF6 50%, #6366F1)', boxShadow:'0 0 0 6px rgba(99,102,241,0.25), 0 30px 60px -10px rgba(0,0,0,0.5)'}}/>
              <div style={{ position:'absolute', inset:-6, borderRadius:999, border:'1px solid rgba(99,102,241,0.4)', animation:'pingRing 3s ease-out infinite' }}/>
              <style>{`@keyframes pingRing { 0%{ transform:scale(1); opacity:.6;} 80%,100%{ transform:scale(1.3); opacity:0;}}`}</style>
            </div>
            <div style={{ flex:1, minWidth: 280 }}>
              <SmallEyebrow>cairn.dev/u/mira-k</SmallEyebrow>
              <h1 className="serif" style={{ fontSize:'clamp(48px, 7vw, 88px)', margin:'8px 0 0', lineHeight:.95, letterSpacing:'-.03em' }}>
                Mira <span className="italic grad-text">Khatri</span>.
              </h1>
              <div style={{ marginTop: 14, display:'flex', flexWrap:'wrap', gap:8, fontSize: 16, color:'var(--text-mid)' }}>
                <span>AI Engineer — career-switching from frontend</span>
                <span>·</span>
                <span>Bangalore</span>
                <span>·</span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}><span style={{ width:6, height:6, borderRadius:999, background:'#34D399', boxShadow:'0 0 8px #34D399' }}/> open to roles</span>
              </div>
              <div style={{ marginTop: 24, display:'flex', gap:8, flexWrap:'wrap' }}>
                <MagneticButton onClick={()=>toast.push('Email copied: mira@kahtri.dev', 'success')}>
                  <Icon name="mail" size={14}/> Hire me
                </MagneticButton>
                <a className="pill" href="#"><Icon name="github" size={12}/> mirak</a>
                <a className="pill" href="#"><Icon name="twitter" size={12}/> @mirak</a>
                <a className="pill" href="#"><Icon name="linkedin" size={12}/> mirakhatri</a>
                <a className="pill" href="#"><Icon name="globe" size={12}/> mira.dev</a>
              </div>
            </div>
          </div>

          {/* Path strip */}
          <div className="card" style={{ marginTop: 40, padding: 20, display:'flex', alignItems:'center', gap: 18, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <CairnMark size={26}/>
              <div>
                <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em' }}>Cairn-verified path</div>
                <div className="serif" style={{ fontSize: 22, lineHeight:1.1 }}>AI Engineer · Week 12 of 12</div>
              </div>
            </div>
            <div style={{ flex:1, minWidth: 200, height:8, borderRadius:999, background:'var(--bg-2)', overflow:'hidden' }}>
              <div style={{ width:'100%', height:'100%', background:'linear-gradient(90deg, var(--primary), var(--mint), var(--warm))' }}/>
            </div>
            <div style={{ display:'flex', gap: 14 }}>
              <Stat n="6" l="credentials"/>
              <Stat n="87" l="avg score" suffix="/100"/>
              <Stat n="148" l="hours"/>
            </div>
          </div>
        </div>
      </section>

      {/* Credentials grid */}
      <section style={{ padding:'40px 24px 60px' }}>
        <div className="container">
          <div style={{ display:'flex', alignItems:'baseline', gap:16, marginBottom: 28 }}>
            <h2 className="serif italic" style={{ fontSize: 40, margin:0, letterSpacing:'-.02em' }}>Verified work</h2>
            <span style={{ flex:1, height:1, background:'var(--border)' }}/>
            <span className="mono" style={{ fontSize:11, color:'var(--text-mid)' }}>{PROJECTS.length} credentials</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 18 }} className="cred-grid">
            {PROJECTS.map((p, i) => (
              <article key={p.t} className="card" style={{ padding: 0, overflow:'hidden', cursor:'pointer', transition:'transform .3s, box-shadow .3s' }}
                onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 30px 60px -20px rgba(0,0,0,0.5), inset 0 0 0 1px var(--border-strong)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
                onClick={()=>setActiveShot(p)}>
                <div style={{ aspectRatio:'16/10', background:`linear-gradient(135deg, ${p.tone}55, ${p.tone}11)`, position:'relative', overflow:'hidden' }}>
                  <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.1), transparent 50%)'}}/>
                  <Icon name="image" size={36} style={{ color: p.tone, position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)' }}/>
                  <div style={{ position:'absolute', top: 12, right: 12 }}>
                    <span className="pill" style={{ background:'rgba(0,0,0,0.5)', backdropFilter:'blur(8px)', fontSize:10, color: p.score>=90?'#6ee7b7':'#a5b4fc' }}>
                      <Icon name="check" size={10}/> verified · {p.score}/100
                    </span>
                  </div>
                  {/* Scan line on hover */}
                  <div style={{
                    position:'absolute', left:0, right:0, height:2,
                    background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                    top:'50%', opacity:0, transition:'opacity .25s'
                  }} className="scan-line"/>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <h3 className="serif" style={{ fontSize: 20, margin: 0, letterSpacing:'-.02em' }}>{p.t}</h3>
                    <span className="mono" style={{ fontSize:11, color:'var(--text-mid)' }}>{p.when}</span>
                  </div>
                  <div style={{ display:'flex', gap: 6, marginTop: 10, flexWrap:'wrap' }}>
                    {p.tags.map(t => <span key={t} className="pill" style={{ fontSize:10 }}>{t}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <style>{`@media(max-width:1000px){.cred-grid{grid-template-columns:1fr 1fr !important;}} @media(max-width:600px){.cred-grid{grid-template-columns:1fr !important;}}`}</style>
        </div>
      </section>

      {/* Skills constellation */}
      <section style={{ padding:'40px 24px' }}>
        <div className="container">
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap: 40, alignItems:'center' }} className="con-grid">
            <div>
              <SmallEyebrow>Skills constellation</SmallEyebrow>
              <h2 className="serif" style={{ fontSize: 44, margin:'10px 0 14px', letterSpacing:'-.02em' }}>What I can <i>actually do</i>.</h2>
              <p style={{ color:'var(--text-mid)', fontSize: 15, lineHeight:1.6 }}>
                Sized by repeated demonstration across verified projects. Hover a node to see which credentials evidence it.
              </p>
              <div style={{ marginTop: 18, display:'flex', flexWrap:'wrap', gap: 6 }}>
                {SKILLS.map(s => <span key={s.n} className="pill" style={{ fontSize:11, color: s.c, boxShadow: `inset 0 0 0 1px ${s.c}40` }}>{s.n}</span>)}
              </div>
            </div>
            <div className="card" style={{ padding: 20, aspectRatio:'4/3', position:'relative', overflow:'hidden' }}>
              <Constellation/>
            </div>
          </div>
          <style>{`@media(max-width:900px){.con-grid{grid-template-columns:1fr !important;}}`}</style>
        </div>
      </section>

      {/* Timeline */}
      <section style={{ padding:'60px 24px' }}>
        <div className="container">
          <SmallEyebrow>Milestones · 12 weeks</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 44, margin:'10px 0 24px', letterSpacing:'-.02em' }}>The <i>receipts</i>.</h2>
          <div style={{ overflowX:'auto', paddingBottom: 16 }}>
            <div style={{ display:'flex', gap: 14, minWidth: 'max-content', paddingBottom: 4 }}>
              {Array.from({length: 12}).map((_, i) => {
                const done = i < 12;
                return (
                  <div key={i} style={{ width: 160, flexShrink: 0 }}>
                    <div style={{ height: 4, borderRadius:999, background: done ? 'linear-gradient(90deg, var(--primary), var(--mint))' : 'var(--bg-2)' }}/>
                    <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', marginTop: 8, textTransform:'uppercase', letterSpacing:'.14em' }}>WEEK {i+1}</div>
                    <div className="serif" style={{ fontSize: 16, marginTop: 4, lineHeight: 1.25, color:'var(--text-hi)' }}>
                      {['Tensors','Autograd','CIFAR-10','Transformers','LoRA','RAG','Codex Studio','Eval harness','Latency','Vision','Deploy','Capstone'][i]}
                    </div>
                    {done && <span className="pill pill-mint" style={{ marginTop:8, fontSize:10 }}><Icon name="check" size={10}/> verified</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section style={{ padding:'80px 24px 120px' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="card" style={{ padding: 48, textAlign:'center', position:'relative', overflow:'hidden' }}>
            <AuroraBackground intensity={.5}/>
            <div style={{ position:'relative', zIndex: 2 }}>
              <h2 className="serif italic" style={{ fontSize: 'clamp(40px, 6vw, 72px)', margin: 0, letterSpacing:'-.025em' }}>
                Want to <span className="grad-text">work together</span>?
              </h2>
              <p style={{ color:'var(--text-mid)', fontSize: 17, marginTop: 12, maxWidth: 480, margin:'12px auto 0' }}>
                Available for full-time, contract, and freelance. Replies within 24 hours.
              </p>
              <div style={{ marginTop: 28, display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
                <MagneticButton onClick={()=>toast.push('Email copied to clipboard', 'success')}>
                  <Icon name="mail" size={14}/> mira@khatri.dev
                </MagneticButton>
                <MagneticButton variant="ghost"><Icon name="copy" size={14}/> Copy portfolio link</MagneticButton>
              </div>
              <div style={{ marginTop: 24, display:'flex', gap:18, justifyContent:'center', fontSize:12, color:'var(--text-mid)' }}>
                <span>built with cairn · all credentials are HMAC-signed and verifiable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={!!activeShot} onClose={()=>setActiveShot(null)} width={900}>
        {activeShot && (
          <div>
            <SmallEyebrow>Credential · {activeShot.when}</SmallEyebrow>
            <h2 className="serif" style={{ fontSize: 40, margin:'10px 0', letterSpacing:'-.02em' }}>{activeShot.t}</h2>
            <div style={{ aspectRatio:'16/9', borderRadius: 14, background:`linear-gradient(135deg, ${activeShot.tone}55, ${activeShot.tone}11)`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
              <Icon name="image" size={48} style={{ color: activeShot.tone, opacity:.7 }}/>
              <BoundingBoxes/>
            </div>
            <div style={{ marginTop: 18, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
              <div className="card" style={{ padding: 14 }}>
                <SmallEyebrow>Score breakdown</SmallEyebrow>
                <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                  {[['Structural', 90, '#6ee7b7'],['Code', 88, '#a5b4fc'],['Visual', 94, '#fdba74'],['Synthesis', 92, '#c4b5fd']].map(([l,v,c])=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ fontSize: 12, color:'var(--text-mid)', width: 80 }}>{l}</div>
                      <div style={{ flex:1, height:6, borderRadius:999, background:'var(--bg-2)', overflow:'hidden' }}>
                        <div style={{ width: `${v}%`, height:'100%', background: c }}/>
                      </div>
                      <div className="mono" style={{ fontSize:11, color: c, width: 28, textAlign:'right' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <SmallEyebrow>Verify</SmallEyebrow>
                <div className="mono" style={{ marginTop:10, fontSize:11, color:'var(--text-mid)', wordBreak:'break-all', lineHeight:1.6 }}>
                  signature: e3b0c44298fc1c149afb f4c8996fb92427ae41e4 649b934ca495991b7852 b855
                </div>
                <button className="btn-magnetic btn-ghost" style={{ marginTop:10, padding:'6px 12px', fontSize:12 }}>Verify on cairn.dev →</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const Stat = ({ n, l, suffix='' }) => (
  <div style={{ textAlign:'right' }}>
    <div className="serif" style={{ fontSize: 28, lineHeight: 1 }}>{n}<span style={{ fontSize:14, color:'var(--text-mid)'}}>{suffix}</span></div>
    <div className="mono" style={{ fontSize: 10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em' }}>{l}</div>
  </div>
);

const Constellation = () => {
  const [hover, setHover] = poUseState(null);
  // edges (pairs of indices)
  const edges = [[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,4],[2,6],[3,7],[5,3]];
  return (
    <svg width="100%" height="100%" viewBox="0 0 100 75" preserveAspectRatio="xMidYMid meet">
      {edges.map((e, i) => {
        const a = SKILLS[e[0]], b = SKILLS[e[1]];
        const dur = 3 + i*0.3;
        return <line key={i} x1={a.x} y1={a.y*0.75} x2={b.x} y2={b.y*0.75} stroke="rgba(255,255,255,0.1)" strokeWidth=".25">
          <animate attributeName="opacity" values=".15;.5;.15" dur={`${dur}s`} repeatCount="indefinite"/>
        </line>;
      })}
      {SKILLS.map((s, i) => (
        <g key={s.n} onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{ cursor:'pointer' }}>
          <circle cx={s.x} cy={s.y*0.75} r={(s.r/6) + (hover===i?1.5:0)} fill={s.c} opacity=".18">
            <animate attributeName="r" values={`${s.r/6};${s.r/6 + .8};${s.r/6}`} dur={`${3+i*.4}s`} repeatCount="indefinite"/>
          </circle>
          <circle cx={s.x} cy={s.y*0.75} r={s.r/12} fill={s.c}/>
          <text x={s.x} y={s.y*0.75 - s.r/9 - 1.5} textAnchor="middle" fontSize="2.4" fontFamily="Inter" fill={hover===i?'#fff':'rgba(255,255,255,0.7)'} fontWeight="500">{s.n}</text>
        </g>
      ))}
    </svg>
  );
};

Object.assign(window, { Portfolio });
