// ── Auth.jsx ──────────────────────────────────────────────────────────────────
import { useState } from 'react';
import raftersLogo from '../raftersiq-logo.png';
import useIsMobile from './useIsMobile';
import {
  signIn,
  signUp,
  supabase,
  createOrg,
  seedDCPrograms,
} from './supabase_client';

const STRIPE_KEY =
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
  'pk_test_51Tdck5BzAEImpxa646mEihqfdsTof7jBXRkClADOv3QKvXJZvjgonrdSbFxyCLdEyqhzddAMiL2k7IE4ZyAShrhM00F1IvcmHw';

// NOTE: monthlyId/annualId below are PLACEHOLDERS — replace with the real Stripe
// price_… ids (and mirror them in the stripe-webhook PRICE_TIER map) before launch.
const PLANS = [
  {
    id: 'program',
    name: 'Program',
    monthlyPrice: 15,
    annualPrice: 149,
    monthlyId: 'price_1Tg9sSJUmIvJqxFc2PyEknl9',
    annualId: 'price_1Tg9suJUmIvJqxFcHZiAPG7r',
    programs: 1,
    description: 'Solo coach, one program',
    features: [
      '1 program',
      '1 coach + AD',
      'Unlimited athletes & seasons',
      'Records & milestone alerts',
      'All-time roster',
      'CSV / PDF import',
    ],
  },
  {
    id: 'program_plus',
    name: 'Program+',
    monthlyPrice: 39,
    annualPrice: 389,
    monthlyId: 'price_1Tg9tFJUmIvJqxFcXfLmtinA',
    annualId: 'price_1Tg9teJUmIvJqxFc2r8oLsC6',
    programs: 1,
    description: 'One program, full staff',
    features: [
      'Everything in Program',
      'Up to 5 coaches + AD',
      'Email alert digests',
      'Shared staff editing',
      'Hall of Fame ratings',
      'Role-based access',
    ],
  },
  {
    id: 'school',
    name: 'School',
    monthlyPrice: 149,
    annualPrice: 1490,
    monthlyId: 'price_1Tg9uVJUmIvJqxFcE1yCbTGK',
    annualId: 'price_1Tg9uqJUmIvJqxFctvXyKW35',
    programs: 5,
    description: 'Multi-sport school',
    features: [
      'Everything in Program+',
      'Up to 5 programs',
      'Athletic Director dashboard',
      'School-wide alert digest',
      'Cross-program season history',
    ],
    popular: true,
  },
  {
    id: 'school_plus',
    name: 'School+',
    monthlyPrice: 299,
    annualPrice: 2990,
    monthlyId: 'price_1Tg9vDJUmIvJqxFcjWgwSRia',
    annualId: 'price_1Tg9veJUmIvJqxFcEcsDCaiX',
    programs: 999,
    description: 'Full school, unlimited',
    features: [
      'Everything in School',
      'Unlimited programs & coaches',
      'Full HOF + induction management',
      'Cross-sport profiles & ratings',
      'Priority support',
      'Early access to new features',
    ],
  },
];

const s = {
  wrap: {
    minHeight: '100vh',
    background: '#f8f7f4',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Georgia, serif',
    padding: 20,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 44px',
    width: '100%',
    maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    border: '1px solid #e8e4dd',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  logoBox: {
    width: 36,
    height: 36,
    background: '#1a3a6b',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
  },
  logoTxt: { fontWeight: 700, fontSize: 20, color: '#111' },
  h1: { margin: '0 0 6px', fontSize: 22, fontWeight: 700, color: '#111' },
  sub: { margin: '0 0 28px', fontSize: 14, color: '#6b7280' },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 4,
  },
  input: {
    width: '100%',
    border: '1px solid #d1d5db',
    borderRadius: 9,
    padding: '11px 14px',
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
    fontFamily: 'inherit',
  },
  btn: {
    width: '100%',
    background: '#1a3a6b',
    color: '#fff',
    border: 'none',
    borderRadius: 9,
    padding: '13px 0',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  },
  link: {
    color: '#1a3a6b',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: 13,
  },
  err: {
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#991b1b',
    marginBottom: 16,
  },
  ok: {
    background: '#f0fdf4',
    border: '1px solid #86efac',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13,
    color: '#166534',
    marginBottom: 16,
  },
  field: { marginBottom: 16 },
};

function Logo() {
  return (
    <div style={s.logo}>
      <img src={raftersLogo} alt="RaftersIQ" style={{ width: 40, height: 40, objectFit: 'contain' }} />
      <span style={s.logoTxt}>RaftersIQ</span>
    </div>
  );
}

function LoginScreen({ onSwitch, onSuccess }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pass) return setErr('Please fill in all fields');
    setLoading(true);
    setErr('');
    const { error } = await signIn(email, pass);
    setLoading(false);
    if (error) return setErr(error.message);
    onSuccess();
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <Logo />
        <h1 style={s.h1}>Welcome back</h1>
        <p style={s.sub}>Sign in to your account</p>
        {err && <div style={s.err}>{err}</div>}
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@school.edu"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="••••••••"
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <button style={s.btn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <div
          style={{
            textAlign: 'center',
            marginTop: 20,
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          Don't have an account?{' '}
          <span style={s.link} onClick={() => onSwitch('signup')}>
            Start free trial
          </span>
        </div>
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <span style={s.link} onClick={() => onSwitch('forgot')}>
            Forgot password?
          </span>
        </div>
      </div>
    </div>
  );
}

function SignupScreen({ onSwitch, onSuccess, initialEmail = '' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !pass) return setErr('Please fill in all fields');
    if (pass.length < 8)
      return setErr('Password must be at least 8 characters');
    setLoading(true);
    setErr('');
    const { error } = await signUp(email, pass, name);
    setLoading(false);
    if (error) return setErr(error.message);
    onSuccess();
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <Logo />
        <h1 style={s.h1}>{initialEmail ? 'Set up your account' : 'Start your free trial'}</h1>
        <p style={s.sub}>{initialEmail ? 'Create a password to finish joining your team on RaftersIQ.' : '7 days free — no charge until trial ends'}</p>
        {err && <div style={s.err}>{err}</div>}
        <div style={s.field}>
          <label style={s.label}>Full name</label>
          <input
            style={s.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Coach Dylan Hoch"
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Email</label>
          <input
            style={s.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="coach@school.edu"
          />
        </div>
        <div style={s.field}>
          <label style={s.label}>Password</label>
          <input
            style={s.input}
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            placeholder="Min. 8 characters"
          />
        </div>
        <button style={s.btn} onClick={handleSignup} disabled={loading}>
          {loading ? 'Creating account…' : 'Create account →'}
        </button>
        <p
          style={{
            fontSize: 11,
            color: '#9ca3af',
            textAlign: 'center',
            marginTop: 12,
          }}
        >
          By signing up you agree to our <a href="/terms" target="_blank" rel="noreferrer" style={{ color: '#1a56db' }}>Terms of Service</a> and <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: '#1a56db' }}>Privacy Policy</a>.
        </p>
        <div
          style={{
            textAlign: 'center',
            marginTop: 8,
            fontSize: 13,
            color: '#6b7280',
          }}
        >
          Already have an account?{' '}
          <span style={s.link} onClick={() => onSwitch('login')}>
            Sign in
          </span>
        </div>
      </div>
    </div>
  );
}

function ForgotScreen({ onSwitch }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) return setErr('Please enter your email');
    setLoading(true);
    setErr('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '?reset=true',
    });
    setLoading(false);
    if (error) return setErr(error.message);
    setSent(true);
  };

  return (
    <div style={s.wrap}>
      <div style={s.card}>
        <Logo />
        <h1 style={s.h1}>Reset password</h1>
        <p style={s.sub}>We'll send a reset link to your email</p>
        {sent ? (
          <div style={s.ok}>✓ Check your email for a reset link</div>
        ) : (
          <>
            {err && <div style={s.err}>{err}</div>}
            <div style={s.field}>
              <label style={s.label}>Email</label>
              <input
                style={s.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="coach@school.edu"
              />
            </div>
            <button style={s.btn} onClick={handleReset} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </>
        )}
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={s.link} onClick={() => onSwitch('login')}>
            ← Back to sign in
          </span>
        </div>
      </div>
    </div>
  );
}

function OnboardingScreen({ userId, onComplete, seedSchools }) {
  const [step, setStep] = useState(1);
  const [orgName, setOrgName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('CO');
  const [billing, setBilling] = useState('monthly');
  const [plan, setPlan] = useState('program');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState(null);
  const [seeding, setSeeding] = useState(false);

  const handleOrgSetup = async () => {
    if (!orgName) return setErr('Please enter your school name');
    setLoading(true);
    setErr('');
    const { data, error } = await createOrg(orgName, userId);
    setLoading(false);
    if (error) return setErr(error.message);
    await supabase
      .from('organizations')
      .update({ city, state })
      .eq('id', data.id);
    setOrgId(data.id);
    if (seedSchools?.length) {
      setSeeding(true);
      await seedDCPrograms(data.id, seedSchools);
      setSeeding(false);
    }
    setStep(2);
  };

  const handleCheckout = async () => {
    const selectedPlan = PLANS.find((p) => p.id === plan);
    const priceId =
      billing === 'annual' ? selectedPlan.annualId : selectedPlan.monthlyId;
    setLoading(true);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const res = await fetch(
      `https://odirpbptemubzysrvajh.supabase.co/functions/v1/create-checkout`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ priceId, orgId, billing }),
      }
    );
    const { url, error } = await res.json();
    setLoading(false);
    if (error) return setErr(error);
    window.location.href = url;
  };

  return (
    <div style={s.wrap}>
      <div style={{ ...s.card, maxWidth: step === 2 ? 820 : 440 }}>
        <Logo />
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['School info', 'Choose plan', 'Checkout'].map((label, i) => (
            <div
              key={label}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background:
                    step > i + 1
                      ? '#166534'
                      : step === i + 1
                      ? '#1a3a6b'
                      : '#f3f4f6',
                  color: step >= i + 1 ? '#fff' : '#9ca3af',
                }}
              >
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: step === i + 1 ? '#111' : '#9ca3af',
                  fontWeight: step === i + 1 ? 600 : 400,
                }}
              >
                {label}
              </span>
              {i < 2 && (
                <div style={{ width: 20, height: 1, background: '#e5e7eb' }} />
              )}
            </div>
          ))}
        </div>
        {err && <div style={s.err}>{err}</div>}
        {step === 1 && (
          <>
            <h1 style={s.h1}>Set up your school</h1>
            <p style={s.sub}>You can add more programs after setup</p>
            <div style={s.field}>
              <label style={s.label}>School name</label>
              <input
                style={s.input}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Denver Christian High School"
              />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px',
                gap: 10,
              }}
            >
              <div style={s.field}>
                <label style={s.label}>City</label>
                <input
                  style={s.input}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Denver"
                />
              </div>
              <div style={s.field}>
                <label style={s.label}>State</label>
                <input
                  style={s.input}
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="CO"
                  maxLength={2}
                />
              </div>
            </div>
            <button
              style={s.btn}
              onClick={handleOrgSetup}
              disabled={loading || seeding}
            >
              {seeding
                ? 'Setting up your programs…'
                : loading
                ? 'Saving…'
                : 'Continue →'}
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <h1 style={s.h1}>Choose your plan</h1>
            <p style={s.sub}>7-day free trial on all plans — cancel anytime</p>
            <div
              style={{
                display: 'flex',
                gap: 0,
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                overflow: 'hidden',
                marginBottom: 20,
                width: 'fit-content',
              }}
            >
              {[
                ['monthly', 'Monthly'],
                ['annual', 'Annual (save ~17%)'],
              ].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setBilling(val)}
                  style={{
                    padding: '8px 20px',
                    fontSize: 13,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: billing === val ? 700 : 400,
                    background: billing === val ? '#1a3a6b' : '#fff',
                    color: billing === val ? '#fff' : '#6b7280',
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: 12,
                marginBottom: 20,
              }}
            >
              {PLANS.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setPlan(p.id)}
                  style={{
                    border: `2px solid ${
                      plan === p.id
                        ? '#1a3a6b'
                        : p.popular
                        ? '#93c5fd'
                        : '#e5e7eb'
                    }`,
                    borderRadius: 12,
                    padding: 20,
                    cursor: 'pointer',
                    position: 'relative',
                    background: plan === p.id ? '#eff6ff' : '#fff',
                  }}
                >
                  {p.popular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1a56db',
                        color: '#fff',
                        borderRadius: 10,
                        padding: '2px 10px',
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MOST POPULAR
                    </div>
                  )}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: '#111',
                      marginBottom: 4,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}
                  >
                    {p.description}
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <span
                      style={{ fontSize: 26, fontWeight: 800, color: '#111' }}
                    >
                      $
                      {billing === 'annual'
                        ? Math.round(p.annualPrice / 12)
                        : p.monthlyPrice}
                    </span>
                    <span style={{ fontSize: 13, color: '#9ca3af' }}>/mo</span>
                    {billing === 'annual' && (
                      <div
                        style={{
                          fontSize: 11,
                          color: '#166534',
                          fontWeight: 600,
                        }}
                      >
                        ${p.annualPrice}/yr billed annually
                      </div>
                    )}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {p.features.map((f) => (
                      <li
                        key={f}
                        style={{
                          fontSize: 12,
                          color: '#374151',
                          padding: '3px 0',
                          display: 'flex',
                          gap: 6,
                        }}
                      >
                        <span style={{ color: '#166534' }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <button style={s.btn} onClick={handleCheckout} disabled={loading}>
              {loading
                ? 'Redirecting to checkout…'
                : 'Start 7-day free trial →'}
            </button>
            <p
              style={{
                fontSize: 11,
                color: '#9ca3af',
                textAlign: 'center',
                marginTop: 8,
              }}
            >
              No charge until your trial ends. Cancel anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Reusable plan picker (monthly/annual toggle + tier tiles). onSelect(priceId, tier, billing).
export function ChoosePlan({ onSelect, busy, ctaLabel = 'Subscribe →', initial, currentTier }) {
  const [billing, setBilling] = useState('monthly');
  const [plan, setPlan] = useState(PLANS.some((p) => p.id === initial) ? initial : 'school');
  const go = () => {
    const p = PLANS.find((x) => x.id === plan);
    if (p) onSelect(p[billing === 'annual' ? 'annualId' : 'monthlyId'], p.id, billing);
  };
  return (
    <>
      <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 20, width: 'fit-content' }}>
        {[['monthly', 'Monthly'], ['annual', 'Annual (save ~17%)']].map(([val, label]) => (
          <button key={val} onClick={() => setBilling(val)} style={{ padding: '8px 20px', fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: billing === val ? 700 : 400, background: billing === val ? '#1a3a6b' : '#fff', color: billing === val ? '#fff' : '#6b7280', fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, marginBottom: 20 }}>
        {PLANS.map((p) => (
          <div key={p.id} onClick={() => setPlan(p.id)} style={{ border: `2px solid ${plan === p.id ? '#1a3a6b' : p.popular ? '#93c5fd' : '#e5e7eb'}`, borderRadius: 12, padding: 20, cursor: 'pointer', position: 'relative', background: plan === p.id ? '#eff6ff' : '#fff' }}>
            {p.id === currentTier
              ? <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#166534', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>CURRENT PLAN</div>
              : p.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1a56db', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
            <div style={{ fontWeight: 700, fontSize: 16, color: '#111', marginBottom: 4 }}>{p.name}</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>{p.description}</div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: '#111' }}>${billing === 'annual' ? Math.round(p.annualPrice / 12) : p.monthlyPrice}</span>
              <span style={{ fontSize: 13, color: '#9ca3af' }}>/mo</span>
              {billing === 'annual' && <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>${p.annualPrice}/yr billed annually</div>}
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {p.features.map((f) => (
                <li key={f} style={{ fontSize: 12, color: '#374151', padding: '3px 0', display: 'flex', gap: 6 }}><span style={{ color: '#166534' }}>✓</span>{f}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <button style={{ ...s.btn, ...(plan === currentTier ? { background: '#9ca3af', cursor: 'default' } : {}) }} onClick={go} disabled={busy || plan === currentTier}>{plan === currentTier ? '✓ Your current plan' : (busy ? 'Redirecting to checkout…' : ctaLabel)}</button>
    </>
  );
}

export function LockedScreen({ role, status, onCheckout, onManageBilling, onRedeemCode }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');
  const isAdmin = role === 'admin';
  const pastDue = status === 'past_due';
  const showErr = (e) => setErr(typeof e === 'string' ? e : (e?.message || 'Something went wrong'));
  const handleSelect = async (priceId, tier, billing) => {
    setBusy(true); setErr('');
    const e = await onCheckout(priceId, tier, billing);
    setBusy(false);
    if (e) showErr(e);
  };
  const handlePortal = async () => {
    setErr('');
    const e = await onManageBilling();
    if (e) showErr(e);
  };
  const handleRedeem = async () => {
    if (!code.trim() || !onRedeemCode) return;
    setRedeeming(true); setErr(''); setRedeemMsg('');
    const { error, message } = await onRedeemCode(code.trim());
    setRedeeming(false);
    if (error) showErr(error); else setRedeemMsg(message || 'Applied!');
  };
  return (
    <div style={s.wrap}>
      <div style={{ ...s.card, maxWidth: isAdmin ? 820 : 440 }}>
        <Logo />
        <h1 style={s.h1}>{pastDue ? 'Payment needs attention' : "Your school's trial has ended"}</h1>
        {!isAdmin ? (
          <>
            <p style={s.sub}>RaftersIQ for your school is paused. Ask your athletic director to choose a plan to restore access.</p>
            <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 12 }}>Your data is safe — it'll be here the moment your AD subscribes.</p>
          </>
        ) : (
          <>
            <p style={s.sub}>{pastDue ? "We couldn't process your last payment. Pick a plan or update billing to continue." : "Choose a plan to keep your school's stats, records, and alerts going — your data is safe and waiting."}</p>
            {err && <div style={s.err}>{err}</div>}
            <ChoosePlan onSelect={handleSelect} busy={busy} ctaLabel="Subscribe & continue →" />
            {(status === 'canceled' || pastDue) && (
              <div style={{ textAlign: 'center', marginTop: 10 }}>
                <span style={s.link} onClick={handlePortal}>Or manage existing billing →</span>
              </div>
            )}
            <div style={{ borderTop: '1px solid #eef0f3', marginTop: 18, paddingTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Have a beta or promo code?</div>
              {redeemMsg ? (
                <div style={{ ...s.err, background: '#f0fdf4', color: '#166534', border: '1px solid #86efac' }}>{redeemMsg}</div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. BETA90"
                    style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 14, textTransform: 'uppercase' }} />
                  <button onClick={handleRedeem} disabled={redeeming || !code.trim()}
                    style={{ background: '#111827', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: redeeming || !code.trim() ? 'default' : 'pointer', opacity: redeeming || !code.trim() ? 0.6 : 1 }}>
                    {redeeming ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Public marketing landing page (raftersiq.com for logged-out visitors) ──────
function LandingPage({ onStartTrial, onSignIn }) {
  const isMobile = useIsMobile();
  const FEATURES = [
    { icon: "📊", title: "Career & season stats", desc: "Every athlete's career totals and season-by-season splits — with per-game averages and shooting % computed automatically." },
    { icon: "🏆", title: "Records & milestones", desc: "School records by stat and variant, plus custom milestone alerts that fire as athletes approach them." },
    { icon: "🏛️", title: "Hall of Fame engine", desc: "Auto-scored HOF candidacy for athletes and coaches — cross-sport, with all-league / all-state and Coach of the Year honors." },
    { icon: "📧", title: "Instant alerts", desc: "Email your coaches and AD the moment an athlete nears or breaks a record, or reaches a milestone." },
    { icon: "📥", title: "Effortless imports", desc: "Bring in stats from CSV, Excel, or any PDF — AI reads MaxPreps sheets and roster exports for you." },
    { icon: "🎓", title: "Whole-school ready", desc: "Athletic Director dashboard, role-based access, multi-program history, and cross-sport athlete profiles." },
  ];
  const wrapPad = isMobile ? "40px 18px" : "64px 24px";
  return (
    <div style={{ minHeight:"100vh", background:"#f8f7f4", fontFamily:"Georgia, serif", color:"#111" }}>
      {/* Nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding: isMobile ? "14px 18px" : "18px 32px", maxWidth:1120, margin:"0 auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src={raftersLogo} alt="RaftersIQ" style={{ width:36, height:36, objectFit:"contain" }} />
          <span style={{ fontWeight:700, fontSize:20, color:"#1a3a6b" }}>RaftersIQ</span>
        </div>
        <button onClick={onSignIn} style={{ background:"none", border:"1px solid #d1d5db", borderRadius:8, padding:"8px 18px", fontSize:14, fontWeight:600, cursor:"pointer", color:"#374151" }}>Sign in</button>
      </div>

      {/* Hero */}
      <div style={{ textAlign:"center", padding: isMobile ? "44px 20px 40px" : "76px 24px 60px", maxWidth:840, margin:"0 auto" }}>
        <div style={{ display:"inline-block", background:"#eff6ff", color:"#1e40af", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:600, marginBottom:20 }}>For high-school athletic programs</div>
        <h1 style={{ fontSize: isMobile ? 32 : 52, lineHeight:1.1, fontWeight:800, margin:"0 0 18px" }}>Every stat, record &amp; Hall of Famer — for your whole program.</h1>
        <p style={{ fontSize: isMobile ? 16 : 20, color:"#4b5563", lineHeight:1.5, margin:"0 0 28px" }}>RaftersIQ tracks careers, seasons, records, and milestones — and auto-builds your Hall of Fame for athletes and coaches across every sport.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={onStartTrial} style={{ background:"#1a56db", color:"#fff", border:"none", borderRadius:10, padding:"14px 28px", fontSize:16, fontWeight:700, cursor:"pointer" }}>Start your 7-day free trial →</button>
          <button onClick={onSignIn} style={{ background:"#fff", color:"#374151", border:"1px solid #d1d5db", borderRadius:10, padding:"14px 24px", fontSize:16, fontWeight:600, cursor:"pointer" }}>Sign in</button>
        </div>
        <div style={{ fontSize:13, color:"#9ca3af", marginTop:14 }}>No credit card required · Cancel anytime</div>
      </div>

      {/* Features */}
      <div style={{ background:"#fff", borderTop:"1px solid #e8e4dd", borderBottom:"1px solid #e8e4dd", padding: wrapPad }}>
        <div style={{ maxWidth:1120, margin:"0 auto" }}>
          <h2 style={{ textAlign:"center", fontSize: isMobile ? 26 : 34, fontWeight:800, margin:"0 0 8px" }}>Everything your program tracks, in one place</h2>
          <p style={{ textAlign:"center", fontSize:16, color:"#6b7280", margin:"0 0 36px" }}>Built for coaches and athletic directors — not spreadsheets.</p>
          <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap:16 }}>
            {FEATURES.map(f => (
              <div key={f.title} style={{ background:"#f9fafb", border:"1px solid #f0eeea", borderRadius:14, padding:"22px 20px" }}>
                <div style={{ fontSize:28, marginBottom:10 }}>{f.icon}</div>
                <div style={{ fontWeight:700, fontSize:17, marginBottom:6 }}>{f.title}</div>
                <div style={{ fontSize:14, color:"#6b7280", lineHeight:1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div style={{ padding: wrapPad, maxWidth:1120, margin:"0 auto" }}>
        <h2 style={{ textAlign:"center", fontSize: isMobile ? 26 : 34, fontWeight:800, margin:"0 0 8px" }}>Simple pricing for every size</h2>
        <p style={{ textAlign:"center", fontSize:16, color:"#6b7280", margin:"0 0 36px" }}>7-day free trial on every plan · save ~17% annually.</p>
        <div style={{ display:"grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)", gap:14 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ background:"#fff", border:`1px solid ${p.popular?"#1a56db":"#e8e4dd"}`, borderRadius:14, padding:"24px 18px 20px", position:"relative", boxShadow:p.popular?"0 6px 22px rgba(26,86,219,0.14)":"none" }}>
              {p.popular && <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:"#1a56db", color:"#fff", borderRadius:20, padding:"3px 14px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>MOST POPULAR</div>}
              <div style={{ fontWeight:700, fontSize:18 }}>{p.name}</div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:10 }}>{p.description}</div>
              <div style={{ fontSize:30, fontWeight:800 }}>${p.monthlyPrice}<span style={{ fontSize:14, color:"#9ca3af", fontWeight:400 }}>/mo</span></div>
              <div style={{ fontSize:12, color:"#166534", fontWeight:600, marginBottom:14 }}>${p.annualPrice}/yr billed annually</div>
              <button onClick={onStartTrial} style={{ width:"100%", background:p.popular?"#1a56db":"#eff6ff", color:p.popular?"#fff":"#1a56db", border:"none", borderRadius:8, padding:"10px", fontSize:14, fontWeight:700, cursor:"pointer", marginBottom:14 }}>Start free trial</button>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {p.features.map(ft => <div key={ft} style={{ fontSize:13, color:"#374151" }}>✓ {ft}</div>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Closing CTA */}
      <div style={{ background:"#1a3a6b", color:"#fff", padding: isMobile ? "44px 18px" : "60px 24px", textAlign:"center" }}>
        <h2 style={{ fontSize: isMobile ? 24 : 32, fontWeight:800, margin:"0 0 12px" }}>Give your program the record book it deserves.</h2>
        <p style={{ fontSize:16, color:"rgba(255,255,255,0.8)", margin:"0 0 24px" }}>Start preserving your program's history and milestones today.</p>
        <button onClick={onStartTrial} style={{ background:"#fff", color:"#1a3a6b", border:"none", borderRadius:10, padding:"14px 28px", fontSize:16, fontWeight:700, cursor:"pointer" }}>Start your free trial →</button>
      </div>

      <div style={{ padding:"24px", textAlign:"center", fontSize:13, color:"#9ca3af" }}>© {new Date().getFullYear()} RaftersIQ · raftersiq.com</div>
    </div>
  );
}

export default function Auth({ onAuthenticated, seedSchools }) {
  const params = new URLSearchParams(window.location.search);
  const invitedEmail = params.get('invite') || '';
  const hasRef = !!params.get('ref');   // a referral link is for a NEW school → open Create account directly
  const [screen, setScreen] = useState((invitedEmail || hasRef) ? 'signup' : 'landing');
  const [userId, setUserId] = useState(null);

  const handleLoginSuccess = () => window.location.reload();

  // Free trial, no card: after signup just reload — AppWrapper routes the new user
  // into SchoolOnboarding and their school's 7-day trial starts automatically.
  const handleSignupDone = () => window.location.reload();

  if (screen === 'signup')
    return <SignupScreen onSwitch={setScreen} onSuccess={handleSignupDone} initialEmail={invitedEmail} />;
  if (screen === 'forgot') return <ForgotScreen onSwitch={setScreen} />;
  if (screen === 'onboarding')
    return (
      <OnboardingScreen
        userId={userId}
        onComplete={handleLoginSuccess}
        seedSchools={seedSchools}
      />
    );
  if (screen === 'landing')
    return <LandingPage onStartTrial={() => setScreen('signup')} onSignIn={() => setScreen('login')} />;
  return <LoginScreen onSwitch={setScreen} onSuccess={handleLoginSuccess} />;
}
