import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api";
const LOW = 5;
const inr = (n) => "₹" + Number(n).toLocaleString("en-IN");
const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Avatar({ name }) {
  const h = hue(name);
  return (
    <span className="avatar" style={{ background: `hsl(${h} 55% 90%)`, color: `hsl(${h} 55% 28%)` }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function Stock({ qty }) {
  const low = qty < LOW;
  return (
    <div className="stock">
      <div className="track"><i className={low ? "low" : ""} style={{ width: `${Math.min(100, (qty / 20) * 100)}%` }} /></div>
      <span className={low ? "txt low" : "txt"}>{qty} in stock{low ? " · low" : ""}</span>
    </div>
  );
}

function ProductForm({ initial, onSave, onClose, nextId }) {
  const editing = !!initial;
  const [f, setF] = useState(initial ?? { id: nextId, name: "", price: "", quantity: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const msg = await onSave({ id: Number(f.id), name: f.name.trim(), price: Number(f.price), quantity: parseInt(f.quantity, 10) });
    if (msg) { setErr(msg); setBusy(false); }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={editing ? "Edit product" : "Add product"}>
        <h2>{editing ? "Edit product" : "Add product"}</h2>
        <label>Product ID<input type="number" min="1" required value={f.id} onChange={set("id")} disabled={editing} /></label>
        <label>Name<input required autoFocus value={f.name} onChange={set("name")} /></label>
        <div className="two">
          <label>Price (₹)<input type="number" min="0" step="0.01" required value={f.price} onChange={set("price")} /></label>
          <label>Quantity<input type="number" min="0" step="1" required value={f.quantity} onChange={set("quantity")} /></label>
        </div>
        {err && <p className="formerr">{err}. If you are adding, check that the ID is not already used.</p>}
        <div className="foot">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save product"}</button>
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("id");
  const [onlyLow, setOnlyLow] = useState(false);
  const [view, setView] = useState("grid");
  const [form, setForm] = useState(null);
  const [toast, setToast] = useState("");

  const load = async () => {
    try { setItems(await api.list()); setStatus("ok"); } catch { setStatus("error"); }
  };
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    const sorters = {
      id: (a, b) => a.id - b.id,
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => b.price - a.price,
      quantity: (a, b) => a.quantity - b.quantity,
    };
    return items
      .filter((p) => (!s || p.name.toLowerCase().includes(s) || String(p.id) === s) && (!onlyLow || p.quantity < LOW))
      .sort(sorters[sort]);
  }, [items, q, sort, onlyLow]);

  const value = items.reduce((s, p) => s + p.price * p.quantity, 0);
  const lowCount = items.filter((p) => p.quantity < LOW).length;
  const nextId = Math.max(0, ...items.map((p) => p.id)) + 1;

  async function save(p) {
    try {
      if (form.product) await api.update(p.id, p); else await api.create(p);
      setToast(form.product ? "Product updated" : "Product added");
      setForm(null);
      load();
    } catch (e) { return e.message; }
  }

  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api.remove(p.id); setToast("Product deleted"); load(); }
    catch (e) { setToast("Could not delete: " + e.message); }
  }

  const Actions = ({ p }) => (
    <div className="acts">
      <button className="btn ghost sm" onClick={() => setForm({ product: p })}>Edit</button>
      <button className="btn ghost sm del" onClick={() => remove(p)}>Delete</button>
    </div>
  );

  return (
    <main>
      <header>
        <div>
          <h1>Stockroom</h1>
          <p>Products, prices and stock levels in one place.</p>
        </div>
        <button className="btn" onClick={() => setForm({ product: null })}>Add product</button>
      </header>

      <section className="stats">
        <div className="stat"><span>Products</span><b>{items.length}</b></div>
        <div className="stat"><span>Inventory value</span><b>{inr(value)}</b></div>
        <button className={"stat low" + (onlyLow ? " on" : "")} onClick={() => setOnlyLow(!onlyLow)} aria-pressed={onlyLow}>
          <span>Low stock · {onlyLow ? "showing only" : "click to filter"}</span><b>{lowCount}</b>
        </button>
      </section>

      <div className="toolbar">
        <input type="search" placeholder="Search by name or ID" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products">
          <option value="id">Sort: ID</option>
          <option value="name">Sort: Name</option>
          <option value="price">Sort: Price, high to low</option>
          <option value="quantity">Sort: Stock, low to high</option>
        </select>
        <div className="seg" role="group" aria-label="Layout">
          <button className={view === "grid" ? "on" : ""} onClick={() => setView("grid")}>Cards</button>
          <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Table</button>
        </div>
      </div>

      {status === "loading" && <div className="grid">{[1, 2, 3].map((i) => <div key={i} className="card skel" />)}</div>}
      {status === "error" && (
        <div className="note err">
          Could not reach the API. Start the backend with <code>uvicorn main:app --reload</code> and refresh.
          <button className="btn sm" onClick={load}>Try again</button>
        </div>
      )}
      {status === "ok" && shown.length === 0 && (
        <div className="note">{items.length ? "No products match your filters." : "No products yet. Add your first one."}</div>
      )}

      {status === "ok" && shown.length > 0 && view === "grid" && (
        <div className="grid">
          {shown.map((p) => (
            <article className="card" key={p.id}>
              <div className="top">
                <Avatar name={p.name} />
                <div><h3>{p.name}</h3><small>ID {p.id}</small></div>
                <strong className="price">{inr(p.price)}</strong>
              </div>
              <Stock qty={p.quantity} />
              <Actions p={p} />
            </article>
          ))}
        </div>
      )}

      {status === "ok" && shown.length > 0 && view === "table" && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th className="r">Price</th><th>Stock</th><th /></tr></thead>
            <tbody>
              {shown.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td><span className="nm"><Avatar name={p.name} />{p.name}</span></td>
                  <td className="r">{inr(p.price)}</td>
                  <td><Stock qty={p.quantity} /></td>
                  <td><Actions p={p} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <ProductForm initial={form.product} nextId={nextId} onSave={save} onClose={() => setForm(null)} />}
      <div className={"toast" + (toast ? " show" : "")} role="status">{toast}</div>
    </main>
  );
}
