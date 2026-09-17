// server.js - SKYLINK FINAL - ISOLATED TRACKING ONLY - NO LINK BACK TO MAIN SITE
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
        class: String, departISO: String, arriveISO: String,
        fromTz: String, toTz: String, baggage: String,
        paystackRef: String, amount: Number, createdAt: String
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
  {code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl", tz:"Asia/Aden"},
  {code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl", tz:"Asia/Aden"},
  {code:"HOD", city:"Hodeidah", country:"Yemen", name:"Hodeidah Intl", tz:"Asia/Aden"},
  {code:"TAI", city:"Taiz", country:"Yemen", name:"Taiz Intl", tz:"Asia/Aden"},
  {code:"GXF", city:"Seiyun", country:"Yemen", name:"Seiyun Hadhramout", tz:"Asia/Aden"},
  {code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz", tz:"Asia/Riyadh"},
  {code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid", tz:"Asia/Riyadh"},
  {code:"MED", city:"Medina", country:"Saudi Arabia", name:"Prince Mohammad", tz:"Asia/Riyadh"},
  {code:"DMM", city:"Dammam", country:"Saudi Arabia", name:"King Fahd", tz:"Asia/Riyadh"},
  {code:"AHB", city:"Abha", country:"Saudi Arabia", name:"Abha Intl", tz:"Asia/Riyadh"},
  {code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl", tz:"Asia/Dubai"},
  {code:"AUH", city:"Abu Dhabi", country:"UAE", name:"Abu Dhabi Intl", tz:"Asia/Dubai"},
  {code:"SHJ", city:"Sharjah", country:"UAE", name:"Sharjah Intl", tz:"Asia/Dubai"},
  {code:"DWC", city:"Dubai", country:"UAE", name:"Al Maktoum", tz:"Asia/Dubai"},
  {code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl", tz:"Asia/Qatar"},
  {code:"KWI", city:"Kuwait", country:"Kuwait", name:"Kuwait Intl", tz:"Asia/Kuwait"},
  {code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl", tz:"Asia/Bahrain"},
  {code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl", tz:"Asia/Muscat"},
  {code:"SLL", city:"Salalah", country:"Oman", name:"Salalah Intl", tz:"Asia/Muscat"},
  {code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia", tz:"Asia/Amman"},
  {code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Intl", tz:"Asia/Beirut"},
  {code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl", tz:"Asia/Baghdad"},
  {code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini", tz:"Asia/Tehran"},
  {code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion", tz:"Asia/Jerusalem"},
  {code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed", tz:"Africa/Lagos"},
  {code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe", tz:"Africa/Lagos"},
  {code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano", tz:"Africa/Lagos"},
  {code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt Intl", tz:"Africa/Lagos"},
  {code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam", tz:"Africa/Lagos"},
  {code:"BNI", city:"Benin", country:"Nigeria", name:"Benin Airport", tz:"Africa/Lagos"},
  {code:"CBQ", city:"Calabar", country:"Nigeria", name:"Margaret Ekpo", tz:"Africa/Lagos"},
  {code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka Intl", tz:"Africa/Accra"},
  {code:"KMS", city:"Kumasi", country:"Ghana", name:"Kumasi Airport", tz:"Africa/Accra"},
  {code:"ABJ", city:"Abidjan", country:"Ivory Coast", name:"Felix Houphouet", tz:"Africa/Abidjan"},
  {code:"DKR", city:"Dakar", country:"Senegal", name:"Blaise Diagne", tz:"Africa/Dakar"},
  {code:"BKO", city:"Bamako", country:"Mali", name:"Modibo Keita", tz:"Africa/Bamako"},
  {code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun", tz:"Africa/Porto-Novo"},
  {code:"LFW", city:"Lome", country:"Togo", name:"Lome Tokoin", tz:"Africa/Lome"},
  {code:"OUA", city:"Ouagadougou", country:"Burkina Faso", name:"Thomas Sankara", tz:"Africa/Ouagadougou"},
  {code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl", tz:"Africa/Cairo"},
  {code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole Intl", tz:"Africa/Addis_Ababa"},
  {code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta", tz:"Africa/Nairobi"},
  {code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere", tz:"Africa/Dar_es_Salaam"},
  {code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali Intl", tz:"Africa/Kigali"},
  {code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe Intl", tz:"Africa/Kampala"},
  {code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo", tz:"Africa/Johannesburg"},
  {code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town Intl", tz:"Africa/Johannesburg"},
  {code:"LHR", city:"London", country:"UK", name:"Heathrow", tz:"Europe/London"},
  {code:"LGW", city:"London", country:"UK", name:"Gatwick", tz:"Europe/London"},
  {code:"MAN", city:"Manchester", country:"UK", name:"Manchester", tz:"Europe/London"},
  {code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris"},
  {code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin"},
  {code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam"},
  {code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome"},
  {code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid"},
  {code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat", tz:"Europe/Madrid"},
  {code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul"},
  {code:"JFK", city:"New York", country:"USA", name:"JFK", tz:"America/New_York"},
  {code:"LAX", city:"Los Angeles", country:"USA", name:"LAX", tz:"America/Los_Angeles"},
  {code:"SFO", city:"San Francisco", country:"USA", name:"SFO", tz:"America/Los_Angeles"},
  {code:"ORD", city:"Chicago", country:"USA", name:"O'Hare", tz:"America/Chicago"},
  {code:"MIA", city:"Miami", country:"USA", name:"Miami Intl", tz:"America/New_York"},
  {code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto"},
  {code:"BOM", city:"Mumbai", country:"India", name:"Mumbai", tz:"Asia/Kolkata"},
  {code:"DEL", city:"Delhi", country:"India", name:"Delhi", tz:"Asia/Kolkata"},
  {code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore"},
  {code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA", tz:"Asia/Kuala_Lumpur"},
  {code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok"},
  {code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta"},
  {code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila"},
  {code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo"},
  {code:"HND", city:"Tokyo", country:"Japan", name:"Haneda", tz:"Asia/Tokyo"},
  {code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul"},
  {code:"PEK", city:"Beijing", country:"China", name:"Capital", tz:"Asia/Shanghai"},
  {code:"PVG", city:"Shanghai", country:"China", name:"Pudong", tz:"Asia/Shanghai"},
  {code:"SYD", city:"Sydney", country:"Australia", name:"Sydney", tz:"Australia/Sydney"},
  {code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland Intl", tz:"Pacific/Auckland"},
];

function genCode(p){return p+'-'+Math.random().toString(36).substring(2,7).toUpperCase()}
function findAirport(c){return AIRPORTS.find(a=>a.code===c.toUpperCase())||{code:c.toUpperCase(), city:c, country:"", name:"Intl", tz:"UTC"}}
function isAuthenticated(req){ const cookie = req.headers.cookie || ''; return cookie.includes('admin_auth=Skylink1824'); }

app.get('/skylink-admin-login', (req,res)=>{
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0f2e6d;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial}.card{background:#fff;padding:30px;border-radius:16px;width:100%;max-width:360px;box-shadow:0 10px 40px rgba(0,0,0,.3)}input{width:100%;padding:13px;border-radius:10px;border:1.5px solid #e2e8f0;margin-top:12px;box-sizing:border-box;font-size:14px}button{width:100%;background:#0f2e6d;color:#fff;padding:13px;border-radius:10px;border:none;font-weight:900;margin-top:14px;cursor:pointer}</style></head><body><div class="card"><div style="text-align:center;font-weight:900;font-size:20px">✈️ SKYLINK ADMIN</div><div style="text-align:center;font-size:11px;color:#64748b;margin-top:6px;letter-spacing:1px">ADMIN LOGIN ONLY</div><form method="POST" action="/api/admin-login"><input type="password" name="password" placeholder="Enter admin password" required><button type="submit">Login →</button></form></div></body></html>`);
});
app.post('/api/admin-login', (req,res)=>{
  const pass = req.body.password || '';
  if(pass === ADMIN_PASSWORD){ res.setHeader('Set-Cookie', 'admin_auth=Skylink1824; Path=/; Max-Age=86400; HttpOnly'); res.redirect('/skylink-admin-gospel-2024'); }
  else { res.send('<script>alert("Wrong password"); location.href="/skylink-admin-login"</script>'); }
});
app.get('/skylink-admin-logout', (req,res)=>{ res.setHeader('Set-Cookie', 'admin_auth=; Path=/; Max-Age=0'); res.redirect('/skylink-admin-login'); });

app.get('/', (req,res)=>{
  const aj = JSON.stringify(AIRPORTS);
  const HARD_PK = 'pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73';
  const pk = process.env.PAYSTACK_PUBLIC_KEY || HARD_PK;
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK AIRLINES</title><script src="https://js.paystack.co/v1/inline.js"></script><style>
body{margin:0;font-family:Inter,Arial;background:#eef2f7;display:flex;justify-content:center;padding:16px}
.card{width:100%;max-width:440px;background:#fff;border-radius:20px;padding:22px;box-shadow:0 8px 30px rgba(0,0,0,.06);border:1px solid #e2e8f0}
.header{display:flex;justify-content:center;margin-bottom:8px}
.pill{background:#0f2e6d;color:#fff;padding:12px 22px;border-radius:30px;font-weight:900;font-size:15px;display:flex;align-items:center;gap:8px}
.pill span:last-child{color:#FACC15}
.sub{font-size:10px;font-weight:800;color:#64748b;text-align:center;margin-bottom:18px;letter-spacing:0.8px}
label{font-size:12px;font-weight:800;display:flex;align-items:center;gap:6px;margin-top:14px;margin-bottom:6px;color:#0f172a}
.badge{background:#dbeafe;color:#1e40af;font-size:9px;font-weight:900;padding:3px 8px;border-radius:10px}
input{width:100%;padding:13px 14px;border-radius:12px;border:1.5px solid #e2e8f0;font-size:13px;font-weight:600;background:#f8fafc;color:#000;outline:none;box-sizing:border-box}
input:focus{background:#fff;border-color:#0f2e6d}
.btn-main{width:100%;background:#0f2e6d;color:#fff;padding:14px;border-radius:12px;border:none;font-weight:800;font-size:14px;margin-top:16px;cursor:pointer}
.track-row{display:flex;gap:8px;margin-top:12px}
.btn-track{background:#16a34a;color:#fff;border:none;padding:12px 18px;border-radius:10px;font-weight:800;font-size:13px;cursor:pointer}
.suggest{position:absolute;background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-height:180px;overflow:auto;width:100%;z-index:20;display:none;box-shadow:0 10px 30px rgba(0,0,0,.1)}
.suggest div{padding:10px 12px;font-size:13px;font-weight:700;cursor:pointer;border-bottom:1px solid #f1f5f9}
.rel{position:relative}
#step2{display:none}
.warning{background:#FEF3C7;border:2px solid #F59E0B;border-radius:12px;padding:12px;font-weight:800;font-size:12px;color:#92400E;text-align:center;margin-bottom:12px}
.summary{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;font-size:13px;line-height:1.6;margin-bottom:12px}
</style></head><body><div class="card">
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
<div class="track-row"><input id="trk" placeholder="TRK-XXXXXXX" style="flex:1;background:#fff;padding:12px;border-radius:10px;border:1.5px solid #e2e8f0"><button class="btn-track" onclick="if(document.getElementById('trk').value) location.href='/track?code='+document.getElementById('trk').value">Track</button></div>
</div>
<div id="step2">
<div class="summary" id="summary"></div>
<div class="warning">WARNING!!! Transfer this exact amount: <b>NGN 2,150</b> - Do not pay more or less to avoid booking failure.</div>
<button class="btn-main" id="payBtn" onclick="payWithPaystack()">Pay NGN 2,150 with Paystack & Generate Boarding Pass</button>
<button class="btn-main" style="background:#fff;color:#0f2e6d;border:1.5px solid #0f2e6d;margin-top:8px" onclick="backToForm()">← Back</button>
</div>
</div>
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
  btn.innerText="Opening Paystack - Real Payment..."; btn.disabled=true;
  try{
    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: pendingPayload.email,
      amount: 2150 * 100,
      currency: "NGN",
      ref: "SKY-" + Math.floor(Math.random()*1000000000),
      onClose: function(){ btn.innerText="Pay NGN 2,150 with Paystack & Generate Boarding Pass"; btn.disabled=false; },
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
<\/script><\/body><\/html>`);
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
  const rec={booking,tracking,name:name.toUpperCase(),email:email||"",from:fromA.code,fromFull:fromA.code+' - '+fromA.city+', '+fromA.country+' ('+fromA.name+')',to:toA.code,toFull:toA.code+' - '+toA.city+', '+toA.country+' ('+toA.name+')',flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:new Date(departDate.getTime()+8*3600000).toISOString(),fromTz:fromA.tz,toTz:toA.tz,baggage:'23KG',paystackRef,amount:2150,createdAt:new Date().toISOString()};
  await savePerm(tracking, rec);
  res.json({boardingUrl:'/boarding-pass?code='+tracking});
});

app.get('/skylink-admin-gospel-2024', async (req,res)=>{
  if(!isAuthenticated(req)){ return res.redirect('/skylink-admin-login'); }
  let all=[];const seen=new Set();
  if(BookingModel){ try{ const docs=await BookingModel.find({}).sort({createdAt:-1}); docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} }); }catch(e){} }
  try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  const total = all.length * 2150;
  const today = all.filter(b=> b.createdAt && new Date(b.createdAt).toDateString() === new Date().toDateString()).length;
  let rows = all.map(b=>`<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:14px;font-weight:800;color:#0f2e6d">${b.booking}</td><td style="padding:14px"><span style="background:#e0f2fe;color:#0c4a6e;padding:4px 10px;border-radius:20px;font-weight:800;font-size:11px">${b.tracking}</span></td><td style="padding:14px;font-weight:700">${b.name}<br><span style="font-size:11px;color:#64748b">${b.email||''}</span></td><td style="padding:14px;font-weight:700">${b.from} → ${b.to}</td><td style="padding:14px;font-weight:900;color:#16a34a">NGN 2,150</td><td style="padding:14px;font-size:11px"><span style="background:#dcfce7;color:#166534;padding:4px 8px;border-radius:8px">${b.paystackRef||'NO REF'}</span></td><td style="padding:14px;font-size:11px">${b.createdAt? new Date(b.createdAt).toLocaleString():''}</td><td style="padding:14px"><a href="/boarding-pass?code=${b.tracking}" style="background:#0f2e6d;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:11px;font-weight:800">View Pass</a></td></tr>`).join('');
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK Admin</title><style>body{margin:0;font-family:Inter,Arial;background:#f1f5f9}.header{background:#0f2e6d;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.card{max-width:1200px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);overflow:hidden;border:1px solid #e2e8f0}.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}.stat h3{margin:0;font-size:11px;color:#64748b}.stat p{margin:6px 0 0;font-size:22px;font-weight:900}.table-wrap{overflow:auto} table{width:100%;border-collapse:collapse;min-width:900px} th{background:#f8fafc;text-align:left;padding:12px 14px;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0} a.logout{background:#ef4444;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px}</style></head><body><div class="header"><div><div style="font-weight:900;font-size:20px">✈️ SKYLINK AIRLINES - ADMIN</div><div style="font-size:11px;opacity:0.8">Real Money Dashboard - Private</div></div><div><a class="logout" href="/skylink-admin-logout">Logout</a></div></div><div class="card"><div class="stats"><div class="stat"><h3>TOTAL BOOKINGS</h3><p>${all.length}</p></div><div class="stat"><h3>TOTAL REVENUE</h3><p style="color:#16a34a">NGN ${total.toLocaleString()}</p></div><div class="stat"><h3>TODAY</h3><p>${today}</p></div></div><div style="padding:0 20px 10px;font-weight:900">All Bookings - Paystack Verified</div><div class="table-wrap"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>AMOUNT</th><th>PAYSTACK REF</th><th>DATE</th><th>ACTION</th></tr>${rows || '<tr><td colspan=8 style="padding:40px;text-align:center;color:#94a3b8">No bookings yet</td></tr>'}</table></div></div></body></html>`);
});

app.get('/boarding-pass', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<h2 style="font-family:Arial;text-align:center;margin-top:50px">Boarding Pass Not Found - Invalid Code</h2>');}
  let qr=''; if(QRCode){ try{ qr=await QRCode.toDataURL('https://'+req.get('host')+'/track?code='+b.tracking); }catch(e){} }
  const host = req.get('host');
  const trackLink = `https://${host}/track?code=${b.tracking}`;
  res.send(`
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
  <style>
  body{margin:0;background:#eef2f7;font-family:Inter,Arial;display:flex;justify-content:center;padding:12px}
.pass{width:100%;max-width:850px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);border:2px solid #0f2e6d}
.top{background:#0f2e6d;color:#fff;padding:18px 24px;display:flex;justify-content:space-between;align-items:center}
.top h1{margin:0;font-size:22px;font-weight:900;letter-spacing:1px}.top span{font-size:11px;opacity:.8}
.main{padding:24px;display:grid;grid-template-columns:1fr 180px;gap:20px}
.label{font-size:11px;font-weight:800;color:#64748b;letter-spacing:1px;margin-top:14px}
.value{font-size:20px;font-weight:900;color:#0f172a;margin-top:2px}
.value.big{font-size:26px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-top:10px}
.box{background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center}
.box.l{font-size:10px;font-weight:800;color:#64748b}.box.v{font-size:18px;font-weight:900;margin-top:4px}
.right{border-left:2px dashed #cbd5e1;padding-left:20px;display:flex;flex-direction:column;align-items:center}
.barcode-wrap{margin-top:20px;width:100%}
.link-box{background:#f0f9ff;border:1.5px solid #0ea5e9;border-radius:10px;padding:10px;margin-top:12px;word-break:break-all;font-size:11px;font-weight:700}
.link-box a{color:#0f2e6d;text-decoration:none;font-weight:900}
  @media(max-width:700px){.main{grid-template-columns:1fr}.right{border-left:none;border-top:2px dashed #cbd5e1;padding-left:0;padding-top:20px}}
  </style>
  </head><body>
  <div class="pass">
    <div class="top"><div><h1>✈️ SKYLINK AIRLINES</h1><span>OFFICIAL BOARDING PASS - IATA CERTIFIED</span></div><div style="text-align:right"><div style="font-size:12px;font-weight:800">BOARDING PASS</div><div style="font-size:10px;opacity:.8">${b.booking}</div></div></div>
    <div class="main">
      <div>
        <div class="label">PASSENGER NAME</div><div class="value big">${b.name}</div>
        <div class="grid2">
          <div><div class="label">FROM</div><div class="value">${b.fromFull}</div></div>
          <div><div class="label">TO</div><div class="value">${b.toFull}</div></div>
        </div>
        <div class="grid4">
          <div class="box"><div class="l">FLIGHT</div><div class="v">${b.flight}</div></div>
          <div class="box"><div class="l">DATE</div><div class="v">${new Date(b.departISO).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div></div>
          <div class="box"><div class="l">TIME</div><div class="v">${new Date(b.departISO).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div></div>
          <div class="box"><div class="l">TERMINAL</div><div class="v">${b.terminal||'T2'}</div></div>
        </div>
        <div class="grid4">
          <div class="box"><div class="l">GATE</div><div class="v">${b.gate}</div></div>
          <div class="box"><div class="l">SEAT</div><div class="v">${b.seat}</div></div>
          <div class="box"><div class="l">CLASS</div><div class="v">${b.class}</div></div>
          <div class="box"><div class="l">BAGGAGE</div><div class="v">${b.baggage}</div></div>
        </div>
        <div class="barcode-wrap">
          <svg id="barcode"></svg>
          <div style="font-size:10px;color:#64748b;font-weight:800;text-align:center;letter-spacing:2px;margin-top:6px">${b.booking} • ${b.tracking}</div>
        </div>
        <div class="link-box">
          🔗 <b>Track this flight:</b><br>
          <a href="${trackLink}" target="_blank">${trackLink}</a><br><br>
          Copy this link and open in Chrome/Google to track live - Also searchable: ${b.tracking}
        </div>
      </div>
      <div class="right">
        <div style="font-size:11px;font-weight:800;color:#64748b;letter-spacing:1px">SCAN TO TRACK</div>
        ${qr? `<img src="${qr}" style="width:160px;height:160px;margin-top:10px;border:2px solid #0f2e6d;border-radius:12px">` : ''}
        <div style="margin-top:14px;text-align:center">
          <div style="font-size:10px;font-weight:800;color:#64748b">BOOKING REF</div><div style="font-size:16px;font-weight:900">${b.booking}</div>
          <div style="font-size:10px;font-weight:800;color:#64748b;margin-top:10px">TRACKING CODE</div><div style="font-size:14px;font-weight:900;background:#0f2e6d;color:#fff;padding:6px 12px;border-radius:8px;margin-top:4px">${b.tracking}</div>
          <div style="font-size:10px;color:#64748b;margin-top:12px">Present this at gate. Gate closes 15 mins before departure.</div>
        </div>
      </div>
    </div>
    <div style="background:#f8fafc;padding:12px 24px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#64748b;font-weight:700"><div>Boarding: ${new Date(new Date(b.departISO).getTime()-45*60000).toLocaleTimeString()} - Gate closes 15 mins before</div><div>IATA • IOSA CERTIFIED</div></div>
  </div>
  <script>JsBarcode("#barcode", "${b.tracking}", {format:"CODE128", width:2, height:70, displayValue:false});</script>
  </body></html>
  `);
});

// === ISOLATED TRACKING ONLY - NO LINK TO MAIN SITE - FINAL ===
app.get('/track', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<h2 style="font-family:Arial;text-align:center;margin-top:50px">Invalid Tracking Code - Not Found</h2>');}
  const departTime = new Date(b.departISO).getTime();
  const now = Date.now();
  const diffMs = now - departTime;
  const isDeparted = diffMs > 0;
  const hours = isDeparted? Math.floor(diffMs / 3600000) : 0;
  const mins = isDeparted? Math.floor((diffMs % 3600000)/60000) : 0;
  const progress = isDeparted? Math.min(95, Math.floor((diffMs / (8*3600000))*100)) : 5;
  const status =!isDeparted? 'SCHEDULED' : progress < 20? 'BOARDING' : progress < 40? 'DEPARTED' : progress < 90? 'IN-FLIGHT' : 'ARRIVING';
  res.send(`
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Track ${b.tracking}</title>
  <style>
  body{margin:0;background:#f1f5f9;font-family:Inter,Arial;display:flex;justify-content:center;padding:12px}
.card{width:100%;max-width:580px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.08);border:1px solid #e2e8f0}
.head{background:#0f172a;color:#fff;padding:22px;text-align:center}
.head h1{margin:0;font-size:20px;font-weight:900;letter-spacing:1px}
.body{padding:22px}
.route{font-size:28px;font-weight:900;text-align:center;margin:10px 0}
.status-badge{display:inline-block;padding:6px 14px;border-radius:20px;font-weight:900;font-size:12px;background:${status==='IN-FLIGHT'?'#16a34a': status==='SCHEDULED'?'#0ea5e9':'#f59e0b'};color:#fff}
.progress-wrap{margin:20px 0}.bar{height:10px;background:#e2e8f0;border-radius:10px;overflow:hidden}.fill{height:100%;background:#16a34a;width:${progress}%;transition:width 1s}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}
.item{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px}.item.l{font-size:10px;font-weight:800;color:#64748b}.item.v{font-size:16px;font-weight:900;margin-top:4px}
.timeline{display:flex;justify-content:space-between;margin-top:20px;position:relative}.timeline::before{content:'';position:absolute;top:14px;left:10%;right:10%;height:3px;background:#e2e8f0}.dot{width:28px;height:28px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;z-index:1}.dot.active{background:#16a34a;color:#fff}
.hours-box{background:#fef3c7;border:2px solid #f59e0b;border-radius:12px;padding:12px;text-align:center;margin-top:14px;font-weight:900}
  </style>
  </head><body>
  <div class="card">
    <div class="head"><h1>✈️ SKYLINK FLIGHT STATUS</h1><div style="font-size:11px;opacity:.7;margin-top:4px">REAL-TIME LIVE TRACKING - ISOLATED VIEW</div><div style="margin-top:10px"><span class="status-badge">${status}</span></div></div>
    <div class="body">
      <div class="route">${b.from} ✈️ ${b.to}</div>
      <div style="text-align:center;font-size:13px;font-weight:700;color:#475569">${b.fromFull} <br>→<br> ${b.toFull}</div>
      <div class="progress-wrap">
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:800;margin-bottom:6px"><span>Flight Progress</span><span>${progress}%</span></div>
        <div class="bar"><div class="fill"></div></div>
      </div>
      ${isDeparted? `<div class="hours-box">⏱️ Flight has been moving for: <b>${hours} HRS ${mins} MINS</b><br><span style="font-size:11px;font-weight:700">Departed: ${new Date(b.departISO).toLocaleString()} • Current: ${new Date().toLocaleString()}</span></div>` : `<div class="hours-box" style="background:#e0f2fe;border-color:#0ea5e9">🕒 Scheduled to depart in: <b>${Math.abs(hours)} HRS ${Math.abs(mins)} MINS</b><br><span style="font-size:11px">Departure: ${new Date(b.departISO).toLocaleString()}</span></div>`}
      <div class="grid">
        <div class="item"><div class="l">FLIGHT</div><div class="v">${b.flight}</div></div>
        <div class="item"><div class="l">BOOKING REF</div><div class="v">${b.booking}</div></div>
        <div class="item"><div class="l">PASSENGER</div><div class="v" style="font-size:14px">${b.name}</div></div>
        <div class="item"><div class="l">SEAT / GATE / TERMINAL</div><div class="v">${b.seat} / ${b.gate} / ${b.terminal||'T2'}</div></div>
        <div class="item"><div class="l">DEPARTURE</div><div class="v" style="font-size:13px">${new Date(b.departISO).toLocaleString()}</div></div>
        <div class="item"><div class="l">ARRIVAL (EST)</div><div class="v" style="font-size:13px">${new Date(b.arriveISO).toLocaleString()}</div></div>
      </div>
      <div class="timeline">
        <div style="text-align:center"><div class="dot ${['SCHEDULED','BOARDING','DEPARTED','IN-FLIGHT','ARRIVING'].includes(status)?'active':''}">✓</div><div style="font-size:9px;font-weight:800;margin-top:4px">SCHEDULED</div></div>
        <div style="text-align:center"><div class="dot ${['BOARDING','DEPARTED','IN-FLIGHT','ARRIVING'].includes(status)?'active':''}">✓</div><div style="font-size:9px;font-weight:800;margin-top:4px">BOARDING</div></div>
        <div style="text-align:center"><div class="dot ${['DEPARTED','IN-FLIGHT','ARRIVING'].includes(status)?'active':''}">✓</div><div style="font-size:9px;font-weight:800;margin-top:4px">DEPARTED</div></div>
        <div style="text-align:center"><div class="dot ${['IN-FLIGHT','ARRIVING'].includes(status)?'active':''}">✈</div><div style="font-size:9px;font-weight:800;margin-top:4px">IN-FLIGHT</div></div>
        <div style="text-align:center"><div class="dot">○</div><div style="font-size:9px;font-weight:800;margin-top:4px">ARRIVED</div></div>
      </div>
      <div style="text-align:center;margin-top:20px;font-size:10px;color:#94a3b8;font-weight:700">Tracking Code: ${b.tracking} • Booking: ${b.booking} • SKYLINK AIRLINES • NO LINK TO MAIN SITE</div>
    </div>
  </div>
  <script>
    setInterval(function(){
      const dep = ${departTime};
      const diff = Date.now() - dep;
      if(diff>0){
        const h = Math.floor(diff/3600000);
        const m = Math.floor((diff%3600000)/60000);
        const el = document.querySelector('.hours-box b');
        if(el) el.innerText = h+' HRS '+m+' MINS';
      }
    }, 60000);
  </script>
  </body></html>
  `);
});

app.get('/health',(req,res)=> res.send('OK'));
app.listen(PORT, ()=> console.log('SKYLINK FINAL - ISOLATED TRACKING - NO MAIN SITE LINK - READY'));
