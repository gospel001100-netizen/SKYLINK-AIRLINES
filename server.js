const express = require('express');
const mongoose = require('mongoose');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const app = express();

// ========= V9.1 SECURITY =========
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '20kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '<h2>Too many login attempts - Wait 15 mins - SKYLINK Security</h2>',
  standardHeaders: true
});

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Skylink1824';
const PAYSTACK_PUBLIC = process.env.PAYSTACK_PUBLIC || 'pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73';

// ========= DATA LAYER =========
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
if (!fs.existsSync(BOOKINGS_FILE)) fs.writeFileSync(BOOKINGS_FILE, '[]');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/skylink', { serverSelectionTimeoutMS: 3000 })
.then(()=>console.log('MongoDB Connected')).catch(()=>console.log('File mode active'));

const bookingSchema = new mongoose.Schema({
  tracking: { type: String, unique: true },
  name: String, email: String, phone: String,
  from: String, to: String, date: String, time: String, seat: String,
  amount: { type: Number, default: 2150 },
  paystackRef: String, status: { type: String, default: 'CONFIRMED' },
  createdAt: { type: Date, default: Date.now }
});
const Booking = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);

function saveToFile(b){ try{ let a=JSON.parse(fs.readFileSync(BOOKINGS_FILE,'utf8')); a.push(b); fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(a,null,2)); }catch(e){} }
function getFileBookings(){ try{ return JSON.parse(fs.readFileSync(BOOKINGS_FILE,'utf8')); }catch(e){ return []; } }

// ========= V9.1 AUTO-DELETE SESSIONS (FIX MEMORY LEAK + SECURITY) =========
let adminSessions = new Map(); // token => timestamp

// Auto-delete every 1 hour - tokens older than 24h
setInterval(()=>{
  const now = Date.now();
  const MAX_AGE = 24*60*60*1000; // 24 hours
  let deleted = 0;
  for(let [token, time] of adminSessions){
    if(now - time > MAX_AGE){
      adminSessions.delete(token);
      deleted++;
    }
  }
  if(deleted>0) console.log(`[SECURITY] Auto-deleted ${deleted} expired admin sessions`);
}, 60*60*1000);

// Daily backup at midnight
setInterval(()=>{
  try{
    let bookings = getFileBookings();
    let date = new Date().toISOString().split('T')[0];
    let backupFile = path.join(BACKUP_DIR, `bookings-${date}.json`);
    if(!fs.existsSync(backupFile)){
      fs.writeFileSync(backupFile, JSON.stringify(bookings, null, 2));
      console.log(`[BACKUP] Daily backup saved: ${backupFile} - ${bookings.length} bookings`);
    }
  }catch(e){ console.log('Backup failed', e.message); }
}, 60*60*1000); // check every hour, save once per day

function isAuthenticated(req){
  const cookie = req.headers.cookie || '';
  const m = cookie.match(/admin_token=([a-f0-9]{64})/);
  if(!m) return false;
  const token = m[1];
  const time = adminSessions.get(token);
  if(!time) return false;
  // Also check not expired
  if(Date.now() - time > 24*60*60*1000){
    adminSessions.delete(token);
    return false;
  }
  return true;
}
function sanitizeTracking(c){ return (c||'').toString().toUpperCase().replace(/[^A-Z0-9-]/g,'').substring(0,20); }

// ========= FRONTEND HTML (V8 SAME - NO CUT) =========
const homePage = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SKYLINK AIRLINES</title>
<script src="https://js.paystack.co/v1/inline.js"></script>
<style>
body{font-family:Arial;background:#f0f9f0;margin:0;padding:15px}
.card{max-width:480px;margin:auto;background:#fff;padding:20px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,.1);border-top:5px solid #16a34a}
input,select,button{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:1px solid #ccc;font-size:16px;box-sizing:border-box}
button{background:#16a34a;color:#fff;border:none;font-weight:bold;cursor:pointer}
button:disabled{background:#aaa}
.warning{background:#fff3cd;border:1px solid #ffc107;padding:10px;border-radius:8px;font-size:13px;margin:10px 0}
.seat{width:40px;height:40px;margin:4px;display:inline-flex;align-items:center;justify-content:center;border:1px solid #16a34a;border-radius:6px;cursor:pointer}
.seat.selected{background:#16a34a;color:#fff}
.seat.taken{background:#ddd;cursor:not-allowed}
</style></head><body>
<div class="card">
<h2 style="color:#16a34a;text-align:center">SKYLINK AIRLINES</h2>
<p style="text-align:center">Benin (BNI) → Lagos (LOS) - NGN 2,150</p>
<div class="warning">⚠️ If Paystack shows "Copy failed" when copying account number - Please TYPE account number manually into your bank app.</div>
<label>Full Name</label><input id="name" placeholder="John Doe">
<label>Email</label><input id="email" type="email" placeholder="you@email.com">
<label>Phone</label><input id="phone" placeholder="080...">
<label>Date</label><input id="date" type="date">
<label>Time</label><select id="time"><option>07:00 AM</option><option>12:00 PM</option><option>06:00 PM</option></select>
<label>Select Seat</label><div id="seats"></div>
<input id="seat" readonly placeholder="Select seat">
<button id="payBtn" onclick="pay()">Pay NGN 2,150 with Paystack</button>
<div id="msg"></div>
<div id="boarding" style="display:none;text-align:center;margin-top:20px;border:2px dashed #16a34a;padding:15px;border-radius:10px"></div>
</div>
<script>
const seatsDiv=document.getElementById('seats'); let selectedSeat='';
for(let r=1;r<=5;r++){ for(let c of ['A','B','C','D']){ let s=r+c; let d=document.createElement('div'); d.className='seat'; d.innerText=s;
d.onclick=()=>{ document.querySelectorAll('.seat').forEach(x=>x.classList.remove('selected')); d.classList.add('selected'); selectedSeat=s; document.getElementById('seat').value=s; }; seatsDiv.appendChild(d); } seatsDiv.appendChild(document.createElement('br')); }
async function copyRobust(t){ try{ await navigator.clipboard.writeText(t); showMsg("✅ Copied: "+t); }catch(e){ const ta=document.createElement("textarea"); ta.value=t; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); showMsg("✅ Copied: "+t); }catch(e2){ prompt("Long-press to copy:", t); } document.body.removeChild(ta); } }
function showMsg(m){ document.getElementById('msg').innerHTML='<p style="color:green">'+m+'</p>'; }
async function pay(){
  const name=document.getElementById('name').value.trim(); const email=document.getElementById('email').value.trim();
  const phone=document.getElementById('phone').value.trim(); const date=document.getElementById('date').value;
  const time=document.getElementById('time').value;
  if(!name||!email||!phone||!date||!selectedSeat){ alert('Fill all + seat'); return; }
  let handler = PaystackPop.setup({
    key: '${PAYSTACK_PUBLIC}',
    email: email, amount: 2150*100, currency: 'NGN', ref: 'SKY-'+Date.now(),
    onClose: function(){ alert('Payment cancelled'); },
    callback: async function(res){
      document.getElementById('payBtn').innerText='Confirming...';
      let r = await fetch('/api/book',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name,email,phone,from:'Benin',to:'Lagos',date,time,seat:selectedSeat, paystackRef: res.reference }) });
      let data = await r.json();
      if(data.success){
        let b=data.booking; let trackLink = location.origin+'/track?code='+b.tracking;
        let qr = await (await fetch('/api/qr?text='+encodeURIComponent(trackLink))).text();
        document.getElementById('boarding').style.display='block';
        document.getElementById('boarding').innerHTML = '<h3>Boarding Pass CONFIRMED</h3><p><b>'+b.name+'</b> - Seat '+b.seat+'</p><p>'+b.from+' → '+b.to+' | '+b.date+' '+b.time+'</p><p>Tracking: <b>'+b.tracking+'</b></p><img src="'+qr+'" style="width:180px"><br><p style="word-break:break-all">'+trackLink+'</p><button onclick="copyRobust(\\''+trackLink+'\\')">Copy Link</button> <button onclick="window.print()">Print</button>';
        showMsg('✅ Confirmed! '+b.tracking); document.getElementById('payBtn').innerText='Booked!';
      }else{ alert('Failed'); document.getElementById('payBtn').innerText='Pay NGN 2,150'; }
    }
  }); handler.openIframe();
}
</script></body></html>
`;

// ========= ROUTES =========
app.get('/', (req,res)=>res.send(homePage));
app.get('/track', (req,res)=>{
  let code = sanitizeTracking(req.query.code);
  res.send(`<html><body style="font-family:Arial;padding:20px"><h2>Tracking ${code}</h2><div id="i">Loading...</div><script>fetch('/api/track?code=${code}').then(r=>r.json()).then(d=>{document.getElementById('i').innerHTML=d.success?'<p>Name:'+d.booking.name+'<br>Seat:'+d.booking.seat+'<br>Status:'+d.booking.status+'</p>':'Not found'})</script></body></html>`);
});
app.get('/dashboard', (req,res)=>res.send('<h2>SKYLINK Dashboard - Enter tracking code in /track?code=TRK-XXX</h2>'));
app.get('/api/qr', async (req,res)=>{ try{ let u=await QRCode.toDataURL((req.query.text||'').substring(0,200)); res.send(u); }catch(e){ res.send(''); } });
app.get('/api/track', async (req,res)=>{
  let code=sanitizeTracking(req.query.code); if(!code) return res.json({success:false});
  try{ let b=await Booking.findOne({tracking:code}).lean(); if(!b){ let all=getFileBookings(); b=all.find(x=>x.tracking===code); } if(b) return res.json({success:true,booking:b}); res.json({success:false}); }catch(e){ res.json({success:false}); }
});
app.post('/api/book', async (req,res)=>{
  try{
    let {name,email,phone,from,to,date,time,seat,paystackRef}=req.body;
    if(!name||!email||!seat) return res.json({success:false});
    let tracking='TRK-'+crypto.randomBytes(3).toString('hex').toUpperCase();
    let booking={tracking, name:name.substring(0,50), email:email.substring(0,100), phone:(phone||'').substring(0,20), from:from||'Benin', to:to||'Lagos', date, time, seat, amount:2150, paystackRef: (paystackRef||'').substring(0,50), status:'CONFIRMED', createdAt:new Date()};
    try{ await new Booking(booking).save(); }catch(e){}
    saveToFile(booking);
    res.json({success:true, booking});
  }catch(e){ res.json({success:false}); }
});

// Admin
app.get('/admin', (req,res)=>res.send(`<form method="POST" action="/api/admin-login" style="max-width:320px;margin:100px auto;font-family:Arial"><h2>SKYLINK Admin V9.1</h2><input name="password" type="password" placeholder="Password" style="width:100%;padding:10px"><button style="width:100%;padding:10px;background:#16a34a;color:#fff;margin-top:10px">Login</button><p style="font-size:12px;color:gray">Auto-logout after 24h</p></form>`));
app.post('/api/admin-login', loginLimiter, express.urlencoded({extended:true}), (req,res)=>{
  if(req.body.password === ADMIN_PASSWORD){
    const token=crypto.randomBytes(32).toString('hex');
    adminSessions.set(token, Date.now());
    console.log(`[ADMIN] New login - Active sessions: ${adminSessions.size}`);
    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict`);
    return res.redirect('/skylink-admin-gospel-2024');
  }
  res.status(401).send('Wrong password <a href="/admin">Retry</a>');
});
app.get('/skylink-admin-gospel-2024', (req,res)=>{
  if(!isAuthenticated(req)) return res.redirect('/admin');
  let bookings=getFileBookings();
  res.send(`<html><head><title>Admin V9.1</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ccc;padding:8px;font-size:12px} th{background:#16a34a;color:#fff}</style></head><body>
  <h2>SKYLINK Admin V9.1 SECURE - ${bookings.length} Bookings - Sessions: ${adminSessions.size} <a href="/api/admin-logout" style="float:right">Logout</a></h2>
  <p style="font-size:12px;color:green">✅ Auto-delete: Sessions expire after 24h | Daily backup active | Rate-limit active</p>
  <input id="q" placeholder="Search" onkeyup="filter()" style="padding:8px;width:300px">
  <table id="t"><tr><th>Tracking</th><th>Name</th><th>Email</th><th>Seat</th><th>Date</th><th>Ref</th></tr>
  ${bookings.reverse().map(b=>`<tr><td>${b.tracking}</td><td>${b.name}</td><td>${b.email}</td><td>${b.seat}</td><td>${b.date||''} ${b.time||''}</td><td>${b.paystackRef||''}</td></tr>`).join('')}
  </table><script>function filter(){let q=document.getElementById('q').value.toLowerCase();document.querySelectorAll('#t tr').forEach((r,i)=>{if(i==0)return;r.style.display=r.innerText.toLowerCase().includes(q)?'':'none';});}</script></body></html>`);
});
app.get('/api/admin-logout', (req,res)=>{
  let m=(req.headers.cookie||'').match(/admin_token=([a-f0-9]{64})/); if(m) adminSessions.delete(m[1]);
  res.setHeader('Set-Cookie','admin_token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict');
  res.redirect('/admin');
});
app.get('/api/bookings', (req,res)=>{
  if(!isAuthenticated(req)) return res.status(403).json({error:'Unauthorized V9.1'});
  res.json(getFileBookings());
});

const PORT=process.env.PORT||10000;
app.listen(PORT, ()=>console.log(`SKYLINK V9.1 SECURE + AUTO-DELETE + BACKUP running on ${PORT} - Sessions: ${adminSessions.size}`));
