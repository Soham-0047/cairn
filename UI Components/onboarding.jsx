/* Onboarding flow */
const { useState: oUseState, useEffect: oUseEffect } = React;

const Onboarding = ({ navigate }) => {
  const [step, setStep] = oUseState(0);
  const [goal, setGoal] = oUseState('');
  const [parsing, setParsing] = oUseState(false);
  const [profile, setProfile] = oUseState(null);
  const [generating, setGenerating] = oUseState(false);

  return (
    <div className="page-enter" style={{ minHeight:'100vh', position:'relative', overflow:'hidden' }}>
      <AuroraBackground intensity={.6}/>
      {/* Mini nav */}
      <div style={{ position:'absolute', top: 24, left: 28, right: 28, display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:5 }}>
        <a href="#" onClick={e=>{e.preventDefault(); navigate('landing');}} style={{ display:'flex', alignItems:'center', gap:10 }}>
          <CairnMark size={22}/>
          <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
        </a>
        <StepDots step={generating?3:(profile?2:(step))} total={4}/>
      </div>

      <div className="container" style={{ position:'relative', zIndex:2, paddingTop: 120, paddingBottom: 80, maxWidth: 760 }}>
        {generating ? (
          <GeneratingScene onDone={()=>navigate('dashboard')}/>
        ) : !profile ? (
          step === 0 ? (
            <Welcome onNext={()=>setStep(1)}/>
          ) : (
            <GoalCapture
              goal={goal} setGoal={setGoal}
              parsing={parsing}
              onParse={()=>{
                if (!goal.trim()) return;
                setParsing(true);
                setTimeout(()=>{
                  setParsing(false);
                  setProfile({
                    target: 'AI Engineer',
                    timeline: '6 months',
                    hoursPerWeek: 12,
                    currentSkills:['Python','Pandas','React'],
                    targetSkills:['PyTorch','LangChain','MLOps','Eval frameworks'],
                    modalities:['video','docs','build-along']
                  });
                }, 1800);
              }}
            />
          )
        ) : (
          <ProfileReveal profile={profile} setProfile={setProfile} onGenerate={()=>{
            setGenerating(true);
          }}/>
        )}
      </div>
    </div>
  );
};

const StepDots = ({ step, total }) => (
  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
    {Array.from({length:total}).map((_,i)=>(
      <div key={i} style={{ width: i<=step ? 28 : 8, height: 8, borderRadius:999,
        background: i<=step ? 'linear-gradient(90deg, var(--primary), var(--mint))' : 'var(--bg-3)',
        transition:'all .4s cubic-bezier(.16,1,.3,1)'
      }}/>
    ))}
  </div>
);

const Welcome = ({ onNext }) => {
  return (
    <div style={{ textAlign:'center', marginTop: 40 }}>
      <div style={{ display:'inline-block', position:'relative' }}>
        <div style={{ width: 96, height:96, borderRadius:999, background:'linear-gradient(135deg, #FB923C, #8B5CF6)', boxShadow:'0 0 0 4px rgba(99,102,241,0.25)', margin:'0 auto', animation:'fadeUp .6s both'}}/>
        <div className="pill pill-mint" style={{ position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)' }}>
          <Icon name="github" size={10}/> @adapark
        </div>
      </div>
      <h1 className="serif italic" style={{ fontSize:'clamp(40px, 6vw, 64px)', margin:'40px 0 0', lineHeight:1, letterSpacing:'-.03em' }}>
        Hi Ada. Let's <span className="grad-text">plot a course</span>.
      </h1>
      <p style={{ color:'var(--text-mid)', fontSize: 18, marginTop: 18, maxWidth: 480, marginInline:'auto', lineHeight:1.5 }}>
        We'll ask you one big question, build a 12-week plan, and verify every project you ship. Should take about 90 seconds.
      </p>
      <div style={{ marginTop: 36 }}>
        <MagneticButton onClick={onNext}>Begin <Icon name="arrow-right" size={14}/></MagneticButton>
      </div>
      <div style={{ marginTop: 16, fontSize:12, color:'var(--text-lo)' }}>Press <span className="kbd">Enter</span> to continue</div>
    </div>
  );
};

const GoalCapture = ({ goal, setGoal, onParse, parsing }) => {
  const examples = [
    'I want to become an AI engineer in 6 months. I know Python.',
    'Land a frontend role at a startup. I have a CS degree but no shipped projects.',
    'Pivot from PM to ML researcher. 10h/week.',
    'Build and launch an iOS app from scratch.',
  ];
  const [phIdx, setPhIdx] = oUseState(0);
  oUseEffect(() => {
    if (goal) return;
    const t = setInterval(()=> setPhIdx(i => (i+1)%examples.length), 4000);
    return () => clearInterval(t);
  }, [goal]);

  const suggestions = ['AI Engineer','Frontend Developer','ML Researcher','iOS Developer','DevRel','Design Engineer'];

  return (
    <div style={{ marginTop: 40 }}>
      <SmallEyebrow>Step 1 · Your goal</SmallEyebrow>
      <h2 className="serif" style={{ fontSize:'clamp(36px, 5vw, 56px)', margin:'14px 0 0', lineHeight:1, letterSpacing:'-.025em' }}>
        Where do you want to <i>land</i>?
      </h2>
      <p style={{ color:'var(--text-mid)', fontSize: 17, marginTop: 14, maxWidth: 560 }}>
        Tell us in plain English. The more specific you are about timeline and current skills, the better the plan.
      </p>
      <div style={{ marginTop: 36, position:'relative' }}>
        <div style={{
          padding:'2px', borderRadius: 18,
          background: goal ? 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(52,211,153,0.3))' : 'var(--border-strong)',
          transition:'all .25s ease'
        }}>
          <div style={{ background:'var(--bg-1)', borderRadius: 16, padding: 20, position:'relative' }}>
            <textarea
              value={goal}
              onChange={e=>setGoal(e.target.value)}
              rows={4}
              placeholder=""
              autoFocus
              style={{
                width:'100%', background:'transparent', border:'none', outline:'none', resize:'none',
                color:'var(--text-hi)', fontFamily:'var(--sans)', fontSize: 18, lineHeight: 1.55,
              }}
            />
            {!goal && (
              <div style={{ position:'absolute', top: 20, left: 20, right:20, color:'var(--text-lo)', fontSize:18, pointerEvents:'none', lineHeight:1.55 }}>
                <Typewriter key={phIdx} text={examples[phIdx]} speed={28} cursor={false}/>
              </div>
            )}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop: 14, paddingTop:14, borderTop:'1px solid var(--border)'}}>
              <div style={{ display:'flex', gap:6 }}>
                <button className="btn-magnetic btn-ghost" style={{ padding:'6px 10px', fontSize:12 }}><Icon name="mic" size={12}/> Dictate</button>
                <button className="btn-magnetic btn-ghost" style={{ padding:'6px 10px', fontSize:12 }}><Icon name="upload" size={12}/> Resume</button>
              </div>
              <button onClick={onParse} disabled={!goal.trim() || parsing} className="btn-magnetic btn-primary" style={{ padding:'10px 16px', opacity: !goal.trim()?.4:1 }}>
                {parsing ? <><span style={{display:'inline-block', width:12, height:12, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:999, animation:'spin 1s linear infinite'}}/> Parsing…</> : <>Continue <Icon name="arrow-right" size={14}/></>}
              </button>
            </div>
          </div>
        </div>

        {/* Provider chain shown while parsing */}
        {parsing && (
          <div style={{ marginTop: 18, display:'flex', alignItems:'center', gap:10, animation:'fadeUp .25s ease' }}>
            <ProviderChain providers={['Gemma 4 4B','Gemini Flash','Local 4B']} active={0}/>
            <span style={{ fontSize:12, color:'var(--text-mid)' }}>extracting structured profile…</span>
          </div>
        )}
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="mono" style={{ fontSize:11, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 10 }}>Or pick a starting point</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap: 8 }}>
          {suggestions.map((s, i) => (
            <button key={s} onClick={()=> setGoal(`I want to become a ${s} in 6 months.`)} className="pill" style={{
              padding:'8px 14px', fontSize:13, cursor:'pointer',
              animation:`fadeUp .4s ${i*60}ms both`
            }}>+ {s}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileReveal = ({ profile, setProfile, onGenerate }) => {
  return (
    <div style={{ marginTop: 40 }}>
      <SmallEyebrow>Step 2 · We extracted</SmallEyebrow>
      <h2 className="serif" style={{ fontSize:'clamp(36px, 5vw, 56px)', margin:'14px 0 0', lineHeight:1, letterSpacing:'-.025em' }}>
        Does this <i>sound right</i>?
      </h2>
      <p style={{ color:'var(--text-mid)', fontSize: 17, marginTop: 14, maxWidth: 600 }}>
        We parsed your goal with Gemma 4 4B. Edit any field — these drive the entire 12-week plan.
      </p>
      <div style={{ marginTop: 28, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }} className="profile-grid">
        <ProfileCard label="Target role" value={profile.target} editable onChange={v=>setProfile({...profile, target:v})} delay={0}/>
        <ProfileCard label="Timeline" value={profile.timeline} editable onChange={v=>setProfile({...profile, timeline:v})} delay={60}/>
        <ProfileCard label="Hours / week" value={`${profile.hoursPerWeek} hrs`} delay={120}/>
        <ProfileCard label="Learning style" value={profile.modalities.join(', ')} delay={180}/>
        <div style={{ gridColumn:'span 2', animation:'fadeUp .5s 240ms both' }}>
          <SkillsCard label="Current skills" tags={profile.currentSkills} tone="#a5b4fc"
            onAdd={(t)=>setProfile({...profile, currentSkills:[...profile.currentSkills, t]})}
            onRemove={(t)=>setProfile({...profile, currentSkills:profile.currentSkills.filter(x=>x!==t)})}
          />
        </div>
        <div style={{ gridColumn:'span 2', animation:'fadeUp .5s 300ms both' }}>
          <SkillsCard label="Target skills (we'll build a path for these)" tags={profile.targetSkills} tone="#6ee7b7"
            onAdd={(t)=>setProfile({...profile, targetSkills:[...profile.targetSkills, t]})}
            onRemove={(t)=>setProfile({...profile, targetSkills:profile.targetSkills.filter(x=>x!==t)})}
          />
        </div>
      </div>
      <div style={{ marginTop: 36, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <ProviderChain providers={['Gemma 4 4B','Gemini Flash','Local 4B']} active={0}/>
        <MagneticButton onClick={onGenerate} className="pulse-soft">
          <Icon name="sparkles" size={14}/> Generate my path
        </MagneticButton>
      </div>
      <style>{`@media (max-width: 700px){ .profile-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};

const ProfileCard = ({ label, value, editable, onChange, delay=0 }) => {
  const [edit, setEdit] = oUseState(false);
  const [val, setVal] = oUseState(value);
  oUseEffect(()=> setVal(value), [value]);
  return (
    <div className="card" style={{ padding: 18, animation:`fadeUp .5s ${delay}ms both` }}>
      <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em' }}>{label}</div>
      <div style={{ marginTop: 8, display:'flex', alignItems:'center', justifyContent:'space-between', gap: 8 }}>
        {edit ? (
          <input value={val} onChange={e=>setVal(e.target.value)} onBlur={()=>{ setEdit(false); onChange?.(val); }} autoFocus
            style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontFamily:'var(--serif)', fontSize:22 }}/>
        ) : (
          <div className="serif" style={{ fontSize: 22, lineHeight:1.1 }}>{value}</div>
        )}
        {editable && (
          <button onClick={()=>setEdit(true)} className="pill" style={{ padding:'4px 8px', fontSize:11 }}>edit</button>
        )}
      </div>
    </div>
  );
};

const SkillsCard = ({ label, tags, tone, onAdd, onRemove }) => {
  const [adding, setAdding] = oUseState('');
  return (
    <div className="card" style={{ padding: 18 }}>
      <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', textTransform:'uppercase', letterSpacing:'.14em', marginBottom: 12 }}>{label}</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap: 6 }}>
        {tags.map(t => (
          <span key={t} className="pill" style={{ padding:'6px 10px', fontSize:12, color: tone, boxShadow:`inset 0 0 0 1px ${tone}40`, background:`color-mix(in srgb, ${tone} 10%, transparent)` }}>
            {t}
            <button onClick={()=>onRemove(t)} style={{ background:'none', border:'none', color:'inherit', opacity:.5, cursor:'pointer', padding:0 }}>
              <Icon name="x" size={10}/>
            </button>
          </span>
        ))}
        <input
          placeholder="add skill…"
          value={adding}
          onChange={e=>setAdding(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter' && adding.trim()) { onAdd(adding.trim()); setAdding(''); } }}
          style={{
            background:'transparent', border:'none', outline:'none', color:'var(--text-hi)', fontSize:12,
            padding:'6px 10px', minWidth: 100, fontFamily:'inherit'
          }}
        />
      </div>
    </div>
  );
};

const SmallEyebrow = ({ children }) => (
  <div className="mono" style={{ fontSize:10, color:'var(--text-mid)', letterSpacing:'.14em', textTransform:'uppercase' }}>{children}</div>
);

/* ---------------- Generating scene ---------------- */
const GeneratingScene = ({ onDone }) => {
  const tokens = ['phase 1','milestone','project','review','phase 2','vision','27B','12B','signed','credential','phase 3','portfolio','ship','PyTorch','LangChain','eval'];
  const [step, setStep] = oUseState(0);
  const phases = ['Researching learning paths…','Pacing milestones to 12 weeks…','Curating free resources…','Designing shippable projects…','Sealing credential schema…'];
  oUseEffect(() => {
    const t = setInterval(()=> setStep(s => s+1), 800);
    const done = setTimeout(()=> onDone && onDone(), phases.length * 800 + 1200);
    return () => { clearInterval(t); clearTimeout(done); };
  }, []);
  return (
    <div style={{ textAlign:'center', position:'relative', minHeight: 600, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
      <div style={{ position:'relative', width: 360, height: 360 }}>
        {/* Spinning rings */}
        {[0, 60, 120].map((d,i)=>(
          <div key={i} style={{
            position:'absolute', inset: i*20, borderRadius:999,
            border: '1px solid rgba(99,102,241,0.25)',
            borderTopColor: i===0 ? '#818CF8' : i===1 ? '#34D399' : '#FB923C',
            animation: `spin ${4+i*1.5}s linear infinite ${i%2?'reverse':''}`,
          }}/>
        ))}
        <div style={{ position:'absolute', inset:'30%', borderRadius:999,
          background:'radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)',
          filter:'blur(10px)', animation:'pulseGlow 2.5s ease-in-out infinite' }}/>
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <CairnMark size={56}/>
        </div>
        {/* Flying tokens */}
        {tokens.map((tk, i) => {
          const ang = (i / tokens.length) * Math.PI*2;
          const r = 160 + (i%3)*20;
          const cx = 180 + Math.cos(ang)*r;
          const cy = 180 + Math.sin(ang)*r;
          return (
            <span key={i} className="mono" style={{
              position:'absolute', left:cx, top:cy, transform:'translate(-50%,-50%)',
              fontSize:11, color: i%3===0?'#a5b4fc':i%3===1?'#6ee7b7':'#fdba74',
              opacity:.7,
              animation:`tokenFloat ${4+(i%4)}s ease-in-out infinite ${i*0.15}s`,
              whiteSpace:'nowrap', pointerEvents:'none'
            }}>{tk}</span>
          );
        })}
      </div>
      <div style={{ marginTop: 40 }}>
        <div className="serif italic" style={{ fontSize: 36, letterSpacing:'-.02em' }}>
          {phases[Math.min(step, phases.length-1)]}
        </div>
        <div style={{ marginTop:14 }}>
          <ProviderChain providers={['Gemma 4 27B','Gemini','DeepSeek']} active={0}/>
        </div>
        <div style={{ marginTop: 14, fontFamily:'var(--mono)', fontSize:11, color:'var(--text-lo)', letterSpacing:'.1em' }}>
          T+{(step*0.8).toFixed(1)}s · routing tokens · streaming
        </div>
      </div>
      <style>{`
        @keyframes tokenFloat {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

Object.assign(window, { Onboarding });
