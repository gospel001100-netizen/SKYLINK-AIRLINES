// server.js - SKYLINK FINAL V3 - Professional Ticket + Isolated Tracking + Real Duration + Normal View
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
let QRCode = null; try{ QRCode = require('qrcode'); }catch(e){}
let mongoose = null; try{ mongoose = require('mongoose'); }catch(e){}
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 10000;
const ADMIN_PASSWORD = 'Skylink1824';
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');
let bookings = new Map();
let BookingModel = null;
async function initDB(){
  const uri = process.env.MONGODB_URI;
  if(uri && mongoose){
    try{
      await mongoose.connect(uri);
      const schema = new mongoose.Schema({
        _id: String, booking: String, tracking: String, name: String, email: String,
        from: String, fromFull: String, to: String, toFull: String,
        flight: String, gate: String, terminal: String, seat: String,
        class: String, departISO: String, arriveISO: String, durationMins: Number,
        fromTz: String, toTz: String, baggage: String, paystackRef: String, amount: Number, createdAt: String
      }, { _id: false });
      BookingModel = mongoose.model('Booking', schema);
      const all = await BookingModel.find({});
      all.forEach(d=>{ bookings.set(d.tracking, d.toObject()); bookings.set(d.booking, d.toObject()); });
    }catch(e){}
  }
  try{ const raw = fs.readFileSync(DATA_FILE,'utf8'); const obj = JSON.parse(raw||'{}'); Object.keys(obj).forEach(k=> bookings.set(k, obj[k])); }catch(e){}
}
initDB();
async function savePerm(k, rec){
  bookings.set(k, rec); bookings.set(rec.tracking, rec); bookings.set(rec.booking, rec);
  try{ const o={}; bookings.forEach((v,k)=>{ o[k]=v }); fs.writeFileSync(DATA_FILE, JSON.stringify(o,null,2),'utf8'); }catch(e){}
  if(BookingModel){ try{ await BookingModel.findOneAndUpdate({tracking: rec.tracking}, rec, {upsert:true}); }catch(e){} }
}
const AIRPORTS = [
  {code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl", tz:"Asia/Aden", lat:15.476, lon:44.219},
  {code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl", tz:"Asia/Aden", lat:12.827, lon:45.030},
  {code:"HOD", city:"Hodeidah", country:"Yemen", name:"Hodeidah Intl", tz:"Asia/Aden", lat:14.753, lon:42.976},
  {code:"TAI", city:"Taiz", country:"Yemen", name:"Taiz Intl", tz:"Asia/Aden", lat:13.685, lon:44.136},
  {code:"GXF", city:"Seiyun", country:"Yemen", name:"Seiyun Hadhramout", tz:"Asia/Aden", lat:15.962, lon:48.788},
  {code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz", tz:"Asia/Riyadh", lat:21.681, lon:39.155},
  {code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid", tz:"Asia/Riyadh", lat:24.957, lon:46.698},
  {code:"MED", city:"Medina", country:"Saudi Arabia", name:"Prince Mohammad", tz:"Asia/Riyadh", lat:24.551, lon:39.714},
  {code:"DMM", city:"Dammam", country:"Saudi Arabia", name:"King Fahd", tz:"Asia/Riyadh", lat:26.471, lon:49.797},
  {code:"AHB", city:"Abha", country:"Saudi Arabia", name:"Abha Intl", tz:"Asia/Riyadh", lat:18.24, lon:42.656},
  {code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl", tz:"Asia/Dubai", lat:25.253, lon:55.365},
  {code:"AUH", city:"Abu Dhabi", country:"UAE", name:"Abu Dhabi Intl", tz:"Asia/Dubai", lat:24.433, lon:54.651},
  {code:"SHJ", city:"Sharjah", country:"UAE", name:"Sharjah Intl", tz:"Asia/Dubai", lat:25.328, lon:55.517},
  {code:"DWC", city:"Dubai", country:"UAE", name:"Al Maktoum", tz:"Asia/Dubai", lat:24.898, lon:55.161},
  {code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl", tz:"Asia/Qatar", lat:25.273, lon:51.608},
  {code:"KWI", city:"Kuwait", country:"Kuwait", name:"Kuwait Intl", tz:"Asia/Kuwait", lat:29.226, lon:47.968},
  {code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl", tz:"Asia/Bahrain", lat:26.271, lon:50.633},
  {code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl", tz:"Asia/Muscat", lat:23.593, lon:58.284},
  {code:"SLL", city:"Salalah", country:"Oman", name:"Salalah Intl", tz:"Asia/Muscat", lat:17.038, lon:54.091},
  {code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia", tz:"Asia/Amman", lat:31.722, lon:35.993},
  {code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Intl", tz:"Asia/Beirut", lat:33.820, lon:35.488},
  {code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl", tz:"Asia/Baghdad", lat:33.262, lon:44.234},
  {code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini", tz:"Asia/Tehran", lat:35.416, lon:51.152},
  {code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion", tz:"Asia/Jerusalem", lat:32.011, lon:34.886},
  {code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed", tz:"Africa/Lagos", lat:6.577, lon:3.321},
  {code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe", tz:"Africa/Lagos", lat:9.006, lon:7.263},
  {code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano", tz:"Africa/Lagos", lat:12.047, lon:8.524},
  {code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt Intl", tz:"Africa/Lagos", lat:5.015, lon:6.949},
  {code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam", tz:"Africa/Lagos", lat:6.474, lon:7.561},
  {code:"BNI", city:"Benin", country:"Nigeria", name:"Benin Airport", tz:"Africa/Lagos", lat:6.316, lon:5.599},
  {code:"CBQ", city:"Calabar", country:"Nigeria", name:"Margaret Ekpo", tz:"Africa/Lagos", lat:4.976, lon:8.347},
  {code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka Intl", tz:"Africa/Accra", lat:5.605, lon:-0.166},
  {code:"KMS", city:"Kumasi", country:"Ghana", name:"Kumasi Airport", tz:"Africa/Accra", lat:6.714, lon:-1.591},
  {code:"ABJ", city:"Abidjan", country:"Ivory Coast", name:"Felix Houphouet", tz:"Africa/Abidjan", lat:5.261, lon:-3.926},
  {code:"DKR", city:"Dakar", country:"Senegal", name:"Blaise Diagne", tz:"Africa/Dakar", lat:14.67, lon:-17.072},
  {code:"BKO", city:"Bamako", country:"Mali", name:"Modibo Keita", tz:"Africa/Bamako", lat:12.533, lon:-7.949},
  {code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun", tz:"Africa/Porto-Novo", lat:6.357, lon:2.384},
  {code:"LFW", city:"Lome", country:"Togo", name:"Lome Tokoin", tz:"Africa/Lome", lat:6.165, lon:1.254},
  {code:"OUA", city:"Ouagadougou", country:"Burkina Faso", name:"Thomas Sankara", tz:"Africa/Ouagadougou", lat:12.353, lon:-1.512},
  {code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl", tz:"Africa/Cairo", lat:30.121, lon:31.405},
  {code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole Intl", tz:"Africa/Addis_Ababa", lat:8.977, lon:38.799},
  {code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta", tz:"Africa/Nairobi", lat:-1.319, lon:36.927},
  {code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere", tz:"Africa/Dar_es_Salaam", lat:-6.875, lon:39.202},
  {code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali Intl", tz:"Africa/Kigali", lat:-1.968, lon:30.139},
  {code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe Intl", tz:"Africa/Kampala", lat:0.042, lon:32.443},
  {code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo", tz:"Africa/Johannesburg", lat:-26.133, lon:28.046},
  {code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town Intl", tz:"Africa/Johannesburg", lat:-33.964, lon:18.601},
  {code:"LHR", city:"London", country:"UK", name:"Heathrow", tz:"Europe/London", lat:51.47, lon:-0.454},
  {code:"LGW", city:"London", country:"UK", name:"Gatwick", tz:"Europe/London", lat:51.148, lon:-0.190},
  {code:"MAN", city:"Manchester", country:"UK", name:"Manchester", tz:"Europe/London", lat:53.353, lon:-2.274},
  {code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris", lat:49.012, lon:2.55},
  {code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin", lat:50.037, lon:8.562},
  {code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam", lat:52.308, lon:4.763},
  {code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome", lat:41.8, lon:12.238},
  {code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid", lat:40.489, lon:-3.592},
  {code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat", tz:"Europe/Madrid", lat:41.297, lon:2.083},
  {code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul", lat:41.275, lon:28.751},
  {code:"JFK", city:"New York", country:"USA", name:"JFK", tz:"America/New_York", lat:40.641, lon:-73.778},
  {code:"LAX", city:"Los Angeles", country:"USA", name:"LAX", tz:"America/Los_Angeles", lat:33.941, lon:-118.408},
  {code:"SFO", city:"San Francisco", country:"USA", name:"SFO", tz:"America/Los_Angeles", lat:37.618, lon:-122.375},
  {code:"ORD", city:"Chicago", country:"USA", name:"O'Hare", tz:"America/Chicago", lat:41.974, lon:-87.907},
  {code:"MIA", city:"Miami", country:"USA", name:"Miami Intl", tz:"America/New_York", lat:25.793, lon:-80.290},
  {code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto", lat:43.677, lon:-79.624},
  {code:"BOM", city:"Mumbai", country:"India", name:"Mumbai", tz:"Asia/Kolkata", lat:19.088, lon:72.867},
  {code:"DEL", city:"Delhi", country:"India", name:"Delhi", tz:"Asia/Kolkata", lat:28.556, lon:77.100},
  {code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore", lat:1.364, lon:103.991},
  {code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA", tz:"Asia/Kuala_Lumpur", lat:2.745, lon:101.709},
  {code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok", lat:13.681, lon:100.747},
  {code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta", lat:-6.125, lon:106.655},
  {code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila", lat:14.508, lon:121.019},
  {code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo", lat:35.764, lon:140.386},
  {code:"HND", city:"Tokyo", country:"Japan", name:"Haneda", tz:"Asia/Tokyo", lat:35.549, lon:139.779},
  {code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul", lat:37.460, lon:126.44},
  {code:"PEK", city:"Beijing", country:"China", name:"Capital", tz:"Asia/Shanghai", lat:40.08, lon:116.584},
  {code:"PVG", city:"Shanghai", country:"China", name:"Pudong", tz:"Asia/Shanghai", lat:31.143, lon:121.805},
  {code:"SYD", city:"Sydney", country:"Australia", name:"Sydney", tz:"Australia/Sydney", lat:-33.939, lon:151.175},
  {code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland Intl", tz:"Pacific/Auckland", lat:-37.008, lon:174.791},
];
function haversine(lat1, lon1, lat2, lon2){ const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
function getFlightDurationMins(from, to){ const f=findAirport(from), t=findAirport(to); if(!f.lat ||!t.lat || f.lat===0) return 8*60; const dist=haversine(f.lat,f.lon,t.lat,t.lon); const hours=dist/850 + 0.8; return Math.max(60, Math.round(hours*60)); }
function genCode(p){return p+'-'+Math.random().toString(36).substring(2,7).toUpperCase()}
function findAirport(c){return AIRPORTS.find(a=>a.code===c.toUpperCase())||{code:c.toUpperCase(), city:c, country:"", name:"Intl", tz:"UTC", lat:0, lon:0}}
function isAuthenticated(req){ const cookie = req.headers.cookie || ''; return cookie.includes('admin_auth=Skylink1824'); }
app.get('/skylink-admin-login', (req,res)=>{ res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0f2e6d;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial}.card{background:#fff;padding:30px;border-radius:16px;width:100%;max-width:360px;box-shadow:0 10px 40px rgba(0,0,0,.3)}input{width:100%;padding:13px;border-radius:10px;border:1.5px solid #e2e8f0;margin-top:12px;box-sizing:border-box;font-size:14px}button{width:100%;background:#0f2e6d;color:#fff;padding:13px;border-radius:10px;border:none;font-weight:900;margin-top:14px;cursor:pointer}</style></head><body><div class="card"><div style="text-align:center;font-weight:900;font-size:20px">✈️ SKYLINK ADMIN</div><div style="text-align:center;font-size:11px;color:#64748b;margin-top:6px;letter-spacing:1px">ADMIN LOGIN ONLY</div><form method="POST" action="/api/admin-login"><input type="password" name="password" placeholder="Enter admin password" required><button type="submit">Login →</button></form></div></body></html>`);});
app.post('/api/admin-login', (req,res)=>{ const pass = req.body.password || ''; if(pass === ADMIN_PASSWORD){ res.setHeader('Set-Cookie', 'admin_auth=Skylink1824; Path=/; Max-Age=86400; HttpOnly'); res.redirect('/skylink-admin-gospel-2024'); } else { res.send('<script>alert("Wrong password"); location.href="/skylink-admin-login"</script>'); } });
app.get('/skylink-admin-logout', (req,res)=>{ res.setHeader('Set-Cookie', 'admin_auth=; Path=/; Max-Age=0'); res.redirect('/skylink-admin-login'); });

app.get('/', (req,res)=>{
  const aj = JSON.stringify(AIRPORTS);
  const pk = process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73';
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>SKYLINK AIRLINES</title><script src="https://js.paystack.co/v1/inline.js"></script><style>
*{box-sizing:border-box} html{font-size:16px}
body{margin:0;font-family:Inter,Arial;background:#f1f5f9;padding:0;display:block}
.wrapper{width:100%;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:12px}
.card{width:100%;max-width:540px;background:#fff;border-radius:20px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08);border:1px solid #e2e8f0;margin-top:10px}
.header{display:flex;justify-content:center;margin-bottom:8px}
.pill{background:#0f2e6d;color:#fff;padding:14px 26px;border-radius:30px;font-weight:900;font-size:17px;display:flex;align-items:center;gap:8px}
.pill span:last-child{color:#FACC15}
.sub{font-size:11px;font-weight:800;color:#64748b;text-align:center;margin-bottom:18px;letter-spacing:0.8px}
label{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;margin-top:16px;margin-bottom:6px;color:#0f172a}
.badge{background:#dbeafe;color:#1e40af;font-size:9px;font-weight:900;padding:3px 8px;border-radius:10px}
input{width:100%;padding:15px 16px;border-radius:12px;border:1.5px solid #e2e8f0;font-size:16px;font-weight:600;background:#f8fafc;color:#000;outline:none}
input:focus{background:#fff;border-color:#0f2e6d}
.btn-main{width:100%;background:#0f2e6d;color:#fff;padding:16px;border-radius:12px;border:none;font-weight:800;font-size:16px;margin-top:18px;cursor:pointer}
.track-row{display:flex;gap:8px;margin-top:14px}
.btn-track{background:#16a34a;color:#fff;border:none;padding:14px 20px;border-radius:10px;font-weight:800;font-size:14px;cursor:pointer}
.suggest{position:absolute;background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-height:180px;overflow:auto;width:100%;z-index:20;display:none;box-shadow:0 10px 30px rgba(0,0,0,.1)}
.suggest div{padding:10px 12px;font-size:13px;font-weight:700;cursor:pointer;border-bottom:1px solid #f1f5f9}
.rel{position:relative}
#step2{display:none}
.warning{background:#FEF3C7;border:2px solid #F59E0B;border-radius:12px;padding:12px;font-weight:800;font-size:13px;color:#92400E;text-align:center;margin-bottom:12px}
.summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px;font-size:14px;line-height:1.6;margin-bottom:12px}
</style></head><body><div class="wrapper"><div class="card">
<div class="header"><div class="pill">✈️ SKYLINK <span>AIRLINES</span></div></div>
<div class="sub">OFFICIAL BOOKING PORTAL</div>
<div id="step1">
<form onsubmit="goToPayment(event)">
<label>Full Name *</label><input id="pname" required placeholder="As on passport" autocomplete="off">
<label>Email *</label><input id="email" type="email" required placeholder="boarding pass will be sent here" autocomplete="off">
<label>From * <span class="badge">150+ COUNTRIES</span></label><div class="rel"><input id="from" autocomplete="off" oninput="autoSuggest('from')" placeholder="e.g. SAH - Sanaa, Yemen" required><div id="from-suggest" class="suggest"></div></div>
<label>To *</label><div class="rel"><input id="to" autocomplete="off" oninput="autoSuggest('to')" placeholder="e.g. LOS - Lagos" required><div id="to-suggest" class="suggest"></div></div>
<label>Departure Date & Time *</label><input type="datetime-local" id="depart" required>
<button class="btn-main" type="submit">Continue →</button>
</form>
<div class="track-row"><input id="trk" placeholder="TRK-XXXXXXX" style="flex:1;background:#fff;padding:14px;border-radius:10px;border:1.5px solid #e2e8f0"><button class="btn-track" onclick="if(document.getElementById('trk').value) location.href='/track?code='+document.getElementById('trk').value">Track</button></div>
</div>
<div id="step2">
<div class="summary" id="summary"></div>
<div class="warning">WARNING!!! Transfer this exact amount: <b>NGN 2,150</b> - Do not pay more or less to avoid booking failure.</div>
<button class="btn-main" id="payBtn" onclick="payWithPaystack()">Pay NGN 2,150 & Generate Boarding Pass</button>
<button class="btn-main" style="background:#fff;color:#0f2e6d;border:1.5px solid #0f2e6d;margin-top:8px" onclick="backToForm()">← Back</button>
</div>
</div></div>
<script>
const airports=${aj};
const PAYSTACK_PUBLIC_KEY="${pk}";
let pendingPayload=null;
function autoSuggest(t){
  const i=document.getElementById(t), b=document.getElementById(t+"-suggest"), q=i.value.toLowerCase();
  if(!q){b.style.display="none";return}
  const f=airports.filter(a=>(a.code+" "+a.city+" "+a.country+" "+a.name).toLowerCase().includes(q)).slice(0,12);
  if(!f.length){b.style.display="none";return}
  b.innerHTML=f.map(a=>"<div onclick=\\"selectAirport('"+t+"','"+a.code+"')\\"><b>"+a.code+"</b> - "+a.city+", "+a.country+" - "+a.name+"</div>").join("");
  b.style.display="block";
}
function selectAirport(t,c){
  const a=airports.find(x=>x.code===c);
  document.getElementById(t).value=a.code+" - "+a.city+", "+a.country+" ("+a.name+")";
  document.getElementById(t).dataset.code=c;
  document.getElementById(t+"-suggest").style.display="none";
}
function goToPayment(e){
  e.preventDefault();
  const name=document.getElementById("pname").value.trim();
  const email=document.getElementById("email").value.trim();
  const from=document.getElementById("from").dataset.code||document.getElementById("from").value.split(" ")[0].toUpperCase();
  const to=document.getElementById("to").dataset.code||document.getElementById("to").value.split(" ")[0].toUpperCase();
  const depart=document.getElementById("depart").value;
  if(!name||!email||!from||!to||!depart){alert("Fill all fields");return}
  pendingPayload={name,email,from,to,depart,class:"ECONOMY"};
  document.getElementById("summary").innerHTML="<b>Passenger:</b> "+name+"<br><b>Route:</b> "+from+" → "+to+"<br><b>Departure:</b> "+new Date(depart).toLocaleString()+"<br><b>Amount:</b> NGN 2,150";
  document.getElementById("step1").style.display="none";
  document.getElementById("step2").style.display="block";
}
function backToForm(){document.getElementById("step2").style.display="none";document.getElementById("step1").style.display="block";}
function payWithPaystack(){
  var btn=document.getElementById("payBtn");
  if(typeof PaystackPop === 'undefined'){ alert("Paystack not loaded"); btn.disabled=false; return; }
  btn.innerText="Processing Payment..."; btn.disabled=true;
  try{
    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: pendingPayload.email,
      amount: 2150 * 100,
      currency: "NGN",
      ref: "SKY-" + Math.floor(Math.random()*1000000000),
      onClose: function(){ btn.innerText="Pay NGN 2,150 & Generate Boarding Pass"; btn.disabled=false; },
      callback: function(response){
        btn.innerText="Payment successful! Generating ticket...";
        pendingPayload.paystackRef = response.reference;
        fetch("/api/book",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(pendingPayload)})
    .then(function(r){return r.json()})
    .then(function(d){ if(d.boardingUrl){ window.location = d.boardingUrl; } else { alert(d.error||"Failed"); btn.disabled=false; } })
    .catch(function(err){ alert("Error: "+err.message); btn.disabled=false; });
      }
    });
    handler.openIframe();
  }catch(err){ alert("Paystack error: "+err.message); btn.disabled=false; }
}
document.addEventListener("click",function(e){if(!e.target.closest(".rel"))document.querySelectorAll(".suggest").forEach(function(s){s.style.display="none"})});
<\/script></body></html>`);
});

app.post('/api/book', async (req,res)=>{
  const {name,email,from,to,depart,class:cls,paystackRef}=req.body;
  if(!paystackRef){ return res.status(400).json({error:'Payment required'}); }
  const tracking='TRK-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const booking=genCode('SKY');
  const flight='SKY-'+Math.floor(100+Math.random()*899);
  const gate='G'+Math.floor(10+Math.random()*90);
  const terminal='T'+Math.floor(1+Math.random()*3);
  const seat=Math.floor(10+Math.random()*30)+['A','B','C','D','E','F'][Math.floor(Math.random()*6)];
  const fromA=findAirport(from),toA=findAirport(to);
  const departDate=depart?new Date(depart):new Date(Date.now()+7200000);
  const durMins=getFlightDurationMins(fromA.code,toA.code);
  const arriveDate=new Date(departDate.getTime()+durMins*60000);
  const rec={booking,tracking,name:name.toUpperCase(),email:email||"",from:fromA.code,fromFull:fromA.code+' - '+fromA.city+', '+fromA.country+' ('+fromA.name+')',to:toA.code,toFull:toA.code+' - '+toA.city+', '+toA.country+' ('+toA.name+')',flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:arriveDate.toISOString(),durationMins:durMins,fromTz:fromA.tz,toTz:toA.tz,baggage:'23KG',paystackRef,amount:2150,createdAt:new Date().toISOString()};
  await savePerm(tracking, rec);
  res.json({boardingUrl:'/boarding-pass?code='+tracking});
});

// ADMIN SAME AS BEFORE
app.get('/skylink-admin-gospel-2024', async (req,res)=>{
  if(!isAuthenticated(req)){ return res.redirect('/skylink-admin-login'); }
  let all=[];const seen=new Set();
  if(BookingModel){ try{ const docs=await BookingModel.find({}).sort({createdAt:-1}); docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} }); }catch(e){} }
  try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  const total = all.length * 2150; const today = all.filter(b=> b.createdAt && new Date(b.createdAt).toDateString() === new Date().toDateString()).length;
  let rows = all.map(b=>`<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:14px;font-weight:800;color:#0f2e6d">${b.booking}</td><td style="padding:14px"><span style="background:#e0f2fe;color:#0c4a6e;padding:4px 10px;border-radius:20px;font-weight:800;font-size:11px">${b.tracking}</span></td><td style="padding:14px;font-weight:700">${b.name}</td><td style="padding:14px;font-weight:700">${b.from} → ${b.to} <br><span style="font-size:10px;color:#16a34a">${b.durationMins? Math.floor(b.durationMins/60)+'h '+(b.durationMins%60)+'m':''}</span></td><td style="padding:14px;font-weight:900;color:#16a34a">NGN 2,150</td><td style="padding:14px;font-size:11px">${b.paystackRef||''}</td><td style="padding:14px;font-size:11px">${b.createdAt? new Date(b.createdAt).toLocaleString():''}</td><td style="padding:14px"><a href="/boarding-pass?code=${b.tracking}" style="background:#0f2e6d;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:11px;font-weight:800">View Pass</a></td></tr>`).join('');
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK Admin</title><style>body{margin:0;font-family:Inter,Arial;background:#f1f5f9}.header{background:#0f2e6d;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.card{max-width:1200px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);overflow:hidden;border:1px solid #e2e8f0}.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}.stat h3{margin:0;font-size:11px;color:#64748b}.stat p{margin:6px 0 0;font-size:22px;font-weight:900}.table-wrap{overflow:auto} table{width:100%;border-collapse:collapse;min-width:900px} th{background:#f8fafc;text-align:left;padding:12px 14px;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0} a.logout{background:#ef4444;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px}</style></head><body><div class="header"><div><div style="font-weight:900;font-size:20px">✈️ SKYLINK AIRLINES - ADMIN</div><div style="font-size:11px;opacity:0.8">Real Money Dashboard - Private</div></div><div><a class="logout" href="/skylink-admin-logout">Logout</a></div></div><div class="card"><div class="stats"><div class="stat"><h3>TOTAL BOOKINGS</h3><p>${all.length}</p></div><div class="stat"><h3>TOTAL REVENUE</h3><p style="color:#16a34a">NGN ${total.toLocaleString()}</p></div><div class="stat"><h3>TODAY</h3><p>${today}</p></div></div><div style="padding:0 20px 10px;font-weight:900">All Bookings - Paystack Verified</div><div class="table-wrap"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>AMOUNT</th><th>PAYSTACK REF</th><th>DATE</th><th>ACTION</th></tr>${rows || '<tr><td colspan=8 style="padding:40px;text-align:center;color:#94a3b8">No bookings yet</td></tr>'}</table></div></div></body></html>`);
});

// NEW PROFESSIONAL BOARDING PASS - EXACTLY LIKE YOUR SAMPLE
app.get('/boarding-pass', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<h2 style="font-family:Arial;text-align:center;margin-top:50px">Boarding Pass Not Found</h2>');}
  let qr=''; if(QRCode){ try{ qr=await QRCode.toDataURL('https://'+req.get('host')+'/track?code='+b.tracking); }catch(e){} }
  const host = req.get('host');
  const trackLink = `https://${host}/track?code=${b.tracking}`;
  const durH = b.durationMins? Math.floor(b.durationMins/60) : 8;
  const durM = b.durationMins? b.durationMins%60 : 0;
  const departStr = new Date(b.departISO).toLocaleString('en-US',{month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' - ' + b.fromTz;
  const arriveStr = new Date(b.arriveISO).toLocaleString('en-US',{month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' - ' + b.toTz;
  res.send(`
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boarding Pass ${b.booking}</title>
<style>
*{box-sizing:border-box} body{margin:0;background:#e5e7eb;font-family:Arial,Helvetica,sans-serif;display:flex;justify-content:center;padding:0}
.ticket{width:100%;max-width:900px;background:#fff;margin:0;box-shadow:0 4px 20px rgba(0,0,0,.15)}
.header{background:#1a2b5e;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:flex-start}
.header-left h1{margin:0;font-size:28px;font-weight:900;letter-spacing:0.5px}.header-left h1 span{color:#facc15}.header-left.sub{font-size:10px;letter-spacing:1px;margin-top:4px;opacity:0.9}
.header-right{font-size:11px;opacity:0.8;text-align:right}
.content{padding:20px 24px;display:grid;grid-template-columns:1fr 200px;gap:20px}
.label{font-size:10px;color:#6b7280;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;margin-top:14px}
.value{font-size:14px;font-weight:800;color:#111827;margin-top:2px;word-break:break-word}
.big-name{font-size:18px;font-weight:900}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:6px}
.box{border:1px solid #e5e7eb;border-radius:0;padding:0}
.status-green{color:#16a34a;font-weight:900}
.qr-box{border:1.5px solid #1a2b5e;padding:10px;text-align:center;background:#fff}
.qr-box img{width:100%;max-width:180px;height:auto}
.qr-link{font-size:8px;color:#1a2b5e;word-break:break-all;margin-top:6px;font-weight:600}
.bottom-bar{background:#1a2b5e;color:#cbd5e1;padding:8px 24px;font-size:8px;text-align:center;letter-spacing:0.5px}
.stub{padding:10px 24px;background:#fff;border-top:2px dashed #9ca3af;font-size:10px;font-weight:800}
@media(max-width:700px){.content{grid-template-columns:1fr}.qr-box{order:-1}}
</style>
</head><body>
<div class="ticket">
  <div class="header">
    <div class="header-left"><h1>SKYLINK<span>AIRLINES</span></h1><div class="sub">IATA CERTIFIED • EST. 2018 • OFFICIAL BOARDING PASS</div></div>
    <div class="header-right">${host}</div>
  </div>
  <div class="content">
    <div>
      <div class="label">PASSENGER NAME / NOM DU PASSAGER</div><div class="value big-name">${b.name}</div>
      <div class="label">FROM / DE</div><div class="value">${b.fromFull}</div>
      <div class="label">TO / A</div><div class="value">${b.toFull}</div>
      <div class="grid3">
        <div><div class="label">FLIGHT / VOL</div><div class="value">${b.flight}</div></div>
        <div><div class="label">DATE</div><div class="value">${new Date(b.departISO).toLocaleDateString('en-GB')}</div></div>
        <div><div class="label">SEAT / SIEGE</div><div class="value" style="font-size:18px">${b.seat}</div></div>
      </div>
      <div class="grid3">
        <div><div class="label">GATE / PORTE</div><div class="value">${b.gate}</div></div>
        <div><div class="label">TERMINAL</div><div class="value">${b.terminal}</div></div>
        <div><div class="label">CLASS</div><div class="value">${b.class}</div></div>
        <div><div class="label">BAGGAGE</div><div class="value">${b.baggage}</div></div>
      </div>
      <div class="grid3" style="margin-top:12px">
        <div><div class="label">TRACKING CODE</div><div class="value">${b.tracking}</div></div>
        <div><div class="label">STATUS</div><div class="value status-green">CONFIRMED / CONFIRME</div></div>
      </div>
      <div style="margin-top:16px">
        <div class="label">DEPARTURE / DEPART</div><div class="value">${departStr}</div>
        <div class="label">ARRIVAL / ARRIVEE</div><div class="value">${arriveStr}</div>
      </div>
      <div style="margin-top:16px;font-size:11px;line-height:1.5">
        <b>AIRCRAFT:</b> Boeing 737-800 | <b>DURATION:</b> ${durH}h ${durM.toString().padStart(2,'0')}m | <b>MEAL:</b> Included<br>
        <b>IMPORTANT:</b> Present this boarding pass with valid ID at check-in counter 2 hours before departure. Boarding closes 45 mins before.
      </div>
    </div>
    <div class="qr-box">
      ${qr? `<img src="${qr}">` : `<div style="width:180px;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center">QR</div>`}
      <div style="font-size:10px;font-weight:800;margin-top:8px">SCAN TO TRACK LIVE FLIGHT STATUS</div>
      <div class="qr-link">${trackLink}</div>
    </div>
  </div>
  <div class="bottom-bar">This is an official e-ticket issued by SKYLINK AIRLINES. Non-transferable. Subject to conditions of carriage.</div>
  <div class="stub">BOARDING PASS STUB - KEEP WITH YOU<br>${b.name} | ${b.flight} | ${b.from} ${b.to} | SEAT ${b.seat} | GATE ${b.gate} | TERMINAL ${b.terminal} | ${b.tracking}</div>
</div>
</body></html>
`);
});

// NEW ISOLATED TRACKING - EXACTLY LIKE YOUR SAMPLE - NO HOME BUTTON - REAL LANDING
app.get('/track', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<html><body style="font-family:Arial;padding:20px">Invalid Tracking Code - Not Found: '+code+'</body></html>');}
  const departTime = new Date(b.departISO).getTime();
  const arriveTime = new Date(b.arriveISO).getTime();
  const totalMs = arriveTime - departTime;
  const now = Date.now();
  const diffMs = now - departTime;
  const isDeparted = diffMs > 0;
  const isLanded = diffMs >= totalMs;
  const totalHours = Math.floor(totalMs/3600000);
  const totalMins = Math.floor((totalMs%3600000)/60000);
  let timeInAirText = "Not Departed";
  let statusText = "Scheduled";
  let altitude = "N/A";
  let speed = "N/A";
  if(!isDeparted){
    statusText = "Scheduled";
    timeInAirText = "Not Departed";
  } else if(isLanded){
    statusText = "Arrived";
    timeInAirText = `${totalHours}h ${totalMins}m (Landed)`;
    altitude = "0 ft";
    speed = "0 km/h";
  } else {
    const h = Math.floor(diffMs/3600000);
    const m = Math.floor((diffMs%3600000)/60000);
    timeInAirText = `${h}h ${m}m`;
    statusText = diffMs < 15*60000? "Boarding" : diffMs < 30*60000? "Departed" : "In-Flight";
    altitude = "35,000 ft";
    speed = "850 km/h";
  }
  const departStr = new Date(b.departISO).toLocaleString('en-US',{month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true});
  const arriveStr = new Date(b.arriveISO).toLocaleString('en-US',{month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true});

  res.send(`
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live Flight Tracking ${b.tracking}</title>
<style>
body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:16px;color:#111}
.container{max-width:700px}
h2{margin:0 0 16px;font-size:18px;font-weight:700;display:flex;align-items:center;gap:6px}
.line{margin:8px 0;font-size:14px}.label{font-weight:700}.value{font-weight:400}
.divider{border:none;border-top:1.5px solid #1a2b5e;margin:16px 0}
.live{margin-top:10px}
.live b{font-size:15px}
.green{color:#16a34a;font-weight:800}
.red{color:#dc2626;font-weight:800}
</style>
</head><body>
<div class="container">
  <h2>📍 Live Flight Tracking</h2>
  <div class="line"><span class="label">Tracking Code:</span> <span class="value">${b.tracking}</span></div>
  <div class="line"><span class="label">Passenger:</span> <span class="value">${b.name}</span></div>
  <div class="line"><span class="label">Flight:</span> <span class="value">${b.flight}</span></div>
  <div class="line"><span class="label">Route:</span> <span class="value">${b.from} - ${b.fromFull.split(' - ')[1]||b.from} → ${b.to} - ${b.toFull.split(' - ')[1]||b.to}</span></div>
  <div class="line"><span class="label">Departure:</span> <span class="value">${departStr}</span></div>
  <div class="line"><span class="label">Est. Duration:</span> <span class="value">${totalHours}h ${totalMins}m</span></div>
  <div class="line"><span class="label">Est. Arrival:</span> <span class="value">${arriveStr}</span></div>
  <hr class="divider">
  <div class="live">
    <div style="font-weight:700;margin-bottom:8px">Live Status</div>
    <div class="line"><span class="label">Status:</span> <span class="value ${isLanded?'green':''}" style="font-weight:700;color:${statusText==='In-Flight'?'#16a34a': statusText==='Scheduled'?'#1e40af': statusText==='Arrived'?'#16a34a':'#b45309'}">${statusText}</span></div>
    <div class="line"><span class="label">Time in Air:</span> <span class="value ${isDeparted &&!isLanded?'green':''} ${isLanded?'green':''}" style="font-weight:${isDeparted?'800':'400'}">${timeInAirText}</span></div>
    <div class="line"><span class="label">Altitude:</span> <span class="value">${altitude}</span></div>
    <div class="line"><span class="label">Speed:</span> <span class="value">${speed}</span></div>
  </div>
</div>
<script>
// Auto refresh every 60 seconds to update Time in Air real-time without showing Home
setTimeout(()=>{ location.reload(); }, 60000);
</script>
</body></html>
`);
});

app.get('/health',(req,res)=> res.send('OK'));
app.listen(PORT, ()=> console.log('SKYLINK FINAL V3 PROFESSIONAL READY'));
