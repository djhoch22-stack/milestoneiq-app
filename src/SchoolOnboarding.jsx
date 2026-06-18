// ── SchoolOnboarding ──────────────────────────────────────────────────────────
// Shown by AppWrapper to a logged-in user who has no school membership yet.
// Flow: (1) find your school by state → (2) join it, OR create a new one + name
// your AD (who gets invited as admin) → (3) create your own program.
import { useState } from 'react';
import raftersLogo from '../raftersiq-logo.png';
import {
  searchSchools,
  createSchoolWithMembership,
  joinSchoolAsCoach,
  inviteMember,
  createProgram,
  redeemPromoCode,
  onboardNewSchool,
  applyReferral,
} from './supabase_client';

const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const SPORTS_AVAILABLE = [["football","🏈 Football"],["basketball_boys","🏀 Boys Basketball"],["basketball_girls","🏀 Girls Basketball"],["soccer","⚽ Boys Soccer"],["soccer_girls","⚽ Girls Soccer"]];

const s = {
  wrap: { minHeight:'100vh', background:'#f8f7f4', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Georgia, serif', padding:20 },
  card: { background:'#fff', borderRadius:16, padding:'36px 40px', width:'100%', maxWidth:540, boxShadow:'0 4px 24px rgba(0,0,0,0.08)', border:'1px solid #e8e4dd' },
  h1: { margin:'0 0 4px', fontSize:22, fontWeight:700, color:'#111' },
  sub: { margin:'0 0 22px', fontSize:14, color:'#6b7280' },
  label: { display:'block', fontSize:12, fontWeight:600, color:'#374151', marginBottom:4 },
  input: { width:'100%', border:'1px solid #d1d5db', borderRadius:9, padding:'10px 13px', fontSize:14, boxSizing:'border-box', outline:'none', fontFamily:'inherit', color:'#111' },
  btn: { background:'#1a3a6b', color:'#fff', border:'none', borderRadius:9, padding:'12px 0', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit', width:'100%', marginTop:6 },
  ghost: { background:'none', border:'1px solid #d1d5db', borderRadius:9, padding:'10px 14px', fontSize:13, cursor:'pointer', color:'#374151', fontFamily:'inherit' },
  field: { marginBottom:14 },
  err: { background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:8, padding:'9px 13px', fontSize:13, color:'#991b1b', marginBottom:14 },
  link: { color:'#1a3a6b', cursor:'pointer', textDecoration:'underline', fontSize:13 },
};

export default function SchoolOnboarding({ userId, fullName, onComplete, onSignOut }) {
  const [step, setStep] = useState(1);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const [selState, setSelState] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const [orgId, setOrgId] = useState(null);
  const [schoolName, setSchoolName] = useState('');

  const [form, setForm] = useState({ name:'', address:'', city:'', state:'', zip:'', level:'HS', adName:'', adEmail:'' });
  const [prog, setProg] = useState({ sport:'basketball_boys', mascot:'', color:'#1a3a6b' });
  const [promoCode, setPromoCode] = useState('');
  const [redeemed, setRedeemed] = useState(false);
  const [isCreator, setIsCreator] = useState(false); // true only on the new-school path (admin) — coaches joining can't redeem
  const [createdOrgId, setCreatedOrgId] = useState(null); // set once the atomic RPC creates the org (guards retries)

  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const runSearch = async () => {
    if (!selState) { setErr('Pick your state first.'); return; }
    setBusy(true); setErr('');
    const { data, error } = await searchSchools(selState, query.trim());
    setBusy(false); setSearched(true);
    if (error) { setErr(error.message); return; }
    setResults(data || []);
  };

  const joinExisting = async (school) => {
    setBusy(true); setErr('');
    const { error } = await joinSchoolAsCoach(school.id, userId);
    setBusy(false);
    if (error && !/duplicate|unique/i.test(error.message || '')) { setErr(error.message); return; }
    setOrgId(school.id); setSchoolName(school.name); setStep(3);
  };

  const startNewSchool = () => {
    setErr('');
    setForm(f => ({ ...f, name: query.trim(), state: selState }));
    setStep(2);
  };

  const createSchool = async () => {
    const required = [['name','School name'],['city','City'],['state','State'],['zip','ZIP'],['address','Street address'],['adName','AD name'],['adEmail','AD email']];
    const missing = required.filter(([k]) => !String(form[k] || '').trim()).map(([,label]) => label);
    if (missing.length) { setErr('Please complete all fields — missing: ' + missing.join(', ') + '.'); return; }
    // Defer all DB writes to the atomic RPC on Finish — no half-made orgs if they bail.
    setErr(''); setIsCreator(true); setSchoolName(form.name); setStep(3);
  };

  const createMyProgram = async () => {
    if (!prog.mascot) { setErr('Enter your team name / mascot.'); return; }
    setBusy(true); setErr('');
    let targetOrg = isCreator ? createdOrgId : orgId;
    if (isCreator) {
      // New school: org + admin membership + program in ONE atomic RPC as auth.uid().
      // Guarded by createdOrgId so a retry (e.g. after a bad promo code) doesn't duplicate it.
      if (!createdOrgId) {
        const { data, error } = await onboardNewSchool({
          name: form.name, city: form.city, state: form.state, address: form.address,
          zip: form.zip, level: form.level, adName: form.adName, adEmail: form.adEmail,
          sport: prog.sport, mascot: prog.mascot, color: prog.color,
        });
        if (error) { setBusy(false); setErr(error.message || String(error)); return; }
        targetOrg = data?.org_id || null;
        setCreatedOrgId(targetOrg);
      }
    } else {
      // Joining an existing school: just add the program to it.
      const { error } = await createProgram(orgId, {
        name: schoolName, mascot: prog.mascot, sport: prog.sport, primary_color: prog.color,
      });
      if (error) { setBusy(false); setErr(error.message); return; }
    }
    // Apply a beta/promo code if one was entered (the org now exists).
    if (promoCode.trim() && !redeemed && targetOrg) {
      const { error: rErr } = await redeemPromoCode(promoCode.trim(), targetOrg);
      if (rErr) { setBusy(false); setErr('Promo code: ' + (rErr.message || rErr)); return; }
      setRedeemed(true);
    }
    // Referral: if they arrived via a ?ref= link, credit the referrer + extend this NEW school's trial to 14 days.
    if (isCreator && targetOrg) {
      let _ref = null; try { _ref = localStorage.getItem('rq_ref'); } catch (e) {}
      if (_ref) { try { await applyReferral(targetOrg, _ref); localStorage.removeItem('rq_ref'); } catch (e) {} }
    }
    setBusy(false);
    onComplete();
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <img src={raftersLogo} alt="RaftersIQ" style={{ width:38, height:38, objectFit:'contain' }} />
            <span style={{ fontWeight:700, fontSize:18, color:'#111' }}>RaftersIQ</span>
          </div>
          <span style={s.link} onClick={onSignOut}>Sign out</span>
        </div>
        <div style={{ fontSize:12, color:'#9ca3af', marginBottom:18 }}>Step {step} of 3{fullName ? ` · Welcome, ${fullName}` : ''}</div>

        {err && <div style={s.err}>{err}</div>}

        {step === 1 && (
          <>
            <h1 style={s.h1}>Find your school</h1>
            <p style={s.sub}>Pick your state and search — if it's not listed yet, you can add it.</p>
            <div style={s.field}>
              <label style={s.label}>State</label>
              <select style={s.input} value={selState} onChange={e => { setSelState(e.target.value); setSearched(false); setResults([]); }}>
                <option value="">Select a state…</option>
                {STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div style={s.field}>
              <label style={s.label}>School name</label>
              <div style={{ display:'flex', gap:8 }}>
                <input style={s.input} value={query} placeholder="Start typing your school…"
                  onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} />
                <button style={{ ...s.ghost, whiteSpace:'nowrap' }} onClick={runSearch} disabled={busy}>{busy ? '…' : 'Search'}</button>
              </div>
            </div>

            {searched && (
              <div style={{ marginBottom:14 }}>
                {results.length === 0
                  ? <div style={{ fontSize:13, color:'#6b7280', padding:'8px 0' }}>No matching schools found.</div>
                  : results.map(r => (
                      <div key={r.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 12px', border:'1px solid #e5e7eb', borderRadius:8, marginBottom:6 }}>
                        <div>
                          <div style={{ fontSize:14, fontWeight:600, color:'#111' }}>{r.name}</div>
                          <div style={{ fontSize:12, color:'#9ca3af' }}>{[r.city, r.state].filter(Boolean).join(', ')}</div>
                        </div>
                        <button style={s.ghost} onClick={() => joinExisting(r)} disabled={busy}>This is mine</button>
                      </div>
                    ))
                }
                <div style={{ textAlign:'center', marginTop:10, fontSize:13, color:'#6b7280' }}>
                  Don't see it?{' '}
                  <span style={s.link} onClick={startNewSchool}>Add your school →</span>
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <h1 style={s.h1}>Add your school</h1>
            <p style={s.sub}>This creates your school's directory entry. All fields are required. Your AD will be invited as the school administrator.</p>
            <div style={s.field}><label style={s.label}>School name</label><input style={s.input} value={form.name} onChange={sf('name')} placeholder="Denver Christian High School" /></div>
            <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:10 }}>
              <div style={s.field}><label style={s.label}>City</label><input style={s.input} value={form.city} onChange={sf('city')} /></div>
              <div style={s.field}><label style={s.label}>State</label>
                <select style={s.input} value={form.state} onChange={sf('state')}>
                  <option value="">—</option>{STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div style={s.field}><label style={s.label}>ZIP</label><input style={s.input} value={form.zip} onChange={sf('zip')} /></div>
            </div>
            <div style={s.field}><label style={s.label}>Street address</label><input style={s.input} value={form.address} onChange={sf('address')} /></div>
            <div style={s.field}><label style={s.label}>Level</label>
              <select style={s.input} value={form.level} onChange={sf('level')}><option value="HS">High School</option><option value="MS">Middle School</option></select>
            </div>
            <div style={{ borderTop:'1px solid #f0eeea', margin:'8px 0 14px', paddingTop:14 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'#374151', marginBottom:8 }}>Athletic Director (school admin)</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={s.field}><label style={s.label}>AD name</label><input style={s.input} value={form.adName} onChange={sf('adName')} /></div>
                <div style={s.field}><label style={s.label}>AD email</label><input style={s.input} type="email" value={form.adEmail} onChange={sf('adEmail')} placeholder="ad@school.org" /></div>
              </div>
            </div>
            <button style={s.btn} onClick={createSchool} disabled={busy}>{busy ? 'Creating…' : 'Create school & continue →'}</button>
            <div style={{ textAlign:'center', marginTop:10 }}><span style={s.link} onClick={() => { setErr(''); setStep(1); }}>← Back to search</span></div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 style={s.h1}>Create your program</h1>
            <p style={s.sub}>You'll manage this program at <strong>{schoolName}</strong>. Only you (and your AD) can see it.</p>
            <div style={s.field}><label style={s.label}>Sport</label>
              <select style={s.input} value={prog.sport} onChange={e => setProg(p => ({ ...p, sport: e.target.value }))}>
                {SPORTS_AVAILABLE.map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
              </select>
            </div>
            <div style={s.field}><label style={s.label}>Team name / mascot</label><input style={s.input} value={prog.mascot} onChange={e => setProg(p => ({ ...p, mascot: e.target.value }))} /></div>
            <div style={s.field}><label style={s.label}>Team color</label><input type="color" value={prog.color} onChange={e => setProg(p => ({ ...p, color: e.target.value }))} style={{ width:60, height:38, border:'1px solid #d1d5db', borderRadius:8, cursor:'pointer', background:'#fff' }} /></div>
            {isCreator && <div style={s.field}><label style={s.label}>Beta / promo code <span style={{ color:'#9ca3af', fontWeight:400 }}>(optional)</span></label><input style={{ ...s.input, textTransform:'uppercase' }} value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} placeholder="e.g. BETA90" /></div>}
            <button style={s.btn} onClick={createMyProgram} disabled={busy}>{busy ? 'Setting up…' : 'Finish & open RaftersIQ →'}</button>
          </>
        )}
      </div>
    </div>
  );
}
