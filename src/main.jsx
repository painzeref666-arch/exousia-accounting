import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  LayoutDashboard, ShoppingCart, Receipt, WalletCards, BarChart3,
  Settings, Search, Plus, RefreshCw, LogOut, Menu, TrendingUp,
  TrendingDown, Package, AlertTriangle, BookOpen, Scale
} from 'lucide-react';
import { supabase } from './lib/supabase';
import { getDashboardData, getSales, getExpenses, getAccounts, createExpense, getLedger, getTrialBalance, money, dateLabel } from './lib/accounting';
import './styles.css';

const nav = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['sales', 'Sales', ShoppingCart],
  ['expenses', 'Expenses', Receipt],
  ['accounts', 'Accounts', WalletCards],
  ['reports', 'Reports', BarChart3],
  ['ledger', 'General Ledger', BookOpen],
  ['trial', 'Trial Balance', Scale],
  ['settings', 'Settings', Settings]
];

function Card({ title, value, sub, icon: Icon, good }) {
  return <div className="card kpi"><div className="kpiTop"><span>{title}</span><i><Icon size={17} /></i></div><strong>{value}</strong><small className={good ? 'good' : ''}>{sub}</small></div>;
}

function Loading({ error, retry }) {
  return <div className="card loading">{error ? <><b>Could not load data</b><p>{error}</p><button className="secondary" onClick={retry}>Retry</button></> : <><RefreshCw className="spin" /><p>Loading…</p></>}</div>;
}

function Title({ title, sub, action }) {
  return <div className="title"><div><h1>{title}</h1><p>{sub}</p></div>{action}</div>;
}

function Mini({ rows, sale }) {
  return <div className="mini">{rows.map(r => <div key={r.id}><span><b>{sale ? (r.customer_name || r.customer?.name || 'Customer') : (r.description || r.memo || 'Expense')}</b><small>{dateLabel(r.created_at || r.expense_date)}</small></span><strong>{money(sale ? (r.total ?? r.subtotal ?? 0) : r.amount)}</strong></div>)}{!rows.length && <p className="empty">No records yet.</p>}</div>;
}

function Dashboard({ data, load, error }) {
  if (!data) return <Loading error={error} retry={load} />;
  return <>
    <Title title="Business overview" sub="Your Exousia & Co. financial snapshot" action={<button className="secondary" onClick={load}><RefreshCw size={16} />Refresh</button>} />
    <div className="grid four">
      <Card title="Sales" value={money(data.sales)} sub={`${data.orders} orders`} icon={TrendingUp} good />
      <Card title="Expenses" value={money(data.expenses)} sub="Recorded expenses" icon={TrendingDown} />
      <Card title="Net profit" value={money(data.sales - data.expenses)} sub="Sales less expenses" icon={WalletCards} good={data.sales >= data.expenses} />
      <Card title="Inventory units" value={data.stock.toLocaleString()} sub={`${data.lowStock} low-stock items`} icon={Package} />
    </div>
    <div className="grid two">
      <div className="card"><h3>Recent sales</h3><Mini rows={data.recentSales} sale /></div>
      <div className="card"><h3>Recent expenses</h3><Mini rows={data.recentExpenses} /></div>
    </div>
    {data.lowStock > 0 && <div className="notice"><AlertTriangle size={18} /><div><b>Inventory attention</b><p>{data.lowStock} product(s) are at or below 5 units.</p></div></div>}
  </>;
}

function Sales({ rows, load, error }) {
  const [q, setQ] = useState('');
  const list = Array.isArray(rows) ? rows : [];
  const filtered = list.filter(x => `${x.id} ${x.customer_name || ''} ${x.status || ''}`.toLowerCase().includes(q.toLowerCase()));
  return <>
    <Title title="Sales" sub="Live orders from the existing storefront" action={<button className="secondary" onClick={load}><RefreshCw size={16} />Refresh</button>} />
    <div className="search"><Search size={17} /><input placeholder="Search order, customer, status…" value={q} onChange={e => setQ(e.target.value)} /></div>
    {error ? <div className="error">{error}</div> : <Table headers={['Date', 'Order', 'Customer', 'Status', 'Payment', 'Total']} rows={filtered.map(x => [dateLabel(x.created_at), String(x.id).slice(0, 8) + '…', x.customer_name || x.customer?.name || x.customer?.email || 'Customer', x.order_status || x.status || 'pending', x.payment_status || 'Pending', money(x.total ?? x.subtotal ?? 0)])} />}
  </>;
}

function Expenses({ rows, load, error }) {
  const [show, setShow] = useState(false);
  const list = Array.isArray(rows) ? rows : [];
  return <>
    <Title title="Expenses" sub="Track operating costs and business spending" action={<button className="primary" onClick={() => setShow(true)}><Plus size={17} />Add expense</button>} />
    {error ? <div className="error">{error}</div> : <Table headers={['Date', 'Description', 'Category', 'Status', 'Amount']} rows={list.map(x => [dateLabel(x.expense_date || x.created_at), x.description || x.memo || '—', x.category || x.expense_category || 'General', x.status || 'posted', money(x.amount)])} />}
    {show && <Expense onClose={() => setShow(false)} onSaved={() => { setShow(false); load(); }} />}
  </>;
}

function Expense({ onClose, onSaved }) {
  const [form, setForm] = useState({ description: '', amount: '', category: 'General', expense_date: new Date().toISOString().slice(0, 10) });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true); setError('');
    try { await createExpense({ ...form, amount: Number(form.amount) }); onSaved(); }
    catch (e) { setError(e?.message || 'Could not save expense.'); }
    finally { setBusy(false); }
  }
  return <div className="back"><div className="modal"><div className="modalHead"><h3>New expense</h3><button onClick={onClose}>×</button></div>
    <label>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    <div className="grid two"><label>Amount (PHP)<input type="number" min="0" step=".01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label>Date<input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></label></div>
    <label>Category<select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>{['General','Supplies','Packaging','Shipping','Marketing','Utilities','Rent','Salaries','Equipment','Other'].map(x => <option key={x}>{x}</option>)}</select></label>
    {error && <div className="error">{error}</div>}
    <div className="actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!form.amount || busy} onClick={save}>{busy ? 'Saving…' : 'Save expense'}</button></div>
  </div></div>;
}

function Accounts({ rows, error }) {
  const list = Array.isArray(rows) ? rows : [];
  return <><Title title="Chart of accounts" sub="Accounts from the accounting schema" />{error ? <div className="error">{error}</div> : <Table headers={['Code', 'Account', 'Type', 'Normal balance', 'Status']} rows={list.map(x => [x.code, x.name, x.account_type || x.type, x.normal_balance || '—', x.active === false ? 'Inactive' : 'Active'])} />}</>;
}

function Reports({ data, error }) {
  return <><Title title="Reports" sub="Management-level accounting reports" />{error ? <div className="error">{error}</div> : <div className="grid three"><div className="card report"><BarChart3 /><b>Profit & Loss</b><small>Revenue less expenses</small><strong>{data ? money(data.sales - data.expenses) : '—'}</strong></div><div className="card report"><ShoppingCart /><b>Sales report</b><small>Store orders</small><strong>{data ? money(data.sales) : '—'}</strong></div><div className="card report"><Package /><b>Inventory</b><small>Current units</small><strong>{data ? data.stock.toLocaleString() : '—'} units</strong></div></div>}<div className="card"><h3>Architecture</h3><p className="muted">This accounting portal is a separate application. It reads the same Supabase project as the storefront, without changing storefront code.</p></div></>;
}


function Ledger({ rows, error }) {
  const entries = Array.isArray(rows) ? rows : [];
  return <><Title title="General Ledger" sub="Posted double-entry journal transactions" />{error ? <div className="error">{error}</div> : <div className="card table"><table><thead><tr><th>Date</th><th>Entry</th><th>Source</th><th>Description</th><th>Account</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{entries.flatMap(e => (e.journal_lines || []).map((l, i) => <tr key={`${e.id}-${l.id || i}`}><td>{dateLabel(e.entry_date)}</td><td>{e.entry_number}</td><td>{e.source_type}</td><td>{l.description || e.description}</td><td>{l.accounts?.code} — {l.accounts?.name}</td><td className="right">{money(l.debit)}</td><td className="right">{money(l.credit)}</td></tr>))}{!entries.length && <tr><td colSpan="7" className="empty">No journal entries yet.</td></tr>}</tbody></table></div>}</>;
}

function TrialBalance({ rows, error }) {
  const list = Array.isArray(rows) ? rows : [];
  const debit = list.reduce((a,x)=>a+Number(x.debit||0),0);
  const credit = list.reduce((a,x)=>a+Number(x.credit||0),0);
  return <><Title title="Trial Balance" sub="Account balances from posted journal lines" />{error ? <div className="error">{error}</div> : <div className="card table"><table><thead><tr><th>Code</th><th>Account</th><th>Type</th><th>Debit</th><th>Credit</th></tr></thead><tbody>{list.map(x=><tr key={x.code}><td>{x.code}</td><td>{x.name}</td><td>{x.type}</td><td className="right">{money(x.debit)}</td><td className="right">{money(x.credit)}</td></tr>)}<tr><th colSpan="3">Total</th><th className="right">{money(debit)}</th><th className="right">{money(credit)}</th></tr>{!list.length && <tr><td colSpan="5" className="empty">No posted journal lines yet.</td></tr>}</tbody></table></div>}</>;
}

function SettingsPage() {
  return <><Title title="Settings" sub="Accounting application settings" /><div className="card settings"><div><span>Supabase</span><b className="good">Connected</b></div><div><span>Application</span><b>Standalone Accounting</b></div><div><span>Storefront</span><b>Exousia & Co.</b></div><div><span>Currency</span><b>PHP (₱)</b></div></div></>;
}

function Table({ headers, rows }) {
  return <div className="card table"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td className={j === r.length - 1 ? 'right' : ''} key={j}>{v}</td>)}</tr>)}{!rows.length && <tr><td colSpan={headers.length} className="empty">No records found.</td></tr>}</tbody></table></div>;
}

function Shell({ session }) {
  const [page, setPage] = useState('dashboard');
  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [trial, setTrial] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadPage(target = page) {
    setLoading(true); setError('');
    try {
      if (target === 'dashboard' || target === 'reports') setData(await getDashboardData());
      if (target === 'sales') setSales(await getSales());
      if (target === 'expenses') setExpenses(await getExpenses());
      if (target === 'accounts') setAccounts(await getAccounts());
      if (target === 'ledger') setLedger(await getLedger());
      if (target === 'trial') setTrial(await getTrialBalance());
    } catch (e) { setError(e?.message || 'Could not load data'); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadPage(page); }, [page]);

  const title = nav.find(x => x[0] === page)?.[1] || 'Dashboard';
  const content = loading && !((page === 'dashboard' || page === 'reports') ? data : true)
    ? <Loading />
    : page === 'dashboard' ? <Dashboard data={data} load={() => loadPage('dashboard')} error={error} />
    : page === 'sales' ? <Sales rows={sales} load={() => loadPage('sales')} error={error} />
    : page === 'expenses' ? <Expenses rows={expenses} load={() => loadPage('expenses')} error={error} />
    : page === 'accounts' ? <Accounts rows={accounts} error={error} />
    : page === 'reports' ? <Reports data={data} error={error} />
    : page === 'ledger' ? <Ledger rows={ledger} error={error} />
    : page === 'trial' ? <TrialBalance rows={trial} error={error} />
    : <SettingsPage />;

  return <div className="app"><aside className={open ? 'open' : ''}><div className="brand"><div className="mark small">E<span>&</span>C</div><div><b>Exousia & Co.</b><small>ACCOUNTING</small></div></div><nav>{nav.map(([id, t, Icon]) => <button type="button" className={page === id ? 'active' : ''} onClick={() => { setPage(id); setOpen(false); }} key={id}><Icon size={18} />{t}</button>)}</nav><button type="button" className="signout" onClick={() => supabase.auth.signOut()}><LogOut size={17} />Sign out</button></aside><main><header><button type="button" className="hamb" onClick={() => setOpen(!open)}><Menu /></button><div><h2>{title}</h2><small>{session.user.email}</small></div><span className="connected">● Connected</span></header><section className="content">{content}</section></main></div>;
}

function Login() {
  const [email, setEmail] = useState(''), [password, setPassword] = useState(''), [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function go(e) { e.preventDefault(); setBusy(true); setMessage(''); try { const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) setMessage(error.message); } catch (err) { setMessage(err?.message || 'Sign in failed'); } finally { setBusy(false); } }
  return <div className="login"><form className="loginCard" onSubmit={go}><div className="mark">E<span>&</span>C</div><h1>Exousia & Co.</h1><p>Accounting Portal</p><label>Email<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{message && <div className="error">{message}</div>}<button type="submit" className="primary wide" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button></form></div>;
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('Accounting portal runtime error:', error); }
  render() { if (this.state.error) return <div className="loadingScreen"><div className="card" style={{ maxWidth: 720, margin: '24px' }}><b>Something went wrong</b><p>{this.state.error?.message || 'Unexpected application error.'}</p><button className="secondary" onClick={() => window.location.reload()}>Reload application</button></div></div>; return this.props.children; }
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data, error }) => { if (!alive) return; if (error) console.error('Auth initialization error:', error); setSession(data?.session || null); setLoading(false); }).catch(error => { console.error('Auth initialization error:', error); if (alive) { setSession(null); setLoading(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_, nextSession) => { if (alive) setSession(nextSession); });
    return () => { alive = false; listener?.subscription?.unsubscribe?.(); };
  }, []);
  if (loading) return <div className="loadingScreen">Loading Exousia & Co. Accounting…</div>;
  return session ? <Shell session={session} /> : <Login />;
}

createRoot(document.getElementById('root')).render(<ErrorBoundary><App /></ErrorBoundary>);
