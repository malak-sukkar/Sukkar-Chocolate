import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowRight, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock3, Eye, EyeOff, Heart, Mail, MapPin, Menu, Phone, UserRound, X } from 'lucide-react';
import { FaFacebookF, FaInstagram } from 'react-icons/fa';
import { createRemoteOrder, deleteRemoteGalleryItem, deleteRemoteOrder, deleteRemoteReview, deleteRemoteCategory, getAdminSession, getCustomerSession, listCustomerOrders, listRemoteOrders, loadAdminContent, loadPublicContent, registerCustomer, respondToPrice, savePublicReview, saveRemoteCategory, saveRemoteProductOverride, saveRemoteReview, saveRemoteSettings, sendSiteEmail, signInAdmin, signInCustomer, signOutAdmin, signOutCustomer, signedOrderPhoto, supabaseReady, updateAdminEmail, updateAdminPassword, updateCustomerEmail, updateCustomerPassword, updateRemoteGalleryItem, updateRemoteOrder, uploadRemoteGalleryPhotos } from './lib/supabase';
import { products } from './data/products';
import { reviews as initialReviews } from './data/reviews';
import { countryCallingCodes } from './data/countryCallingCodes';
import heroImage from './assets/hero.jpg';
import customImage from './assets/custom.jpg';
import aboutImage from './assets/about.jpg';
import ourStoryImage from './assets/our-story.jpg';
import logo from './assets/logo.png';
import './App.css';

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
const isPreferredCollectionTimeAllowed = (value) => {
  const normalized = normalizeTimeValue(value);
  if (!normalized) return false;
  const [hour, minute] = normalized.split(':').map(Number);
  const minutesSinceMidnight = hour * 60 + minute;
  return minutesSinceMidnight >= 10 * 60 && minutesSinceMidnight <= 22 * 60;
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

function PreferredTimeWheelPicker({ name, value = '', onChange, label = 'preferred collection time', invalid = false }) {
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
    <button className="preferred-time-trigger" type="button" aria-label={`Choose ${label}`} aria-haspopup="dialog" aria-expanded={open} aria-required="true" aria-invalid={invalid} aria-describedby={invalid ? 'preferred-time-error' : undefined} onClick={() => setOpen((current) => !current)}>
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
  const navRef = useRef(null);
  const toolsRef = useRef(null);
  useEffect(() => {
    const updateCustomer = () => setCustomer(getCustomerSession());
    window.addEventListener('sukkar-customer-auth', updateCustomer);
    return () => window.removeEventListener('sukkar-customer-auth', updateCustomer);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsidePress = (event) => {
      if (!navRef.current?.contains(event.target) && !toolsRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [open]);
  const links = [['Home', '/'], ['Our story', '/about'], ['Gallery', '/gallery'], ['Reviews', '/reviews'], ['My order', '/my-orders'], ['Contact', '/contact']];
  return <header className="site-header"><Link to="/" className="brand" aria-label="Sukkar Chocolate home"><img src={logo} alt="Sukkar Chocolate" /></Link><nav ref={navRef} className={open ? 'main-nav nav-open' : 'main-nav'}>{links.map(([label, path]) => <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}>{label}</NavLink>)}{customer ? <button className="customer-signout" onClick={() => { signOutCustomer(); setCustomer(null); setOpen(false); window.dispatchEvent(new Event('sukkar-customer-auth')); }}>Sign out</button> : <><NavLink to="/sign-in" onClick={() => setOpen(false)}>Sign in</NavLink><NavLink to="/register" onClick={() => setOpen(false)}>Register</NavLink></>}<div className="nav-primary-actions">{customer && <NavLink className="account-nav-icon" to="/account" aria-label="Account settings" title="Account settings" onClick={() => setOpen(false)}><UserRound size={20}/></NavLink>}<Link className="nav-order" to="/custom" onClick={() => setOpen(false)}>Make an order <ArrowRight size={15}/></Link></div></nav><div className="header-tools" ref={toolsRef}><button className="menu-toggle" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></header>;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname, hash]);
  return null;
}

function Footer() {
  const shared = usePublicContent();
  const settings = shared?.settings || read(STORAGE.settings, {});
  return <footer className="site-footer"><div className="footer-main"><div><img className="footer-brand" src={logo} alt="Sukkar Chocolate"/><p>Little handmade moments,<br/>made to be shared.</p></div><div><h3>Explore</h3><Link to="/gallery">The gallery</Link><Link to="/about">Our story</Link><Link to="/reviews">Kind words</Link><Link to="/my-orders">My order</Link><Link to="/admin">Admin Dashboard</Link></div><div><h3>Have a sweet idea?</h3><p>Tell us what you’re dreaming of.</p><Link className="footer-link" to="/custom"><span>Create a custom order</span><ArrowRight size={15}/></Link></div><div><h3>Find us</h3><p><Phone size={15}/> {settings.phone || '+963 982 769 168'}</p>{settings.email && <a className="social-link" href={`mailto:${settings.email}`}><Mail size={15}/> {settings.email}</a>}<Link className="social-link" to="/#location"><MapPin size={15}/> {settings.address || 'Sadad, Homs, Syria'}</Link><a className="social-link" href="https://www.instagram.com/sukkar_chocolate/" target="_blank" rel="noreferrer"><FaInstagram size={16}/> Instagram</a><a className="social-link" href="https://www.facebook.com/share/1B7mhzjcAi/" target="_blank" rel="noreferrer"><FaFacebookF size={16}/> Facebook</a></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Sukkar Chocolate</span><span>Handmade with care, in Homs.</span></div></footer>;
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

function OrderNote({ compact = false }) { return <div className={`order-note ${compact ? 'compact' : ''}`}><span className="note-icon"><Clock3 size={19}/></span><div><strong>Made just for you, with a little time</strong><p>Please place your order at least 3 days before collection. We’ll agree the price together by email before we begin, and you can pay when you collect.</p></div></div>; }

function ReviewCarousel({ reviews }) {
  const [index, setIndex] = useState(0);
  if (!reviews.length) return <div className="empty-reviews review-home-card"><span>♡</span><p>We’re waiting for the first kind words. Have ordered from Sukkar? We’d love to hear from you.</p><Link to="/reviews">Leave a review <ArrowRight size={15}/></Link></div>;
  const review = reviews[index % reviews.length];
  return <div className="review-carousel review-home-card"><p className="review-by">{review.name}</p><ReviewStars rating={review.rating}/><blockquote>{review.quote}</blockquote><div className="carousel-controls"><span>{String(index + 1).padStart(2, '0')} <i>/ {String(reviews.length).padStart(2, '0')}</i></span><button aria-label="Previous review" onClick={() => setIndex((index - 1 + reviews.length) % reviews.length)}><ChevronLeft/></button><button aria-label="Next review" onClick={() => setIndex((index + 1) % reviews.length)}><ChevronRight/></button></div></div>;
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
  const localSettings = read(STORAGE.settings, {});
  const location = shared?.settings?.address || localSettings.address || 'Sadad, Homs, Syria';
  const mapLocation = shared?.settings?.mapLocation || localSettings.mapLocation || SUKKAR_MAP_PIN;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapLocation)}`;
  const homeProducts = products.map((item) => ({ ...item, image: shared?.overrides?.[item.id]?.image || item.image }));
  const reviewItems = shared?.reviews || read(STORAGE.reviews, initialReviews);
  return <main><section className="hero-section" style={{ '--hero-image': `url(${heroImage})` }}><div className="hero-copy"><span className="eyebrow">Handmade with love</span><h1>Make a moment<br/>a little <em>sweeter.</em></h1><p>Personalised chocolate and celebration treats, made by hand for the people and days you love.</p><div className="hero-actions"><ButtonLink to="/custom">Create a custom order</ButtonLink><Link className="button button-outline" to="/gallery">View gallery <ArrowDown size={15}/></Link></div></div></section>
    <section className="intro-band"><span className="eyebrow">A little Sukkar goes a long way</span><p>From a name spelled in chocolate to a whole celebration table, tell us what you have in mind. <em>We’ll make it yours.</em></p></section>
    <section className="story-strip"><div className="story-copy"><span className="eyebrow">A thoughtful kind of sweet</span><h2>Made by hand.<br/><em>Made for your moment.</em></h2><p>Every order begins with your idea. We shape, decorate and finish each piece with care, so it feels just right for the person receiving it.</p><ButtonLink to="/about" className="button-outline">Meet Sukkar</ButtonLink></div><div className="story-image"><img src={aboutImage} alt="Handmade chocolate treats prepared for a special occasion"/><span>Made with care, one order at a time</span></div></section>
    <section className="occasions-section" id="occasions"><div className="section-heading"><div><span className="eyebrow">The days worth celebrating</span><h2>Sweetness for <em>every occasion.</em></h2></div><Link className="text-link" to="/gallery">Explore all the treats <ArrowRight size={16}/></Link></div><div className="occasion-cards">{[{ label:'Birthdays', photo:homeProducts[0]?.image, sub:'A little extra happy'},{label:'Baby showers', photo:homeProducts[17]?.image, sub:'For the newest arrival'},{label:'Just because', photo:homeProducts[19]?.image, sub:'No reason needed'}].map((item, i)=><Link to="/gallery" className={`occasion-card occasion-${i+1}`} key={item.label}><img src={item.photo} alt=""/><div><span>{item.sub}</span><h3>{item.label}</h3></div><ArrowRight size={17}/></Link>)}</div></section>
    <section className="custom-feature"><div className="custom-photo"><img src={customImage} alt="Handmade chocolate gift boxes decorated for a baptism"/></div><div className="custom-feature-copy"><span className="eyebrow">Your idea, our little workshop</span><h2>Tell us what<br/>you’re <em>imagining.</em></h2><p>Send a description, a reference photo and your collection date. We’ll talk through the details and price together before anything is made.</p><ButtonLink to="/custom">Start a custom order</ButtonLink><span className="small-note">A few words or a full moodboard — either is lovely.</span></div></section>
    <section className="promise-section"><div className="promise-heading"><span className="eyebrow">Good to know</span><h2>A few things before<br/><em>the first bite.</em></h2></div><div className="promise-content"><OrderNote compact/><div className="faq-mini"><h3>What about allergies?</h3><p>Please include any allergies in your request. We’ll confirm the ingredients and whether we can accommodate them before you place your order.</p><Link to="/contact">Ask us a question <ArrowRight size={14}/></Link></div></div></section>
    <section className="reviews-section"><div className="reviews-heading"><span className="eyebrow">A few kind words</span><h2>From our table <em>to yours.</em></h2><Link to="/reviews" className="text-link">Read all reviews <ArrowRight size={15}/></Link></div><ReviewCarousel reviews={reviewItems}/></section>
    <section className="home-location" id="location"><div className="home-location-copy"><span className="eyebrow">Find Sukkar</span><h2>A little sweetness,<br/><em>close to home.</em></h2><p>Visit us in person or open the map for directions to our location.</p><div className="home-location-address"><MapPin size={17}/><span>{location}</span></div><a className="button" href={directionsUrl} target="_blank" rel="noreferrer">Get directions <ArrowRight size={16}/></a></div><div className="home-location-map"><iframe title={`Map showing Sukkar Chocolate at ${location}`} src={`https://maps.google.com/maps?q=${encodeURIComponent(mapLocation)}&z=16&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen /></div></section>
    </main>;
}

function About() { return <main className="inner-page"><PageIntro eyebrow="The hands behind the chocolate" title={<>A little story,<br/><em>made with love.</em></>} text="Sukkar began with a love of chocolate and the happiness that comes with sharing something made just for you."/><section className="about-layout"><div className="about-photo"><img src={ourStoryImage} alt="Sukkar’s chocolatier preparing handmade chocolate in her workshop"/><span>Handmade with care at Sukkar</span></div><div className="about-copy"><span className="eyebrow">Our story</span><h2>Small beginnings.<br/><em>Sweet intentions.</em></h2><p>Sukkar grew from a simple thought: the best gifts feel personal. A favourite colour, a name, a tiny detail only you would know — those are the things that make a treat feel like it belongs to someone.</p><p>Today, each order is still made by hand. We listen to your idea, share the details and make your chocolate especially for the occasion.</p><p>Thank you for being part of our story. We’re glad you’re here.</p><ButtonLink to="/custom">Make something together</ButtonLink></div></section><OrderNote/></main>; }

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
  const [visibleCount, setVisibleCount] = useState(6);
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
    const review = { id: crypto.randomUUID(), name: data.get('name'), quote: data.get('review'), rating, website: data.get('website') };
    try {
      if (supabaseReady) await savePublicReview(review);
      else { const next = [review, ...items]; write(STORAGE.reviews,next); setItems(next); }
      setSubmitted(true); setRating(0); setRatingError(''); form.reset();
    } catch { setSubmitError('We could not submit your review. Please try again.'); }
  };
  const visibleItems = items.slice(0, visibleCount);
  const remainingReviews = items.length - visibleItems.length;
  const nextReviewCount = Math.min(6, remainingReviews);
  return <main className="inner-page"><PageIntro eyebrow="Notes from our customers" title={<>The sweetest <em>words.</em></>} text="A little note after a special day means the world to us."/><div className="reviews-list" id="customer-reviews">{items.length ? visibleItems.map((review)=><article className="review-card" key={review.id}><span className="review-by">{review.name}</span><ReviewStars rating={review.rating}/><p>{review.quote}</p></article>) : <div className="empty-state">No reviews yet. Be the first to share a little note.</div>}</div>{visibleCount > 6 || remainingReviews > 0 ? <div className="reviews-load-more">{visibleCount > 6 && <button className="button button-outline" type="button" aria-controls="customer-reviews" onClick={() => setVisibleCount(6)}>Show less</button>}{remainingReviews > 0 && <button className="button button-outline" type="button" aria-controls="customer-reviews" onClick={() => setVisibleCount((count) => count + 6)}>Show {nextReviewCount} more {nextReviewCount === 1 ? 'review' : 'reviews'}</button>}</div> : null}<section className="form-panel review-form-panel"><span className="eyebrow">Leave a little note</span><h2>How was your <em>Sukkar?</em></h2><form onSubmit={addReview} className="form-grid"><label className="email-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off"/></label><label>Your name<input name="name" required maxLength="60" placeholder="The name you’d like us to use"/></label><fieldset className="full-field review-rating-field"><legend>Your rating</legend><div className="rating-picker" role="group" aria-label="Choose a star rating">{[1,2,3,4,5].map((stars)=><button key={stars} type="button" className={stars <= rating ? 'rating-star selected' : 'rating-star'} aria-label={`${stars} ${stars===1?'star':'stars'}`} aria-pressed={rating===stars} onClick={()=>{setRating(stars);setRatingError('');}}>{stars <= rating ? '★' : '☆'}</button>)}</div>{ratingError&&<small className="error-message" role="alert">{ratingError}</small>}</fieldset><label className="full-field">Your review<textarea name="review" required maxLength="500" rows="4" placeholder="Tell us what made it special…"/></label><button className="button" type="submit">Share your review <ArrowRight size={16}/></button></form></section>{submitted&&<p className="success-message review-success-outside" role="status">{supabaseReady ? 'Thank you — your review has been sent for approval.' : 'Thank you — your kind words have been added.'}</p>}{submitError&&<p className="error-message review-error-outside" role="alert">{submitError}</p>}</main>;
}

function CustomOrder() {
  const [done, setDone] = useState(null); const [error,setError]=useState(''); const [sending,setSending]=useState(false);
  const [preferredTimeError, setPreferredTimeError] = useState('');
  const [hasAllergies, setHasAllergies] = useState('no');
  const [customerSession, setCustomerSession] = useState(getCustomerSession);
  useEffect(() => { const syncSession = () => setCustomerSession(getCustomerSession()); window.addEventListener('sukkar-customer-auth', syncSession); return () => window.removeEventListener('sukkar-customer-auth', syncSession); }, []);
  if (!customerSession?.access_token) return <main className="inner-page account-page"><PageIntro eyebrow="Before you order" title={<>Sign in to <em>make it yours.</em></>} text="Please sign in or register before sending a custom order request."/><section className="form-panel account-panel account-gate"><p>{supabaseReady ? 'Your order details will be submitted securely with your account.' : 'Preview mode: create a test account to try the order flow. Preview orders stay in this browser.'}</p><div className="account-gate-actions"><Link className="button" to="/sign-in?next=%2Fcustom">Sign in <ArrowRight size={15}/></Link><Link className="button button-outline" to="/register?next=%2Fcustom">Create account <ArrowRight size={15}/></Link></div></section></main>;
  const submit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = [...form.elements.photos.files];
    if (files.length > 5) return;
    const collectionDate = data.get('date');
    if (!collectionDate) { setError('Choose a collection date.'); return; }
    const preferredPickupTime = data.get('pickupTime');
    if (!preferredPickupTime) { setError('Choose your preferred collection time.'); return; }
    if (!isPreferredCollectionTimeAllowed(preferredPickupTime)) {
      setError('');
      setPreferredTimeError('Choose a time between 10:00 AM and 10:00 PM.');
      return;
    }
    setPreferredTimeError('');
    setSending(true);
    setError('');
    const order = { id: `SK-${crypto.randomUUID().slice(0,8).toUpperCase()}`, firstName:data.get('firstName'), lastName:data.get('lastName'), name:[data.get('firstName'), data.get('lastName')].filter(Boolean).join(' '), phone:readPhone(data), email:data.get('email'), customerUserId:customerSession.user.id, description:data.get('description'), date:collectionDate, allergies:hasAllergies === 'yes' ? data.get('allergies') : 'No', photoNames:files.map(file=>file.name), status:'Awaiting details', cost:'', preferredPickupTime, pickupTime:'', createdAt:new Date().toISOString() };
    try {
      const savedOrder = supabaseReady ? await createRemoteOrder(order, files, customerSession) : { ...order, trackingToken: crypto.randomUUID(), photoPaths: [], photoPreviews: await Promise.all(files.map(fileToDataUrl)) };
      const saved=read(STORAGE.orders,[]);
      write(STORAGE.orders,[{...savedOrder,photoNames:order.photoNames},...saved]);
      let emailError = '';
      try { await sendSiteEmail('order_submitted', { orderId: order.id }, customerSession); }
      catch (cause) { emailError = cause.message || 'We could not email Sukkar. Please contact us using the email address on the site.'; }
      setDone({ ...order, emailError });
      form.reset();
      setHasAllergies('no');
    } catch (cause) {
      setError(cause.message || 'We could not save your request. Please try again.');
    } finally { setSending(false); }
  };
  return <main className="inner-page order-page"><PageIntro eyebrow="A treat that starts with your idea" title={<>Let’s make it <em>yours.</em></>} text="Tell us what you’re picturing and when you’d like to collect it. You can add up to five reference photos."/><div className="order-layout"><section className="form-panel"><form onSubmit={submit} className="form-grid"><label>First name<input name="firstName" required autoComplete="given-name" defaultValue={customerSession.user?.user_metadata?.full_name?.split(' ')[0] || ''} placeholder="Your first name"/></label><label>Last name<input name="lastName" required autoComplete="family-name" defaultValue={customerSession.user?.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''} placeholder="Your last name"/></label><PhoneNumberField/><label>Email address<input name="email" type="email" required autoComplete="email" defaultValue={customerSession.user?.email || ''} placeholder="you@example.com"/></label><div className="date-field-label"><span>Collection date</span><DatePickerDropdown name="date" minDate={new Date(Date.now()+3*86400000).toISOString().slice(0,10)} required/></div><div className="time-field-label"><span>Preferred collection time</span><PreferredTimeWheelPicker name="pickupTime" invalid={Boolean(preferredTimeError)} onChange={(value) => setPreferredTimeError(isPreferredCollectionTimeAllowed(value) ? '' : 'Choose a time between 10:00 AM and 10:00 PM.')}/>{preferredTimeError && <small id="preferred-time-error" className="time-field-error" role="alert">{preferredTimeError}</small>}{!preferredTimeError && <small className="time-field-note">Choose a time between 10:00 AM and 10:00 PM.</small>}</div><label className="full-field">Describe your idea<textarea name="description" required minLength="10" maxLength="1500" rows="5" placeholder="Chocolate and filling, colours, message, size or occasion — share anything that helps us imagine it…"/></label><fieldset className="full-field allergy-field"><legend>Any allergies or dietary requirements?</legend><select name="hasAllergies" value={hasAllergies} onChange={(event) => setHasAllergies(event.target.value)}><option value="no">No</option><option value="yes">Yes</option></select>{hasAllergies === 'yes' && <label className="allergy-details">Please tell us about any allergies or dietary requirements<input name="allergies" required placeholder="e.g. nuts, dairy, gluten"/></label>}</fieldset><label className="full-field upload-field">Reference photos <span className="optional">(up to 5)</span><input name="photos" type="file" accept="image/*" multiple onChange={(event)=>{if(event.target.files.length>5) event.target.setCustomValidity('Please choose up to 5 photos.'); else event.target.setCustomValidity('');}}/><small>{supabaseReady ? 'Photos are uploaded privately with your request.' : 'Preview photos stay on this device and are not uploaded.'}</small></label><button className="button" type="submit" disabled={sending}>{sending?'Sending request…':'Send order request'} <ArrowRight size={16}/></button><p className="form-footnote">{supabaseReady ? 'Your request and photos are saved securely. You’ll receive an email and Sukkar will email you about the price before starting.' : 'Preview order saved only in this browser. Email sending requires the connected website setup.'}</p></form>{error&&<p className="error-message">{error}</p>}{done&&<div className="success-card"><span>✓</span><div><strong>Your request was saved — thank you!</strong><p>Reference <b>{done.id}</b>. {done.emailError ? 'The order is saved, but its email could not be sent.' : 'A confirmation email has been sent to you, and Sukkar has received your request.'}</p>{done.emailError&&<p className="error-message" role="alert">{done.emailError}</p>}<Link to="/my-orders">View my order <ArrowRight size={15}/></Link></div></div>}</section><aside className="order-aside"><OrderNote/><div className="aside-steps"><span className="eyebrow">A lovely little process</span><ol><li><span>01</span><div><strong>Tell us what you love</strong><p>Share your idea, date and inspiration.</p></div></li><li><span>02</span><div><strong>Agree the details</strong><p>We’ll confirm the price together by email.</p></div></li><li><span>03</span><div><strong>Collect and enjoy</strong><p>Pay when you collect your finished order.</p></div></li></ol></div></aside></div></main>;
}

function Contact() {
  const shared=usePublicContent(); const settings=shared?.settings || read(STORAGE.settings,{}); const [sent,setSent]=useState(false); const [error,setError]=useState(''); const [sending,setSending]=useState(false);
  const submit=async(event)=>{event.preventDefault();const form=event.currentTarget;const d=new FormData(form);setSending(true);setError('');setSent(false);try{await sendSiteEmail('contact',{name:d.get('name'),email:d.get('email'),message:d.get('message'),website:d.get('website')});setSent(true);form.reset();}catch(cause){setError(cause.message||'We could not send your email. Please try again.');}finally{setSending(false);}};
  return <main className="inner-page contact-page"><PageIntro eyebrow="We’re happy you’re here" title={<>Let’s have a <em>chat.</em></>} text="Questions, a special request or a little chocolate curiosity? Send us a note."/><div className="contact-layout"><section className="form-panel"><form onSubmit={submit} className="form-grid"><label>Your name<input name="name" required maxLength="100" placeholder="Your name"/></label><label>Email address<input name="email" type="email" required maxLength="254" placeholder="you@example.com"/></label><label className="full-field">Your message<textarea name="message" rows="5" required maxLength="4000" placeholder="How can we help?"/></label><label className="email-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off"/></label><button className="button" type="submit" disabled={sending}>{sending?'Sending email…':'Send email'} <ArrowRight size={16}/></button><small className="full-field">Your message will be sent to Sukkar by email.</small></form>{sent&&<p className="success-message" role="status">Your email has been sent. We look forward to chatting.</p>}{error&&<p className="error-message" role="alert">{error}</p>}</section><aside className="contact-details"><span className="eyebrow">Find Sukkar</span><h2>Let’s make<br/><em>something sweet.</em></h2>{settings.email&&<a href={`mailto:${settings.email}`}><Mail size={17}/>{settings.email}</a>}<p><MapPin size={17}/>{settings.address||'Sadad, Homs, Syria'}</p><a href="https://www.instagram.com/sukkar_chocolate/" target="_blank" rel="noreferrer"><FaInstagram size={17}/>Follow along on Instagram</a><a href="https://www.facebook.com/share/1B7mhzjcAi/" target="_blank" rel="noreferrer"><FaFacebookF size={17}/>Find us on Facebook</a><div className="contact-hours">Orders are made by request. Please allow at least 3 days before collection.</div></aside></div></main>;
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

function CustomerAccount() {
  const navigate=useNavigate();
  const [session,setSession]=useState(getCustomerSession);
  const accountName=String(session?.user?.user_metadata?.full_name||'').trim()||String(session?.user?.email||'').split('@')[0]||'there';
  const [saving,setSaving]=useState(false);
  const [emailMessage,setEmailMessage]=useState('');
  const [emailError,setEmailError]=useState('');
  const [passwordMessage,setPasswordMessage]=useState('');
  const [passwordError,setPasswordError]=useState('');

  useEffect(()=>{
    const syncSession=()=>setSession(getCustomerSession());
    window.addEventListener('sukkar-customer-auth',syncSession);
    window.addEventListener('storage',syncSession);
    return()=>{window.removeEventListener('sukkar-customer-auth',syncSession);window.removeEventListener('storage',syncSession);};
  },[]);
  useEffect(()=>{
    if(!session) navigate(`/sign-in?next=${encodeURIComponent('/account')}`,{replace:true});
  },[navigate,session]);

  const saveEmail=async(event)=>{
    event.preventDefault();
    const form=event.currentTarget;
    const email=new FormData(form).get('customerEmail').trim();
    setEmailError('');setEmailMessage('');
    if(email.toLowerCase()===String(session?.user?.email||'').toLowerCase()){setEmailError('Enter a different email address.');return;}
    setSaving(true);
    try{
      const updatedUser=await updateCustomerEmail(email,session);
      setSession((current)=>current?{...current,user:updatedUser}:current);
      setEmailMessage(supabaseReady?'Email change requested. Check your current and new email inboxes for Supabase confirmation links.':'Email updated for this local preview account.');
      form.reset();
    }catch(cause){
      const message=cause.message||'';
      setEmailError(/already (been )?registered|email_exists/i.test(message)?'That email is already in use. Choose an unused email address.':message||'Could not change your email. Please try again.');
    }finally{setSaving(false);}
  };
  const savePassword=async(event)=>{
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    const password=data.get('newPassword');
    setPasswordError('');setPasswordMessage('');
    if(password!==data.get('confirmPassword')){setPasswordError('The passwords do not match.');return;}
    setSaving(true);
    try{
      await updateCustomerPassword(password,session);
      setPasswordMessage('Your password has been changed.');
      form.reset();
    }catch(cause){setPasswordError(cause.message||'Could not change your password. Please try again.');}
    finally{setSaving(false);}
  };

  return <main className="inner-page account-settings-page"><PageIntro eyebrow={session?`Welcome, ${accountName}`:'Your Sukkar account'} title={<>Account <em>settings.</em></>} text="Update the email address or password you use to sign in."/>{session&&<section className="customer-account-settings"><div><span className="eyebrow">Account security</span><h2>Your sign-in details</h2><p>Keep your customer account details up to date.{!supabaseReady&&' Preview account changes are saved only in this browser.'}</p></div><div className="customer-account-forms"><form onSubmit={saveEmail} className="form-grid"><label className="full-field">Current email<input type="email" value={session.user?.email||''} readOnly /></label><label className="full-field">New email address<input name="customerEmail" type="email" required autoComplete="email" placeholder="new@example.com" /></label><button className="button" type="submit" disabled={saving}>{saving?'Saving…':'Change email'} <ArrowRight size={15}/></button>{emailMessage&&<p className="success-message full-field" role="status">{emailMessage}</p>}{emailError&&<p className="error-message full-field" role="alert">{emailError}</p>}</form><form onSubmit={savePassword} className="form-grid"><label className="full-field">New password<PasswordInput id="customer-new-password" name="newPassword" required minLength="8" autoComplete="new-password" placeholder="At least 8 characters" /></label><label className="full-field">Confirm new password<PasswordInput id="customer-confirm-password" name="confirmPassword" required minLength="8" autoComplete="new-password" placeholder="Enter the new password again" /></label><button className="button" type="submit" disabled={saving}>{saving?'Saving…':'Change password'} <ArrowRight size={15}/></button>{passwordMessage&&<p className="success-message full-field" role="status">{passwordMessage}</p>}{passwordError&&<p className="error-message full-field" role="alert">{passwordError}</p>}</form></div></section>}</main>;
}

function MyOrders() {
  const navigate = useNavigate();
  const location = useLocation();
  const [orders,setOrders]=useState(()=>normalizeOrderTimes(read(STORAGE.orders,[])));
  const [respondingOrder,setRespondingOrder]=useState(null);
  const [responseError,setResponseError]=useState('');
  const [questionOrder,setQuestionOrder]=useState(null);
  const [questionMessage,setQuestionMessage]=useState('');
  const lastScrolledHash = useRef('');
  useEffect(()=>{
    if (supabaseReady && !getCustomerSession()) {
      const next = `${location.pathname}${location.hash}`;
      navigate(`/sign-in?next=${encodeURIComponent(next)}`, { replace: true });
    }
  },[location.hash, location.pathname, navigate]);
  useEffect(()=>{
    if (!location.hash.startsWith('#order-')) {
      lastScrolledHash.current = '';
      return;
    }
    if (lastScrolledHash.current === location.hash) return;
    const orderId = decodeURIComponent(location.hash.slice('#order-'.length));
    const target = document.getElementById(`order-${orderId}`);
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      lastScrolledHash.current = location.hash;
    });
    return () => window.cancelAnimationFrame(frame);
  },[location.hash, orders]);
  useEffect(()=>{
    let active = true;
    let refreshing = false;
    const refreshStatuses = async () => {
      if (supabaseReady && !getCustomerSession()) return;
      if (refreshing) return;
      refreshing = true;
      try {
        const cachedOrders = normalizeOrderTimes(read(STORAGE.orders, []));
        const customerSession = getCustomerSession();
        const next = supabaseReady && customerSession ? await listCustomerOrders(customerSession) : cachedOrders;
        if (active) {
          const cachedById = new Map(cachedOrders.map((order) => [order.id, order]));
          const visibleOrders = next.filter(Boolean).map((order) => ({ ...cachedById.get(order.id), ...order }));
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
      try { await sendSiteEmail('customer_price_response', { orderId: order.id, accepted: accept }, getCustomerSession()); }
      catch (cause) { setResponseError(`Your response was saved, but Sukkar could not be emailed: ${cause.message || 'please try again later.'}`); }
    } catch (cause) {
      setResponseError(cause.message || 'Could not save your response. Please try again.');
    } finally {
      setRespondingOrder(null);
    }
  };
  const askAboutOrder = async (order) => {
    if (!window.confirm('Are you sure you want to send an email to ask about your order?')) return;
    setQuestionOrder(order.id); setQuestionMessage(''); setResponseError('');
    try { await sendSiteEmail('order_question', { orderId: order.id }, getCustomerSession()); setQuestionMessage(`Your question about ${order.id} was emailed to Sukkar.`); }
    catch (cause) { setResponseError(cause.message || 'We could not email Sukkar. Please try again.'); }
    finally { setQuestionOrder(null); }
  };
  return (
    <main className="inner-page">
      <PageIntro eyebrow="Your sweet requests" title={<>A little order <em>update.</em></>} text={supabaseReady ? 'Orders submitted on this browser will appear here, with updates from Sukkar.' : 'Orders submitted on this browser will appear here. We’ll agree the price and details together by email.'} />
      {responseError && <p className="error-message" role="alert">{responseError}</p>}
      {questionMessage && <p className="success-message" role="status">{questionMessage}</p>}
      <div className="my-orders">
        {orders.length ? orders.map((order) => <article className="order-card" id={`order-${order.id}`} key={order.id}>
          <div className="order-card-top"><span className="eyebrow">{order.id}</span></div>
          <h2>Made for {order.name}</h2><p>{order.description}</p>
          <div className="order-meta"><span>Collection date<strong>{formatDate(order.date)}</strong></span><span>{order.status === 'Awaiting price agreement' || order.status === 'Accepted' ? 'Proposed price' : 'Agreed price'}<strong>{order.cost ? formatPrice(order.cost) : 'To be agreed'}</strong></span>{order.preferredPickupTime && <span>{order.status === 'Ready for collection' ? 'Your preferred time' : 'Preferred time'}<strong>{order.preferredPickupTime}</strong></span>}{order.status === 'Ready for collection' && order.pickupTime && <span className="order-collection-time">Collection time<strong>{formatCollectionTime(order.pickupTime)}</strong></span>}</div>
          <OrderStatusJourney status={order.status} />
          {order.status === 'Awaiting price agreement' && <div className="customer-price-response"><p>Sukkar has proposed this price:</p><strong>{formatPrice(order.cost)}</strong><div><button className="button" type="button" disabled={respondingOrder === order.id} onClick={() => respond(order, true)}>Accept price <ArrowRight size={15}/></button><button className="collected-button" type="button" disabled={respondingOrder === order.id} onClick={() => respond(order, false)}>Reject price</button></div></div>}
          {order.status === 'Price declined' && <p className="price-response-note">You declined this price. Sukkar will review your order.</p>}
          <button className="text-link" type="button" disabled={questionOrder === order.id} onClick={() => askAboutOrder(order)}>{questionOrder === order.id ? 'Sending email…' : 'Ask about this order'} <ArrowRight size={15}/></button>
        </article>) : <div className="empty-state">No orders on this device yet. <Link to="/custom">Tell us what you have in mind <ArrowRight size={15}/></Link></div>}
      </div>
    </main>
  );
}

function Admin() {
  const [session, setSession] = useState(getAdminSession);
  const shared = usePublicContent(session);
  const [orders, setOrders] = useState(() => normalizeOrderTimes(read(STORAGE.orders, [])));
  const [settings, setSettings] = useState(() => read(STORAGE.settings, {}));
  const [saved, setSaved] = useState(false);
  const [accountEmailMessage, setAccountEmailMessage] = useState('');
  const [accountEmailError, setAccountEmailError] = useState('');
  const [accountPasswordMessage, setAccountPasswordMessage] = useState('');
  const [accountPasswordError, setAccountPasswordError] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminReviews, setAdminReviews] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
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
    .map((item) => ({ ...item, name: shared?.overrides?.[item.id]?.name ?? galleryPhotoNames[item.id] ?? item.name, category: photoCategories[item.id] || shared?.overrides?.[item.id]?.category || item.category, description: shared?.overrides?.[item.id]?.description ?? photoDescriptions[item.id] ?? item.description, image: shared?.overrides?.[item.id]?.image || item.image, isVisible: photoVisibility[item.id] ?? shared?.overrides?.[item.id]?.is_visible ?? !removedPhotoIds.includes(item.id) }))
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
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { status: 'Rejected' }, session);
      update(order.id, 'status', 'Rejected');
      try { await sendSiteEmail('admin_order_rejected', { orderId: order.id }, session); }
      catch (cause) { setLoginError(`Order rejected, but the customer email could not be sent: ${cause.message || 'please try again.'}`); }
    } catch (cause) {
      setLoginError(cause.message || 'Could not reject the order. Please try again.');
    }
  };

  const markReady = async (order) => {
    const collectionTime = normalizeTimeValue(order.pickupTime);
    if (!order.cost || !collectionTime) return;
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { status: 'Ready for collection', pickupTime: collectionTime }, session);
      const next = orders.map((item) => item.id === order.id ? { ...item, pickupTime: collectionTime, status: 'Ready for collection' } : item);
      setOrders(next);
      if (!supabaseReady) write(STORAGE.orders, next);
      try { await sendSiteEmail('admin_ready_collection', { orderId: order.id }, session); }
      catch (cause) { setLoginError(`Order updated, but the customer email could not be sent: ${cause.message || 'please try again.'}`); }
    } catch (cause) {
      setLoginError(cause.message || 'Could not update the order. Please try again.');
    }
  };

  const sendPriceProposal = async (order) => {
    if (!order.cost) return;
    try {
      if (supabaseReady && session) await updateRemoteOrder(order.id, { cost: order.cost, status: 'Awaiting price agreement' }, session);
      update(order.id, 'status', 'Awaiting price agreement');
      try { await sendSiteEmail('admin_price_proposal', { orderId: order.id }, session); }
      catch (cause) { setLoginError(`Price proposal saved, but the customer email could not be sent: ${cause.message || 'please try again.'}`); }
    } catch (cause) {
      setLoginError(cause.message || 'Could not save the price proposal. Please try again.');
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
    const next = { phone: data.get('phone'), email: data.get('email').trim(), address: data.get('address').trim(), mapLocation: data.get('mapLocation').trim() || SUKKAR_MAP_PIN };
    try {
      if (supabaseReady && session) await saveRemoteSettings(next, session);
      write(STORAGE.settings, next);
      setSettings(next);
      setSaved(true);
    } catch { setLoginError('Could not save site details. Please try again.'); }
  };

  const saveAdminEmail = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const email = new FormData(form).get('adminEmail').trim();
    setAccountEmailError(''); setAccountEmailMessage(''); setAccountSaving(true);
    if (email.toLowerCase() === String(session.user?.email || '').toLowerCase()) { setAccountEmailError('Enter a different email address.'); setAccountSaving(false); return; }
    try {
      await updateAdminEmail(email, session);
      const nextSettings = { ...settings, email };
      try {
        if (supabaseReady && session) await saveRemoteSettings({ email }, session);
        write(STORAGE.settings, nextSettings);
        setSettings(nextSettings);
      } catch {
        setAccountEmailError('The sign-in email change was requested, but the website email could not be updated. Save it in Admin Dashboard → Site details, then reconnect EmailJS to send from the new address.');
        return;
      }
      setAccountEmailMessage('Email change requested. Check both inboxes for Supabase confirmation links. Website notifications and reply addresses now use this email. To also send from this mailbox, connect it in Email delivery below.');
      form.reset();
    } catch (cause) {
      const message = cause.message || '';
      setAccountEmailError(/already (been )?registered|email_exists/i.test(message)
        ? 'That email is already registered to another account. Your admin email has not changed; choose an unused email address.'
        : message || 'Could not change the admin email. Please try again.');
    }
    finally { setAccountSaving(false); }
  };

  const saveAdminPassword = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = data.get('newPassword');
    if (password !== data.get('confirmPassword')) { setAccountPasswordError('The passwords do not match.'); setAccountPasswordMessage(''); return; }
    setAccountPasswordError(''); setAccountPasswordMessage(''); setAccountSaving(true);
    try {
      await updateAdminPassword(password, session);
      setAccountPasswordMessage('Your admin password has been changed.');
      form.reset();
    } catch (cause) { setAccountPasswordError(cause.message || 'Could not change the admin password. Please try again.'); }
    finally { setAccountSaving(false); }
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
    if (name === 'Chocolate' || name === 'All treats') return;
    const affectedItems = galleryItems.filter((item) => item.category === name);
    try {
      if (supabaseReady && session) {
        await Promise.all(affectedItems.filter((item) => products.some((product) => product.id === item.id)).map((item) => saveRemoteProductOverride({ ...item, category: 'Chocolate' }, session)));
        await deleteRemoteCategory(name, session);
      }
    }
    catch { setLoginError('Could not remove that category. Please try again.'); return; }
    const next = categoryList.filter((item) => item !== name);
    setCategoryList(next);
    write('sukkar-categories', next);
    const nextPhotoCategories = { ...photoCategories };
    for (const item of affectedItems) nextPhotoCategories[item.id] = 'Chocolate';
    setPhotoCategories(nextPhotoCategories);
    write('sukkar-photo-categories', nextPhotoCategories);
    const nextExtraPhotos = extraPhotos.map((item) => item.category === name ? { ...item, category: 'Chocolate' } : item);
    setExtraPhotos(nextExtraPhotos);
    write(STORAGE.photos, nextExtraPhotos);
    setSelectedGalleryCategory('Chocolate');
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

  const newReviews = adminReviews.filter((review) => !review.isPublished);
  const visibleReviews = showAllReviews ? adminReviews : newReviews;

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
      <PageIntro eyebrow="Sukkar admin" title="Admin Dashboard" text="Manage customer requests and your public gallery details." />
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
                    <button className="button" onClick={() => acceptOrder(order)}>Accept order <ArrowRight size={15} /></button>
                    <button className="collected-button" onClick={() => rejectOrder(order)}>Reject order</button>
                  </>}
                  {(order.status === 'Accepted' || order.status === 'Price declined') && <>
                    <label>Price to agree<div className="price-input-wrap"><input value={String(order.cost || '').replace(/\s*SYP$/i, '')} onChange={(event) => update(order.id, 'cost', event.target.value)} onBlur={(event) => update(order.id, 'cost', event.target.value, true)} placeholder="e.g. 25,000" /><span>SYP</span></div></label>
                    <button className="button" disabled={!order.cost} onClick={() => sendPriceProposal(order)}>Email price proposal <Mail size={15} /></button>
                    {order.status === 'Price declined' && <button className="collected-button" onClick={() => deleteOrder(order.id)}>Delete declined order <X size={14} /></button>}
                  </>}
                  {order.status === 'Awaiting price agreement' && <p className="admin-price-waiting">Waiting for customer response to <strong>{formatPrice(order.cost)}</strong>.</p>}
                  {order.status === 'Preparing' && <>
                    <div className="collection-time-field"><span>Collection time to send</span><PreferredTimeWheelPicker value={order.pickupTime} label="collection time" onChange={(value) => update(order.id, 'pickupTime', value)} /></div>
                    <button className="button" disabled={!normalizeTimeValue(order.pickupTime)} onClick={() => markReady(order)}>Ready to collect — email customer <Mail size={15} /></button>
                  </>}
                  {order.status === 'Ready for collection' && <button className="button" onClick={() => markCollected(order.id)}>Mark as collected <ArrowRight size={14} /></button>}
                  {order.status === 'Rejected' && <button className="collected-button" onClick={() => markCollected(order.id)}>Remove declined order <X size={14} /></button>}
                </div>
              </article>
            )) : <div className="empty-state">New customer requests will appear here.</div>}
          </section>
          <section className="admin-section">
            <div className="admin-section-title"><div><span className="eyebrow">Customer notes</span><h2>{showAllReviews ? 'All reviews' : 'New reviews'} <span>{visibleReviews.length}</span></h2><p>{showAllReviews ? 'Review every submission and hide published reviews from the customer page when needed.' : 'New customer reviews stay hidden until you approve them.'}</p></div>{adminReviews.length > 0 && <button className="text-link" type="button" aria-expanded={showAllReviews} onClick={() => setShowAllReviews((visible) => !visible)}>{showAllReviews ? 'Hide all reviews' : 'Show all reviews'} <ArrowRight size={15}/></button>}</div>
            <div className="reviews-list">
              {visibleReviews.length ? visibleReviews.map((review) => <article className="review-card" key={review.id}><span className="review-by">{review.name} · {review.isPublished ? 'Published' : 'Pending approval'}</span><ReviewStars rating={review.rating}/><p>{review.quote}</p><div className="review-actions">{!review.isPublished && <button className="button" type="button" onClick={() => moderateReview(review, true)}>Publish review</button>}{review.isPublished && <button className="collected-button" type="button" onClick={() => moderateReview(review, false)}>Hide review</button>}<button className="collected-button" type="button" onClick={() => removeReview(review)}>Delete review</button></div></article>) : <p className="empty-state">{adminReviews.length ? 'No new reviews. Show all reviews to manage published ones.' : 'No customer reviews have been submitted yet.'}</p>}
            </div>
          </section>
          {supabaseReady && session && <section className="admin-section admin-settings">
            <div><span className="eyebrow">Account security</span><h2>Admin sign-in details</h2><p>Change the email or password you use to sign in to the dashboard. Email changes need confirmation from Supabase.</p></div>
            <div className="admin-account-forms">
              <form onSubmit={saveAdminEmail} className="form-grid">
                <label className="full-field">Current email<input type="email" value={session.user?.email || ''} readOnly /></label>
                <label className="full-field">New email address<input name="adminEmail" type="email" required autoComplete="email" placeholder="new@example.com" /></label>
                <button className="button" type="submit" disabled={accountSaving}>{accountSaving ? 'Saving…' : 'Change email'} <ArrowRight size={15} /></button>
                {accountEmailMessage && <p className="success-message full-field" role="status">{accountEmailMessage}</p>}
                {accountEmailError && <p className="error-message full-field" role="alert">{accountEmailError}</p>}
              </form>
              <form onSubmit={saveAdminPassword} className="form-grid">
                <label className="full-field">New password<PasswordInput id="admin-new-password" name="newPassword" required minLength="8" autoComplete="new-password" placeholder="At least 8 characters" /></label>
                <label className="full-field">Confirm new password<PasswordInput id="admin-confirm-password" name="confirmPassword" required minLength="8" autoComplete="new-password" placeholder="Enter the new password again" /></label>
                <button className="button" type="submit" disabled={accountSaving}>{accountSaving ? 'Saving…' : 'Change password'} <ArrowRight size={15} /></button>
                {accountPasswordMessage && <p className="success-message full-field" role="status">{accountPasswordMessage}</p>}
                {accountPasswordError && <p className="error-message full-field" role="alert">{accountPasswordError}</p>}
              </form>
            </div>
          </section>}
          <section className="admin-section admin-settings">
            <div><span className="eyebrow">Public details</span><h2>Keep in touch</h2><p>Update the contact details and collection location shown on the site. The map location controls the home page pin and directions. Order and contact messages are sent to the email address.</p></div>
            <form key={shared ? JSON.stringify(settings) : 'settings-loading'} onSubmit={saveSettings} className="form-grid">
              <label>Sukkar email<input name="email" type="email" required defaultValue={settings.email || ''} placeholder="hello@example.com" /></label>
              <label>Phone number<input name="phone" defaultValue={settings.phone || '+963 982 769 168'} /></label>
              <label>Address<input name="address" defaultValue={settings.address || 'Sadad, Homs, Syria'} /></label>
              <label>Map location (address or coordinates)<input name="mapLocation" required defaultValue={settings.mapLocation || SUKKAR_MAP_PIN} placeholder="e.g. 34.314331, 36.924356" /></label>
              <small className="full-field">Enter a full address or coordinates from Google Maps. This updates the map pin and directions button on the home page.</small>
              <button className="button">Save details <ArrowRight size={15} /></button>
              {saved && <span className="success-message">{supabaseReady ? 'Saved to the shared site.' : 'Saved on this device.'}</span>}
            </form>
          </section>
          <section className="admin-section admin-settings email-delivery-settings">
            <div><span className="eyebrow">Email delivery</span><h2>Sending account</h2><p>The Sukkar email above controls where website messages arrive and where replies go. The connected Gmail account controls the sender address.</p></div>
            <div className="email-sender-panel">
              <p>When the sending mailbox changes, you can update it yourself in EmailJS. Edit the existing Gmail service, connect the new mailbox, then save the service. Keep its Service ID unchanged so the website continues sending normally.</p>
              <a className="button" href="https://dashboard.emailjs.com/admin" target="_blank" rel="noreferrer">Manage sending account <ArrowRight size={15} /></a>
            </div>
          </section>
          <section className="admin-section admin-settings">
            <div><span className="eyebrow">Gallery collections</span><h2>Categories</h2>
              <div className="category-admin">{categoryList.map((category) => <span key={category}>{category}{category !== 'All treats' && category !== 'Chocolate' && <button aria-label={`Remove ${category}`} onClick={() => deleteCategory(category)}><X size={13} /></button>}</span>)}</div>
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
  return <BrowserRouter basename={import.meta.env.BASE_URL}><ScrollToTop/><Header/><Routes><Route path="/" element={<Home/>}/><Route path="/about" element={<About/>}/><Route path="/gallery" element={<Gallery/>}/><Route path="/reviews" element={<Reviews/>}/><Route path="/custom" element={<CustomOrder/>}/><Route path="/contact" element={<Contact/>}/><Route path="/my-orders" element={<MyOrders/>}/><Route path="/account" element={<CustomerAccount/>}/><Route path="/sign-in" element={<CustomerAuth/>}/><Route path="/register" element={<CustomerAuth register/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<Home/>}/></Routes><Footer/><Link className="floating-order" to="/custom"><Heart size={15} fill="currentColor"/> Make it yours</Link></BrowserRouter>;
}

export default App;







