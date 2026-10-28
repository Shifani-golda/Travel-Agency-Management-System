import { useEffect, useMemo, useState } from "react";
import { Plane, MapPin, CalendarDays, Users, Search, Plus, Pencil, Trash2, X, Ticket, LayoutDashboard, RefreshCw, CheckCircle2, AlertCircle, Compass } from "lucide-react";

const API = "http://localhost:5000/api";
const blankPackage = { packageId: "", destination: "", duration: "", price: "", availableSeats: "" };
const blankBooking = { customerName: "", email: "", phone: "", travelDate: "", travellers: "1" };
const money = (value) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));

function App() {
  const [packages, setPackages] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [query, setQuery] = useState({ destination: "", duration: "", minPrice: "", maxPrice: "" });
  const [tab, setTab] = useState("packages");
  const [packageModal, setPackageModal] = useState(null);
  const [bookingModal, setBookingModal] = useState(null);
  const [packageForm, setPackageForm] = useState(blankPackage);
  const [bookingForm, setBookingForm] = useState(blankBooking);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState({ type: "", text: "" });
  const [apiOnline, setApiOnline] = useState(false);

  const loadPackages = async (filters = query) => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => String(v).trim() !== ""));
      const response = await fetch(`${API}/packages?${params}`);
      if (!response.ok) throw new Error("Could not load packages.");
      setPackages(await response.json());
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setNotice({ type: "error", text: "Cannot reach the backend. Make sure the backend terminal says the server is running on port 5000." });
    }
  };
  const loadBookings = async () => {
    try {
      const response = await fetch(`${API}/bookings`);
      if (!response.ok) throw new Error("Could not load bookings.");
      setBookings(await response.json());
    } catch { /* status shown by package connection check */ }
  };
  useEffect(() => { loadPackages({ destination: "", duration: "", minPrice: "", maxPrice: "" }); loadBookings(); }, []);

  const showNotice = (type, text) => {
    setNotice({ type, text });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const activeBookings = useMemo(() => bookings.filter(b => b.status === "Confirmed").length, [bookings]);

  const savePackage = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const isEdit = packageModal.mode === "edit";
      const url = isEdit ? `${API}/packages/${packageModal.item._id}` : `${API}/packages`;
      const response = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...packageForm,
          duration: Number(packageForm.duration),
          price: Number(packageForm.price),
          availableSeats: Number(packageForm.availableSeats)
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save package.");
      setPackageModal(null);
      await loadPackages();
      showNotice("success", isEdit ? "Package updated successfully." : "Package added successfully.");
    } catch (error) { showNotice("error", error.message); }
    finally { setBusy(false); }
  };

  const deletePackage = async (item) => {
    if (!window.confirm(`Delete the package for ${item.destination}?`)) return;
    try {
      const response = await fetch(`${API}/packages/${item._id}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to delete package.");
      await loadPackages();
      showNotice("success", "Package deleted successfully.");
    } catch (error) { showNotice("error", error.message); }
  };

  const saveBooking = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...bookingForm, packageId: bookingModal._id, travellers: Number(bookingForm.travellers) })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create booking.");
      setBookingModal(null);
      setBookingForm(blankBooking);
      await loadPackages();
      await loadBookings();
      showNotice("success", `Booking confirmed. Booking ID: ${result.bookingId}`);
    } catch (error) { showNotice("error", error.message); }
    finally { setBusy(false); }
  };

  const cancelBooking = async (booking) => {
    if (!window.confirm(`Cancel booking ${booking.bookingId}? Seats will be returned to the package.`)) return;
    try {
      const response = await fetch(`${API}/bookings/${booking._id}/cancel`, { method: "PUT" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to cancel booking.");
      await loadBookings();
      await loadPackages();
      showNotice("success", "Booking cancelled and seats restored.");
    } catch (error) { showNotice("error", error.message); }
  };

  const openNewPackage = () => { setPackageForm(blankPackage); setPackageModal({ mode: "new" }); };
  const openEditPackage = (item) => {
    setPackageForm({ packageId: item.packageId, destination: item.destination, duration: String(item.duration), price: String(item.price), availableSeats: String(item.availableSeats) });
    setPackageModal({ mode: "edit", item });
  };
  const updateQuery = (key, value) => setQuery(old => ({ ...old, [key]: value }));
  const applySearch = (event) => { event.preventDefault(); loadPackages(query); };
  const clearSearch = () => {
    const empty = { destination: "", duration: "", minPrice: "", maxPrice: "" };
    setQuery(empty); loadPackages(empty);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setTab("packages"); }}>
          <span className="brand-mark"><Compass size={23} /></span>
          <span>roamly<span className="brand-dot">.</span><small>TRAVEL DESK</small></span>
        </a>
        <div className="side-label">WORKSPACE</div>
        <button className={`side-link ${tab === "packages" ? "active" : ""}`} onClick={() => setTab("packages")}><LayoutDashboard size={18} /> Tour packages</button>
        <button className={`side-link ${tab === "bookings" ? "active" : ""}`} onClick={() => { setTab("bookings"); loadBookings(); }}><Ticket size={18} /> Bookings <span className="side-count">{bookings.length}</span></button>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon"><Plane size={18} /></span><strong>Make room for wonder.</strong><p>Manage every journey from one simple desk.</p></div>
          <div className="connection"><span className={`status-dot ${apiOnline ? "online" : ""}`} />{apiOnline ? "System connected" : "Connecting to system"}</div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand"><Compass size={20} /> roamly<span>.</span></div>
          <div className="breadcrumb">Workspace <span>/</span> {tab === "packages" ? "Tour packages" : "Bookings"}</div>
          <div className="topbar-right"><span className="today-label">TRAVEL AGENCY MANAGEMENT</span><div className="avatar">TA</div></div>
        </header>

        <div className="page-content">
          {notice.text && <div className={`notice ${notice.type}`} role="status">{notice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}<span>{notice.text}</span><button aria-label="Dismiss" onClick={() => setNotice({ type: "", text: "" })}><X size={16} /></button></div>}

          {tab === "packages" ? <>
            <section className="welcome-row">
              <div><div className="eyebrow"><span /> YOUR JOURNEY STARTS HERE</div><h1>Tour packages</h1><p className="page-subtitle">Plan better trips. Keep every detail in one place.</p></div>
              <button className="primary-btn" onClick={openNewPackage}><Plus size={18} /> Add tour package</button>
            </section>
            <section className="stats-grid">
              <div className="stat-card"><div className="stat-top"><span>Total packages</span><span className="stat-icon green"><MapPin size={19} /></span></div><div className="stat-number">{packages.length}</div><div className="stat-caption">Available in your catalogue</div></div>
              <div className="stat-card"><div className="stat-top"><span>Available seats</span><span className="stat-icon sand"><Users size={19} /></span></div><div className="stat-number">{packages.reduce((sum, p) => sum + Number(p.availableSeats || 0), 0)}</div><div className="stat-caption">Across all listed packages</div></div>
              <div className="stat-card"><div className="stat-top"><span>Confirmed bookings</span><span className="stat-icon blue"><Ticket size={19} /></span></div><div className="stat-number">{activeBookings}</div><div className="stat-caption">Ready for the next adventure</div></div>
            </section>
            <section className="search-panel">
              <div className="section-heading"><div><h2>Find a package</h2><p>Filter by destination, duration or budget.</p></div><button className="text-btn" onClick={clearSearch}><RefreshCw size={14} /> Reset filters</button></div>
              <form onSubmit={applySearch} className="search-grid">
                <label className="field-label">Destination<input value={query.destination} onChange={e => updateQuery("destination", e.target.value)} placeholder="e.g. Ooty, Goa" /></label>
                <label className="field-label">Duration (days)<input type="number" min="1" value={query.duration} onChange={e => updateQuery("duration", e.target.value)} placeholder="Any duration" /></label>
                <label className="field-label">Min. price (₹)<input type="number" min="0" value={query.minPrice} onChange={e => updateQuery("minPrice", e.target.value)} placeholder="₹ 0" /></label>
                <label className="field-label">Max. price (₹)<input type="number" min="0" value={query.maxPrice} onChange={e => updateQuery("maxPrice", e.target.value)} placeholder="No limit" /></label>
                <button className="search-btn" type="submit"><Search size={17} /> Search</button>
              </form>
            </section>
            <section className="table-panel">
              <div className="section-heading table-heading"><div><h2>Package catalogue</h2><p>Manage destinations, prices and seat availability.</p></div><span className="result-count">{packages.length} {packages.length === 1 ? "package" : "packages"}</span></div>
              {packages.length === 0 ? <div className="empty-state"><div className="empty-icon"><Plane size={25} /></div><h3>No packages found yet</h3><p>Add your first tour package or adjust your search filters.</p><button className="primary-btn" onClick={openNewPackage}><Plus size={17} /> Add first package</button></div> :
                <div className="table-responsive"><table className="table package-table align-middle mb-0"><thead><tr><th>PACKAGE</th><th>DURATION</th><th>PRICE / PERSON</th><th>AVAILABLE SEATS</th><th className="text-end">ACTIONS</th></tr></thead><tbody>{packages.map(item => <tr key={item._id}><td><div className="destination-cell"><span className="destination-icon"><MapPin size={17} /></span><span><strong>{item.destination}</strong><small>{item.packageId}</small></span></div></td><td><span className="duration-pill"><CalendarDays size={14} /> {item.duration} days</span></td><td><strong className="price">{money(item.price)}</strong></td><td><span className={`seat-pill ${item.availableSeats === 0 ? "soldout" : ""}`}>{item.availableSeats} seats</span></td><td><div className="row-actions"><button title="Book this package" className="action-btn book-action" disabled={item.availableSeats === 0} onClick={() => { setBookingForm(blankBooking); setBookingModal(item); }}><Ticket size={15} /><span>Book</span></button><button title="Edit package" className="action-btn" onClick={() => openEditPackage(item)}><Pencil size={15} /></button><button title="Delete package" className="action-btn danger-action" onClick={() => deletePackage(item)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
            </section>
          </> : <>
            <section className="welcome-row"><div><div className="eyebrow"><span /> CUSTOMER TRAVEL RECORDS</div><h1>Bookings</h1><p className="page-subtitle">Review reservations and manage cancellations.</p></div><button className="secondary-btn" onClick={loadBookings}><RefreshCw size={16} /> Refresh</button></section>
            <section className="table-panel booking-panel"><div className="section-heading table-heading"><div><h2>All bookings</h2><p>Bookings are saved to MongoDB.</p></div><span className="result-count">{bookings.length} records</span></div>
            {bookings.length === 0 ? <div className="empty-state"><div className="empty-icon"><Ticket size={25} /></div><h3>No bookings yet</h3><p>Bookings created from the Tour packages page will appear here.</p><button className="secondary-btn" onClick={() => setTab("packages")}>View tour packages</button></div> :
              <div className="table-responsive"><table className="table package-table align-middle mb-0"><thead><tr><th>BOOKING</th><th>CUSTOMER</th><th>TRAVEL DATE</th><th>TRAVELLERS</th><th>TOTAL</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>{bookings.map(b => <tr key={b._id}><td><strong>{b.bookingId}</strong><small className="d-block muted">{b.destination}</small></td><td><strong>{b.customerName}</strong><small className="d-block muted">{b.email}</small></td><td>{new Date(b.travelDate).toLocaleDateString("en-IN")}</td><td>{b.travellers}</td><td><strong className="price">{money(b.totalPrice)}</strong></td><td><span className={`status-pill ${b.status === "Confirmed" ? "confirmed" : "cancelled"}`}>{b.status}</span></td><td>{b.status === "Confirmed" && <button className="action-btn danger-action" title="Cancel booking" onClick={() => cancelBooking(b)}><X size={15} /> Cancel</button>}</td></tr>)}</tbody></table></div>}
            </section>
          </>}
          <footer className="footer"><span>ROAMLY <span className="brand-dot">·</span> TRAVEL DESK</span><span>Travel management, made simpler.</span></footer>
        </div>
      </main>

      {packageModal && <div className="modal-backdrop-custom" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setPackageModal(null); }}><div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="package-modal-title"><div className="modal-header-custom"><div><span className="modal-kicker">PACKAGE DETAILS</span><h2 id="package-modal-title">{packageModal.mode === "edit" ? "Edit tour package" : "Add a tour package"}</h2><p>Enter the details shown in your package catalogue.</p></div><button className="close-btn" onClick={() => setPackageModal(null)}><X size={20} /></button></div><form onSubmit={savePackage}><div className="form-grid"><label className="field-label">Package ID<input required value={packageForm.packageId} onChange={e => setPackageForm({ ...packageForm, packageId: e.target.value })} placeholder="e.g. PKG001" /></label><label className="field-label">Destination<input required value={packageForm.destination} onChange={e => setPackageForm({ ...packageForm, destination: e.target.value })} placeholder="e.g. Ooty" /></label><label className="field-label">Duration (days)<input required type="number" min="1" value={packageForm.duration} onChange={e => setPackageForm({ ...packageForm, duration: e.target.value })} placeholder="e.g. 3" /></label><label className="field-label">Price per person (₹)<input required type="number" min="0" value={packageForm.price} onChange={e => setPackageForm({ ...packageForm, price: e.target.value })} placeholder="e.g. 4999" /></label><label className="field-label full-field">Available seats<input required type="number" min="0" value={packageForm.availableSeats} onChange={e => setPackageForm({ ...packageForm, availableSeats: e.target.value })} placeholder="e.g. 20" /></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setPackageModal(null)}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? "Saving..." : packageModal.mode === "edit" ? "Save changes" : "Add package"}</button></div></form></div></div>}

      {bookingModal && <div className="modal-backdrop-custom" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setBookingModal(null); }}><div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="booking-modal-title"><div className="modal-header-custom"><div><span className="modal-kicker">RESERVE YOUR JOURNEY</span><h2 id="booking-modal-title">Book {bookingModal.destination}</h2><p>{bookingModal.duration} days · {money(bookingModal.price)} per person · {bookingModal.availableSeats} seats available</p></div><button className="close-btn" onClick={() => setBookingModal(null)}><X size={20} /></button></div><form onSubmit={saveBooking}><div className="form-grid"><label className="field-label full-field">Customer name<input required value={bookingForm.customerName} onChange={e => setBookingForm({ ...bookingForm, customerName: e.target.value })} placeholder="Full name" /></label><label className="field-label">Email address<input required type="email" value={bookingForm.email} onChange={e => setBookingForm({ ...bookingForm, email: e.target.value })} placeholder="name@example.com" /></label><label className="field-label">Phone number<input required type="tel" value={bookingForm.phone} onChange={e => setBookingForm({ ...bookingForm, phone: e.target.value })} placeholder="Contact number" /></label><label className="field-label">Travel date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={bookingForm.travelDate} onChange={e => setBookingForm({ ...bookingForm, travelDate: e.target.value })} /></label><label className="field-label">Number of travellers<input required type="number" min="1" max={bookingModal.availableSeats} value={bookingForm.travellers} onChange={e => setBookingForm({ ...bookingForm, travellers: e.target.value })} /></label></div><div className="booking-total"><span>Estimated total</span><strong>{money(Number(bookingModal.price) * Number(bookingForm.travellers || 0))}</strong></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setBookingModal(null)}>Cancel</button><button type="submit" className="primary-btn" disabled={busy}>{busy ? "Confirming..." : "Confirm booking"}</button></div></form></div></div>}
    </div>
  );
}

export default App;
