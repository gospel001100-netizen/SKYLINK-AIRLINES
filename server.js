// server.js - SKYLINK AIRLINES - FREE DATABASE PERMANENT VERSION
// Works on FREE Render plan - Tracking never expires - Features maintained
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
let mongoose = null;
try{ mongoose = require('mongoose'); }catch(e){}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 10000;

// ===== PERMANENT STORAGE - DUAL MODE (FREE DB + FILE BACKUP) =====
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'bookings.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf8');

let bookings = new Map();
let BookingModel = null;
let dbConnected = false;

async function initDatabase(){
  const uri = process.env.MONGODB_URI;
  if(uri && mongoose){
    try{
      await mongoose.connect(uri);
      const schema = new mongoose.Schema({
        _id: String, booking: String, tracking: String, name: String,
        from: String, fromFull: String, to: String, toFull: String,
        flight: String, gate: String, terminal: String, seat: String,
        class: String, departISO: String, arriveISO: String,
        fromTz: String, toTz: String, baggage: String,
        createdAt: String, permanent: Boolean
      }, { _id: false });
      BookingModel = mongoose.model('Booking', schema);
      dbConnected = true;
      console.log('✅ FREE Database connected - Permanent storage active');
      // Load from DB
      const all = await BookingModel.find({});
      all.forEach(doc=>{
        bookings.set(doc.tracking, doc.toObject());
        bookings.set(doc.booking, doc.toObject());
      });
      console.log(`Loaded ${all.length} permanent bookings from FREE DB`);
      return;
    }catch(e){ console.log('DB connect failed, using file fallback', e.message); }
  }
  // FALLBACK: File storage (still permanent until redeploy, but won't fail deploy)
  try{
    const raw = fs.readFileSync(DATA_FILE,'utf8');
    const obj = JSON.parse(raw||'{}');
    Object.keys(obj).forEach(k=> bookings.set(k, obj[k]));
    console.log(`Loaded ${bookings.size} bookings from file (fallback) - Add MONGODB_URI for 100 years permanent`);
  }catch(e){}
}
initDatabase();

async function savePermanent(key, record){
  bookings.set(key, record);
  bookings.set(record.tracking, record);
  bookings.set(record.booking, record);
  // Save to file (backup)
  try{
    const obj = {};
    bookings.forEach((v,k)=>{ obj[k]=v });
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
  }catch(e){}
  // Save to FREE DB if connected
  if(dbConnected && BookingModel){
    try{
      await BookingModel.findOneAndUpdate({tracking: record.tracking}, record, {upsert:true});
    }catch(e){ console.log('DB save error', e.message); }
  }
}

const AIRPORTS = [
  // YEMEN & MIDDLE EAST
  {code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl", tz:"Asia/Aden"},
  {code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl", tz:"Asia/Aden"},
  {code:"HOD", city:"Hodeidah", country:"Yemen", name:"Hodeidah Intl", tz:"Asia/Aden"},
  {code:"TAI", city:"Taiz", country:"Yemen", name:"Taiz Intl", tz:"Asia/Aden"},
  {code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz", tz:"Asia/Riyadh"},
  {code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid", tz:"Asia/Riyadh"},
  {code:"MED", city:"Medina", country:"Saudi Arabia", name:"Prince Mohammad", tz:"Asia/Riyadh"},
  {code:"DMM", city:"Dammam", country:"Saudi Arabia", name:"King Fahd", tz:"Asia/Riyadh"},
  {code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl", tz:"Asia/Dubai"},
  {code:"AUH", city:"Abu Dhabi", country:"UAE", name:"Abu Dhabi Intl", tz:"Asia/Dubai"},
  {code:"SHJ", city:"Sharjah", country:"UAE", name:"Sharjah Intl", tz:"Asia/Dubai"},
  {code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl", tz:"Asia/Qatar"},
  {code:"KWI", city:"Kuwait", country:"Kuwait", name:"Kuwait Intl", tz:"Asia/Kuwait"},
  {code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl", tz:"Asia/Bahrain"},
  {code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl", tz:"Asia/Muscat"},
  {code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia", tz:"Asia/Amman"},
  {code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Intl", tz:"Asia/Beirut"},
  {code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl", tz:"Asia/Baghdad"},
  {code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini", tz:"Asia/Tehran"},
  {code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion", tz:"Asia/Jerusalem"},

  // AFRICA - WEST
  {code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed", tz:"Africa/Lagos"},
  {code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe", tz:"Africa/Lagos"},
  {code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano", tz:"Africa/Lagos"},
  {code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt Intl", tz:"Africa/Lagos"},
  {code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam", tz:"Africa/Lagos"},
  {code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka Intl", tz:"Africa/Accra"},
  {code:"ABJ", city:"Abidjan", country:"Ivory Coast", name:"Felix Houphouet", tz:"Africa/Abidjan"},
  {code:"DKR", city:"Dakar", country:"Senegal", name:"Blaise Diagne", tz:"Africa/Dakar"},
  {code:"BKO", city:"Bamako", country:"Mali", name:"Modibo Keita", tz:"Africa/Bamako"},
  {code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun", tz:"Africa/Porto-Novo"},
  {code:"LFW", city:"Lome", country:"Togo", name:"Lome Tokoin", tz:"Africa/Lome"},

  // AFRICA - EAST & NORTH & SOUTH
  {code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl", tz:"Africa/Cairo"},
  {code:"ALY", city:"Alexandria", country:"Egypt", name:"Borg El Arab", tz:"Africa/Cairo"},
  {code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole Intl", tz:"Africa/Addis_Ababa"},
  {code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta", tz:"Africa/Nairobi"},
  {code:"MBA", city:"Mombasa", country:"Kenya", name:"Moi Intl", tz:"Africa/Nairobi"},
  {code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere", tz:"Africa/Dar_es_Salaam"},
  {code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali Intl", tz:"Africa/Kigali"},
  {code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe Intl", tz:"Africa/Kampala"},
  {code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo", tz:"Africa/Johannesburg"},
  {code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town Intl", tz:"Africa/Johannesburg"},
  {code:"DUR", city:"Durban", country:"South Africa", name:"King Shaka", tz:"Africa/Johannesburg"},
  {code:"LUN", city:"Lusaka", country:"Zambia", name:"Kenneth Kaunda", tz:"Africa/Lusaka"},
  {code:"HRE", city:"Harare", country:"Zimbabwe", name:"Robert Mugabe", tz:"Africa/Harare"},
  {code:"ALG", city:"Algiers", country:"Algeria", name:"Houari Boumediene", tz:"Africa/Algiers"},
  {code:"TUN", city:"Tunis", country:"Tunisia", name:"Carthage", tz:"Africa/Tunis"},
  {code:"CMN", city:"Casablanca", country:"Morocco", name:"Mohammed V", tz:"Africa/Casablanca"},
  {code:"KRT", city:"Khartoum", country:"Sudan", name:"Khartoum Intl", tz:"Africa/Khartoum"},

  // EUROPE
  {code:"LHR", city:"London", country:"UK", name:"Heathrow", tz:"Europe/London"},
  {code:"LGW", city:"London", country:"UK", name:"Gatwick", tz:"Europe/London"},
  {code:"MAN", city:"Manchester", country:"UK", name:"Manchester", tz:"Europe/London"},
  {code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris"},
  {code:"ORY", city:"Paris", country:"France", name:"Orly", tz:"Europe/Paris"},
  {code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin"},
  {code:"MUC", city:"Munich", country:"Germany", name:"Munich Intl", tz:"Europe/Berlin"},
  {code:"BER", city:"Berlin", country:"Germany", name:"Brandenburg", tz:"Europe/Berlin"},
  {code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam"},
  {code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome"},
  {code:"MXP", city:"Milan", country:"Italy", name:"Malpensa", tz:"Europe/Rome"},
  {code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid"},
  {code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat", tz:"Europe/Madrid"},
  {code:"LIS", city:"Lisbon", country:"Portugal", name:"Humberto Delgado", tz:"Europe/Lisbon"},
  {code:"BRU", city:"Brussels", country:"Belgium", name:"Brussels Intl", tz:"Europe/Brussels"},
  {code:"ZRH", city:"Zurich", country:"Switzerland", name:"Zurich Intl", tz:"Europe/Zurich"},
  {code:"VIE", city:"Vienna", country:"Austria", name:"Vienna Intl", tz:"Europe/Vienna"},
  {code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul"},
  {code:"SAW", city:"Istanbul", country:"Turkey", name:"Sabiha Gokcen", tz:"Europe/Istanbul"},
  {code:"ATH", city:"Athens", country:"Greece", name:"Eleftherios Venizelos", tz:"Europe/Athens"},
  {code:"WAW", city:"Warsaw", country:"Poland", name:"Chopin", tz:"Europe/Warsaw"},
  {code:"PRG", city:"Prague", country:"Czech Republic", name:"Vaclav Havel", tz:"Europe/Prague"},
  {code:"BUD", city:"Budapest", country:"Hungary", name:"Ferenc Liszt", tz:"Europe/Budapest"},
  {code:"SVO", city:"Moscow", country:"Russia", name:"Sheremetyevo", tz:"Europe/Moscow"},
  {code:"DME", city:"Moscow", country:"Russia", name:"Domodedovo", tz:"Europe/Moscow"},
  {code:"KBP", city:"Kyiv", country:"Ukraine", name:"Boryspil", tz:"Europe/Kyiv"},
  {code:"ARN", city:"Stockholm", country:"Sweden", name:"Arlanda", tz:"Europe/Stockholm"},
  {code:"CPH", city:"Copenhagen", country:"Denmark", name:"Copenhagen", tz:"Europe/Copenhagen"},
  {code:"OSL", city:"Oslo", country:"Norway", name:"Gardermoen", tz:"Europe/Oslo"},
  {code:"HEL", city:"Helsinki", country:"Finland", name:"Vantaa", tz:"Europe/Helsinki"},
  {code:"DUB", city:"Dublin", country:"Ireland", name:"Dublin Intl", tz:"Europe/Dublin"},

  // USA & CANADA
  {code:"JFK", city:"New York", country:"USA", name:"John F Kennedy", tz:"America/New_York"},
  {code:"LGA", city:"New York", country:"USA", name:"LaGuardia", tz:"America/New_York"},
  {code:"EWR", city:"Newark", country:"USA", name:"Newark Liberty", tz:"America/New_York"},
  {code:"LAX", city:"Los Angeles", country:"USA", name:"LAX", tz:"America/Los_Angeles"},
  {code:"SFO", city:"San Francisco", country:"USA", name:"SFO", tz:"America/Los_Angeles"},
  {code:"ORD", city:"Chicago", country:"USA", name:"O'Hare", tz:"America/Chicago"},
  {code:"MIA", city:"Miami", country:"USA", name:"Miami Intl", tz:"America/New_York"},
  {code:"ATL", city:"Atlanta", country:"USA", name:"Hartsfield", tz:"America/New_York"},
  {code:"DFW", city:"Dallas", country:"USA", name:"Dallas Fort Worth", tz:"America/Chicago"},
  {code:"IAH", city:"Houston", country:"USA", name:"Bush Intercontinental", tz:"America/Chicago"},
  {code:"SEA", city:"Seattle", country:"USA", name:"Sea-Tac", tz:"America/Los_Angeles"},
  {code:"BOS", city:"Boston", country:"USA", name:"Logan", tz:"America/New_York"},
  {code:"IAD", city:"Washington", country:"USA", name:"Dulles", tz:"America/New_York"},
  {code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto"},
  {code:"YVR", city:"Vancouver", country:"Canada", name:"Vancouver Intl", tz:"America/Vancouver"},
  {code:"YUL", city:"Montreal", country:"Canada", name:"Trudeau", tz:"America/Toronto"},

  // LATIN AMERICA
  {code:"MEX", city:"Mexico City", country:"Mexico", name:"Benito Juarez", tz:"America/Mexico_City"},
  {code:"CUN", city:"Cancun", country:"Mexico", name:"Cancun Intl", tz:"America/Cancun"},
  {code:"GRU", city:"Sao Paulo", country:"Brazil", name:"Guarulhos", tz:"America/Sao_Paulo"},
  {code:"GIG", city:"Rio de Janeiro", country:"Brazil", name:"Galeao", tz:"America/Sao_Paulo"},
  {code:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ezeiza", tz:"America/Argentina/Buenos_Aires"},
  {code:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino", tz:"America/Santiago"},
  {code:"BOG", city:"Bogota", country:"Colombia", name:"El Dorado", tz:"America/Bogota"},
  {code:"LIM", city:"Lima", country:"Peru", name:"Jorge Chavez", tz:"America/Lima"},
  {code:"PTY", city:"Panama City", country:"Panama", name:"Tocumen", tz:"America/Panama"},

  // ASIA PACIFIC
  {code:"BOM", city:"Mumbai", country:"India", name:"Chhatrapati Shivaji", tz:"Asia/Kolkata"},
  {code:"DEL", city:"Delhi", country:"India", name:"Indira Gandhi", tz:"Asia/Kolkata"},
  {code:"BLR", city:"Bangalore", country:"India", name:"Kempegowda", tz:"Asia/Kolkata"},
  {code:"HYD", city:"Hyderabad", country:"India", name:"Rajiv Gandhi", tz:"Asia/Kolkata"},
  {code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl", tz:"Asia/Karachi"},
  {code:"LHE", city:"Lahore", country:"Pakistan", name:"Allama Iqbal", tz:"Asia/Karachi"},
  {code:"ISB", city:"Islamabad", country:"Pakistan", name:"Islamabad Intl", tz:"Asia/Karachi"},
  {code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Hazrat Shahjalal", tz:"Asia/Dhaka"},
  {code:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike", tz:"Asia/Colombo"},
  {code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore"},
  {code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA", tz:"Asia/Kuala_Lumpur"},
  {code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok"},
  {code:"HKT", city:"Phuket", country:"Thailand", name:"Phuket Intl", tz:"Asia/Bangkok"},
  {code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta"},
  {code:"DPS", city:"Bali", country:"Indonesia", name:"Ngurah Rai", tz:"Asia/Makassar"},
  {code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila"},
  {code:"SGN", city:"Ho Chi Minh", country:"Vietnam", name:"Tan Son Nhat", tz:"Asia/Ho_Chi_Minh"},
  {code:"HAN", city:"Hanoi", country:"Vietnam", name:"Noi Bai", tz:"Asia/Ho_Chi_Minh"},
  {code:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong Intl", tz:"Asia/Hong_Kong"},
  {code:"TPE", city:"Taipei", country:"Taiwan", name:"Taoyuan", tz:"Asia/Taipei"},
  {code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo"},
  {code:"HND", city:"Tokyo", country:"Japan", name:"Haneda", tz:"Asia/Tokyo"},
  {code:"KIX", city:"Osaka", country:"Japan", name:"Kansai", tz:"Asia/Tokyo"},
  {code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul"},
  {code:"PEK", city:"Beijing", country:"China", name:"Capital", tz:"Asia/Shanghai"},
  {code:"PVG", city:"Shanghai", country:"China", name:"Pudong", tz:"Asia/Shanghai"},
  {code:"CAN", city:"Guangzhou", country:"China", name:"Baiyun", tz:"Asia/Shanghai"},

  // AUSTRALIA & OCEANIA
  {code:"SYD", city:"Sydney", country:"Australia", name:"Kingsford Smith", tz:"Australia/Sydney"},
  {code:"MEL", city:"Melbourne", country:"Australia", name:"Tullamarine", tz:"Australia/Melbourne"},
  {code:"BNE", city:"Brisbane", country:"Australia", name:"Brisbane Intl", tz:"Australia/Brisbane"},
  {code:"PER", city:"Perth", country:"Australia", name:"Perth Intl", tz:"Australia/Perth"},
  {code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland Intl", tz:"Pacific/Auckland"},
  {code:"NAN", city:"Nadi", country:"Fiji", name:"Nadi Intl", tz:"Pacific/Fiji"},
];
const IATA_TZ = {}; AIRPORTS.forEach(a=> IATA_TZ[a.code]=a.tz);
function genCode(p){return p+'-'+Math.random().toString(36).substring(2,7).toUpperCase()}
function findAirport(c){return AIRPORTS.find(a=>a.code===c.toUpperCase())||{code:c.toUpperCase(), city:c, country:"", name:"Intl", tz:"UTC"}}

// HOME - MAINTAINED
app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK</title><style>body{margin:0;font-family:Inter,Arial;background:#f8fafc}.nav{background:#0f172a;color:#fff;padding:14px 20px;display:flex;justify-content:space-between}.logo{font-weight:900;font-size:20px}.logo span:last-child{color:#FACC15}.hero{padding:30px 20px;max-width:900px;margin:auto}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,.06);border:1px solid #e2e8f0}input,select{width:100%;padding:12px;border-radius:10px;border:1px solid #cbd5e1;margin-top:6px;font-weight:600}label{font-size:11px;font-weight:800;color:#64748b;margin-top:12px;display:block}.btn{background:#0f172a;color:#fff;padding:14px;border-radius:12px;border:none;width:100%;font-weight:900;margin-top:16px;cursor:pointer}.suggest{position:absolute;background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-height:180px;overflow:auto;width:calc(100% - 40px);z-index:10;display:none}.suggest div{padding:10px;font-size:13px;font-weight:600;cursor:pointer}.rel{position:relative}</style></head><body>
<div class="nav"><div class="logo"><span>SKYLINK</span><span>AIRLINES</span></div><div style="font-size:10px">${dbConnected?'✅ PERMANENT DB CONNECTED':'⚠️ ADD MONGODB_URI FOR 100YRS PERMANENT'}</div></div>
<div class="hero"><h2 style="font-weight:900">Book Flight - Permanent Tracking</h2><div class="card"><form onsubmit="book(event)"><label>Passenger Name</label><input id="pname" required><div style="display:flex;gap:12px"><div style="flex:1" class="rel"><label>FROM</label><input id="from" autocomplete="off" oninput="autoSuggest('from')" required><div id="from-suggest" class="suggest"></div></div><div style="flex:1" class="rel"><label>TO</label><input id="to" autocomplete="off" oninput="autoSuggest('to')" required><div id="to-suggest" class="suggest"></div></div></div><div style="display:flex;gap:12px"><div style="flex:1"><label>Departure Exact Time</label><input type="datetime-local" id="depart" required></div><div style="flex:1"><label>Class</label><select id="class"><option>ECONOMY</option><option>BUSINESS</option></select></div></div><button class="btn">Confirm & Generate Permanent Boarding Pass</button></form></div><p style="text-align:center;margin-top:16px"><a href="/admin" style="font-weight:800;background:#000;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none">Admin Dashboard - Permanent</a> | Bookings: ${bookings.size}</p></div>
<script>
const airports=${JSON.stringify(AIRPORTS)};
function autoSuggest(t){const i=document.getElementById(t),b=document.getElementById(t+'-suggest'),q=i.value.toLowerCase();if(!q){b.style.display='none';return}const f=airports.filter(a=>(a.code+' '+a.city+' '+a.country).toLowerCase().includes(q)).slice(0,8);if(!f.length){b.style.display='none';return}b.innerHTML=f.map(a=>\`<div onclick="selectAirport('\${t}','\${a.code}')">\${a.code} - \${a.city}, \${a.country}</div>\`).join('');b.style.display='block'}
function selectAirport(t,c){const a=airports.find(x=>x.code===c);document.getElementById(t).value=\`\${a.code} - \${a.city}, \${a.country}\`;document.getElementById(t).dataset.code=c;document.getElementById(t+'-suggest').style.display='none'}
async function book(e){e.preventDefault();const from=document.getElementById('from').dataset.code||document.getElementById('from').value.split(' ')[0].toUpperCase(),to=document.getElementById('to').dataset.code||document.getElementById('to').value.split(' ')[0].toUpperCase();const p={name:document.getElementById('pname').value,from,to,depart:document.getElementById('depart').value,class:document.getElementById('class').value};const r=await fetch('/api/book',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});const d=await r.json();if(d.boardingUrl)window.location=d.boardingUrl}
document.addEventListener('click',e=>{if(!e.target.closest('.rel'))document.querySelectorAll('.suggest').forEach(s=>s.style.display='none')});
<\/script></body></html>`);
});

app.get('/api/airports',(req,res)=>{
  const q=(req.query.q||'').toLowerCase();if(!q)return res.json(AIRPORTS.slice(0,10));
  res.json(AIRPORTS.filter(a=>(a.code+' '+a.city+' '+a.country+' '+a.name).toLowerCase().includes(q)).slice(0,10));
});

app.post('/api/book', async (req,res)=>{
  const {name,from,to,depart,class:cls}=req.body;
  const tracking='TRK-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const booking=genCode('SKY');const flight='SKY-'+Math.floor(100+Math.random()*899);
  const gate='G'+Math.floor(10+Math.random()*90);const terminal='T'+Math.floor(1+Math.random()*3);
  const seat=Math.floor(10+Math.random()*30)+['A','B','C','D','E','F'][Math.floor(Math.random()*6)];
  const fromA=findAirport(from),toA=findAirport(to);
  const departDate=depart?new Date(depart):new Date(Date.now()+7200000);
  const arriveDate=new Date(departDate.getTime()+8*3600000);
  const record={booking,tracking,name:name.toUpperCase(),from:fromA.code,fromFull:`${fromA.code} - ${fromA.city}, ${fromA.country} (${fromA.name})`,to:toA.code,toFull:`${toA.code} - ${toA.city}, ${toA.country} (${toA.name})`,flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:arriveDate.toISOString(),fromTz:fromA.tz,toTz:toA.tz,baggage:'23KG',createdAt:new Date().toISOString(),permanent:true};
  await savePermanent(tracking, record);
  res.json({tracking,booking,boardingUrl:`/boarding-pass?code=${tracking}`,trackUrl:`/track?code=${tracking}`});
});

// ADMIN PERMANENT
app.get('/admin', async (req,res)=>{
  let all=[];const seen=new Set();
  if(dbConnected && BookingModel){
    const docs=await BookingModel.find({}).sort({createdAt:-1});
    docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} });
  } else {
    try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  }
  const rows=all.map(b=>`<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px;font-weight:800">${b.booking}</td><td style="padding:10px;font-weight:800">${b.tracking}</td><td style="padding:10px">${b.name}</td><td style="padding:10px">${b.from}->${b.to}</td><td style="padding:10px">${new Date(b.departISO).toLocaleString()}</td><td style="padding:10px"><a href="/boarding-pass?code=${b.tracking}" style="background:#000;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;font-size:11px">Pass</a> <a href="/track?code=${b.tracking}" style="background:#22c55e;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;font-size:11px">Track</a></td></tr>`).join('');
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admin Permanent</title><style>body{margin:0;font-family:Arial;background:#f8fafc;padding:20px}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,.06);overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{padding:12px;text-align:left;background:#0f172a;color:#fff;font-size:11px}</style></head><body><h2>ADMIN - PERMANENT TRACKING - ${dbConnected?'✅ FREE CLOUD DB (100 YEARS)':'⚠️ FILE MODE - ADD MONGODB_URI FOR PERMANENT'}</h2><p>Total Permanent Bookings: <b>${all.length}</b> | Status: ${dbConnected?'Connected to Free Cloud Database - Never deletes':'File mode - Will delete on redeploy unless you add MONGODB_URI'}</p><div class="card"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>DEPARTURE</th><th>ACTION</th></tr>${rows||'<tr><td colspan=6 style="padding:20px;text-align:center">No bookings yet - will stay forever once created</td></tr>'}</table></div><p><a href="/" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Home</a></p></body></html>`);
});

// BOARDING PASS BRIGHT - PERMANENT
app.get('/boarding-pass', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && dbConnected && BookingModel){const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){b={booking:'SKY-WQIB',tracking:code||'TRK-P7AQ4A9',name:'SYLVESTER GOSPEL',from:'SAH',fromFull:'SAH - Sanaa, Yemen (Sanaa Intl)',to:'JFK',toFull:'JFK - New York, USA (John F Kennedy)',flight:'SKY-392',gate:'G81',terminal:'T3',seat:'14F',class:'ECONOMY',departISO:new Date().toISOString(),arriveISO:new Date(Date.now()+28800000).toISOString(),fromTz:'Asia/Aden',toTz:'America/New_York',baggage:'23KG'}}
  const departDate=new Date(b.departISO),arriveDate=new Date(b.arriveISO);
  const trackUrl=`https://${req.get('host')}/track?code=${b.tracking}`;const qr=await QRCode.toDataURL(trackUrl).catch(()=>'');

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boarding Pass ${b.booking}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#eef2f7;display:flex;justify-content:center;padding:18px;font-family:'Helvetica Neue',Arial}#bp{width:800px;max-width:100%;background:#FFF!important;color:#000!important;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);border:1.5px solid #000}.header{padding:18px 28px;border-bottom:3px solid #000;display:flex;justify-content:space-between;background:#fff}.logo{font-weight:900;font-size:22px}.logo span:last-child{color:#FACC15}.small{font-size:9px;font-weight:800;margin-top:2px}.content{padding:24px 28px;background:#fff}.label{font-size:9px;font-weight:800;letter-spacing:1.2px;color:#374151;text-transform:uppercase;margin-bottom:3px}.value{font-size:13px;font-weight:900;color:#000;text-transform:uppercase}.big{font-size:17px;font-weight:900}.row{display:flex;justify-content:space-between;margin-bottom:14px;gap:12px}.qr{width:140px;height:140px;border:2px solid #000;padding:6px;background:#fff}.divider{border-top:2px dashed #000;margin:18px 0}.footer{background:#000;color:#fff;padding:10px 28px;font-size:8px;font-weight:800;display:flex;justify-content:space-between}.btn-row{display:flex;gap:10px;justify-content:center;padding:18px;background:#f9fafb}.btn{padding:12px 18px;border-radius:10px;font-size:13px;font-weight:900;cursor:pointer;border:none}.btn-dark{background:#000;color:#fff}.btn-light{background:#fff;border:2px solid #000;color:#000}@media print{body{background:#fff!important;padding:0!important}#bp{box-shadow:none!important;width:100%!important}.btn-row{display:none!important}}</style></head><body><div id="bp"><div class="header"><div><div class="logo"><span>SKYLINK</span><span>AIRLINES</span></div><div class="small">IATA CERTIFIED - EST. 2014 - OFFICIAL BOARDING PASS - PERMANENT</div></div><div style="font-size:10px;font-weight:700">skylink-airlines.onrender.com</div></div><div class="content"><div class="label">Passenger Name</div><div class="value big" style="margin-bottom:14px">${b.name}</div><div class="row"><div style="flex:1"><div class="label">From</div><div class="value">${b.fromFull}</div></div><div style="text-align:center"><img class="qr" src="${qr}"><div style="font-size:8px;font-weight:900;margin-top:6px">SCAN TO TRACK LIVE</div><div style="font-size:8px;font-weight:700">BOOKING: ${b.booking}</div></div></div><div class="row"><div style="flex:1"><div class="label">To</div><div class="value">${b.toFull}</div></div></div><div class="row"><div><div class="label">Flight</div><div class="value">${b.flight}</div></div><div><div class="label">Date</div><div class="value">${departDate.toLocaleDateString('en-GB')}</div></div><div><div class="label">Seat</div><div class="value">${b.seat}</div></div></div><div class="row"><div><div class="label">Gate</div><div class="value">${b.gate}</div></div><div><div class="label">Terminal</div><div class="value">${b.terminal}</div></div><div><div class="label">Class</div><div class="value">${b.class}</div></div></div><div class="row"><div><div class="label">Baggage</div><div class="value">${b.baggage}</div></div><div><div class="label">Tracking - PERMANENT</div><div class="value">${b.tracking}</div></div><div><div class="label">Status</div><div class="value">CONFIRMED</div></div></div><div class="divider"></div><div class="row"><div style="flex:1"><div class="label">Departure (${b.from} Local - ${b.fromTz})</div><div class="value">${departDate.toLocaleString('en-US',{timeZone:b.fromTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</div></div></div><div class="row"><div style="flex:1"><div class="label">Arrival (${b.to} Local - ${b.toTz})</div><div class="value">${arriveDate.toLocaleString('en-US',{timeZone:b.toTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})}</div></div></div></div><div class="footer"><div>BOARDING PASS STUB - PERMANENT RECORD</div><div>${b.name} | ${b.flight} | ${b.from}-${b.to} | ${b.tracking}</div></div></div><div class="btn-row"><button class="btn btn-dark" onclick="downloadPDF()">Print / Save PDF - BRIGHT</button><button class="btn btn-light" onclick="location.href='/track?code=${b.tracking}'">Track Live Permanent</button></div><script>function downloadPDF(){const el=document.getElementById('bp');html2canvas(el,{scale:3,useCORS:true,backgroundColor:'#ffffff'}).then(c=>{const img=c.toDataURL('image/png',1.0);const {jsPDF}=window.jspdf;const pdf=new jsPDF('p','mm','a4');const w=pdf.internal.pageSize.getWidth();const h=(c.height*w)/c.width;pdf.addImage(img,'PNG',8,8,w-16,h-16);pdf.save('BoardingPass-${b.tracking}.pdf')})}<\/script></body></html>`);
});

// TRACK - PERMANENT - SECURE - BOLD - SMART TIMEZONE
app.get('/track', async (req,res)=>{
  const code=req.query.code||req.query.tracking||'TRK-P7AQ4A9';let b=bookings.get(code);
  if(!b && dbConnected && BookingModel){const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc){b=doc.toObject();bookings.set(code,b)}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){b={booking:'SKY-WQIB',tracking:code,name:'Sylvester Gospel',from:'SAH',fromFull:'SAH - Sanaa, Yemen (Sanaa Intl)',to:'JFK',toFull:'JFK - New York, USA (John F Kennedy)',flight:'SKY-392',gate:'G81',terminal:'T3',seat:'14F',departISO:new Date().toISOString(),arriveISO:new Date(Date.now()+28800000).toISOString(),fromTz:'Asia/Aden',toTz:'America/New_York',permanent:true}}

  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flight ${b.tracking} - PERMANENT</title><style>body{margin:0;background:#f1f5f9;font-family:Inter,Arial;display:flex;justify-content:center;padding:12px}.card{width:100%;max-width:520px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);border:2px solid #000}.head{background:#000;color:#fff;padding:20px;text-align:center}.head h1{margin:0;font-size:19px;font-weight:900}.head p{margin:8px 0 0;font-size:12px;font-weight:800;opacity:.9}.body{padding:20px}.info{font-size:14px;line-height:1.7;font-weight:700}.info b{font-weight:900}.box{margin-top:16px;padding:16px;background:#f8fafc;border:2px solid #000;border-radius:14px}.label{font-size:11px;font-weight:900;letter-spacing:1px;color:#475569}.value{font-size:26px;font-weight:900;margin-top:6px;text-transform:uppercase}.progress{height:16px;background:#e2e8f0;border-radius:20px;overflow:hidden;margin-top:12px;border:1.5px solid #000}.bar{height:100%;background:#22c55e;width:0%;transition:width 1s}.big{background:#000;color:#fff;border-radius:14px;padding:20px;text-align:center;margin-top:18px}.time{font-size:38px;font-weight:900;margin-top:8px}.route{font-size:16px;font-weight:800;margin-top:10px;line-height:1.4}.note{margin-top:16px;font-size:11px;color:#475569;text-align:center;font-weight:700;line-height:1.5}</style></head><body><div class="card"><div class="head"><h1>FLIGHT STATUS - PERMANENT</h1><p>TRACKING LIVE FROM: ${b.from} - ${b.fromTz} | NEVER EXPIRES</p></div><div class="body"><div class="info"><b>Booking:</b> ${b.booking} | <b>Tracking:</b> <span style="background:#000;color:#fff;padding:2px 8px;border-radius:6px;font-size:16px">${b.tracking}</span><br><b>Passenger:</b> ${b.name}<br><b>Flight:</b> ${b.flight} | Seat ${b.seat} | Gate ${b.gate} | Terminal ${b.terminal}<br><b>Route:</b> ${b.fromFull} to ${b.toFull}<br><b>Departure (${b.from} Local):</b> <span id="dep"></span><br><b>Arrival (${b.to} Local):</b> <span id="arr"></span></div><div class="box"><div class="label">CURRENT FLIGHT STATUS - PERMANENT RECORD</div><div class="value" id="status">BOARDING</div><div class="progress"><div class="bar" id="bar"></div></div><div style="font-size:15px;font-weight:900;margin-top:10px" id="pct">0% completed</div></div><div class="big"><div style="font-size:11px;font-weight:900;opacity:.7">LIVE TRACKING - BOLD - PERMANENT</div><div class="time" id="live-time">--:--:--</div><div class="route" id="live-route">Loading...</div><div style="font-size:11px;margin-top:12px;opacity:.6" id="utc"></div></div><div class="note">Permanent tracking - Works forever (100+ years). Secure: No Home / No Boarding Pass buttons.<br>Code: ${b.tracking} | ${dbConnected?'✅ Saved in FREE Cloud DB':'⚠️ Add MONGODB_URI to make it 100 years permanent'}</div></div></div><script>
const IATA_TZ=${JSON.stringify(IATA_TZ)};const booking=${JSON.stringify(b)};
const fromTz=IATA_TZ[booking.from]||booking.fromTz||'Asia/Aden';const toTz=IATA_TZ[booking.to]||booking.toTz||'America/New_York';
const departDate=new Date(booking.departISO),arriveDate=new Date(booking.arriveISO);
document.getElementById('dep').innerText=departDate.toLocaleString('en-US',{timeZone:fromTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' ('+fromTz+')';
document.getElementById('arr').innerText=arriveDate.toLocaleString('en-US',{timeZone:toTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})+' ('+toTz+')';
function update(){const now=new Date();const diff=departDate-now;const mins=Math.floor(diff/60000);let status='SCHEDULED',pct=5,msg='';if(mins>120){status='SCHEDULED';pct=5;msg='Departing in '+Math.floor(mins/60)+'h '+(mins%60)+'m from '+booking.from}else if(mins>60){status='CHECK-IN OPEN';pct=25;msg='Check-in OPEN at Terminal '+booking.terminal}else if(mins>30){status='BOARDING';pct=60;msg='Boarding NOW at Gate '+booking.gate+' Terminal '+booking.terminal}else if(mins>0){status='FINAL BOARDING';pct=85;msg='Final Boarding - Gate '+booking.gate+' Closing in '+mins+' mins'}else if(mins>-60){status='DEPARTED';pct=90;msg='Departed from '+booking.from+' - In Air'}else if(mins>-480){status='IN-FLIGHT';pct=95;msg='In Flight to '+booking.to}else{status='ARRIVED';pct=100;msg='Arrived at '+booking.to+' - Permanent Record'}
document.getElementById('status').innerText=status;document.getElementById('bar').style.width=pct+'%';document.getElementById('pct').innerText=pct+'% completed - PERMANENT';
const fromTime=now.toLocaleString('en-US',{timeZone:fromTz,hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true});const fromDate=now.toLocaleDateString('en-US',{timeZone:fromTz,weekday:'short',month:'short',day:'numeric',year:'numeric'});
document.getElementById('live-time').innerText=fromTime;document.getElementById('live-route').innerHTML=msg+'<br><small style="opacity:.8">Live: '+fromDate+' '+fromTime+' - '+booking.from+' ('+fromTz+')<br>Exact booking: '+departDate.toLocaleString('en-US',{timeZone:fromTz})+'</small>';document.getElementById('utc').innerText='Current: '+now.toLocaleString()+' | UTC: '+now.toUTCString()+' | Permanent: '+booking.tracking}
update();setInterval(update,30000);
<\/script></body></html>`);
});

app.get('/health',(req,res)=> res.send(`OK - Permanent ${dbConnected?'DB':'FILE'} - ${bookings.size} bookings - ${dbConnected?'Never deletes':'Add MONGODB_URI'}`));

app.listen(PORT, ()=> console.log(`SKYLINK PERMANENT FREE running on ${PORT} - ${bookings.size} bookings - DB:${dbConnected}`));
