import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, EyeOff, Heart, MapPin, Menu, MessageCircle, Phone, X } from 'lucide-react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { createRemoteOrder, deleteRemoteGalleryItem, deleteRemoteOrder, deleteRemoteReview, deleteRemoteCategory, getAdminSession, getCustomerSession, getRemoteOrderStatus, listRemoteOrders, loadAdminContent, loadPublicContent, registerCustomer, respondToPrice, savePublicReview, saveRemoteCategory, saveRemoteProductOverride, saveRemoteReview, saveRemoteSettings, signInAdmin, signInCustomer, signOutAdmin, signOutCustomer, signedOrderPhoto, supabaseReady, updateRemoteGalleryItem, updateRemoteOrder, uploadRemoteGalleryPhotos } from './lib/supabase';
import { products } from './data/products';
import { reviews as initialReviews } from './data/reviews';
import { countryCallingCodes } from './data/countryCallingCodes';
import heroImage from './assets/hero.jpg';
import aboutImage from './assets/about.jpg';
import logo from './assets/logo.png';
import './App.css';

const PHONE = '963982769168';
const SUKKAR_MAP_PIN = '34.314331,36.924356';
const STORAGE = { orders: 'sukkar-orders', reviews: 'sukkar-reviews', settings: 'sukkar-settings', photos: 'sukkar-photos' };
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const normalizeOrderTimes = (orders) => orders.map((order) => order.preferredPickupTime !== undefined ? order : ({ ...order, preferredPickupTime: order.status === 'Ready for collection' ? '' : (order.pickupTime || ''), pickupTime: order.status === 'Ready for collection' ? (order.pickupTime || '') : '' }));
const categories = ['All treats', ...new Set(products.map((item) => item.category))];
const fileToDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(reader.result); reader.onerror=reject; reader.readAsDataURL(file); });
const formatDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const normalizeTimeValue = (value) => {
  const time = String(value || '').trim();
  const twelveHour = time.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (twelveHour) {
    let hours = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toLowerCase() === 'pm') hours += 12;
    return `${String(hours).padStart(2, '0')}:${twelveHour[2]}`;
  }
  const twentyFourHour = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!twentyFourHour || Number(twentyFourHour[1]) > 23 || Number(twentyFourHour[2]) > 59) return '';
  return `${String(Number(twentyFourHour[1])).padStart(2, '0')}:${twentyFourHour[2]}`;
};
const formatCollectionTime = (value) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return value || '';
  const [hour, minute] = normalized.split(':').map(Number);
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
};
const formatPrice = (value) => {
  const price = String(value || '').trim();
  if (!price) return '';
  return /\bSYP$/i.test(price) ? price : `${price} SYP`;
};
const whatsapp = (message) => `https://wa.me/${(read(STORAGE.settings, {}).phone || PHONE).replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
const whatsappTo = (phone, message) => `https://wa.me/${String(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

function PickupTimePicker({ value = '', name, onChange, daytimeOnly = false, required = false }) {
  return <input
    aria-label={daytimeOnly ? 'Preferred collection time' : 'Collection time'}
    name={name}
    type="time"
    value={normalizeTimeValue(value)}
    min={daytimeOnly ? '10:00' : undefined}
    max={daytimeOnly ? '22:00' : undefined}
    required={required}
    onChange={(event) => onChange?.(event.target.value)}
  />;
}

function PreferredTimeWheelPicker({ name, value = '', onChange, label = 'preferred collection time' }) {
  const rootRef = useRef(null);
  const normalized = normalizeTimeValue(value);
  const [parts, setParts] = useState(() => getTimeParts(normalized));
  const [selected, setSelected] = useState(Boolean(normalized));
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (normalized) {
      setParts(getTimeParts(normalized));
      setSelected(true);
    }
  }, [normalized]);
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const updatePart = (part, nextValue) => {
    const next = { ...parts, [part]: nextValue };
    setParts(next);
    setSelected(true);
    onChange?.(makeTimeValue(next));
  };

  const hours = Array.from({ length: 12 }, (_, index) => String(index + 1));
  const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  const shownTime = selected ? makeTimeValue(parts) : '';
  return <div className="preferred-time-picker" ref={rootRef}>
    <button className="preferred-time-trigger" type="button" aria-label={`Choose ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-required="true" onClick={() => setOpen((current) => !current)}>
      {shownTime ? formatCollectionTime(shownTime) : 'Choose a time'} <ChevronDown size={15} />
    </button>
    {open && <div className="preferred-time-menu" role="dialog" aria-label={`Choose ${label}`}>
      <div className="preferred-time-wheels">
        <TimeWheelColumn label="Hour" options={hours} value={parts.hour} onChange={(next) => updatePart('hour', next)} />
        <TimeWheelColumn label="Minute" options={minutes} value={parts.minute} onChange={(next) => updatePart('minute', next)} />
        <TimeWheelColumn label="AM or PM" options={['AM', 'PM']} value={parts.period} onChange={(next) => updatePart('period', next)} />
        <div className="preferred-time-highlight" aria-hidden="true" />
      </div>
    </div>}
    <input type="hidden" name={name} value={shownTime} />
  </div>;
}

const getTimeParts = (value) => {
  if (!value) return { hour: '10', minute: '00', period: 'AM' };
  const [hours, minute] = value.split(':').map(Number);
  return { hour: String(hours % 12 || 12), minute: String(minute).padStart(2, '0'), period: hours >= 12 ? 'PM' : 'AM' };
};
const makeTimeValue = ({ hour, minute, period }) => {
  let hours = Number(hour) % 12;
  if (period === 'PM') hours += 12;
  return `${String(hours).padStart(2, '0')}:${minute}`;
};
function TimeWheelColumn({ label, options, value, onChange }) {
  const columnRef = useRef(null);
  const scrollTimer = useRef(null);
  const selectedIndex = Math.max(0, options.indexOf(value));
  useEffect(() => {
    if (columnRef.current) columnRef.current.scrollTop = selectedIndex * 24;
  }, [selectedIndex, options.join('|')]);
  const commitScroll = () => {
    if (!columnRef.current) return;
    const index = Math.min(options.length - 1, Math.max(0, Math.round(columnRef.current.scrollTop / 24)));
    if (options[index] !== value) onChange(options[index]);
  };
  return <div className="preferred-time-wheel" role="listbox" aria-label={label} tabIndex={0} ref={columnRef}
    onScroll={() => { clearTimeout(scrollTimer.current); scrollTimer.current = setTimeout(commitScroll, 110); }}
    onKeyDown={(event) => {
      const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (!direction) return;
      event.preventDefault();
      const nextIndex = Math.min(options.length - 1, Math.max(0, selectedIndex + direction));
      onChange(options[nextIndex]);
    }}>
    <div className="preferred-time-spacer" />
    {options.map((option) => <div key={option} role="option" aria-selected={option === value} className={`preferred-time-option${option === value ? ' selected' : ''}`} onClick={() => onChange(option)}>{option}</div>)}
    <div className="preferred-time-spacer" />
  </div>;
}

function DatePickerDropdown({ name, minDate, required = false }) {
  const rootRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [open, setOpen] = useState(false);
  const minimum = new Date(`${minDate}T12:00:00`);
  const [viewMonth, setViewMonth] = useState(() => new Date(minimum.getFullYear(), minimum.getMonth(), 1));
  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => { if (!rootRef.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const monthName = viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const leadingDays = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarCells = [...Array(leadingDays).fill(null), ...Array.from({ length: daysInMonth }, (_, index) => index + 1)];
  const minimumMonth = new Date(minimum.getFullYear(), minimum.getMonth(), 1);
  const selectedLabel = selectedDate
    ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const dateValue = (day) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return <div className="date-picker-dropdown" ref={rootRef}>
    <button className="date-picker-trigger" type="button" aria-haspopup="dialog" aria-expanded={open} aria-required={required} onClick={() => setOpen((current) => !current)}>
      {selectedLabel || 'Choose a date'} <CalendarDays size={15} />
    </button>
    {open && <div className="date-picker-menu" role="dialog" aria-label="Choose collection date">
      <div className="date-picker-heading">
        <button type="button" aria-label="Previous month" disabled={viewMonth <= minimumMonth} onClick={() => setViewMonth(new Date(year, month - 1, 1))}><ChevronLeft size={16} /></button>
        <strong>{monthName}</strong>
        <button type="button" aria-label="Next month" onClick={() => setViewMonth(new Date(year, month + 1, 1))}><ChevronRight size={16} /></button>
      </div>
      <div className="date-picker-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`} className="date-picker-weekday">{day}</span>)}
        {calendarCells.map((day, index) => day === null
          ? <span className="date-picker-empty" key={`empty-${index}`} />
          : <button key={day} type="button" disabled={dateValue(day) < minDate} className={dateValue(day) === selectedDate ? 'selected' : ''} onClick={() => { setSelectedDate(dateValue(day)); setOpen(false); }}>{day}</button>)}
      </div>
    </div>}
    <input type="hidden" name={name} value={selectedDate} />
  </div>;
}

function usePublicContent(session) {
  const [content, setContent] = useState(null);
  useEffect(() => {
    if (!supabaseReady) return undefined;
    let active = true;
    loadPublicContent(session).then((value) => { if (active) { write(STORAGE.settings, value.settings || {}); setContent(value); } }).catch((error) => console.error('Could not load shared site content:', error));
    return () => { active = false; };
  }, [session]);
  return content;
}

function Header() {
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] = useState(getCustomerSession);
  useEffect(() => {
    const updateCustomer = () => setCustomer(getCustomerSession());
    window.addEventListener('sukkar-customer-auth', updateCustomer);
    return () => window.removeEventListener('sukkar-customer-auth', updateCustomer);
  }, []);
  const links = [['Home', '/'], ['Our story', '/about'], ['Gallery', '/gallery'], ['Reviews', '/reviews'], ['My order', '/my-orders'], ['Contact', '/contact']];
  return <header className="site-header"><Link to="/" className="brand" aria-label="Sukkar Chocolate home"><img src={logo} alt="Sukkar Chocolate" /></Link><button className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button><nav className={open ? 'main-nav nav-open' : 'main-nav'}>{links.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}{customer ? <button className="customer-signout" onClick={() => { signOutCustomer(); setCustomer(null); setOpen(false); window.dispatchEvent(new Event('sukkar-customer-auth')); }}>Sign out</button> : <><NavLink to="/sign-in" onClick={() => setOpen(false)}>Sign in</NavLink><NavLink to="/register" onClick={() => setOpen(false)}>Register</NavLink></>}<Link className="nav-order" to="/custom" onClick={() => setOpen(false)}>Make an order <ArrowRight size={15}/></Link></nav></header>;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Footer() {
  const shared = usePublicContent();
  const settings = shared?.settings || read(STORAGE.settings, {});
  return <footer className="site-footer"><div className="footer-main"><div><img className="footer-brand" src={logo} alt="Sukkar Chocolate"/><p>Little handmade moments,<br/>made to be shared.</p></div><div><h3>Explore</h3><Link to="/gallery">The gallery</Link><Link to="/about">Our story</Link><Link to="/reviews">Kind words</Link><Link to="/my-orders">My order</Link><Link to="/admin">Studio dashboard</Link></div><div><h3>Have a sweet idea?</h3><p>Tell us what you’re dreaming of.</p><Link className="footer-link" to="/custom"><span>Create a custom order</span><ArrowRight size={15}/></Link></div><div><h3>Find us</h3><p><Phone size={15}/> {settings.phone || '+963 982 769 168'}</p><p><MapPin size={15}/> {settings.address || 'Sadad, Homs, Syria'}</p><a className="social-link" href="https://www.instagram.com/sukkar_chocolate/" target="_blank" rel="noreferrer"><FaInstagram size={16}/> Instagram</a><a className="social-link" href="https://www.facebook.com/share/1B7mhzjcAi/" target="_blank" rel="noreferrer"><FaFacebookF size={16}/> Facebook</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Sukkar Chocolate</span><span>Handmade with care, in Homs.</span></div></footer>;
}

function ButtonLink({ to, children, className = '' }) { return <Link className={`button ${className}`} to={to}>{children}<ArrowRight size={16}/></Link>; }

function PageIntro({ eyebrow, title, text }) { return <section className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{text && <p>{text}</p>}</section>; }

function PhoneNumberField() {
  return <label>Phone number<span className="phone-number-fields"><select name="phoneCountryCode" defaultValue="+963" aria-label="Country calling code" required>{countryCallingCodes.map(([country, code]) => <option key={`${country}-${code}`} value={code}>{country} ({code})</option>)}</select><input name="phone" type="tel" required autoComplete="tel-national" inputMode="tel" placeholder="Phone number"/></span></label>;
}

const readPhone = (data) => `${data.get('phoneCountryCode')} ${data.get('phone')}`;

function PasswordInput({ id, ...props }) {
  const [visible, setVisible] = useState(false);
  return <span className="password-input-wrap"><input id={id} {...props} type={visible ? 'text' : 'password'} /><button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} aria-controls={id} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={17} aria-hidden="true"/> : <Eye size={17} aria-hidden="true"/>}</button></span>;
}

function CustomerAuth({ register = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const requestedNext = new URLSearchParams(location.search).get('next') || '/';
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/';
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setError('');
    setMessage('');
    setSending(true);
    try {
      if (register) {
        const fullName = `${data.get('firstName').trim()} ${data.get('lastName').trim()}`;
        const result = await registerCustomer(fullName, data.get('email'), data.get('password'));
        const session = result.session || result;
        if (session.access_token) {
          localStorage.setItem('sukkar-customer-session', JSON.stringify(session));
          window.dispatchEvent(new Event('sukkar-customer-auth'));
          navigate(next);
        } else {
          setMessage('Your account is created. Check your email to confirm it, then sign in.');
          form.reset();
        }
      } else {
        await signInCustomer(data.get('email'), data.get('password'));
        window.dispatchEvent(new Event('sukkar-customer-auth'));
        navigate(next);
      }
    } catch (cause) {
      setError(cause.message || 'We could not complete that request. Please try again.');
    } finally {
      setSending(false);
    }
  };
  return (
    <main className="inner-page account-page">
      <div className="account-layout">
        <section className="account-form-area">
          <section className="form-panel account-panel">
            <span className="eyebrow">{register ? 'A warm welcome to Sukkar' : 'Good to see you again'}</span>
            <h2>{register ? 'Create your account' : 'Welcome back'}</h2>
            <p className="account-form-intro">{register ? 'A few details and you’ll be ready to order something sweet.' : 'Sign in to see your orders and continue where you left off.'}</p>
            {!supabaseReady && <p className="account-notice">Preview account: saved only in this browser for testing. It is not a live account.</p>}
            <form className="form-grid" onSubmit={submit}>
              {register && <>
                <label>First name<input name="firstName" required maxLength="40" autoComplete="given-name" placeholder="First name" /></label>
                <label>Last name<input name="lastName" required maxLength="40" autoComplete="family-name" placeholder="Last name" /></label>
              </>}
              <label className="full-field">Email address<input name="email" type="email" required autoComplete="email" placeholder="you@example.com" /></label>
              <label className="full-field">Password<PasswordInput id="customer-password" name="password" required minLength="8" autoComplete={register ? 'new-password' : 'current-password'} placeholder={register ? 'At least 8 characters' : 'Your password'} /></label>
              <button className="button account-submit" type="submit" disabled={sending}>{sending ? 'Please wait…' : register ? 'Create account' : 'Sign in'} <ArrowRight size={15} /></button>
            </form>
            <p className="account-switch">{register ? 'Already have an account?' : 'New to Sukkar?'} <Link to={`${register ? '/sign-in' : '/register'}?next=${encodeURIComponent(next)}`}>{register ? 'Sign in' : 'Create an account'}</Link></p>
          </section>
          {message && <p className="success-message account-success-outside" role="status">{message}</p>}
          {error && <p className="error-message account-error-outside" role="alert">{error}</p>}
        </section>
      </div>
    </main>
  );
}

function OrderNote({ compact = false }) { return <div className={`order-note ${compact ? 'compact' : ''}`}><span className="note-icon"><Clock3 size={19}/></span><div><strong>Made just for you, with a little time</strong><p>Please place your order at least 3 days before collection. We’ll agree the price together over WhatsApp before we begin, and you can pay when you collect.</p></div></div>; }

function ReviewCarousel({ reviews }) {
  const [index, setIndex] = useState(0);
  if (!reviews.length) return <div className="empty-reviews review-home-card"><span>♡</span><p>We’re waiting for the first kind words. Have ordered from Sukkar? We’d love to hear from you.</p><Link to="/reviews">Leave a review <ArrowRight size={15}/></Link></div>;
  const review = reviews[index % reviews.length];
  return <div className="review-carousel review-home-card"><span className="quote-mark">“</span><ReviewStars rating={review.rating}/><blockquote>{review.quote}</blockquote><p className="review-by">{review.name}</p><div className="carousel-controls"><span>{String(index + 1).padStart(2, '0')} <i>/ {String(reviews.length).padStart(2, '0')}</i></span><button aria-label="Previous review" onClick={() => setIndex((index - 1 + reviews.length) % reviews.length)}><ChevronLeft/></button><button aria-label="Next review" onClick={() => setIndex((index + 1) % reviews.length)}><ChevronRight/></button></div></div>;
}

function ReviewStars({ rating }) {
  const score = Number(rating) || 0;
  return <span className="review-stars" role="img" aria-label={score ? `${score} out of 5 stars` : 'No star rating provided'}>{Array.from({ length: 5 }, (_, index) => <span key={index} className={index < score ? 'filled' : ''}>★</span>)}</span>;
}

function OrderPhotos({ paths, previews, session }) {
  const [links,setLinks]=useState([]); const [error,setError]=useState('');
  const [selectedPhoto,setSelectedPhoto]=useState('');
  useEffect(() => {
    let active = true;
    if (previews?.length || !paths?.length) { setLinks([]); return () => { active = false; }; }
    Promise.all(paths.map(path => signedOrderPhoto(path, session)))
      .then(urls => { if (active) { setLinks(urls); setError(''); } })
      .catch(() => { if (active) setError('Could not load photo previews. Check Supabase Storage permissions.'); });
    return () => { active = false; };
  }, [paths, previews, session]);
  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelectedPhoto(''); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedPhoto]);
  const photoUrls = previews?.length ? previews : links;
  if (!paths?.length && !photoUrls.length) return <span>None attached</span>;
  return <span className="order-photo-list">{error&&<small>{error}</small>}{photoUrls.length > 0 ? <span className="order-photo-previews">{photoUrls.map((url,index)=><button type="button" key={`${index}-${url.slice(0,32)}`} onClick={()=>setSelectedPhoto(url)} aria-label={`Enlarge reference photo ${index+1}`}><img src={url} alt={`Order reference ${index+1}`}/></button>)}</span> : <small>Loading photo previews…</small>}<small>{(paths?.length || photoUrls.length)} {(paths?.length || photoUrls.length)===1?'photo':'photos'} attached</small>{selectedPhoto&&<span className="lightbox admin-photo-lightbox" role="dialog" aria-modal="true" aria-label="Order reference photo" onClick={()=>setSelectedPhoto('')}><button className="lightbox-close" type="button" aria-label="Close enlarged photo" onClick={()=>setSelectedPhoto('')}><X/></button><img src={selectedPhoto} alt="Enlarged order reference" onClick={(event)=>event.stopPropagation()}/></span>}</span>;
}

function Home() {
  const shared = usePublicContent();
  const location = shared?.settings?.address || read(STORAGE.settings, {}).address || 'Sadad, Homs, Syria';
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(SUKKAR_MAP_PIN)}`;
  const homeProducts = products.map((item) => ({ ...item, image: shared?.overrides?.[item.id]?.image || item.image }));
  const reviewItems = shared?.reviews || read(STORAGE.reviews, initialReviews);
  return <main><section className="hero-section" style={{ '--hero-image': `url(${heroImage})` }}><div className="hero-copy"><span className="eyebrow">Handmade in Homs · Made with heart</span><h1>Make a moment<br/>a little <em>sweeter.</em></h1><p>Personalised chocolate and celebration treats, made by hand for the people and days you love.</p><div className="hero-actions"><ButtonLink to="/custom">Dream up a treat</ButtonLink><Link className="button button-outline" to="/gallery">Wander through the gallery <ArrowDown size={15}/></Link></div></div><div className="hero-caption"><span>01 — Little things, lovingly made</span><span>Made to order in Sadad, Homs</span></div></section>
    <section className="intro-band"><span className="eyebrow">A little Sukkar goes a long way</span><p>From a name spelled in chocolate to a whole celebration table, tell us what you have in mind. <em>We’ll make it yours.</em></p></section>
    <section className="story-strip"><div className="story-copy"><span className="eyebrow">A thoughtful kind of sweet</span><h2>Made by hand.<br/><em>Made for your moment.</em></h2><p>Every order begins with your idea. We shape, decorate and finish each piece with care, so it feels just right for the person receiving it.</p><ButtonLink to="/about" className="button-outline">Meet Sukkar</ButtonLink></div><div className="story-image"><img src={aboutImage} alt="Handmade chocolate treats prepared for a special occasion"/><span>Made with care, one order at a time</span></div></section>
    <section className="occasions-section" id="occasions"><div className="section-heading"><div><span className="eyebrow">The days worth celebrating</span><h2>Sweetness for <em>every occasion.</em></h2></div><Link className="text-link" to="/gallery">Explore all the treats <ArrowRight size={16}/></Link></div><div className="occasion-cards">{[{ label:'Birthdays', photo:homeProducts[0]?.image, sub:'A little extra happy'},{label:'Baby showers', photo:homeProducts[17]?.image, sub:'For the newest arrival'},{label:'Just because', photo:homeProducts[19]?.image, sub:'No reason needed'}].map((item, i)=><Link to="/gallery" className={`occasion-card occasion-${i+1}`} key={item.label}><img src={item.photo} alt=""/><div><span>{item.sub}</span><h3>{item.label}</h3></div><ArrowRight size={17}/></Link>)}</div></section>
    <section className="custom-feature"><div className="custom-photo"><img src={homeProducts[20].image} alt="A handmade chocolate gift assortment"/></div><div className="custom-feature-copy"><span className="eyebrow">Your idea, our little workshop</span><h2>Tell us what<br/>you’re <em>imagining.</em></h2><p>Send a description, a reference photo and your collection date. We’ll talk through the details and price together before anything is made.</p><ButtonLink to="/custom">Start a custom order</ButtonLink><span className="small-note">A few words or a full moodboard — either is lovely.</span></div></section>
    <section className="promise-section"><div className="promise-heading"><span className="eyebrow">Good to know</span><h2>A few things before<br/><em>the first bite.</em></h2></div><div className="promise-content"><OrderNote compact/><div className="faq-mini"><h3>What about allergies?</h3><p>Please include any allergies in your request. We’ll confirm the ingredients and whether we can accommodate them before you place your order.</p><Link to="/contact">Ask us a question <ArrowRight size={14}/></Link></div></div></section>
    <section className="reviews-section"><div className="reviews-heading"><span className="eyebrow">A few kind words</span><h2>From our table <em>to yours.</em></h2><Link to="/reviews" className="text-link">Read all reviews <ArrowRight size={15}/></Link></div><ReviewCarousel reviews={reviewItems}/></section>
    <section className="home-location"><div className="home-location-copy"><span className="eyebrow">Find Sukkar</span><h2>A little sweetness,<br/><em>close to home.</em></h2><p>Visit us in person or open the map for directions to our location.</p><div className="home-location-address"><MapPin size={17}/><span>{location}</span></div><a className="button" href={directionsUrl} target="_blank" rel="noreferrer">Get directions <ArrowRight size={16}/></a></div><div className="home-location-map"><iframe title={`Map showing Sukkar Chocolate at ${location}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(SUKKAR_MAP_PIN)}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></section>
    </main>;
}

function About() { return <main className="inner-page"><PageIntro eyebrow="The hands behind the chocolate" title={<>A little story,<br/><em>made with love.</em></>} text="Sukkar began with a love of chocolate and the happiness that comes with sharing something made just for you."/><section className="about-layout"><div className="about-photo"><img src={aboutImage} alt="Sukkar's handmade chocolate creations"/><span>Little details make a big difference</span></div><div className="about-copy"><span className="eyebrow">Our story</span><h2>Small beginnings.<br/><em>Sweet intentions.</em></h2><p>Sukkar grew from a simple thought: the best gifts feel personal. A favourite colour, a name, a tiny detail only you would know — those are the things that make a treat feel like it belongs to someone.</p><p>Today, each order is still made by hand. We listen to your idea, share the details and make your chocolate especially for the occasion.</p><p>Thank you for being part of our story. We’re glad you’re here.</p><ButtonLink to="/custom">Make something together</ButtonLink></div></section><OrderNote/></main>; }

function Gallery() {
  const shared = usePublicContent();
  const [active, setActive] = useState('All treats');
  const [selected, setSelected] = useState(null);
  const extra = read(STORAGE.photos, []);
  const overrides = shared?.overrides || read('sukkar-photo-categories', {});
  const descriptions = read('sukkar-photo-descriptions', {});
  const names = read('sukkar-photo-names', {});
  const removed = new Set(read('sukkar-removed-photos', []));
  const remoteExtra = shared?.gallery || [];
  const items = [...products, ...extra, ...remoteExtra].map((item) => {
    const override = overrides[item.id];
    return { ...item, name: override?.name ?? names[item.id] ?? item.name, category: override?.category || item.category, description: override?.description ?? descriptions[item.id] ?? item.description, image: override?.image || item.image, isVisible: override?.is_visible ?? !removed.has(item.id) };
  }).filter((item) => item.isVisible && !removed.has(item.id));
  const filters = ['All treats', ...(shared?.categories || read('sukkar-categories', categories).filter((item) => item !== 'All treats'))];
  const shown = active === 'All treats' ? items : items.filter((item) => item.category === active);
  return <main className="inner-page"><PageIntro eyebrow="A peek at the sweet things" title={<>A gallery of <em>little joys.</em></>} text="Every piece is made to order, so colours and details can be tailored to your celebration."/><div className="filter-row" aria-label="Filter gallery">{filters.map((category) => <button key={category} className={active===category?'filter-chip active':'filter-chip'} onClick={()=>setActive(category)}>{category}</button>)}</div><div className="gallery-grid">{shown.map((item, i)=><button className={`gallery-item gallery-item-${i%6}`} key={item.id || item.name} onClick={()=>setSelected(item)}><img src={item.image} alt={item.name || 'Handmade Sukkar treat'}/><span className="gallery-caption"><span>{item.category}</span><strong>{item.name || 'A Sukkar creation'}</strong>{item.description && <small>{item.description}</small>}</span></button>)}</div>{shown.length===0&&<p className="empty-state">More treats are on the way. Choose another collection to explore.</p>}{selected&&<div className="lightbox" role="dialog" aria-modal="true" aria-label={selected.name} onClick={()=>setSelected(null)}><button className="lightbox-close" aria-label="Close"><X/></button><img src={selected.image} alt={selected.name}/><div><span className="eyebrow">{selected.category}</span><h2>{selected.name}</h2>{selected.description && <p>{selected.description}</p>}<Link className="button" to="/custom">Ask about a custom version <ArrowRight size={15}/></Link></div></div>}</main>;
}

function Reviews() {
  const shared = usePublicContent();
  const [items, setItems] = useState(()=>read(STORAGE.reviews, initialReviews));
  useEffect(() => { if (shared?.reviews) setItems(shared.reviews); }, [shared]);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingError, setRatingError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const addReview = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    setSubmitError('');
    setSubmitted(false);
    if (!rating) { setRatingError('Please choose a star rating.'); return; }
    setRatingError('');
    const data = new FormData(form);
    const review = { id: crypto.randomUUID(), name: data.get('name'), quote: data.get('review'), rating };
    try {
      if (supabaseReady) await savePublicReview(review);
      else { const next = [review, ...items]; write(STORAGE.reviews,next); setItems(next); }
      setSubmitted(true); setRating(0); setRatingError(''); form.reset();
    } catch { setSubmitError('We could not submit your review. Please try again.'); }
  };
  return <main className="inner-page"><PageIntro eyebrow="Notes from our customers" title={<>The sweetest <em>words.</em></>} text="A little note after a special day means the world to us."/><div className="reviews-list">{items.length ? items.map((review)=><article className="review-card" key={review.id}><span className="quote-mark">“</span><ReviewStars rating={review.rating}/><p>{review.quote}</p><span className="review-by">{review.name}</span></article>) : <div className="empty-state">No reviews yet. Be the first to share a little note.</div>}</div><section className="form-panel review-form-panel"><span className="eyebrow">Leave a little note</span><h2>How was your <em>Sukkar?</em></h2><form onSubmit={addReview} className="form-grid"><label>Your name<input name="name" required maxLength="60" placeholder="The name you’d like us to use"/></label><fieldset className="full-field review-rating-field"><legend>Your rating</legend><div className="rating-picker" role="group" aria-label="Choose a star rating">{[1,2,3,4,5].map((stars)=><button key={stars} type="button" className={stars <= rating ? 'rating-star selected' : 'rating-star'} aria-label={`${stars} ${stars===1?'star':'stars'}`} aria-pressed={rating===stars} onClick={()=>{setRating(stars);setRatingError('');}}>{stars <= rating ? '★' : '☆'}</button>)}</div>{ratingError&&<small className="error-message" role="alert">{ratingError}</small>}</fieldset><label className="full-field">Your review<textarea name="review" required maxLength="500" rows="4" placeholder="Tell us what made it special…"/></label><button className="button" type="submit">Share your review <ArrowRight size={16}/></button></form></section>{submitted&&<p className="success-message review-success-outside" role="status">{supabaseReady ? 'Thank you — your review has been sent for approval.' : 'Thank you — your kind words have been added.'}</p>}{submitError&&<p className="error-message review-error-outside" role="alert">{submitError}</p>}</main>;
}

function CustomOrder() {
  const [done, setDone] = useState(null); const [error,setError]=useState(''); const [sending,setSending]=useState(false);
  const [hasAllergies, setHasAllergies] = useState('no');
  const [customerSession, setCustomerSession] = useState(getCustomerSession);
  useEffect(() => { const syncSession = () => setCustomerSession(getCustomerSession()); window.addEventListener('sukkar-customer-auth', syncSession); return () => window.removeEventListener('sukkar-customer-auth', syncSession); }, []);
  if (!customerSession?.access_token) return <main className="inner-page account-page"><PageIntro eyebrow="Before you order" title={<>Sign in to <em>make it yours.</em></>} text="Please sign in or register before sending a custom order request."/><section className="form-panel account-panel account-gate"><p>{supabaseReady ? 'Your order details will be submitted securely with your account.' : 'Preview mode: create a test account to try the order flow. Preview orders stay in this browser.'}</p><div className="account-gate-actions"><Link className="button" to="/sign-in?next=%2Fcustom">Sign in <ArrowRight size={15}/></Link><Link className="button button-outline" to="/register?next=%2Fcustom">Create account <ArrowRight size={15}/></Link></div></section></main>;
  const submit = async (event) => { event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const files = [...form.elements.photos.files]; if (files.length > 5) return; const collectionDate = data.get('date'); if (!collectionDate) { setError('Choose a collection date.'); return; } const preferredPickupTime = data.get('pickupTime'); if (!preferredPickupTime) { setError('Choose your preferred collection time.'); return; } const waWindow=window.open('about:blank','_blank'); setSending(true);setError(''); const order = { id: `SK-${crypto.randomUUID().slice(0,8).toUpperCase()}`, firstName:data.get('firstName'), lastName:data.get('lastName'), name:[data.get('firstName'), data.get('lastName')].filter(Boolean).join(' '), phone:readPhone(data), email:data.get('email'), customerUserId:customerSession.user.id, description:data.get('description'), date:collectionDate, allergies:hasAllergies === 'yes' ? data.get('allergies') : 'No', photoNames:files.map(file=>file.name), status:'Awaiting details', cost:'', preferredPickupTime, pickupTime:'', createdAt:new Date().toISOString() }; try { const savedOrder = supabaseReady ? await createRemoteOrder(order, files, customerSession) : { ...order, trackingToken: crypto.randomUUID(), photoPaths: [], photoPreviews: await Promise.all(files.map(fileToDataUrl)) }; const saved=read(STORAGE.orders,[]); write(STORAGE.orders,[{...savedOrder,photoNames:order.photoNames},...saved]); const photoMessage = supabaseReady && savedOrder.photoUrls?.length ? `Reference photo links (available for 24 hours):\n${savedOrder.photoUrls.join('\n')}\n` : order.photoNames.length ? `Reference photos: ${order.photoNames.join(', ')} (I’ll attach these in WhatsApp)\n` : '';const message=`Hello Sukkar! I’d love to request a custom order.\n\nOrder reference: ${order.id}\nFirst name: ${order.firstName}\nLast name: ${order.lastName}\nFull name: ${order.name}\nPhone: ${order.phone}\nEmail: ${order.email}\nCollection date: ${formatDate(order.date)}\nPreferred collection time: ${formatCollectionTime(order.preferredPickupTime)}\n${order.allergies && order.allergies !== 'No'?`Allergies or dietary notes: ${order.allergies}\n`:order.allergies === 'No'?'Allergies or dietary notes: No\n':''}What I have in mind: ${order.description}\n${photoMessage}\nPlease let me know the price before you begin. Thank you!`;const whatsappUrl=whatsapp(message);setDone({...order,whatsappUrl});if(waWindow)waWindow.location.href=whatsappUrl;form.reset();setHasAllergies('no'); } catch (cause) { if(waWindow)waWindow.close();setError(cause.message || 'We could not save your request. Please try again.'); } finally { setSending(false); } };
  return <main className="inner-page order-page"><PageIntro eyebrow="A treat that starts with your idea" title={<>Let’s make it <em>yours.</em></>} text="Tell us what you’re picturing and when you’d like to collect it. You can add up to five reference photos."/><div className="order-layout"><section className="form-panel"><form onSubmit={submit} className="form-grid"><label>First name<input name="firstName" required autoComplete="given-name" defaultValue={customerSession.user?.user_metadata?.full_name?.split(' ')[0] || ''} placeholder="Your first name"/></label><label>Last name<input name="lastName" required autoComplete="family-name" defaultValue={customerSession.user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''} placeholder="Your last name"/></label><PhoneNumberField/><label>Email address<input name="email" type="email" required autoComplete="email" defaultValue={customerSession.user?.email || ''} placeholder="you@example.com"/></label><div className="date-field-label"><span>Collection date</span><DatePickerDropdown name="date" minDate={new Date(Date.now()+3*86400000).toISOString().slice(0,10)} required/></div><div className="time-field-label"><span>Preferred collection time</span><PreferredTimeWheelPicker name="pickupTime"/><small className="time-field-note">Choose a time between 10:00 AM and 10:00 PM.</small></div><label className="full-field">Describe your idea<textarea name="description" required minLength="10" maxLength="1500" rows="5" placeholder="Chocolate and filling, colours, message, size or occasion — share anything that helps us imagine it…"/></label><fieldset className="full-field allergy-field"><legend>Any allergies or dietary requirements?</legend><select name="hasAllergies" value={hasAllergies} onChange={(event) => setHasAllergies(event.target.value)}><option value="no">No</option><option value="yes">Yes</option></select>{hasAllergies === 'yes' && <label className="allergy-details">Please tell us about any allergies or dietary requirements<input name="allergies" required placeholder="e.g. nuts, dairy, gluten"/></label>}</fieldset><label className="full-field upload-field">Reference photos <span className="optional">(up to 5)</span><input name="photos" type="file" accept="image/*" multiple onChange={(event)=>{if(event.target.files.length>5) event.target.setCustomValidity('Please choose up to 5 photos.'); else event.target.setCustomValidity('');}}/><small>{supabaseReady ? 'Photos are uploaded privately with your request.' : 'Preview photos stay on this device and are not uploaded.'}</small></label><button className="button" type="submit" disabled={sending}>{sending?'Sending request…':'Send order request'} <ArrowRight size={16}/></button><p className="form-footnote">{supabaseReady ? 'Your request and photos are saved securely with your account. WhatsApp opens so we can agree the price before we start.' : 'Preview order saved only in this browser. WhatsApp opens so we can try the request flow.'}</p></form>{error&&<p className="error-message">{error}</p>}{done&&<div className="success-card"><span>✓</span><div><strong>Your request was saved — thank you!</strong><p>Reference <b>{done.id}</b>. We’ve opened WhatsApp so you can discuss your order.</p><a className="success-whatsapp" href={done.whatsappUrl} target="_blank" rel="noreferrer">Continue to WhatsApp <ArrowRight size={15}/></a><Link to="/my-orders">View my order <ArrowRight size={15}/></Link></div></div>}</section><aside className="order-aside"><OrderNote/><div className="aside-steps"><span className="eyebrow">A lovely little process</span><ol><li><span>01</span><div><strong>Tell us what you love</strong><p>Share your idea, date and inspiration.</p></div></li><li><span>02</span><div><strong>Agree the details</strong><p>We’ll confirm the price together over WhatsApp.</p></div></li><li><span>03</span><div><strong>Collect and enjoy</strong><p>Pay when you collect your finished order.</p></div></li></ol></div></aside></div></main>;
}

function Contact() {
  const shared=usePublicContent(); const settings=shared?.settings || read(STORAGE.settings,{}); const [sent,setSent]=useState(false);
  const submit=(event)=>{event.preventDefault();const d=new FormData(event.currentTarget);window.open(whatsapp(`Hello Sukkar!\n\nName: ${d.get('name')}\nPhone: ${readPhone(d)}\nMessage: ${d.get('message')}`),'_blank','noopener,noreferrer');setSent(true);event.currentTarget.reset();};
  return <main className="inner-page contact-page"><PageIntro eyebrow="We’re happy you’re here" title={<>Let’s have a <em>chat.</em></>} text="Questions, a special request or a little chocolate curiosity? Send us a note."/><div className="contact-layout"><section className="form-panel"><form onSubmit={submit} className="form-grid"><label>Your name<input name="name" required placeholder="Your name"/></label><PhoneNumberField/><label className="full-field">Your message<textarea name="message" rows="5" required placeholder="How can we help?"/></label><button className="button" type="submit">Send via WhatsApp <ArrowRight size={16}/></button><small className="full-field">WhatsApp will open with your message ready to send.</small></form>{sent&&<p className="success-message">Your message is ready in WhatsApp. We look forward to chatting.</p>}</section><aside className="contact-details"><span className="eyebrow">Find Sukkar</span><h2>Let’s make<br/><em>something sweet.</em></h2><p><Phone size={17}/>{settings.phone||'+963 982 769 168'}</p><p><MapPin size={17}/>{settings.address||'Sadad, Homs, Syria'}</p><a href="https://www.instagram.com/sukkar_chocolate/" target="_blank" rel="noreferrer"><FaInstagram size={17}/>Follow along on Instagram</a><a href="https://www.facebook.com/share/1B7mhzjcAi/" target="_blank" rel="noreferrer"><FaFacebookF size={17}/>Find us on Facebook</a><div className="contact-hours">Orders are made by request. Please allow at least 3 days before collection.</div></aside></div></main>;
}

function OrderStatusJourney({ status, admin = false, collectionTime = '' }) {
  const declined = status === 'Price declined';
  const rejected = status === 'Rejected';
  const steps = admin ? ['Awaiting details', 'Accepted', 'Awaiting price agreement', 'Price agreed', 'Preparing', 'Ready for collection'] : ['Request received', 'Accepted', 'Price proposed', 'Price agreed', 'Preparing', 'Ready for collection'];
  const activeStep = {
    'Awaiting details': 0,
    Accepted: 1,
    'Awaiting price agreement': 2,
    'Price declined': 2,
    Preparing: 4,
    'Ready for collection': 5,
    Rejected: 1,
  }[status] ?? 0;
  return <ol className="order-journey" aria-label={`Order progress: ${status}`}>
    {steps.map((step, index) => {
      const done = index < activeStep;
      const current = index === activeStep;
      const failed = current && (declined || rejected);
      const label = failed ? (declined ? 'Price declined' : 'Rejected') : step;
      return <li key={step} className={`journey-step${done ? ' done' : ''}${current ? ' current' : ''}${failed ? ' failed' : ''}`} aria-current={current ? 'step' : undefined}>
        <span className="journey-marker" aria-hidden="true">{done ? '✓' : index + 1}</span>
        <span className="journey-label">{label}</span>
        {admin && current && status === 'Ready for collection' && collectionTime && <span className="journey-collection-time">{formatCollectionTime(collectionTime)}</span>}
      </li>;
    })}
  </ol>;
}

function MyOrders() {
  const [orders,setOrders]=useState(()=>normalizeOrderTimes(read(STORAGE.orders,[])));
  const [respondingOrder,setRespondingOrder]=useState(null);
  const [responseError,setResponseError]=useState('');
  useEffect(()=>{
    let active = true;
    let refreshing = false;
    const refreshStatuses = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const cachedOrders = normalizeOrderTimes(read(STORAGE.orders, []));
        const next = supabaseReady ? await Promise.all(cachedOrders.map(async (order) => {
          if (!order.trackingToken) return order;
          try {
            const row = await getRemoteOrderStatus(order);
            return row ? { ...order, cost: row.agreed_cost || '', preferredPickupTime: row.preferred_collection_time || order.preferredPickupTime || '', pickupTime: row.collection_time || '', status: row.status } : null;
          } catch { return order; }
        })) : cachedOrders;
        if (active) {
          const visibleOrders = next.filter(Boolean);
          setOrders(visibleOrders);
          write(STORAGE.orders, visibleOrders);
        }
      } finally {
        refreshing = false;
      }
    };
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refreshStatuses(); };
    refreshStatuses();
    const interval = window.setInterval(refreshWhenVisible, 10000);
    window.addEventListener('focus', refreshStatuses);
    window.addEventListener('storage', refreshStatuses);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshStatuses);
      window.removeEventListener('storage', refreshStatuses);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  },[]);
  const respond = async (order, accept) => {
    setRespondingOrder(order.id);
    setResponseError('');
    try {
      if (supabaseReady) await respondToPrice(order.id, accept, getCustomerSession());
      const next = orders.map((item) => item.id === order.id ? { ...item, status: accept ? 'Preparing' : 'Price declined' } : item);
      setOrders(next);
      write(STORAGE.orders, next);
    } catch (cause) {
      setResponseError(cause.message || 'Could not save your response. Please try again.');
    } finally {
      setRespondingOrder(null);
    }
  };
  return <main className="inner-page"><PageIntro eyebrow="Your sweet requests" title={<>A little order <em>update.</em></>} text={supabaseReady?'Orders submitted on this browser will appear here, with updates from Sukkar.':'Orders submitted on this browser will appear here. We’ll agree the price and details together over WhatsApp.'}/>{responseError&&<p className="error-message">{responseError}</p>}<div className="my-orders">{orders.length?orders.map(order=><article className="order-card" key={order.id}><div className="order-card-top"><span className="eyebrow">{order.id}</span></div><h2>Made for {order.name}</h2><p>{order.description}</p><div className="order-meta"><span>Collection date<strong>{formatDate(order.date)}</strong></span><span>{order.status==='Awaiting price agreement'||order.status==='Accepted'?'Proposed price':'Agreed price'}<strong>{order.cost?formatPrice(order.cost):'To be agreed'}</strong></span>{order.preferredPickupTime && <span>{order.status === 'Ready for collection' ? 'Your preferred time' : 'Preferred time'}<strong>{order.preferredPickupTime}</strong></span>}{order.status === 'Ready for collection' && order.pickupTime && <span className="order-collection-time">Collection time<strong>{formatCollectionTime(order.pickupTime)}</strong></span>}</div><OrderStatusJourney status={order.status}/>{order.status==='Awaiting price agreement'&&<div className="customer-price-response"><p>Sukkar has proposed this price:</p><strong>{formatPrice(order.cost)}</strong><div><button className="button" type="button" disabled={respondingOrder===order.id} onClick={()=>respond(order,true)}>Accept price <ArrowRight size={15}/></button><button className="collected-button" type="button" disabled={respondingOrder===order.id} onClick={()=>respond(order,false)}>Reject price</button></div></div>}{order.status==='Price declined'&&<p className="price-response-note">You declined this price. Sukkar will review your order.</p>}<a className="text-link" target="_blank" rel="noreferrer" href={whatsapp(`Hello Sukkar, I’m checking on order ${order.id}.`)}>Ask about this order <ArrowRight size={15}/></a></article>):<div className="empty-state">No orders on this device yet. <Link to="/custom">Tell us what you have in mind <ArrowRight size={15}/></Link></div>}</div></main>;
}

function Admin() {
  const [session, setSession] = useState(getAdminSession);
  const shared = usePublicContent(session);
  const [orders, setOrders] = useState(() => normalizeOrderTimes(read(STORAGE.orders, [])));
  const [settings, setSettings] = useState(() => read(STORAGE.settings, {}));
  const [saved, setSaved] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminReviews, setAdminReviews] = useState([]);
  const [categoryList, setCategoryList] = useState(() => read('sukkar-categories', categories));
  const [extraPhotos, setExtraPhotos] = useState(() => read(STORAGE.photos, []));
  const [photoCategories, setPhotoCategories] = useState(() => read('sukkar-photo-categories', {}));
  const [photoDescriptions, setPhotoDescriptions] = useState(() => read('sukkar-photo-descriptions', {}));
  const [galleryPhotoNames, setGalleryPhotoNames] = useState(() => read('sukkar-photo-names', {}));
  const [photoVisibility, setPhotoVisibility] = useState({});
  const [removedPhotoIds, setRemovedPhotoIds] = useState(() => read('sukkar-removed-photos', []));
  const [selectedGalleryCategory, setSelectedGalleryCategory] = useState(() => read('sukkar-categories', categories).find((item) => item !== 'All treats') || 'Chocolate');
  const galleryCategories = categoryList.filter((item) => item !== 'All treats');
  const activeGalleryCategory = galleryCategories.includes(selectedGalleryCategory) ? selectedGalleryCategory : (galleryCategories[0] || 'Chocolate');
  const galleryItems = [...products, ...extraPhotos]
    .map((item) => ({ ...item, name: shared?.overrides?.[item.id]?.name ?? galleryPhotoNames[item.id] ?? item.name, category: shared?.overrides?.[item.id]?.category || photoCategories[item.id] || item.category, description: shared?.overrides?.[item.id]?.description ?? photoDescriptions[item.id] ?? item.description, image: shared?.overrides?.[item.id]?.image || item.image, isVisible: photoVisibility[item.id] ?? shared?.overrides?.[item.id]?.is_visible ?? !removedPhotoIds.includes(item.id) }))
    .concat((shared?.gallery || []).filter((remote) => !extraPhotos.some((photo) => photo.id === remote.id)))
    ;

  useEffect(() => {
    if (!shared) return;
    if (shared.categories?.length) setCategoryList(shared.categories);
    setExtraPhotos(shared.gallery || []);
    setSettings(shared.settings || {});
    setPhotoCategories(Object.fromEntries(Object.entries(shared.overrides || {}).map(([id, row]) => [id, row.category])));
    setPhotoDescriptions(Object.fromEntries(Object.entries(shared.overrides || {}).map(([id, row]) => [id, row.description])));
    setGalleryPhotoNames(Object.fromEntries(Object.entries(shared.overrides || {}).map(([id, row]) => [id, row.name])));
    setPhotoVisibility(Object.fromEntries(Object.entries(shared.overrides || {}).map(([id, row]) => [id, row.is_visible])));
    setRemovedPhotoIds(Object.entries(shared.overrides || {}).filter(([, row]) => !row.is_visible).map(([id]) => id));
  }, [shared]);

  useEffect(() => {
    if (!supabaseReady || !session) return undefined;
    let active = true;
    listRemoteOrders(session).then((rows) => { if (active) setOrders(rows); }).catch(() => {
      if (!active) return;
      setLoginError('Your admin session expired. Sign in again to load the orders.');
      signOutAdmin();
      setSession(null);
    });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!supabaseReady || !session) return undefined;
    let active = true;
    loadAdminContent(session).then((content) => {
      if (active) { setAdminReviews(content.reviews); setSettings(content.settings); }
    }).catch(() => { if (active) setLoginError('Could not load shared site content. Please sign in again.'); });
    return () => { active = false; };
  }, [session]);

  const update = (id, field, value, commit = false) => {
    const next = orders.map((order) => order.id === id ? { ...order, [field]: value } : order);
    setOrders(next);
    if (!supabaseReady) write(STORAGE.orders, next);
    else if (session && commit) updateRemoteOrder(id, { [field]: value }, session).catch(() => setLoginError('Could not save that change. Please try again.'));
  };

  const acceptOrder = async (order) => {
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { status: 'Accepted' }, session);
      update(order.id, 'status', 'Accepted');
    } catch {
      setLoginError('Could not accept the order. Please try again.');
    }
  };

  const rejectOrder = async (order) => {
    const messageWindow = window.open('about:blank', '_blank');
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { status: 'Rejected' }, session);
      update(order.id, 'status', 'Rejected');
      if (messageWindow) messageWindow.location.href = whatsappTo(order.phone, `Hello ${order.name}, thank you for your Sukkar order request ${order.id}. We’re sorry, but we can’t accept this request. Please contact us if you’d like to discuss another date or idea.`);
    } catch {
      if (messageWindow) messageWindow.close();
      setLoginError('Could not reject the order. Please try again.');
    }
  };

  const markReady = async (order) => {
    const collectionTime = normalizeTimeValue(order.pickupTime);
    if (!order.cost || !collectionTime) return;
    const messageWindow = window.open('about:blank', '_blank');
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { status: 'Ready for collection', pickupTime: collectionTime }, session);
      const next = orders.map((item) => item.id === order.id ? { ...item, pickupTime: collectionTime, status: 'Ready for collection' } : item);
      setOrders(next);
      if (!supabaseReady) write(STORAGE.orders, next);
      const messageUrl = whatsappTo(order.phone, `Hello ${order.name}, your Sukkar order ${order.id} is ready for collection on ${formatDate(order.date)} at ${formatCollectionTime(collectionTime)}. The agreed total is ${formatPrice(order.cost)}. We look forward to seeing you!`);
      if (messageWindow) messageWindow.location.href = messageUrl;
    } catch {
      if (messageWindow) messageWindow.close();
      setLoginError('Could not update the order. Please try again.');
    }
  };

  const sendPriceProposal = async (order) => {
    if (!order.cost) return;
    const messageWindow = window.open('about:blank', '_blank');
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { cost: order.cost, status: 'Awaiting price agreement' }, session);
      update(order.id, 'status', 'Awaiting price agreement');
      const messageUrl = whatsappTo(order.phone, `Hello ${order.name}, good news — we’ve accepted your Sukkar order ${order.id}. The proposed price is ${formatPrice(order.cost)}. Please sign in to My orders to accept or reject the price. Thank you!`);
      if (messageWindow) messageWindow.location.href = messageUrl;
    } catch {
      if (messageWindow) messageWindow.close();
      setLoginError('Could not send the price proposal. Please try again.');
    }
  };

  const deleteOrder = async (id) => {
    try {
      if (supabaseReady && session) await deleteRemoteOrder(id, session);
      const next = orders.filter((order) => order.id !== id);
      setOrders(next);
      if (!supabaseReady) write(STORAGE.orders, next);
    } catch {
      setLoginError('Could not delete the order. Please try again.');
    }
  };

  const markCollected = deleteOrder;

  const saveSettings = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = { phone: data.get('phone'), address: data.get('address') };
    try {
      if (supabaseReady && session) await saveRemoteSettings(next, session);
      write(STORAGE.settings, next);
      setSettings(next);
      setSaved(true);
    } catch { setLoginError('Could not save site details. Please try again.'); }
  };

  const addCategory = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = data.get('category').trim();
    const next = [...new Set([...categoryList, name])];
    try {
      if (supabaseReady && session) await saveRemoteCategory(name, next.length, session);
    } catch { setLoginError('Could not add that category. Please try again.'); return; }
    setCategoryList(next);
    write('sukkar-categories', next);
    event.currentTarget.reset();
    setSaved(true);
  };

  const deleteCategory = async (name) => {
    try { if (supabaseReady && session) await deleteRemoteCategory(name, session); }
    catch { setLoginError('Could not remove that category. Please try again.'); return; }
    const next = categoryList.filter((item) => item !== name);
    setCategoryList(next);
    write('sukkar-categories', next);
    if (name === selectedGalleryCategory) setSelectedGalleryCategory(next.find((item) => item !== 'All treats') || 'Chocolate');
  };

  const addPhotos = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const selected = [...form.elements.photos.files];
    if (!selected.length) return;
    const photoName = data.get('photoName').trim();
    if (!photoName) { setLoginError('Enter a name for the gallery photo.'); return; }
    try {
      if (supabaseReady && session) {
        const added = await uploadRemoteGalleryPhotos(selected, { name: photoName, description: data.get('description').trim(), category: data.get('category') }, session);
        const next = [...extraPhotos, ...added];
        setExtraPhotos(next);
        setSaved(true);
        form.reset();
        return;
      }
      const added = await Promise.all(selected.map(async (file) => ({
        id: crypto.randomUUID(),
        name: photoName,
        description: data.get('description').trim(),
        category: data.get('category'),
        occasion: '',
        image: await fileToDataUrl(file),
      })));
      const next = [...extraPhotos, ...added];
      setExtraPhotos(next);
      write(STORAGE.photos, next);
      setSaved(true);
      form.reset();
    } catch {
      setLoginError('Could not add that photo. Please try again.');
    }
  };

  const changePhotoCategory = async (id, category) => {
    const item = galleryItems.find((photo) => photo.id === id);
    try {
      if (supabaseReady && session) {
        if (products.some((photo) => photo.id === id)) await saveRemoteProductOverride({ ...item, category }, session);
        else await updateRemoteGalleryItem(id, { category }, session);
      }
    } catch { setLoginError('Could not save the photo category. Please try again.'); return; }
    const next = { ...photoCategories, [id]: category };
    setPhotoCategories(next);
    write('sukkar-photo-categories', next);
  };

  const changePhotoDescription = async (id, description) => {
    const item = galleryItems.find((photo) => photo.id === id);
    try {
      if (supabaseReady && session) {
        if (products.some((photo) => photo.id === id)) await saveRemoteProductOverride({ ...item, description }, session);
        else await updateRemoteGalleryItem(id, { description }, session);
      }
    } catch { setLoginError('Could not save the photo description. Please try again.'); return; }
    const next = { ...photoDescriptions, [id]: description };
    setPhotoDescriptions(next);
    write('sukkar-photo-descriptions', next);
  };

  const changeGalleryPhotoName = async (id, name) => {
    const item = galleryItems.find((photo) => photo.id === id);
    try {
      if (supabaseReady && session) {
        if (products.some((photo) => photo.id === id)) await saveRemoteProductOverride({ ...item, name }, session);
        else await updateRemoteGalleryItem(id, { name }, session);
      }
    } catch { setLoginError('Could not save the photo name. Please try again.'); return; }
    const next = { ...galleryPhotoNames, [id]: name };
    setGalleryPhotoNames(next);
    write('sukkar-photo-names', next);
  };

  const removePhoto = async (id) => {
    const item = galleryItems.find((photo) => photo.id === id);
    try {
      if (supabaseReady && session) {
        if (products.some((photo) => photo.id === id)) {
          const isVisible = !item.isVisible;
          await saveRemoteProductOverride({ ...item, isVisible }, session);
          setPhotoVisibility((current) => ({ ...current, [id]: isVisible }));
          const next = item.isVisible ? [...new Set([...removedPhotoIds, id])] : removedPhotoIds.filter((photoId) => photoId !== id);
          setRemovedPhotoIds(next);
        }
        else await deleteRemoteGalleryItem(item, session);
      }
    } catch { setLoginError('Could not remove that gallery photo. Please try again.'); return; }
    if (products.some((photo) => photo.id === id)) {
      const next = item.isVisible ? [...new Set([...removedPhotoIds, id])] : removedPhotoIds.filter((photoId) => photoId !== id);
      setRemovedPhotoIds(next);
      write('sukkar-removed-photos', next);
      return;
    }
    const next = extraPhotos.filter((photo) => photo.id !== id);
    setExtraPhotos(next);
    write(STORAGE.photos, next);
  };

  const moderateReview = async (review, isPublished) => {
    try {
      if (supabaseReady && session) await saveRemoteReview(review.id, isPublished, session);
      setAdminReviews((current) => current.map((item) => item.id === review.id ? { ...item, isPublished } : item));
    } catch { setLoginError('Could not update that review. Please try again.'); }
  };

  const removeReview = async (review) => {
    try {
      if (supabaseReady && session) await deleteRemoteReview(review.id, session);
      setAdminReviews((current) => current.filter((item) => item.id !== review.id));
    } catch { setLoginError('Could not delete that review. Please try again.'); }
  };

  const login = async (event) => {
    event.preventDefault();
    setLoading(true);
    setLoginError('');
    const data = new FormData(event.currentTarget);
    try {
      setSession(await signInAdmin(data.get('email'), data.get('password')));
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page">
      <PageIntro eyebrow="Sukkar studio" title={<>A little <em>dashboard.</em></>} text="Manage customer requests and your public gallery details." />
      {supabaseReady ? (
        <div className="admin-banner">
          <strong>{session ? 'Supabase connected' : 'Admin sign-in'}</strong>
          <span>{session ? `Signed in as ${session.user?.email}` : 'Sign in with the owner account to view customer orders.'}
            {session && <button className="admin-signout" onClick={() => { signOutAdmin(); setSession(null); setOrders([]); }}>Sign out</button>}
          </span>
        </div>
      ) : (
        <div className="admin-banner"><strong>Local preview mode</strong><span>Set up Supabase using the included project guide to share data securely between customers and the dashboard.</span></div>
      )}
      {supabaseReady && !session ? (
        <form className="admin-login form-panel" onSubmit={login}>
          <label>Email address<input type="email" name="email" required autoComplete="username" /></label>
          <label>Password<PasswordInput id="admin-password" name="password" required autoComplete="current-password" /></label>
          <button className="button" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'} <ArrowRight size={15} /></button>
          {loginError && <p className="error-message">{loginError}</p>}
        </form>
      ) : (
        <>
          <section className="admin-section">
            <div className="admin-section-title"><div><span className="eyebrow">Customer requests</span><h2>Orders <span>{orders.length}</span></h2></div></div>
            {orders.length ? orders.map((order) => (
              <article className="admin-order" key={order.id}>
                <div className="admin-order-info">
                  <div className="order-card-top"><span className="eyebrow">{order.id} · {new Date(order.createdAt || Date.now()).toLocaleDateString()}</span></div>
                  <h3>{order.name}</h3><p>{order.description}</p>
                  <div className="order-meta">
                    <span>Phone<strong>{order.phone}</strong></span><span>Email<strong>{order.email}</strong></span>
                    <span>Collection<strong>{formatDate(order.date)}</strong></span><span>Allergies<strong>{order.allergies || 'None noted'}</strong></span>
                    <span>{order.status === 'Awaiting price agreement' || order.status === 'Accepted' ? 'Proposed price' : 'Agreed price'}<strong>{order.cost ? formatPrice(order.cost) : 'To be agreed'}</strong></span>
                    <span>Customer preferred time<strong>{order.preferredPickupTime || 'Not provided'}</strong></span>
                    <span>Photos<strong>{supabaseReady ? <OrderPhotos paths={order.photoPaths} previews={order.photoPreviews} session={session} /> : order.photoPreviews?.length ? <OrderPhotos previews={order.photoPreviews} /> : order.photoNames?.join(', ') || 'None attached'}</strong></span>
                  </div>
                  <OrderStatusJourney status={order.status} admin collectionTime={order.pickupTime} />
                </div>
                <div className="admin-order-actions">
                  {order.status === 'Awaiting details' && <>
                    <button className="button" onClick={() => acceptOrder(order)}>Accept order <MessageCircle size={15} /></button>
                    <button className="collected-button" onClick={() => rejectOrder(order)}>Reject order</button>
                  </>}
                  {(order.status === 'Accepted' || order.status === 'Price declined') && <>
                    <label>Price to agree<div className="price-input-wrap"><input value={String(order.cost || '').replace(/\s*SYP$/i, '')} onChange={(event) => update(order.id, 'cost', event.target.value)} onBlur={(event) => update(order.id, 'cost', event.target.value, true)} placeholder="e.g. 25,000" /><span>SYP</span></div></label>
                    <button className="button" disabled={!order.cost} onClick={() => sendPriceProposal(order)}>Send price proposal <MessageCircle size={15} /></button>
                    {order.status === 'Price declined' && <button className="collected-button" onClick={() => deleteOrder(order.id)}>Delete declined order <X size={14} /></button>}
                  </>}
                  {order.status === 'Awaiting price agreement' && <p className="admin-price-waiting">Waiting for customer response to <strong>{formatPrice(order.cost)}</strong>.</p>}
                  {order.status === 'Preparing' && <>
                    <div className="collection-time-field"><span>Collection time to send</span><PreferredTimeWheelPicker value={order.pickupTime} label="collection time" onChange={(value) => update(order.id, 'pickupTime', value)} /></div>
                    <button className="button" disabled={!normalizeTimeValue(order.pickupTime)} onClick={() => markReady(order)}>Ready to collect — send time <MessageCircle size={15} /></button>
                  </>}
                  {order.status === 'Ready for collection' && <button className="button" onClick={() => markCollected(order.id)}>Mark as collected <ArrowRight size={14} /></button>}
                  {order.status === 'Rejected' && <button className="collected-button" onClick={() => markCollected(order.id)}>Remove declined order <X size={14} /></button>}
                </div>
              </article>
            )) : <div className="empty-state">New customer requests will appear here.</div>}
          </section>
          <section className="admin-section">
            <div><span className="eyebrow">Customer notes</span><h2>Reviews <span>{adminReviews.length}</span></h2><p>New customer reviews stay hidden until you approve them.</p></div>
            <div className="reviews-list">
              {adminReviews.length ? adminReviews.map((review) => <article className="review-card" key={review.id}><ReviewStars rating={review.rating}/><p>{review.quote}</p><span className="review-by">{review.name} · {review.isPublished ? 'Published' : 'Pending approval'}</span><div className="account-gate-actions">{!review.isPublished && <button className="button" type="button" onClick={() => moderateReview(review, true)}>Publish review</button>}<button className="collected-button" type="button" onClick={() => removeReview(review)}>Delete review</button></div></article>) : <p className="empty-state">No customer reviews have been submitted yet.</p>}
            </div>
          </section>
          <section className="admin-section admin-settings">
            <div><span className="eyebrow">Public details</span><h2>Keep in touch</h2><p>Update the phone number and collection location shown on the site.</p></div>
            <form key={shared ? 'shared-settings-loaded' : 'settings-loading'} onSubmit={saveSettings} className="form-grid">
              <label>WhatsApp / phone<input name="phone" defaultValue={settings.phone || '+963 982 769 168'} /></label>
              <label>Address<input name="address" defaultValue={settings.address || 'Sadad, Homs, Syria'} /></label>
              <button className="button">Save details <ArrowRight size={15} /></button>
              {saved && <span className="success-message">{supabaseReady ? 'Saved to the shared site.' : 'Saved on this device.'}</span>}
            </form>
          </section>
          <section className="admin-section admin-settings">
            <div><span className="eyebrow">Gallery collections</span><h2>Categories</h2>
              <div className="category-admin">{categoryList.map((category) => <span key={category}>{category}{category !== 'All treats' && <button aria-label={`Remove ${category}`} onClick={() => deleteCategory(category)}><X size={13} /></button>}</span>)}</div>
            </div>
            <form className="category-add" onSubmit={addCategory}>
              <label>Add a category<input name="category" required maxLength="40" placeholder="e.g. Graduation" /></label>
              <button className="button">Add category <ArrowRight size={15} /></button>
            </form>
          </section>
          <section className="admin-section">
            <div><span className="eyebrow">Gallery images</span><h2>Add a photo</h2><p>Add a name, description and category for the photos you upload.</p>
              <form className="admin-photo-form form-grid" onSubmit={addPhotos}>
                <label className="full-field">Photo name<input name="photoName" required maxLength="100" placeholder="e.g. Chocolate birthday box" /></label>
                <label className="photo-category-select">Photo category
                  <select name="category" value={activeGalleryCategory} onChange={(event) => setSelectedGalleryCategory(event.target.value)} required>
                    {galleryCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
                <label className="full-field">Photo description<textarea name="description" required maxLength="300" rows="3" placeholder="Describe the treat, colours, details or occasion…" /></label>
                <label className="full-field upload-field">Choose photos<input name="photos" type="file" accept="image/*" multiple required /></label>
                <button className="button" type="submit">Add to gallery <ArrowRight size={15} /></button>
              </form>
              <div className="gallery-admin-list">{galleryItems.map((item) => (
                <div key={item.id}>
                  <img src={item.image} alt={item.name} />
                  <label className="photo-name-edit">Photo name<input value={item.name || ''} maxLength="100" placeholder="Add a photo name" onChange={(event) => changeGalleryPhotoName(item.id, event.target.value)} /></label>
                  <label className="photo-description-edit">Description<textarea value={item.description || ''} maxLength="300" rows="3" placeholder="Add a short description" onChange={(event) => changePhotoDescription(item.id, event.target.value)} /></label>
                  <label className="photo-category-select">Category
                    <select value={item.category} onChange={(event) => changePhotoCategory(item.id, event.target.value)}>
                      {galleryCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                    </select>
                  </label>
                  <button className="collected-button" onClick={() => removePhoto(item.id)}>{item.isVisible ? 'Remove photo' : 'Restore photo'}</button>
                </div>
              ))}</div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
function App() {
  return <BrowserRouter><ScrollToTop/><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path="/gallery" element={<Gallery/>}/><Route path="/reviews" element={<Reviews/>}/><Route path="/custom" element={<CustomOrder/>}/><Route path="/contact" element={<Contact/>}/><Route path="/my-orders" element={<MyOrders/>}/><Route path="/sign-in" element={<CustomerAuth/>}/><Route path="/register" element={<CustomerAuth register/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Home/>}/></Routes><Footer/><Link className="floating-order" to="/custom"><Heart size={15} fill="currentColor"/> Make it yours</Link></BrowserRouter>;
}

export default App;







