const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));

const AIRPORTS = [
{c:"SAH",city:"Sana'a",country:"Yemen",name:"Sana'a International",lat:15.476,lon:44.2197,tz:"Asia/Aden"},
{c:"ADE",city:"Aden",country:"Yemen",name:"Aden International",lat:12.8295,lon:45.0288,tz:"Asia/Aden"},
{c:"HOD",city:"Hodeidah",country:"Yemen",name:"Hodeidah International",lat:14.753,lon:42.9764,tz:"Asia/Aden"},
{c:"TAI",city:"Taiz",country:"Yemen",name:"Taiz International",lat:13.6858,lon:44.1359,tz:"Asia/Aden"},
{c:"GXF",city:"Seiyun",country:"Yemen",name:"Seiyun Airport",lat:15.9614,lon:48.7883,tz:"Asia/Aden"},
{c:"JED",city:"Jeddah",country:"Saudi Arabia",name:"King Abdulaziz Intl",lat:21.6796,lon:39.1565,tz:"Asia/Riyadh"},
{c:"RUH",city:"Riyadh",country:"Saudi Arabia",name:"King Khalid Intl",lat:24.9576,lon:46.6988,tz:"Asia/Riyadh"},
{c:"MED",city:"Medina",country:"Saudi Arabia",name:"Prince Mohammad",lat:24.5534,lon:39.705,tz:"Asia/Riyadh"},
{c:"DMM",city:"Dammam",country:"Saudi Arabia",name:"King Fahd Intl",lat:26.4712,lon:49.7979,tz:"Asia/Riyadh"},
{c:"AHB",city:"Abha",country:"Saudi Arabia",name:"Abha Intl",lat:18.2404,lon:42.6566,tz:"Asia/Riyadh"},
{c:"DXB",city:"Dubai",country:"UAE",name:"Dubai Intl",lat:25.2532,lon:55.3657,tz:"Asia/Dubai"},
{c:"AUH",city:"Abu Dhabi",country:"UAE",name:"Zayed Intl",lat:24.4329,lon:54.6511,tz:"Asia/Dubai"},
{c:"SHJ",city:"Sharjah",country:"UAE",name:"Sharjah Intl",lat:25.3286,lon:55.5172,tz:"Asia/Dubai"},
{c:"DWC",city:"Dubai",country:"UAE",name:"Al Maktoum",lat:24.8962,lon:55.1612,tz:"Asia/Dubai"},
{c:"DOH",city:"Doha",country:"Qatar",name:"Hamad Intl",lat:25.2731,lon:51.6081,tz:"Asia/Qatar"},
{c:"KWI",city:"Kuwait",country:"Kuwait",name:"Kuwait Intl",lat:29.2266,lon:47.9689,tz:"Asia/Kuwait"},
{c:"BAH",city:"Bahrain",country:"Bahrain",name:"Bahrain Intl",lat:26.2708,lon:50.6336,tz:"Asia/Bahrain"},
{c:"MCT",city:"Muscat",country:"Oman",name:"Muscat Intl",lat:23.5933,lon:58.2844,tz:"Asia/Muscat"},
{c:"SLL",city:"Salalah",country:"Oman",name:"Salalah Intl",lat:17.0387,lon:54.0913,tz:"Asia/Muscat"},
{c:"AMM",city:"Amman",country:"Jordan",name:"Queen Alia Intl",lat:31.7226,lon:35.9932,tz:"Asia/Amman"},
{c:"BEY",city:"Beirut",country:"Lebanon",name:"Beirut Rafic Hariri",lat:33.8209,lon:35.4884,tz:"Asia/Beirut"},
{c:"BGW",city:"Baghdad",country:"Iraq",name:"Baghdad Intl",lat:33.2625,lon:44.2346,tz:"Asia/Baghdad"},
{c:"IKA",city:"Tehran",country:"Iran",name:"Imam Khomeini",lat:35.4161,lon:51.1522,tz:"Asia/Tehran"},
{c:"TLV",city:"Tel Aviv",country:"Israel",name:"Ben Gurion",lat:32.0114,lon:34.8867,tz:"Asia/Jerusalem"},
{c:"LOS",city:"Lagos",country:"Nigeria",name:"Murtala Muhammed Intl",lat:6.5774,lon:3.3212,tz:"Africa/Lagos"},
{c:"ABV",city:"Abuja",country:"Nigeria",name:"Nnamdi Azikiwe Intl",lat:9.0068,lon:7.2632,tz:"Africa/Lagos"},
{c:"KAN",city:"Kano",country:"Nigeria",name:"Mallam Aminu Kano",lat:12.0476,lon:8.5246,tz:"Africa/Lagos"},
{c:"PHC",city:"Port Harcourt",country:"Nigeria",name:"Port Harcourt Intl",lat:5.0155,lon:6.9624,tz:"Africa/Lagos"},
{c:"ENU",city:"Enugu",country:"Nigeria",name:"Akanu Ibiam Intl",lat:6.4743,lon:7.5619,tz:"Africa/Lagos"},
{c:"BNI",city:"Benin",country:"Nigeria",name:"Benin Airport",lat:6.3161,lon:5.5995,tz:"Africa/Lagos"},
{c:"CBQ",city:"Calabar",country:"Nigeria",name:"Margaret Ekpo Intl",lat:4.976,lon:8.3472,tz:"Africa/Lagos"},
{c:"ACC",city:"Accra",country:"Ghana",name:"Kotoka Intl",lat:5.6052,lon:-0.1668,tz:"Africa/Accra"},
{c:"KMS",city:"Kumasi",country:"Ghana",name:"Kumasi Airport",lat:6.7146,lon:-1.5911,tz:"Africa/Accra"},
{c:"ABJ",city:"Abidjan",country:"Ivory Coast",name:"Felix Houphouet Boigny",lat:5.2614,lon:-3.9258,tz:"Africa/Abidjan"},
{c:"DKR",city:"Dakar",country:"Senegal",name:"Blaise Diagne Intl",lat:14.67,lon:-17.0733,tz:"Africa/Dakar"},
{c:"BKO",city:"Bamako",country:"Mali",name:"Modibo Keita Intl",lat:12.5335,lon:-7.9439,tz:"Africa/Bamako"},
{c:"COO",city:"Cotonou",country:"Benin",name:"Cadjehoun Airport",lat:6.3572,lon:2.3844,tz:"Africa/Porto-Novo"},
{c:"LFW",city:"Lome",country:"Togo",name:"Gnassingbe Eyadema Intl",lat:6.1656,lon:1.2545,tz:"Africa/Lome"},
{c:"OUA",city:"Ouagadougou",country:"Burkina Faso",name:"Ouagadougou Airport",lat:12.3532,lon:-1.5124,tz:"Africa/Ouagadougou"},
{c:"CAI",city:"Cairo",country:"Egypt",name:"Cairo Intl",lat:30.1219,lon:31.4056,tz:"Africa/Cairo"},
{c:"ADD",city:"Addis Ababa",country:"Ethiopia",name:"Bole Intl",lat:8.9779,lon:38.7993,tz:"Africa/Addis_Ababa"},
{c:"NBO",city:"Nairobi",country:"Kenya",name:"Jomo Kenyatta Intl",lat:-1.3192,lon:36.9278,tz:"Africa/Nairobi"},
{c:"DAR",city:"Dar es Salaam",country:"Tanzania",name:"Julius Nyerere Intl",lat:-6.8781,lon:39.2026,tz:"Africa/Dar_es_Salaam"},
{c:"KGL",city:"Kigali",country:"Rwanda",name:"Kigali Intl",lat:-1.9686,lon:30.1395,tz:"Africa/Kigali"},
{c:"EBB",city:"Entebbe",country:"Uganda",name:"Entebbe Intl",lat:0.0424,lon:32.4435,tz:"Africa/Kampala"},
{c:"JNB",city:"Johannesburg",country:"South Africa",name:"O.R. Tambo Intl",lat:-26.1392,lon:28.246,tz:"Africa/Johannesburg"},
{c:"CPT",city:"Cape Town",country:"South Africa",name:"Cape Town Intl",lat:-33.9648,lon:18.6017,tz:"Africa/Johannesburg"},
{c:"LHR",city:"London",country:"UK",name:"Heathrow",lat:51.47,lon:-0.4543,tz:"Europe/London"},
{c:"LGW",city:"London",country:"UK",name:"Gatwick",lat:51.1481,lon:-0.1903,tz:"Europe/London"},
{c:"MAN",city:"Manchester",country:"UK",name:"Manchester Airport",lat:53.3537,lon:-2.275,tz:"Europe/London"},
{c:"CDG",city:"Paris",country:"France",name:"Charles de Gaulle",lat:49.0097,lon:2.5479,tz:"Europe/Paris"},
{c:"FRA",city:"Frankfurt",country:"Germany",name:"Frankfurt Airport",lat:50.0379,lon:8.5622,tz:"Europe/Berlin"},
{c:"AMS",city:"Amsterdam",country:"Netherlands",name:"Schiphol",lat:52.3086,lon:4.7639,tz:"Europe/Amsterdam"},
{c:"FCO",city:"Rome",country:"Italy",name:"Fiumicino",lat:41.8003,lon:12.2389,tz:"Europe/Rome"},
{c:"MAD",city:"Madrid",country:"Spain",name:"Barajas",lat:40.4894,lon:-3.5922,tz:"Europe/Madrid"},
{c:"BCN",city:"Barcelona",country:"Spain",name:"El Prat",lat:41.2971,lon:2.0833,tz:"Europe/Madrid"},
{c:"IST",city:"Istanbul",country:"Turkey",name:"Istanbul Airport",lat:41.2753,lon:28.7519,tz:"Europe/Istanbul"},
{c:"JFK",city:"New York",country:"USA",name:"John F Kennedy Intl",lat:40.6413,lon:-73.7781,tz:"America/New_York"},
{c:"LAX",city:"Los Angeles",country:"USA",name:"Los Angeles Intl",lat:33.9416,lon:-118.4085,tz:"America/Los_Angeles"},
{c:"SFO",city:"San Francisco",country:"USA",name:"San Francisco Intl",lat:37.6213,lon:-122.379,tz:"America/Los_Angeles"},
{c:"ORD",city:"Chicago",country:"USA",name:"O'Hare Intl",lat:41.9742,lon:-87.9073,tz:"America/Chicago"},
{c:"MIA",city:"Miami",country:"USA",name:"Miami Intl",lat:25.7959,lon:-80.287,tz:"America/New_York"},
{c:"YYZ",city:"Toronto",country:"Canada",name:"Pearson Intl",lat:43.6777,lon:79.6248,tz:"America/Toronto"},
{c:"BOM",city:"Mumbai",country:"India",name:"Chhatrapati Shivaji",lat:19.0896,lon:72.8656,tz:"Asia/Kolkata"},
{c:"DEL",city:"Delhi",country:"India",name:"Indira Gandhi Intl",lat:28.5562,lon:77.1,tz:"Asia/Kolkata"},
{c:"SIN",city:"Singapore",country:"Singapore",name:"Changi Airport",lat:1.3644,lon:103.9915,tz:"Asia/Singapore"},
{c:"KUL",city:"Kuala Lumpur",country:"Malaysia",name:"Kuala Lumpur Intl",lat:2.7456,lon:101.7099,tz:"Asia/Kuala_Lumpur"},
{c:"BKK",city:"Bangkok",country:"Thailand",name:"Suvarnabhumi",lat:13.69,lon:100.75,tz:"Asia/Bangkok"},
{c:"CGK",city:"Jakarta",country:"Indonesia",name:"Soekarno-Hatta Intl",lat:-6.1256,lon:106.6558,tz:"Asia/Jakarta"},
{c:"MNL",city:"Manila",country:"Philippines",name:"Ninoy Aquino Intl",lat:14.5086,lon:121.0194,tz:"Asia/Manila"},
{c:"NRT",city:"Tokyo",country:"Japan",name:"Narita Intl",lat:35.7647,lon:140.3864,tz:"Asia/Tokyo"},
{c:"HND",city:"Tokyo",country:"Japan",name:"Haneda Airport",lat:35.5494,lon:139.7798,tz:"Asia/Tokyo"},
{c:"ICN",city:"Seoul",country:"South Korea",name:"Incheon Intl",lat:37.4602,lon:126.4407,tz:"Asia/Seoul"},
{c:"PEK",city:"Beijing",country:"China",name:"Capital Intl",lat:40.0799,lon:116.5846,tz:"Asia/Shanghai"},
{c:"PVG",city:"Shanghai",country:"China",name:"Pudong Intl",lat:31.1443,lon:121.8083,tz:"Asia/Shanghai"},
{c:"SYD",city:"Sydney",country:"Australia",name:"Sydney Airport",lat:-33.9399,lon:151.1753,tz:"Australia/Sydney"},
{c:"AKL",city:"Auckland",country:"New Zealand",name:"Auckland Airport",lat:-37.0081,lon:174.785,tz:"Pacific/Auckland"}
];
function findAirport(c){return AIRPORTS.find(a=>a.c===c)||AIRPORTS[46];}
function calcKm(lat1,lon1,lat2,lon2){const R=6371;const dLat=(lat2-lat1)*Math.PI/180;const dLon=(lon2-lon1)*Math.PI/180;const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));}
const bookings=new Map(); const logistics=new Map();

app.get('/',(req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Airlines & Logistics</title><style>body{margin:0;font-family:Arial;background:#f8fafc}.hero{background:linear-gradient(90deg,#0b1f4a,#14366e);color:#fff;padding:50px 20px;text-align:center}.btn{padding:12px 18px;border-radius:10px;border:none;font-weight:800;margin:6px;cursor:pointer}.blue{background:#0f2e6d;color:#fff}.green{background:#16a34a;color:#fff}.box{max-width:900px;margin:20px auto;background:#fff;padding:20px;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,.08)}</style></head><body>
<div class="hero"><h1>✈️ SKYLINK AIRLINES & 📦 LOGISTICS</h1><p>77 Airports Worldwide - Real Time Tracking</p><br><a href="/flights"><button class="btn blue">Book Flight</button></a><a href="/logistics"><button class="btn green">Ship Package</button></a></div>
<div class="box"><h3>Track Your Booking</h3><form action="/track" method="get"><input name="code" placeholder="Enter TRK- or LOG- code" style="padding:12px;width:70%;border-radius:8px;border:1px solid #cbd5e1"><button class="btn blue">Track</button></form></div>
</body></html>`);
});

app.get('/flights',(req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Book Flight</title><style>body{margin:0;font-family:Arial;background:#f1f5f9;padding:12px;display:flex;justify-content:center}.card{max-width:640px;width:100%;background:#fff;border-radius:16px;padding:20px} input,select{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:1px solid #cbd5e1;box-sizing:border-box} label{font-weight:800;margin-top:12px;display:block}.btn{width:100%;padding:14px;margin-top:16px;background:#0f2e6d;color:#fff;border:none;border-radius:10px;font-weight:900;cursor:pointer}.sug{border:1px solid #e2e8f0;max-height:150px;overflow:auto;display:none;position:absolute;background:#fff;z-index:10;width:92%;border-radius:8px}.sug div{padding:8px;cursor:pointer}.sug div:hover{background:#f1f5f9}</style></head><body><div class="card">
<h3>✈️ Book Flight - Skylink Airlines</h3>
<div style="position:relative"><label>From *</label><input id="fromInput" placeholder="JFK - New York, USA" autocomplete="off"><div id="fromSug" class="sug"></div></div>
<div style="position:relative"><label>To *</label><input id="toInput" placeholder="LHR - London, UK" autocomplete="off"><div id="toSug" class="sug"></div></div>
<label>Date *</label><input id="date" type="date"><label>Time *</label><input id="time" type="time" value="10:00">
<label>Full Name *</label><input id="name"><label>Email *</label><input id="email"><label>Phone *</label><input id="phone">
<button class="btn" onclick="book()">Search & Pay ₦2150</button><div id="msg" style="margin-top:12px"></div>
<script>
const AIRPORTS=${JSON.stringify(AIRPORTS)};
function setup(inputId,sugId){const inp=document.getElementById(inputId);const sug=document.getElementById(sugId);inp.addEventListener('input',()=>{const v=inp.value.toLowerCase();if(!v){sug.style.display='none';return;}const f=AIRPORTS.filter(a=> (a.c+' '+a.city+' '+a.country+' '+a.name).toLowerCase().includes(v)).slice(0,8);sug.innerHTML=f.map(a=>\`<div onclick="document.getElementById('\${inputId}').value='\${a.c} - \${a.city}, \${a.country}';document.getElementById('\${sugId}').style.display='none';">\${a.c} - \${a.city}, \${a.country} - \${a.name}</div>\`).join('');sug.style.display=f.length?'block':'none';});}
setup('fromInput','fromSug');setup('toInput','toSug');
function parseCode(str){const m=str.match(/([A-Z]{3})/);return m?m[1]:null;}
async function book(){const from=parseCode(document.getElementById('fromInput').value);const to=parseCode(document.getElementById('toInput').value);const date=document.getElementById('date').value;const time=document.getElementById('time').value;const name=document.getElementById('name').value;const email=document.getElementById('email').value;const phone=document.getElementById('phone').value;if(!from||!to||!date||!time||!name){document.getElementById('msg').innerText='Fill all *';return;}document.getElementById('msg').innerText='Processing...';const res=await fetch('/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to,date,time,name,email,phone})});const data=await res.json();document.getElementById('msg').innerHTML='Booked! Tracking: <b>'+data.tracking+'</b> <a href="/track?code='+data.tracking+'">Track now</a>';}
<\/script></div></body></html>`);
});

app.get('/logistics',(req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Logistics</title><style>body{margin:0;font-family:Arial;background:#f1f5f9;padding:12px;display:flex;justify-content:center}.card{max-width:640px;width:100%;background:#fff;border-radius:16px;padding:20px} input{width:100%;padding:12px;margin-top:6px;border-radius:8px;border:1px solid #cbd5e1;box-sizing:border-box} label{font-weight:800;margin-top:12px;display:block}.btn{width:100%;padding:14px;margin-top:16px;background:#16a34a;color:#fff;border:none;border-radius:10px;font-weight:900}.sug{border:1px solid #e2e8f0;max-height:150px;overflow:auto;display:none;position:absolute;background:#fff;z-index:10;width:92%;border-radius:8px}.sug div{padding:8px;cursor:pointer}</style></head><body><div class="card">
<h3>📦 Skylink Logistics</h3>
<div style="position:relative"><label>From *</label><input id="fromInput" placeholder="JFK - New York, USA"><div id="fromSug" class="sug"></div></div>
<div style="position:relative"><label>To *</label><input id="toInput" placeholder="LHR - London, UK"><div id="toSug" class="sug"></div></div>
<label>Sender *</label><input id="sender"><label>Phone *</label><input id="phone"><label>Email</label><input id="email"><label>Receiver *</label><input id="receiver"><label>Receiver Phone *</label><input id="rphone"><label>Address *</label><input id="raddr"><label>Item *</label><input id="item"><label>Weight kg *</label><input id="weight" type="number" value="2"><label>Date *</label><input id="date" type="date"><label>Time *</label><input id="time" type="time" value="10:00">
<button class="btn" onclick="bookLog()">Ship & Pay ₦3000</button><div id="msg" style="margin-top:12px"></div>
<script>
const AIRPORTS=${JSON.stringify(AIRPORTS)};
function setup(i,s){const inp=document.getElementById(i);const sug=document.getElementById(s);inp.addEventListener('input',()=>{const v=inp.value.toLowerCase();if(!v){sug.style.display='none';return;}const f=AIRPORTS.filter(a=> (a.c+' '+a.city+' '+a.country).toLowerCase().includes(v)).slice(0,8);sug.innerHTML=f.map(a=>\`<div onclick="document.getElementById('\${i}').value='\${a.c} - \${a.city}, \${a.country}';document.getElementById('\${s}').style.display='none';">\${a.c} - \${a.city}, \${a.country}</div>\`).join('');sug.style.display=f.length?'block':'none';});}
setup('fromInput','fromSug');setup('toInput','toSug');
function parseCode(s){const m=s.match(/([A-Z]{3})/);return m?m[1]:null;}
async function bookLog(){const from=parseCode(document.getElementById('fromInput').value);const to=parseCode(document.getElementById('toInput').value);const sender=document.getElementById('sender').value;const phone=document.getElementById('phone').value;const email=document.getElementById('email').value;const receiver=document.getElementById('receiver').value;const rphone=document.getElementById('rphone').value;const raddr=document.getElementById('raddr').value;const item=document.getElementById('item').value;const weight=document.getElementById('weight').value;const date=document.getElementById('date').value;const time=document.getElementById('time').value;if(!from||!to||!sender){document.getElementById('msg').innerText='Fill *';return;}document.getElementById('msg').innerText='Processing...';const res=await fetch('/api/logistics/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({from,to,senderName:sender,phone,email,receiverName:receiver,receiverPhone:rphone,receiverAddress:raddr,item,weight,date,time})});const data=await res.json();document.getElementById('msg').innerHTML='Shipped! Tracking: <b>'+data.tracking+'</b> <a href="/track?code='+data.tracking+'">Track now</a>';}
<\/script></div></body></html>`);
});

app.get('/api/airports',(req,res)=>{const q=(req.query.q||'').toLowerCase();res.json(AIRPORTS.filter(a=> (a.c+' '+a.city+' '+a.country).toLowerCase().includes(q)).slice(0,20));});
function genCode(p){return p+'-'+Math.random().toString(36).substr(2,6).toUpperCase();}
app.post('/api/book',(req,res)=>{const {from,to,date,time,name,email,phone}=req.body;const f=findAirport(from),t=findAirport(to);const distance=calcKm(f.lat,f.lon,t.lat,t.lon);const dur=Math.round(distance/850*60+30);const departISO=new Date(date+'T'+time).toISOString();const arriveISO=new Date(new Date(departISO).getTime()+dur*60000).toISOString();const tracking=genCode('TRK');const booking=genCode('BK');const rec={tracking,booking,from,to,fromFull:f.city+' - '+f.country,toFull:t.city+' - '+t.country,fromTz:f.tz,toTz:t.tz,name,email,phone,flight:'SKY-'+Math.floor(100+Math.random()*900),distanceKm:distance,durationMins:dur,departISO,arriveISO,aircraft:['Airbus A330-300','Boeing 787','Airbus A320'][Math.floor(Math.random()*3)],seat:Math.floor(1+Math.random()*30)+'A',gate:'G'+Math.floor(1+Math.random()*20),terminal:'T'+Math.floor(1+Math.random()*3),amount:2150,paystackRef:'PS-'+Date.now(),createdAt:new Date().toISOString()};bookings.set(tracking,rec);res.json({tracking,booking});});
app.post('/api/logistics/book',(req,res)=>{const {from,to,senderName,phone,email,receiverName,receiverPhone,receiverAddress,item,weight,date,time}=req.body;const f=findAirport(from),t=findAirport(to);const distance=calcKm(f.lat,f.lon,t.lat,t.lon);const dur=Math.round(distance/800*60+120);const departISO=new Date(date+'T'+time).toISOString();const arriveISO=new Date(new Date(departISO).getTime()+dur*60000).toISOString();const tracking=genCode('LOG');const booking=genCode('LBK');const rec={tracking,booking,from,to,fromFull:f.city+' - '+f.country,toFull:t.city+' - '+t.country,fromTz:f.tz,toTz:t.tz,senderName,phone,email,receiverName,receiverPhone,receiverAddress,item,weight,distanceKm:distance,durationMins:dur,departISO,arriveISO,aircraft:'Boeing 747-400F + Van',amount:3000,paystackRef:'PS-'+Date.now(),createdAt:new Date().toISOString()};logistics.set(tracking,rec);res.json({tracking,booking});});

// YOUR PASTED TRACK ROUTE - EXACT - NOW FULL FILE
app.get('/track',(req,res)=>{
  const code=(req.query.code||'').toUpperCase();
  let rec=bookings.get(code)||logistics.get(code);
  if(!rec){return res.send('<h2>Not found: '+code+'</h2><a href="/">Home</a>');}
  const isLog=rec.tracking&&rec.tracking.startsWith('LOG');
  const f=findAirport(rec.from), t=findAirport(rec.to);
  if(isLog){
    // LOGISTICS - DIFFERENT - DARK CARGO MAP
    res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>body{margin:0;font-family:Arial;background:#f1f5f9;padding:12px;display:flex;justify-content:center}.card{max-width:720px;width:100%;background:#fff;border-radius:16px;padding:20px}.step{display:flex;gap:12px;margin:10px 0}.dot{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center}.active{background:#16a34a;color:#fff}.wait{background:#e2e8f0}.btn{padding:10px 14px;border-radius:8px;border:none;font-weight:800;cursor:pointer;margin-right:8px}.copy{background:#0f2e6d;color:#fff}.down{background:#16a34a;color:#fff}.progress{height:8px;background:#e2e8f0;border-radius:10px;margin-top:12px;overflow:hidden}.bar{height:100%;background:#16a34a;width:0%}#map{height:260px;border-radius:12px}</style></head><body><div class="card"><div style="display:flex;justify-content:space-between"><h3 style="margin:0">📦 SKYLINK LOGISTICS - ${rec.tracking}</h3><a href="/" style="color:#64748b;text-decoration:none;font-size:12px">Home</a></div><div style="margin-top:8px;font-size:13px;line-height:1.8"><b>Sender:</b> ${rec.senderName} (${rec.phone})<br><b>Receiver:</b> ${rec.receiverName} (${rec.receiverPhone})<br><b>Address:</b> ${rec.receiverAddress||''}<br><b>Route:</b> ${rec.fromFull} → ${rec.toFull}<br><b>Item:</b> ${rec.item} ${rec.weight}kg</div><div style="margin-top:12px"><button class="btn copy" onclick="navigator.clipboard.writeText(window.location.origin+'/track?code=${rec.tracking}');alert('Copied')">📋 Copy Link</button><button class="btn down" onclick="window.print()">⬇️ Download</button></div><div id="map" style="margin-top:14px"></div><div class="progress"><div class="bar" id="bar"></div></div><div id="steps" style="margin-top:12px"></div><script>const rec=${JSON.stringify(rec)};const f=${JSON.stringify(f)};const t=${JSON.stringify(t)};const map=L.map('map').setView([(f.lat+t.lat)/2,(f.lon+t.lon)/2],3);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);L.marker([f.lat,f.lon]).addTo(map);L.marker([t.lat,t.lon]).addTo(map);L.polyline([[f.lat,f.lon],[t.lat,t.lon]],{color:'#1e3a8a',dashArray:'10,10',weight:3}).addTo(map);function tick(){const now=Date.now();const dep=new Date(rec.departISO).getTime();const arr=new Date(rec.arriveISO).getTime();let pct=Math.max(0,Math.min(1,(now-dep)/(arr-dep)));if(isNaN(pct))pct=0.2;document.getElementById('bar').style.width=(pct*100)+'%';let html='';const steps=[{t:'📦 Pickup - Van',d:'Collected'},{t:'✈️ Cargo Plane',d:'In Air'},{t:'🚚 Customs + Van',d:'Out for delivery'},{t:'✅ Delivered',d:'Done'}];steps.forEach((s,i)=>{const a=pct>i*0.33;html+=\`<div class="step"><div class="dot \${a?'active':'wait'}">\${a?'✓':i+1}</div><div><b>\${s.t}</b><br><small>\${s.d}</small></div></div>\`;});document.getElementById('steps').innerHTML=html;}setInterval(tick,1000);tick();<\/script></div></body></html>`);
  } else {
  // AIRLINES - EXACT LIKE YOUR SCREENSHOT 3:29 AM
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Track ${rec.tracking}</title><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>body{margin:0;font-family:Inter,Arial,sans-serif;background:#fff;padding:0;color:#111}.wrap{max-width:720px;margin:0 auto;padding:16px 18px}.title{font-size:19px;font-weight:800;display:flex;gap:8px;align-items:center;margin-top:6px}.label{font-size:15px;font-weight:700;margin-top:10px;line-height:1.4}.label span{font-weight:400}.line{height:2px;background:#1e3a8a;margin:18px 0 16px 0;opacity:0.8}.badge{padding:5px 12px;border-radius:8px;font-size:13px;font-weight:700;display:inline-block;background:#dbeafe;color:#1e40af}.notdep{color:#1e40af;font-weight:700}.small{font-size:13px;color:#64748b;margin-top:8px}.mapbox{height:420px;border-radius:12px;overflow:hidden;margin-top:10px;border:1.5px solid #cbd5e1}.btn{padding:10px 14px;border-radius:8px;border:none;font-weight:800;cursor:pointer;margin-right:8px;font-size:13px;margin-top:14px}.copy{background:#0f2e6d;color:#fff}.down{background:#16a34a;color:#fff}#ticket{margin-top:18px;border:1.5px dashed #cbd5e1;padding:14px;border-radius:12px;font-size:13px;background:#f8fafc;line-height:1.6}</style></head><body><div class="wrap">
  <div class="title">📍 Live Flight Tracking</div>
  <div style="margin-top:16px">
    <div class="label">Tracking Code: <span>${rec.tracking}</span></div>
    <div class="label">Passenger: <span>${rec.name}</span></div>
    <div class="label">Flight: <span>${rec.flight}</span></div>
    <div class="label">Route: <span>${rec.from} → ${rec.to} (${rec.fromFull} (${rec.from}) to ${rec.toFull} (${rec.to}))</span></div>
    <div class="label">Departure: <span id="depTxt"></span></div>
    <div class="label">Est. Duration: <span>${Math.floor(rec.durationMins/60)}h ${rec.durationMins%60}m | ${rec.distanceKm}km</span></div>
    <div class="label">Est. Arrival: <span id="arrTxt"></span></div>
    <div class="label">Aircraft: <span>${rec.aircraft}</span></div>
  </div>
  <div class="line"></div>
  <div style="font-weight:800;font-size:16px;margin-bottom:10px">Live Status</div>
  <div class="label">Status: <span class="badge" id="statusBadge">Scheduled</span></div>
  <div class="label">Time in Air: <span class="notdep" id="timeAir">Not Departed</span></div>
  <div class="label">Altitude: <span id="alt">0 ft (On Ground)</span></div>
  <div class="label">Speed: <span id="speed">0 km/h</span></div>
  <div class="small" id="depIn">Departs in calculating...</div>
  <button class="btn copy" onclick="navigator.clipboard.writeText(window.location.origin+'/track?code=${rec.tracking}');alert('Copied: '+window.location.origin+'/track?code=${rec.tracking}')">📋 Copy Tracking Link</button><button class="btn down" onclick="window.print()">⬇️ Download Ticket</button>
  <div style="margin-top:18px;font-weight:800;display:flex;gap:6px;font-size:15px">🗺️ Live Flight Map</div>
  <div id="map" class="mapbox"></div>
  <div id="ticket"><b>BOARDING PASS</b><br>Tracking: ${rec.tracking}<br>Booking: ${rec.booking}<br>Passenger: ${rec.name}<br>Route: ${rec.from} → ${rec.to}<br>Seat: ${rec.seat} | Gate: ${rec.gate} | Terminal: ${rec.terminal}<br>Amount: ₦${rec.amount} - Ref: ${rec.paystackRef||''}<br>Date: ${rec.createdAt}</div>
  <script>
  const rec=${JSON.stringify(rec)}; const f=${JSON.stringify(f)}; const t=${JSON.stringify(t)};
  document.getElementById('depTxt').innerText = new Date(rec.departISO).toLocaleString('en-US',{timeZone:rec.fromTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) + ' ('+rec.fromTz+')';
  document.getElementById('arrTxt').innerText = new Date(rec.arriveISO).toLocaleString('en-US',{timeZone:rec.toTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit'}) + ' ('+rec.toTz+')';
  const map = L.map('map').setView([(f.lat+t.lat)/2, (f.lon+t.lon)/2], 3);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  const fromIcon = L.divIcon({html:'<div style="background:#1e40af;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,.4)"></div>',iconSize:[16,16]});
  const toIcon = L.divIcon({html:'<div style="background:#1e40af;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 6px rgba(0,0,0,.4)"></div>',iconSize:[16,16]});
  L.marker([f.lat,f.lon],{icon:fromIcon}).addTo(map).bindPopup(f.city);
  L.marker([t.lat,t.lon],{icon:toIcon}).addTo(map).bindPopup(t.city);
  const line = L.polyline([[f.lat,f.lon],[t.lat,t.lon]],{color:'#1e3a8a',weight:3,dashArray:'12,12',opacity:0.9}).addTo(map);
  map.fitBounds(line.getBounds(),{padding:[40,40]});
  let planeMarker = null;
  function tick(){
    const now=Date.now(); const dep=new Date(rec.departISO).getTime(); const arr=new Date(rec.arriveISO).getTime();
    let pct=Math.max(0,Math.min(1,(now-dep)/(arr-dep))); if(isNaN(pct)) pct=0;
    const remain=dep-now; const elapsed=now-dep;
    const curLat = f.lat + (t.lat-f.lat)*pct;
    const curLon = f.lon + (t.lon-f.lon)*pct;
    const planeIcon = L.divIcon({html:'<div style="font-size:22px;transform:rotate('+(t.lon>f.lon?30:-30)+'deg)">✈️</div>',iconSize:[22,22]});
    if(planeMarker) map.removeLayer(planeMarker);
    if(pct>0 && pct<1) planeMarker = L.marker([curLat,curLon],{icon:planeIcon}).addTo(map);
    let status='Scheduled', timeAir='Not Departed', alt='0 ft (On Ground)', speed='0 km/h', depIn='';
    if(remain>0){ const h=Math.floor(remain/3600000), m=Math.floor((remain%3600000)/60000), s=Math.floor((remain%60000)/1000); depIn='Departs in '+h+'h '+m+'m '+s+'s'; status='Scheduled';}
    else if(pct<0.9){ status='In Air'; timeAir=Math.floor(elapsed/60000)+'m in air'; alt='35000 ft'; speed='880 km/h'; depIn='En route - '+Math.round(pct*100)+'%';}
    else{ status='Landed'; timeAir='Landed'; alt='0 ft'; speed='0 km/h'; depIn='Arrived';}
    document.getElementById('statusBadge').innerText=status;
    document.getElementById('timeAir').innerText=timeAir;
    document.getElementById('alt').innerText=alt;
    document.getElementById('speed').innerText=speed;
    document.getElementById('depIn').innerText=depIn;
  }
  setInterval(tick,1000); tick();
  <\/script></div></body></html>`);
  }
});

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log('V18 FULL - exact like screenshot + real map - running '+PORT));
