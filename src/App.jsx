import { useState, useEffect, useRef, useCallback } from "react";

/* ── SUPABASE CONFIG ─────────────────────────────────────── */
const SUPA_URL  = "https://usdtgkzfmwmbrezgtaki.supabase.co";
const SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzZHRna3pmbXdtYnJlemd0YWtpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyODIxMTQsImV4cCI6MjA5Nzg1ODExNH0.o_CxZcM_k_if3q3tziXF4O85KzXaJ7MhfkXP0esvvGk";

const api = {
  headers: (token) => ({
    "apikey":        SUPA_ANON,
    "Authorization": `Bearer ${token || SUPA_ANON}`,
    "Content-Type":  "application/json",
    "Prefer":        "return=representation",
  }),

  async get(path, token, params = {}) {
    const url = new URL(`${SUPA_URL}/rest/v1${path}`);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
    const res = await fetch(url, { headers: this.headers(token) });
    if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
    return res.json();
  },

  async post(path, token, body) {
    const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
      method:  "POST",
      headers: this.headers(token),
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
    return res.json();
  },

  async patch(path, token, body) {
    const res = await fetch(`${SUPA_URL}/rest/v1${path}`, {
      method:  "PATCH",
      headers: { ...this.headers(token), "Prefer": "return=representation" },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} → ${res.status}`);
    return res.json();
  },

  // Auth
  async sendMagicLink(email) {
    const res = await fetch(`${SUPA_URL}/auth/v1/otp`, {
      method:  "POST",
      headers: { "apikey": SUPA_ANON, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, create_user: false }),
    });
    return res.ok;
  },

  async verifyOtp(email, token) {
    const res = await fetch(`${SUPA_URL}/auth/v1/verify`, {
      method:  "POST",
      headers: { "apikey": SUPA_ANON, "Content-Type": "application/json" },
      body:    JSON.stringify({ email, token, type: "email" }),
    });
    if (!res.ok) return null;
    return res.json();
  },

  async getSession() {
    try {
      const stored = localStorage.getItem("sb_session");
      if (!stored) return null;
      const session = JSON.parse(stored);
      if (new Date(session.expires_at * 1000) < new Date()) {
        localStorage.removeItem("sb_session");
        return null;
      }
      return session;
    } catch { return null; }
  },
};

/* ── BRAND ───────────────────────────────────────────────── */
const B = {
  night:"#001E2D", nightL:"#051E30", nightLL:"#082436",
  nightB:"#0A3550", day:"#91BEE6",   dayL:"#C8D2EB",
  white:"#FFFFFF",  muted:"#5B7D99", mutedL:"#91BEE660",
  green:"#4ECDC4",  red:"#FF5A5F",   yellow:"#FFE66D", gold:"#F7B731",
};

/* ── GAMIFICATION ────────────────────────────────────────── */
const PALIERS = [
  { name:"COMÈTE",        min:0,   icon:"☄️",  color:B.muted },
  { name:"ÉTOILE",        min:50,  icon:"⭐",  color:B.day   },
  { name:"CONSTELLATION", min:150, icon:"🌌",  color:B.dayL  },
  { name:"GALAXIE",       min:250, icon:"🌟",  color:B.gold  },
];
const AMBASSADEUR = [
  { name:"Ambassadeur",         min:1,  icon:"🚀", color:B.day  },
  { name:"Ambassadeur Argent",  min:3,  icon:"🥈", color:B.dayL },
  { name:"Ambassadeur Or",      min:5,  icon:"🥇", color:B.gold },
  { name:"Ambassadeur Platine", min:10, icon:"💫", color:"#E0CFFF" },
];
const getPalier = pts => [...PALIERS].reverse().find(p => pts >= p.min) || PALIERS[0];
const getNextP  = pts => PALIERS.find(p => p.min > pts);
const getAmbass = n   => [...AMBASSADEUR].reverse().find(a => n >= a.min);

/* ── COMPONENTS ──────────────────────────────────────────── */
function Stars() {
  const s = Array.from({length:30},(_,i)=>({x:(i*37+13)%100,y:(i*53+7)%100,s:[1,1.5,2][i%3],o:[.2,.35,.5][i%3],d:[3,4,5][i%3]}));
  return <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0}}>
    {s.map((x,i)=><div key={i} style={{position:"absolute",left:`${x.x}%`,top:`${x.y}%`,width:x.s,height:x.s,borderRadius:"50%",background:B.dayL,opacity:x.o,animation:`tw${i%4} ${x.d}s ease-in-out infinite`}}/>)}
  </div>;
}

function SpacersLogo({ height=28 }) {
  return <svg height={height} viewBox="0 0 300 65" fill="none">
    <ellipse cx="32" cy="32" rx="26" ry="10" stroke={B.day} strokeWidth="3" fill="none" transform="rotate(-20 32 32)"/>
    <ellipse cx="32" cy="32" rx="15" ry="6" stroke={B.day} strokeWidth="1.5" fill="none" transform="rotate(-20 32 32)" opacity=".6"/>
    <circle cx="32" cy="32" r="7" fill={B.nightL} stroke={B.white} strokeWidth="1.5"/>
    <circle cx="32" cy="19" r="2" fill={B.day} opacity=".8"/>
    <circle cx="48" cy="27" r="1.5" fill={B.day} opacity=".6"/>
    <text x="68" y="24" fontFamily="Orbitron,sans-serif" fontWeight="900" fontSize="20" fill={B.white} letterSpacing="1.5">SPACER'S</text>
    <text x="68" y="46" fontFamily="Orbitron,sans-serif" fontWeight="400" fontSize="11" fill={B.day} letterSpacing="2.5">TOULOUSE VOLLEY</text>
  </svg>;
}

function QRCode({ value, size=150 }) {
  const seed = value.split("").reduce((a,c,i)=>a+c.charCodeAt(0)*(i+1),0);
  const rng  = i => ((seed*1103515245+i*12345)>>>16)%2;
  const n=21, cell=size/n;
  const finder=(r,c,or,oc)=>{const rr=r-or,cc=c-oc;if(rr<0||rr>6||cc<0||cc>6)return null;return(rr===0||rr===6||cc===0||cc===6)?1:(rr>=2&&rr<=4&&cc>=2&&cc<=4)?1:0;};
  const cells=Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>{
    const f1=finder(r,c,0,0),f2=finder(r,c,0,n-7),f3=finder(r,c,n-7,0);
    if(f1!==null)return f1;if(f2!==null)return f2;if(f3!==null)return f3;
    return rng(r*n+c);
  }));
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
    <rect width={size} height={size} fill="#fff" rx={8}/>
    {cells.map((row,r)=>row.map((v,c)=>v?<rect key={`${r}${c}`} x={c*cell} y={r*cell} width={cell} height={cell} fill={B.night}/>:null))}
  </svg>;
}

function Spinner() {
  return <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40}}>
    <div style={{width:32,height:32,border:`3px solid ${B.nightB}`,borderTop:`3px solid ${B.day}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>;
}

function Toast({ msg, type, onClose }) {
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t)},[]);
  const c={success:B.green,error:B.red,info:B.day,warning:B.yellow}[type]||B.day;
  return <div style={{position:"fixed",bottom:24,right:16,zIndex:999,background:B.nightL,border:`1px solid ${c}50`,borderRadius:12,padding:"12px 18px",fontSize:13,fontWeight:700,color:c,boxShadow:"0 8px 32px #00000060",maxWidth:300}}>
    {msg}
  </div>;
}

/* ── LOGIN SCREEN ────────────────────────────────────────── */
function LoginScreen({ onLogin }) {
  const [step,setStep]   = useState("email"); // email | otp | sending
  const [email,setEmail] = useState("");
  const [otp,setOtp]     = useState("");
  const [err,setErr]     = useState("");
  const [loading,setLoading] = useState(false);

  async function sendLink() {
    if(!email.trim()) return;
    setLoading(true); setErr("");
    try {
      const ok = await api.sendMagicLink(email.trim().toLowerCase());
      if(ok) { setStep("otp"); }
      else   { setErr("Email non trouvé. Vérifie que tu es bien abonné."); }
    } catch { setErr("Erreur de connexion, réessaie."); }
    setLoading(false);
  }

  async function verifyCode() {
    if(otp.length < 6) return;
    setLoading(true); setErr("");
    try {
      const session = await api.verifyOtp(email.trim().toLowerCase(), otp.trim());
      if(session?.access_token) {
        localStorage.setItem("sb_session", JSON.stringify({
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
          expires_at:    Math.floor(Date.now()/1000) + (session.expires_in || 3600),
          user:          session.user,
        }));
        onLogin(session);
      } else {
        setErr("Code invalide ou expiré.");
      }
    } catch { setErr("Erreur de vérification."); }
    setLoading(false);
  }

  return <div style={{minHeight:"100vh",background:B.night,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"28px 24px",position:"relative"}}>
    <Stars/>
    <div style={{position:"relative",zIndex:1,width:"100%",maxWidth:380}}>
      <div style={{textAlign:"center",marginBottom:40,filter:`drop-shadow(0 0 24px ${B.day}40)`}}>
        <SpacersLogo height={50}/>
      </div>

      {step==="email" && <>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:18,color:B.white,marginBottom:6,textAlign:"center"}}>Ton espace abonné</div>
        <div style={{fontSize:12,color:B.muted,textAlign:"center",marginBottom:28,lineHeight:1.7}}>Connecte-toi avec ton email d'abonnement — tu recevras un code à 6 chiffres.</div>
        <input value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendLink()}
          placeholder="ton@email.fr" type="email" autoFocus
          style={{width:"100%",padding:"14px 16px",background:B.nightLL,border:`1.5px solid ${email?B.day:B.nightB}`,borderRadius:12,color:B.white,fontFamily:"inherit",fontSize:15,outline:"none",marginBottom:12,transition:"border-color .2s"}}/>
        {err && <div style={{fontSize:11,color:B.red,marginBottom:10,textAlign:"center"}}>{err}</div>}
        <button onClick={sendLink} disabled={!email.trim()||loading}
          style={{width:"100%",padding:"14px",background:email.trim()?B.day:B.nightB,border:"none",borderRadius:12,color:B.night,fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,cursor:email.trim()?"pointer":"not-allowed",transition:"all .2s"}}>
          {loading?"Envoi…":"RECEVOIR MON CODE ✦"}
        </button>
      </>}

      {step==="otp" && <>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:16,color:B.white,marginBottom:6,textAlign:"center"}}>Code envoyé !</div>
        <div style={{fontSize:12,color:B.muted,textAlign:"center",marginBottom:6,lineHeight:1.7}}>Vérifie ta boîte mail</div>
        <div style={{fontSize:13,color:B.day,textAlign:"center",marginBottom:28,fontWeight:700}}>{email}</div>
        <input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} onKeyDown={e=>e.key==="Enter"&&verifyCode()}
          placeholder="123456" type="text" inputMode="numeric" autoFocus
          style={{width:"100%",padding:"16px",background:B.nightLL,border:`1.5px solid ${otp.length===6?B.day:B.nightB}`,borderRadius:12,color:B.white,fontFamily:"Orbitron,sans-serif",fontSize:24,fontWeight:700,outline:"none",marginBottom:12,textAlign:"center",letterSpacing:8,transition:"border-color .2s"}}/>
        {err && <div style={{fontSize:11,color:B.red,marginBottom:10,textAlign:"center"}}>{err}</div>}
        <button onClick={verifyCode} disabled={otp.length<6||loading}
          style={{width:"100%",padding:"14px",background:otp.length===6?B.day:B.nightB,border:"none",borderRadius:12,color:B.night,fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,cursor:otp.length===6?"pointer":"not-allowed",transition:"all .2s"}}>
          {loading?"Vérification…":"SE CONNECTER ✦"}
        </button>
        <button onClick={()=>{setStep("email");setOtp("");setErr("");}}
          style={{width:"100%",padding:"10px",background:"none",border:"none",color:B.muted,fontFamily:"inherit",fontSize:12,marginTop:10,cursor:"pointer"}}>
          ← Changer d'email
        </button>
      </>}
    </div>
  </div>;
}

/* ── RGPD SHEET ──────────────────────────────────────────── */
function RgpdSheet({ onAccept }) {
  const [c,setC] = useState({analytics:false,marketing:false});
  const items = [
    {key:"essential",label:"Fonctionnement de l'app",  desc:"Billet, authentification, sécurité",locked:true},
    {key:"analytics",label:"Amélioration de l'app",    desc:"Statistiques d'usage anonymisées"},
    {key:"marketing",label:"Offres et actualités",     desc:"Promotions et nouvelles du club"},
  ];
  return <div style={{position:"fixed",inset:0,background:"#000000d8",zIndex:999,display:"flex",alignItems:"flex-end"}}>
    <div style={{background:B.nightL,borderRadius:"22px 22px 0 0",padding:"24px 20px 44px",width:"100%",border:`1px solid ${B.nightB}`}}>
      <div style={{width:36,height:4,background:B.nightB,borderRadius:2,margin:"0 auto 20px"}}/>
      <div style={{fontSize:10,color:B.day,fontWeight:700,letterSpacing:2,marginBottom:6}}>🔒 RGPD · ART. 13</div>
      <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:17,marginBottom:10,color:B.white}}>Tes données t'appartiennent</div>
      <div style={{fontSize:12,color:B.muted,lineHeight:1.8,marginBottom:18}}>Le Spacer's Toulouse Volley traite tes données pour cette app. Aucune donnée n'est vendue. Tu peux retirer ton consentement depuis Profil à tout moment.</div>
      {items.map((item,i,arr)=>(
        <div key={item.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 0",borderBottom:i<arr.length-1?`1px solid ${B.nightB}`:"none"}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:B.white}}>{item.label}{item.locked&&<span style={{fontSize:10,color:B.muted}}> · requis</span>}</div>
            <div style={{fontSize:11,color:B.muted,marginTop:2}}>{item.desc}</div>
          </div>
          <div onClick={()=>!item.locked&&setC(p=>({...p,[item.key]:!p[item.key]}))}
            style={{width:46,height:26,borderRadius:13,background:(c[item.key]||item.locked)?B.green:B.nightB,cursor:item.locked?"default":"pointer",position:"relative",transition:"background .25s",flexShrink:0,marginLeft:12}}>
            <div style={{position:"absolute",top:3,left:(c[item.key]||item.locked)?22:3,width:20,height:20,borderRadius:"50%",background:B.white,transition:"left .25s"}}/>
          </div>
        </div>
      ))}
      <button onClick={()=>onAccept(c)} style={{width:"100%",marginTop:20,padding:"15px",background:B.day,border:"none",borderRadius:14,color:B.night,fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
        ENTRER DANS L'UNIVERS ✦
      </button>
    </div>
  </div>;
}

/* ── SCREEN: ACCUEIL ─────────────────────────────────────── */
function ScreenAccueil({ abonne, matchs }) {
  const points = abonne?.points_total || 0;
  const palier = getPalier(points);
  const next   = getNextP(points);
  const pct    = next ? Math.round(((points-palier.min)/(next.min-palier.min))*100) : 100;
  const ambass = getAmbass(abonne?.nb_filleuls || 0);
  const match  = matchs.find(m => m.statut === "planifie");

  const daysUntil = match ? Math.ceil((new Date(match.date_match) - new Date()) / 86400000) : null;

  return <div style={{padding:"16px 16px 8px"}}>
    <div style={{marginBottom:16}}>
      <div style={{fontSize:11,color:B.muted}}>Bonsoir {abonne?.prenom} ✦</div>
      <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:16,color:B.white,marginTop:3,lineHeight:1.4}}>Bienvenue au Palais<br/>André-Brouat</div>
    </div>

    {/* Status */}
    <div style={{background:`linear-gradient(135deg,${B.day}18,${B.nightLL})`,border:`1px solid ${B.day}40`,borderRadius:16,padding:"14px 16px",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:`${palier.color}20`,border:`1px solid ${palier.color}40`,marginBottom:6}}>
          <span style={{fontSize:13}}>{palier.icon}</span>
          <span style={{fontSize:10,fontWeight:800,color:palier.color}}>{palier.name}</span>
        </div>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:24,color:B.day,lineHeight:1}}>
          {points}<span style={{fontSize:10,color:B.muted,fontWeight:400}}> pts</span>
        </div>
        {next && <div style={{fontSize:10,color:B.muted,marginTop:2}}>{next.min-points} pts → {next.icon} {next.name}</div>}
      </div>
      {ambass && (
        <div style={{textAlign:"right"}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,background:`${ambass.color}20`,border:`1px solid ${ambass.color}40`}}>
            <span>{ambass.icon}</span>
            <span style={{fontSize:10,fontWeight:800,color:ambass.color}}>{ambass.name}</span>
          </div>
          <div style={{fontSize:10,color:B.muted,marginTop:4}}>{abonne?.nb_filleuls} filleul{abonne?.nb_filleuls>1?"s":""}</div>
        </div>
      )}
    </div>

    {next && <div style={{background:B.nightB,borderRadius:4,height:4,marginBottom:14}}>
      <div style={{width:`${pct}%`,height:4,borderRadius:4,background:`linear-gradient(90deg,${palier.color},${B.day})`,transition:"width .8s"}}/>
    </div>}

    {/* Prochain match */}
    {match && (
      <div style={{background:`linear-gradient(135deg,${B.day}20,${B.nightLL})`,border:`1px solid ${B.day}50`,borderRadius:16,padding:16,marginBottom:20}}>
        <div style={{fontSize:9,color:B.day,fontWeight:700,letterSpacing:2,marginBottom:10}}>
          ⚡ {daysUntil > 0 ? `DANS ${daysUntil} JOUR${daysUntil>1?"S":""}` : "CE SOIR"} · {match.est_domicile?"DOMICILE":"EXTÉRIEUR"}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
          <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:11,flex:1,textAlign:"center",color:B.white,lineHeight:1.4}}>{match.home}</div>
          <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:15,color:B.day,padding:"0 8px"}}>VS</div>
          <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:11,flex:1,textAlign:"center",color:B.white,lineHeight:1.4}}>{match.away}</div>
        </div>
        <div style={{fontSize:11,color:B.muted,textAlign:"center"}}>
          {new Date(match.date_match).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} · {match.heure?.slice(0,5).replace(":",""[0]+"h"[0])}
        </div>
        <div style={{fontSize:11,color:B.muted,textAlign:"center"}}>📍 {match.venue}</div>
      </div>
    )}

    {/* Infos pratiques */}
    <div style={{fontSize:10,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:9}}>Ce soir</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:18}}>
      {[{icon:"⏰",t:"Ouverture",i:"18h30 · 90 min avant"},{icon:"🅿️",t:"Parking",i:"Compans · −50% QR"},{icon:"👶",t:"Espace famille",i:"Animations Niveau −1"},{icon:"🚌",t:"TCL direct",i:"Arrêt Palais des Sports"}].map((it,i)=>(
        <div key={i} style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:12,padding:"12px 11px"}}>
          <div style={{fontSize:18,marginBottom:5}}>{it.icon}</div>
          <div style={{fontSize:12,fontWeight:700,color:B.white,marginBottom:1}}>{it.t}</div>
          <div style={{fontSize:11,color:B.muted,lineHeight:1.4}}>{it.i}</div>
        </div>
      ))}
    </div>

    {/* Formule abonnement */}
    <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:12,padding:"12px 14px",marginBottom:12}}>
      <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:6}}>Mon abonnement</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:14,fontWeight:700,color:B.white}}>{abonne?.formule || "—"}</div>
          <div style={{fontSize:11,color:B.muted}}>Saison {abonne?.saison || "2026-27"}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:B.day}}>Code parrainage</div>
          <div style={{fontFamily:"monospace",fontSize:12,color:B.gold,fontWeight:700}}>{abonne?.code_parrainage || "—"}</div>
        </div>
      </div>
    </div>

    {/* Services */}
    <div style={{padding:"10px 12px",background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:12}}>
      <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:7}}>Services connectés</div>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {[["🏐","Tickie","actif"],["🍺","Buvette","actif"],["🛍️","Boutique","actif"],["📊","Ligue A","actif"]].map(([ico,l,s])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:20,background:`${B.green}15`,border:`1px solid ${B.green}40`}}>
            <span style={{fontSize:10}}>{ico}</span>
            <span style={{fontSize:9,fontWeight:700,color:B.green}}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  </div>;
}

/* ── SCREEN: BILLET ──────────────────────────────────────── */
function ScreenBillet({ abonne, matchs }) {
  const [mode,setMode] = useState("entree");
  const match = matchs.find(m=>m.statut==="planifie");
  const qr = `SPACERS2627-${(abonne?.prenom||"X").toUpperCase().slice(0,6)}-${abonne?.id?.slice(0,8)||"A"}`;

  return <div style={{padding:16}}>
    <div style={{marginBottom:16}}><SpacersLogo height={26}/></div>
    <div style={{display:"flex",gap:6,marginBottom:18}}>
      {[["entree","🏟️ Entrée"],["buvette","🍺 Buvette"],["boutique","🛍️ Boutique"]].map(([id,l])=>(
        <button key={id} onClick={()=>setMode(id)} style={{flex:1,padding:"9px 4px",borderRadius:10,border:`1.5px solid ${mode===id?B.day:B.nightB}`,background:mode===id?`${B.day}18`:B.nightLL,color:mode===id?B.day:B.muted,fontFamily:"inherit",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all .2s"}}>{l}</button>
      ))}
    </div>

    {mode==="entree" && <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:20,overflow:"hidden"}}>
      <div style={{background:`linear-gradient(135deg,${B.day},#5B9BD5)`,padding:"16px 18px"}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:B.night,opacity:.8,marginBottom:3}}>SPACER'S TOULOUSE · LIGUE A · 2026-27</div>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:14,color:B.night,marginBottom:3}}>
          {match?`${match.home} vs ${match.away}`:"Prochain Match"}
        </div>
        <div style={{fontSize:11,color:B.night,opacity:.8}}>
          {match&&`${new Date(match.date_match).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})} · ${match.heure?.slice(0,5)} · ${match.venue}`}
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",padding:"0 16px"}}>
        <div style={{width:16,height:16,borderRadius:"50%",background:B.night,flexShrink:0,marginLeft:-24}}/>
        <div style={{flex:1,borderTop:`2px dashed ${B.nightB}`,margin:"0 4px"}}/>
        <div style={{width:16,height:16,borderRadius:"50%",background:B.night,flexShrink:0,marginRight:-24}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",padding:"20px 18px 16px"}}>
        <div style={{background:B.white,padding:10,borderRadius:12,marginBottom:10}}>
          <QRCode value={qr} size={158}/>
        </div>
        <div style={{fontFamily:"monospace",fontSize:9,color:B.muted,letterSpacing:1,textAlign:"center",marginBottom:4}}>{qr}</div>
        <div style={{fontSize:11,color:B.muted}}>Présente ce QR à l'entrée du Palais</div>
      </div>
      <div style={{padding:"0 14px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Titulaire",`${abonne?.prenom} ${abonne?.nom}`],["Formule",abonne?.formule||"—"],["Tribune","Honneur Est"],["Palier",`${getPalier(abonne?.points_total||0).icon} ${getPalier(abonne?.points_total||0).name}`]].map(([l,v])=>(
          <div key={l} style={{background:B.night,borderRadius:8,padding:"9px 11px"}}>
            <div style={{fontSize:9,color:B.muted,marginBottom:2}}>{l}</div>
            <div style={{fontSize:11,fontWeight:700,color:B.white}}>{v}</div>
          </div>
        ))}
      </div>
    </div>}

    {mode==="buvette" && <div>
      <div style={{background:`linear-gradient(135deg,${B.green}18,${B.nightLL})`,border:`1px solid ${B.green}40`,borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{fontSize:9,color:B.green,fontWeight:700,letterSpacing:1.5,marginBottom:5}}>🔗 QR BUVETTE · 1€ = 1 PT</div>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:14,color:B.green}}>Happy Hour · −20% jusqu'à 19h</div>
      </div>
      <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:14,padding:16}}>
        <div style={{fontSize:11,color:B.muted,marginBottom:10}}>QR Buvette · présente à la caisse</div>
        <div style={{display:"flex",justifyContent:"center",background:B.white,borderRadius:10,padding:10}}>
          <QRCode value={`BUV-${abonne?.id||"demo"}`} size={130}/>
        </div>
      </div>
    </div>}

    {mode==="boutique" && <div>
      <div style={{background:`linear-gradient(135deg,${B.dayL}18,${B.nightLL})`,border:`1px solid ${B.dayL}40`,borderRadius:14,padding:16,marginBottom:12}}>
        <div style={{fontSize:9,color:B.dayL,fontWeight:700,letterSpacing:1.5,marginBottom:5}}>🔗 QR BOUTIQUE · 1€ = 1 PT</div>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:14,color:B.dayL}}>−15% sur tout le merch abonné</div>
      </div>
      <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:14,padding:16}}>
        <div style={{fontSize:11,color:B.muted,marginBottom:10}}>QR Boutique · présente à la caisse</div>
        <div style={{display:"flex",justifyContent:"center",background:B.white,borderRadius:10,padding:10}}>
          <QRCode value={`BOUT-${abonne?.id||"demo"}`} size={130}/>
        </div>
      </div>
    </div>}
  </div>;
}

/* ── SCREEN: MATCHS ──────────────────────────────────────── */
function ScreenMatchs({ matchs }) {
  const [tab,setTab] = useState("next");
  const upcoming = matchs.filter(m=>m.statut!=="termine");
  const done     = matchs.filter(m=>m.statut==="termine");
  const list     = tab==="next" ? upcoming : done;

  return <div style={{padding:16}}>
    <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:17,color:B.white,marginBottom:14}}>Calendrier</div>
    <div style={{display:"flex",gap:8,marginBottom:18}}>
      {[["next","À venir"],["done","Résultats"]].map(([id,l])=>(
        <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:"10px",borderRadius:10,border:`1.5px solid ${tab===id?B.day:B.nightB}`,background:tab===id?`${B.day}18`:B.nightLL,color:tab===id?B.day:B.muted,fontFamily:"inherit",fontWeight:700,fontSize:12,cursor:"pointer"}}>{l}</button>
      ))}
    </div>
    {list.length===0 && <div style={{textAlign:"center",padding:32,color:B.muted,fontSize:13}}>Aucun match à afficher</div>}
    {list.map(m=>{
      const isHome = m.home?.includes("Spacer");
      const score  = m.score_sets_home!==null ? `${m.score_sets_home}-${m.score_sets_away}` : null;
      const win    = score ? parseInt(score[0])>parseInt(score[2]) : null;
      return <div key={m.id} style={{background:B.nightLL,border:`1px solid ${win===false?`${B.red}30`:win?`${B.green}30`:B.nightB}`,borderRadius:14,marginBottom:12,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${B.nightB}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:10,color:B.muted}}>{new Date(m.date_match).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})} · {m.heure?.slice(0,5)}</div>
          <div style={{display:"flex",gap:5}}>
            {isHome&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:`${B.day}20`,color:B.day,fontWeight:700}}>DOMICILE</span>}
            {win===true&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:`${B.green}20`,color:B.green,fontWeight:700}}>VICTOIRE</span>}
            {win===false&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:20,background:`${B.red}20`,color:B.red,fontWeight:700}}>DÉFAITE</span>}
          </div>
        </div>
        <div style={{padding:"13px",display:"flex",alignItems:"center"}}>
          <div style={{flex:1,fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:11,textAlign:"center",color:B.white,lineHeight:1.3}}>{m.home}</div>
          <div style={{padding:"0 10px",fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:score?17:12,color:score?B.day:B.muted,minWidth:50,textAlign:"center"}}>{score||"VS"}</div>
          <div style={{flex:1,fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:11,textAlign:"center",color:B.white,lineHeight:1.3}}>{m.away}</div>
        </div>
        <div style={{padding:"0 14px 10px",fontSize:10,color:B.muted}}>📍 {m.venue}</div>
      </div>;
    })}
  </div>;
}

/* ── SCREEN: RÉCOMPENSES ─────────────────────────────────── */
function ScreenRecompenses({ abonne }) {
  const points = abonne?.points_total || 0;
  const palier = getPalier(points);
  const next   = getNextP(points);
  const pct    = next ? Math.round(((points-palier.min)/(next.min-palier.min))*100) : 100;
  const filleuls = abonne?.nb_filleuls || 0;
  const ambass = getAmbass(filleuls);
  const nextAmb= AMBASSADEUR.find(a=>a.min>filleuls);

  const BADGES = [
    {icon:"☄️",label:"1er match",     ok:true},
    {icon:"⭐",label:"Palier ÉTOILE", ok:points>=50},
    {icon:"🌌",label:"Constellation", ok:points>=150},
    {icon:"🚀",label:"1er filleul",   ok:filleuls>=1},
    {icon:"🥇",label:"Ambass. Or",    ok:filleuls>=5},
    {icon:"🍺",label:"Buvette ×5",    ok:false},
    {icon:"📸",label:"Photo tribune",  ok:false},
    {icon:"🎯",label:"Pronostic parfait",ok:false},
  ];

  return <div style={{padding:16}}>
    <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:17,color:B.white,marginBottom:14}}>Récompenses</div>

    <div style={{background:`radial-gradient(ellipse at 50% 0%,${palier.color}25 0%,${B.nightLL} 70%)`,border:`2px solid ${palier.color}40`,borderRadius:20,padding:"22px 18px",textAlign:"center",marginBottom:18}}>
      <div style={{fontSize:42,marginBottom:8}}>{palier.icon}</div>
      <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:18,color:palier.color,letterSpacing:2,marginBottom:4}}>{palier.name}</div>
      <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:44,color:B.day,lineHeight:1,marginBottom:6}}>{points}</div>
      <div style={{fontSize:11,color:B.muted,marginBottom:12}}>points · 1€ buvette/boutique = 1 point</div>
      {next&&<>
        <div style={{background:B.night,borderRadius:6,height:7,marginBottom:5}}>
          <div style={{width:`${pct}%`,height:7,borderRadius:6,background:`linear-gradient(90deg,${palier.color},${B.day})`,transition:"width .8s"}}/>
        </div>
        <div style={{fontSize:10,color:B.muted}}>{next.min-points} pts pour {next.icon} {next.name}</div>
      </>}
    </div>

    <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:9}}>Parcours</div>
    <div style={{display:"flex",background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:12,overflow:"hidden",marginBottom:18}}>
      {PALIERS.map((p,i)=>{
        const active=p.name===palier.name;
        return <div key={p.name} style={{flex:1,padding:"9px 4px",textAlign:"center",background:active?`${p.color}20`:"none",borderRight:i<PALIERS.length-1?`1px solid ${B.nightB}`:"none"}}>
          <div style={{fontSize:14,marginBottom:3}}>{p.icon}</div>
          <div style={{fontSize:8,fontWeight:700,color:active?p.color:B.muted,lineHeight:1.3}}>{p.name}</div>
          <div style={{fontSize:8,color:B.muted}}>{p.min}+</div>
        </div>;
      })}
    </div>

    <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:9}}>Ambassadeur</div>
    <div style={{background:`linear-gradient(135deg,${B.gold}12,${B.nightLL})`,border:`1px solid ${B.gold}40`,borderRadius:14,padding:14,marginBottom:18}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        {ambass
          ? <div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:20,background:`${ambass.color}20`,border:`1px solid ${ambass.color}40`}}>
              <span>{ambass.icon}</span><span style={{fontSize:11,fontWeight:800,color:ambass.color}}>{ambass.name}</span>
            </div>
          : <div style={{fontSize:12,color:B.muted}}>Pas encore ambassadeur</div>
        }
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:22,color:B.gold}}>{filleuls}</div>
          <div style={{fontSize:10,color:B.muted}}>filleul{filleuls>1?"s":""}</div>
        </div>
      </div>
      <div style={{display:"flex",gap:6}}>
        {AMBASSADEUR.map((a,i)=>{
          const active=filleuls>=a.min;
          return <div key={i} style={{flex:1,textAlign:"center",padding:"7px 4px",background:active?`${a.color}18`:B.nightB,border:`1px solid ${active?`${a.color}40`:B.nightB}`,borderRadius:9}}>
            <div style={{fontSize:14,filter:active?"none":"grayscale(1)"}}>{a.icon}</div>
            <div style={{fontSize:8,color:active?a.color:B.muted,fontWeight:700,marginTop:2,lineHeight:1.3}}>{a.name.replace("Ambassadeur ","")}</div>
            <div style={{fontSize:8,color:B.muted}}>{a.min}</div>
          </div>;
        })}
      </div>
      {nextAmb&&<div style={{fontSize:11,color:B.muted,marginTop:10,textAlign:"center"}}>{nextAmb.min-filleuls} filleul{nextAmb.min-filleuls>1?"s":""} de plus → {nextAmb.icon} {nextAmb.name}</div>}
    </div>

    <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:9}}>Badges</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
      {BADGES.map((b,i)=>(
        <div key={i} style={{background:B.nightLL,border:`1px solid ${b.ok?`${B.day}50`:B.nightB}`,borderRadius:12,padding:"13px 11px",textAlign:"center",opacity:b.ok?1:.4}}>
          <div style={{fontSize:24,marginBottom:6,filter:b.ok?"none":"grayscale(1)"}}>{b.icon}</div>
          <div style={{fontSize:11,fontWeight:700,color:B.white,marginBottom:3}}>{b.label}</div>
          {b.ok&&<div style={{fontSize:9,color:B.green}}>✓ Débloqué</div>}
        </div>
      ))}
    </div>
  </div>;
}

/* ── SCREEN: COMMUNAUTÉ ──────────────────────────────────── */
function ScreenCommunaute({ abonne, token }) {
  const [msgs,setMsgs]   = useState([]);
  const [match,setMatch] = useState(null);
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(true);
  const bottomRef = useRef(null);

  // Charger le match actif et les messages
  useEffect(()=>{
    async function load() {
      try {
        // Dernier match planifié
        const matchs = await api.get("/matchs", token, { statut:"eq.planifie", order:"date_match.asc", limit:1 });
        const m = matchs[0];
        if(!m) { setLoading(false); return; }
        setMatch(m);

        // Messages épinglés + messages communauté
        const [epingles, messages] = await Promise.all([
          api.get("/messages_epingles", token, { match_id:`eq.${m.id}`, actif:"eq.true", order:"ordre.asc" }),
          api.get("/messages_communaute", token, { match_id:`eq.${m.id}`, statut:"eq.publie", order:"created_at.asc", limit:50 }),
        ]);

        const pinned = (epingles||[]).map(e=>({...e, official:true, name:"OFFICIEL", av:"✦"}));
        setMsgs([...pinned, ...(messages||[]).map(m=>({...m, official:false}))]);
      } catch(e) {
        console.error(e);
      }
      setLoading(false);
    }
    load();
    const interval = setInterval(load, 15000); // Refresh toutes les 15s
    return ()=>clearInterval(interval);
  },[token]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  async function send() {
    if(!input.trim()||!match||!abonne) return;
    const content = input.slice(0,280);
    setInput("");
    try {
      await api.post("/messages_communaute", token, {
        match_id:  match.id,
        abonne_id: abonne.id,
        contenu:   content,
        statut:    "publie",
      });
      // Ajouter localement
      setMsgs(m=>[...m,{id:Date.now(),contenu:content,official:false,prenom:abonne.prenom,created_at:new Date().toISOString()}]);
    } catch(e) { console.error(e); }
  }

  if(loading) return <div style={{padding:16}}><Spinner/></div>;

  return <div style={{padding:16,display:"flex",flexDirection:"column",height:"calc(100vh - 130px)"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
      <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:17,color:B.white}}>Communauté</div>
      <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:`${B.green}18`,border:`1px solid ${B.green}40`,borderRadius:20}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:B.green}}/>
        <span style={{fontSize:10,color:B.green,fontWeight:700}}>En direct</span>
      </div>
    </div>

    {match && <div style={{background:B.nightLL,border:`1px solid ${B.day}30`,borderRadius:10,padding:"8px 12px",marginBottom:14}}>
      <div style={{fontSize:9,color:B.day,fontWeight:700,letterSpacing:1.5}}>💬 FIL · {match.home?.toUpperCase()} VS {match.away?.toUpperCase()}</div>
      <div style={{fontSize:9,color:B.muted,marginTop:2}}>280 car. max · Modéré · Ferme J+7</div>
    </div>}

    {!match && <div style={{padding:24,textAlign:"center",color:B.muted,fontSize:13}}>
      Aucun fil actif pour le moment — le fil ouvre J−3 avant chaque match.
    </div>}

    <div style={{flex:1,overflowY:"auto",paddingRight:4}}>
      {msgs.map((m,i)=>(
        <div key={m.id||i} style={{marginBottom:12,display:"flex",gap:9,alignItems:"flex-start"}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:m.official?`${B.day}30`:B.nightB,border:`1.5px solid ${m.official?B.day:B.nightB}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:m.official?13:11,fontWeight:700,color:m.official?B.day:B.muted,flexShrink:0}}>
            {m.official?"✦":(m.prenom||"?")[0]?.toUpperCase()}
          </div>
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
              <span style={{fontSize:11,fontWeight:700,color:m.official?B.day:B.white}}>{m.official?"OFFICIEL":m.prenom||"Abonné"}</span>
              {m.official&&<span style={{fontSize:9,padding:"1px 6px",background:`${B.day}20`,color:B.day,borderRadius:4,fontWeight:700}}>CLUB</span>}
              <span style={{fontSize:10,color:B.muted,marginLeft:"auto"}}>{m.created_at?new Date(m.created_at).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):""}</span>
            </div>
            <div style={{background:m.official?`${B.day}10`:B.nightLL,border:`1px solid ${m.official?`${B.day}30`:B.nightB}`,borderRadius:"0 10px 10px 10px",padding:"9px 12px",fontSize:13,color:B.white,lineHeight:1.6}}>
              {m.contenu||m.content||m.txt}
            </div>
          </div>
        </div>
      ))}
      <div ref={bottomRef}/>
    </div>

    {match && <div style={{display:"flex",gap:8,paddingTop:10,borderTop:`1px solid ${B.nightB}`}}>
      <input value={input} onChange={e=>setInput(e.target.value.slice(0,280))} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
        placeholder="Ton message… (280 car. max)"
        style={{flex:1,padding:"11px 14px",background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:12,color:B.white,fontFamily:"inherit",fontSize:13,outline:"none"}}/>
      <button onClick={send} disabled={!input.trim()}
        style={{padding:"11px 16px",background:input.trim()?B.day:B.nightB,border:"none",borderRadius:12,color:B.night,fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,cursor:input.trim()?"pointer":"not-allowed",transition:"all .2s"}}>✦</button>
    </div>}
    {input&&<div style={{fontSize:9,color:input.length>250?B.red:B.muted,textAlign:"right",marginTop:4}}>{input.length}/280</div>}
  </div>;
}

/* ── SCREEN: PROFIL ──────────────────────────────────────── */
function ScreenProfil({ abonne, token, rgpd, setRgpd, onLogout }) {
  const [showExport,setShowExport] = useState(false);
  const ambass = getAmbass(abonne?.nb_filleuls||0);

  async function saveRgpd(newRgpd) {
    setRgpd(newRgpd);
    try {
      await api.patch(`/abonnes?id=eq.${abonne.id}`, token, {
        rgpd_analytics: newRgpd.analytics,
        rgpd_marketing: newRgpd.marketing,
      });
    } catch(e) { console.error(e); }
  }

  return <div style={{padding:16}}>
    <div style={{background:`linear-gradient(135deg,${B.day}18,${B.nightLL})`,border:`1px solid ${B.day}40`,borderRadius:18,padding:"18px",marginBottom:18,display:"flex",alignItems:"center",gap:14}}>
      <div style={{width:52,height:52,borderRadius:"50%",background:`linear-gradient(135deg,${B.day},#5B9BD5)`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:20,color:B.night,flexShrink:0}}>
        {abonne?.prenom?.[0]?.toUpperCase()}
      </div>
      <div>
        <div style={{fontWeight:800,fontSize:17,color:B.white}}>{abonne?.prenom} {abonne?.nom}</div>
        <div style={{fontSize:11,color:B.day,fontWeight:700,marginTop:2}}>{abonne?.formule} · {abonne?.saison}</div>
        {ambass&&<div style={{fontSize:11,color:B.gold,marginTop:2}}>{ambass.icon} {ambass.name}</div>}
      </div>
    </div>

    {/* Code parrainage */}
    <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>🚀 Mon code de parrainage</div>
    <div style={{background:`linear-gradient(135deg,${B.gold}12,${B.nightLL})`,border:`1px solid ${B.gold}40`,borderRadius:14,padding:14,marginBottom:18}}>
      <div style={{fontSize:11,color:B.muted,marginBottom:7}}>Gagne 20 pts par ami qui vient au match</div>
      <div style={{background:B.night,borderRadius:9,padding:"10px 12px",textAlign:"center",marginBottom:10}}>
        <span style={{fontFamily:"monospace",fontSize:16,color:B.gold,fontWeight:700,letterSpacing:2}}>{abonne?.code_parrainage||"—"}</span>
      </div>
      <div style={{display:"flex",gap:7}}>
        {[["💬","WhatsApp"],["📸","Insta"],["📧","Email"],["🔗","Lien"]].map(([ic,l])=>(
          <button key={l} style={{flex:1,padding:"7px 4px",background:B.nightB,border:`1px solid ${B.nightB}`,borderRadius:8,color:B.muted,fontFamily:"inherit",fontSize:10,cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:14}}>{ic}</div><div style={{fontSize:9}}>{l}</div>
          </button>
        ))}
      </div>
    </div>

    {/* RGPD */}
    <div style={{fontSize:9,color:B.muted,fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>🔒 Mes consentements RGPD</div>
    <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:14,overflow:"hidden",marginBottom:14}}>
      {[{key:"essential",label:"Fonctionnement de l'app",locked:true},{key:"analytics",label:"Amélioration de l'app"},{key:"marketing",label:"Offres et actualités"}].map((item,i,arr)=>(
        <div key={item.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:i<arr.length-1?`1px solid ${B.nightB}`:"none"}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:B.white}}>{item.label}</div>
            {item.locked&&<div style={{fontSize:10,color:B.muted}}>Obligatoire</div>}
          </div>
          <div onClick={()=>!item.locked&&saveRgpd({...rgpd,[item.key]:!rgpd?.[item.key]})}
            style={{width:46,height:26,borderRadius:13,background:(rgpd?.[item.key]||item.locked)?B.green:B.nightB,cursor:item.locked?"default":"pointer",position:"relative",transition:"background .25s",flexShrink:0}}>
            <div style={{position:"absolute",top:3,left:(rgpd?.[item.key]||item.locked)?22:3,width:20,height:20,borderRadius:"50%",background:B.white,transition:"left .25s"}}/>
          </div>
        </div>
      ))}
    </div>

    <div style={{background:B.nightLL,border:`1px solid ${B.nightB}`,borderRadius:14,overflow:"hidden",marginBottom:18}}>
      {[
        {icon:"📥",label:"Exporter mes données (Art. 20)",action:()=>setShowExport(true)},
        {icon:"✉️",label:"Contacter le DPO",action:()=>{}},
        {icon:"🗑️",label:"Supprimer mon compte",action:()=>{},danger:true},
      ].map((it,i,arr)=>(
        <button key={i} onClick={it.action} style={{width:"100%",padding:"13px 14px",background:"none",border:"none",borderBottom:i<arr.length-1?`1px solid ${B.nightB}`:"none",color:it.danger?B.red:B.white,fontFamily:"inherit",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
          <span style={{fontSize:15}}>{it.icon}</span>{it.label}
        </button>
      ))}
    </div>

    <button onClick={onLogout} style={{width:"100%",padding:"12px",background:"none",border:`1px solid ${B.nightB}`,borderRadius:12,color:B.muted,fontFamily:"inherit",fontSize:12,fontWeight:700,cursor:"pointer",marginBottom:24}}>
      Se déconnecter
    </button>

    {showExport&&<div style={{position:"fixed",inset:0,background:"#000000d0",zIndex:999,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:B.nightL,borderRadius:"20px 20px 0 0",padding:"24px 18px 44px",width:"100%",border:`1px solid ${B.nightB}`}}>
        <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:14,color:B.white,marginBottom:14}}>📥 Export RGPD · Art. 20</div>
        <pre style={{background:B.night,borderRadius:10,padding:12,fontSize:10,color:B.muted,overflowX:"auto",marginBottom:16,lineHeight:1.7}}>
{JSON.stringify({sujet:`${abonne?.prenom} ${abonne?.nom}`,email:abonne?.email,club:"Spacer's Toulouse Volley",saison:abonne?.saison,export:new Date().toISOString(),consentements:rgpd,dpo:"rgpd@spacerstoulouse.fr"},null,2)}
        </pre>
        <button onClick={()=>setShowExport(false)} style={{width:"100%",padding:"12px",background:B.day,border:"none",borderRadius:12,color:B.night,fontFamily:"Orbitron,sans-serif",fontSize:12,fontWeight:700,cursor:"pointer"}}>Fermer</button>
      </div>
    </div>}
  </div>;
}

/* ── BOTTOM NAV ──────────────────────────────────────────── */
function Nav({ tab, setTab }) {
  return <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:`${B.nightL}f2`,borderTop:`1px solid ${B.nightB}`,display:"flex",padding:"8px 0 22px",zIndex:50,backdropFilter:"blur(12px)"}}>
    {[{id:"home",i:"🏠",l:"Accueil"},{id:"matchs",i:"📅",l:"Matchs"},{id:"billet",i:"🎟️",l:"Billet"},{id:"rewards",i:"⭐",l:"Points"},{id:"community",i:"💬",l:"Communauté"}].map(t=>(
      <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"4px 0"}}>
        <span style={{fontSize:20,filter:tab===t.id?"none":"grayscale(.9)",opacity:tab===t.id?1:.4,transition:"all .2s"}}>{t.i}</span>
        <span style={{fontSize:9,fontWeight:700,color:tab===t.id?B.day:B.muted,letterSpacing:.3,transition:"color .2s"}}>{t.l}</span>
        {tab===t.id&&<div style={{width:4,height:4,borderRadius:"50%",background:B.day}}/>}
      </button>
    ))}
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   APP ROOT
══════════════════════════════════════════════════════════════ */
export default function App() {
  const [session,setSession] = useState(null);
  const [abonne,setAbonne]   = useState(null);
  const [matchs,setMatchs]   = useState([]);
  const [loading,setLoading] = useState(true);
  const [tab,setTab]         = useState("home");
  const [rgpd,setRgpd]       = useState({essential:true,analytics:false,marketing:false});
  const [showRgpd,setShowRgpd] = useState(false);
  const [toast,setToast]     = useState(null);

  const showToast = (msg,type="info") => { setToast({msg,type}); };

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@400;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:Inter,'Segoe UI',sans-serif}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${B.day};border-radius:2px}
    button,input{font-family:inherit}
    @keyframes spin{to{transform:rotate(360deg)}}
    ${Array.from({length:4},(_,i)=>`@keyframes tw${i}{0%,100%{opacity:.2}50%{opacity:.7}}`).join("")}
  `;

  // Charger la session au démarrage
  useEffect(()=>{
    async function init() {
      const sess = await api.getSession();
      if(sess) {
        setSession(sess);
        await loadUserData(sess);
      }
      setLoading(false);
    }
    init();
  },[]);

  async function loadUserData(sess) {
    try {
      const token = sess.access_token;
      const userId = sess.user?.id;

      const [abonnes, matchsData] = await Promise.all([
        api.get("/abonnes", token, { user_id:`eq.${userId}`, limit:1 }),
        api.get("/matchs",  token, { order:"date_match.asc", limit:10 }),
      ]);

      const ab = abonnes?.[0];
      if(ab) {
        setAbonne(ab);
        setRgpd({ essential:true, analytics:ab.rgpd_analytics, marketing:ab.rgpd_marketing });
        if(!ab.rgpd_analytics && !ab.rgpd_marketing) setShowRgpd(true);
      }
      setMatchs(matchsData||[]);
    } catch(e) {
      console.error("Erreur chargement données:", e);
      showToast("Erreur de chargement des données","error");
    }
  }

  function handleLogin(sess) {
    setSession(sess);
    setLoading(true);
    loadUserData(sess).then(()=>setLoading(false));
  }

  function handleLogout() {
    localStorage.removeItem("sb_session");
    setSession(null);
    setAbonne(null);
    setTab("home");
  }

  if(loading) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:B.night,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <style>{CSS}</style>
      <Stars/>
      <SpacersLogo height={40}/>
      <Spinner/>
    </div>
  );

  if(!session) return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:B.night,color:B.white}}>
      <style>{CSS}</style>
      <LoginScreen onLogin={handleLogin}/>
    </div>
  );

  const token = session.access_token;

  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:B.night,color:B.white,position:"relative"}}>
      <style>{CSS}</style>
      <Stars/>

      {/* Top bar */}
      <div style={{position:"sticky",top:0,zIndex:40,background:`${B.night}f0`,borderBottom:`1px solid ${B.nightB}`,padding:"10px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(12px)"}}>
        <SpacersLogo height={26}/>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:13,color:B.day}}>
            {abonne?.points_total||0} pts
          </div>
          <button onClick={()=>setTab("profil")} style={{width:28,height:28,borderRadius:"50%",background:`linear-gradient(135deg,${B.day},#5B9BD5)`,border:"none",color:B.night,fontFamily:"Orbitron,sans-serif",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            {abonne?.prenom?.[0]?.toUpperCase()||"?"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{paddingBottom:90,overflowY:"auto",minHeight:"calc(100vh - 48px)",position:"relative",zIndex:1}}>
        {tab==="home"      && <ScreenAccueil abonne={abonne} matchs={matchs}/>}
        {tab==="matchs"    && <ScreenMatchs matchs={matchs}/>}
        {tab==="billet"    && <ScreenBillet abonne={abonne} matchs={matchs}/>}
        {tab==="rewards"   && <ScreenRecompenses abonne={abonne}/>}
        {tab==="community" && <ScreenCommunaute abonne={abonne} token={token}/>}
        {tab==="profil"    && <ScreenProfil abonne={abonne} token={token} rgpd={rgpd} setRgpd={setRgpd} onLogout={handleLogout}/>}
      </div>

      <Nav tab={tab} setTab={setTab}/>
      {showRgpd && <RgpdSheet onAccept={c=>{setRgpd(c);setShowRgpd(false);}}/>}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </div>
  );
}