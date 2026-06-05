// ── Auth.jsx ──────────────────────────────────────────────────────────────────
import { useState } from 'react';
import raftersLogo from '../raftersiq-logo.png';
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

const PLANS = [
  {
    id: 'program',
    name: 'Program',
    monthlyPrice: 12,
    annualPrice: 99,
    monthlyId: 'price_1TdcrABzAEImpxa62G24Ul20',
    annualId: 'price_1TdczrBzAEImpxa6dKJ8R8gp',
    programs: 1,
    description: 'One sport program, full access',
    features: [
      '1 program',
      'Unlimited athletes',
      'Full all-time roster',
      'Hall of Fame tab',
      'Milestone alerts',
      'Season history',
      'Records tracking',
    ],
  },
  {
    id: 'school',
    name: 'School',
    monthlyPrice: 79,
    annualPrice: 699,
    monthlyId: 'price_1TdcrXBzAEImpxa6WMZtfSY0',
    annualId: 'price_1Tdd0bBzAEImpxa6voXKjkUm',
    programs: 8,
    description: 'Up to 8 programs for your school',
    features: [
      'Up to 8 programs',
      'Everything in Program',
      'Multi-coach access',
      'Cross-sport HOF ratings',
      'Email digest alerts',
    ],
    popular: true,
  },
  {
    id: 'school_plus',
    name: 'School Plus',
    monthlyPrice: 149,
    annualPrice: 1299,
    monthlyId: 'price_1Tdd1XBzAEImpxa6dlaquzPO',
    annualId: 'price_1Tdd1rBzAEImpxa6NjhJBxV6',
    programs: 999,
    description: 'Unlimited programs for large schools',
    features: [
      'Unlimited programs',
      'Everything in School',
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
          By signing up you agree to our Terms of Service and Privacy Policy.
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
                ['annual', 'Annual (save ~25%)'],
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
export function ChoosePlan({ onSelect, busy, ctaLabel = 'Subscribe →', initial }) {
  const [billing, setBilling] = useState('monthly');
  const [plan, setPlan] = useState(PLANS.some((p) => p.id === initial) ? initial : 'school');
  const go = () => {
    const p = PLANS.find((x) => x.id === plan);
    if (p) onSelect(p[billing === 'annual' ? 'annualId' : 'monthlyId'], p.id, billing);
  };
  return (
    <>
      <div style={{ display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 20, width: 'fit-content' }}>
        {[['monthly', 'Monthly'], ['annual', 'Annual (save ~25%)']].map(([val, label]) => (
          <button key={val} onClick={() => setBilling(val)} style={{ padding: '8px 20px', fontSize: 13, border: 'none', cursor: 'pointer', fontWeight: billing === val ? 700 : 400, background: billing === val ? '#1a3a6b' : '#fff', color: billing === val ? '#fff' : '#6b7280', fontFamily: 'inherit' }}>{label}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 20 }}>
        {PLANS.map((p) => (
          <div key={p.id} onClick={() => setPlan(p.id)} style={{ border: `2px solid ${plan === p.id ? '#1a3a6b' : p.popular ? '#93c5fd' : '#e5e7eb'}`, borderRadius: 12, padding: 20, cursor: 'pointer', position: 'relative', background: plan === p.id ? '#eff6ff' : '#fff' }}>
            {p.popular && <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: '#1a56db', color: '#fff', borderRadius: 10, padding: '2px 10px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
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
      <button style={s.btn} onClick={go} disabled={busy}>{busy ? 'Redirecting to checkout…' : ctaLabel}</button>
    </>
  );
}

export function LockedScreen({ role, status, onCheckout, onManageBilling }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
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
          </>
        )}
      </div>
    </div>
  );
}

export default function Auth({ onAuthenticated, seedSchools }) {
  const params = new URLSearchParams(window.location.search);
  const invitedEmail = params.get('invite') || '';
  const [screen, setScreen] = useState(invitedEmail ? 'signup' : 'login');
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
  return <LoginScreen onSwitch={setScreen} onSuccess={handleLoginSuccess} />;
}
