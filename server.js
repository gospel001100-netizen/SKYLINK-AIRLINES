// server.js - SKYLINK - FULL COUNTRIES - FIXED DEPLOY
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
let mongoose = null; try{ mongoose = require('mongoose'); }catch(e){}
let axios = null; try{ axios = require('axios'); }catch(e){}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 10000;

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
        paystackRef: String, amount: Number, createdAt: String
      }, { _id: false });
      BookingModel = mongoose.model('Booking', schema);
      dbConnected = true;
      const all = await BookingModel.find({});
      all.forEach(doc=>{
        bookings.set(doc.tracking, doc.toObject());
        bookings.set(doc.booking, doc.toObject());
      });
      console.log('Loaded '+all.length+' permanent bookings');
      return;
    }catch(e){ console.log('DB fallback', e.message); }
  }
  try{
    const raw = fs.readFileSync(DATA_FILE,'utf8');
    const obj = JSON.parse(raw||'{}');
    Object.keys(obj).forEach(k=> bookings.set(k, obj[k]));
  }catch(e){}
}
initDatabase();

async function savePermanent(key, record){
  bookings.set(key, record);
  bookings.set(record.tracking, record);
  bookings.set(record.booking, record);
  try{
    const obj = {};
    bookings.forEach((v,k)=>{ obj[k]=v });
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8');
  }catch(e){}
  if(dbConnected && BookingModel){
    try{ await BookingModel.findOneAndUpdate({tracking: record.tracking}, record, {upsert:true}); }catch(e){}
  }
}

const AIRPORTS = [
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
  {code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl", tz:"Africa/Cairo"},
  {code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole Intl", tz:"Africa/Addis_Ababa"},
  {code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta", tz:"Africa/Nairobi"},
  {code:"MBA", city:"Mombasa", country:"Kenya", name:"Moi Intl", tz:"Africa/Nairobi"},
  {code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere", tz:"Africa/Dar_es_Salaam"},
  {code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali Intl", tz:"Africa/Kigali"},
  {code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe Intl", tz:"Africa/Kampala"},
  {code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo", tz:"Africa/Johannesburg"},
  {code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town Intl", tz:"Africa/Johannesburg"},
  {code:"LUN", city:"Lusaka", country:"Zambia", name:"Kenneth Kaunda", tz:"Africa/Lusaka"},
  {code:"HRE", city:"Harare", country:"Zimbabwe", name:"Robert Mugabe", tz:"Africa/Harare"},
  {code:"LHR", city:"London", country:"UK", name:"Heathrow", tz:"Europe/London"},
  {code:"LGW", city:"London", country:"UK", name:"Gatwick", tz:"Europe/London"},
  {code:"MAN", city:"Manchester", country:"UK", name:"Manchester", tz:"Europe/London"},
  {code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris"},
  {code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin"},
  {code:"MUC", city:"Munich", country:"Germany", name:"Munich Intl", tz:"Europe/Berlin"},
  {code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam"},
  {code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome"},
  {code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid"},
  {code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul"},
  {code:"JFK", city:"New York", country:"USA", name:"JFK", tz:"America/New_York"},
  {code:"LAX", city:"Los Angeles", country:"USA", name:"LAX", tz:"America/Los_Angeles"},
  {code:"ORD", city:"Chicago", country:"USA", name:"O'Hare", tz:"America/Chicago"},
  {code:"MIA", city:"Miami", country:"USA", name:"Miami Intl", tz:"America/New_York"},
  {code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto"},
  {code:"BOM", city:"Mumbai", country:"India", name:"Chhatrapati Shivaji", tz:"Asia/Kolkata"},
  {code:"DEL", city:"Delhi", country:"India", name:"Indira Gandhi", tz:"Asia/Kolkata"},
  {code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl", tz:"Asia/Karachi"},
  {code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Shahjalal", tz:"Asia/Dhaka"},
  {code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore"},
  {code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok"},
  {code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta"},
  {code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila"},
  {code:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong Intl", tz:"Asia/Hong_Kong"},
  {code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo"},
  {code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul"},
  {code:"SYD", city:"Sydney", country:"Australia", name:"Kingsford Smith", tz:"Australia/Sydney"},
  {code:"MEL", city:"Melbourne", country:"Australia", name:"Tullamarine", tz:"Australia/Melbourne"},
];
const IATA_TZ = {}; AIRPORTS.forEach(a=> IATA_TZ[a.code]=a.tz);
function genCode(p){return p+'-'+Math.random().toString(36).substring(2,7).toUpperCase()}
function findAirport(c){return AIRPORTS.find(a=>a.code===c.toUpperCase())||{code:c.toUpperCase(), city:c, country:"", name:"Intl", tz:"UTC"}}

app.get('/', (req,res)=>{
  const airportsJson = JSON.stringify(AIRPORTS);
  const pk = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxx';
  res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK AIRLINES</title><script src="https://js.paystack.co/v1/inline.js"></script><style>body{margin:0;font-family:Inter,Arial;background:#f8fafc}.nav{background:#0f172a;color:#fff;padding:14px 20px;display:flex;justify-content:space-between}.logo{font-weight:900;font-size:20px}.logo span:last-child{color:#FACC15}.hero{padding:30px 20px;max-width:900px;margin:auto}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,.06);border:1px solid #e2e8f0}input,select{width:100%;padding:12px;border-radius:10px;border:1px solid #cbd5e1;margin-top:6px;font-weight:600}label{font-size:11px;font-weight:800;color:#64748b;margin-top:12px;display:block}.btn{background:#0f172a;color:#fff;padding:14px;border-radius:12px;border:none;width:100%;font-weight:900;margin-top:16px;cursor:pointer}.warning{background:#FEF3C7;border:2px solid #F59E0B;border-radius:12px;padding:12px;margin-top:12px;font-weight:800;font-size:12px;color:#92400E}.suggest{position:absolute;background:#fff;border:1px solid #e2e8f0;border-radius:10px;max-height:180px;overflow:auto;width:calc(100% - 40px);z-index:10;display:none}.suggest div{padding:10px;font-size:13px;font-weight:600;cursor:pointer}.rel{position:relative}</style></head><body><div class="nav"><div class="logo"><span>SKYLINK</span><span>AIRLINES</span></div><div style="font-size:10px">IATA CERTIFIED</div></div><div class="hero"><h2 style="font-weight:900">Book Flight</h2><div class="card"><form onsubmit="payAndBook(event)"><label>Passenger Name</label><input id="pname" required><div style="display:flex;gap:12px"><div style="flex:1" class="rel"><label>FROM</label><input id="from" autocomplete="off" oninput="autoSuggest(\'from\')" placeholder="Search country or code" required><div id="from-suggest" class="suggest"></div></div><div style="flex:1" class="rel"><label>TO</label><input id="to" autocomplete="off" oninput="autoSuggest(\'to\')" placeholder="Search country or code" required><div id="to-suggest" class="suggest"></div></div></div><div style="display:flex;gap:12px"><div style="flex:1"><label>Departure Date & Time (Your Local Airport Time)</label><input type="datetime-local" id="depart" required></div><div style="flex:1"><label>Class</label><select id="class"><option>ECONOMY</option><option>BUSINESS</option></select></div></div><div class="warning">WARNING!!! Transfer this exact amount: <b>NGN 2,150</b> - Do not pay more or less to avoid booking failure.</div><button class="btn" id="payBtn">Pay NGN 2,150 with Paystack & Generate Boarding Pass</button></form></div><p style="text-align:center;margin-top:16px;font-size:11px;color:#64748b">All countries available | Secure by Paystack | Trackable worldwide</p></div><script>const airports='+airportsJson+'; const PAYSTACK_PUBLIC_KEY="'+pk+'"; function autoSuggest(t){const i=document.getElementById(t),b=document.getElementById(t+"-suggest"),q=i.value.toLowerCase();if(!q){b.style.display="none";return}const f=airports.filter(a=>(a.code+" "+a.city+" "+a.country).toLowerCase().includes(q)).slice(0,10);if(!f.length){b.style.display="none";return} b.innerHTML=f.map(a=>"<div onclick=\"selectAirport(\'"+t+"\',\'"+a.code+"\')\">"+a.code+" - "+a.city+", "+a.country+" ("+a.name+")</div>").join(""); b.style.display="block"} function selectAirport(t,c){const a=airports.find(x=>x.code===c);document.getElementById(t).value=a.code+" - "+a.city+", "+a.country;document.getElementById(t).dataset.code=c;document.getElementById(t+"-suggest").style.display="none"} async function payAndBook(e){e.preventDefault();const btn=document.getElementById("payBtn");btn.innerText="Processing...";btn.disabled=true;const from=document.getElementById("from").dataset.code||document.getElementById("from").value.split(" ")[0].toUpperCase();const to=document.getElementById("to").dataset.code||document.getElementById("to").value.split(" ")[0].toUpperCase();const payload={name:document.getElementById("pname").value,from,to,depart:document.getElementById("depart").value,class:document.getElementById("class").value}; let handler=PaystackPop.setup({key:PAYSTACK_PUBLIC_KEY,email:"customer@skylink.com",amount:2150*100,currency:"NGN",ref:"SKY-"+Math.floor(Math.random()*1000000000),onClose:function(){btn.innerText="Pay NGN 2,150 with Paystack & Generate Boarding Pass";btn.disabled=false;alert("Payment cancelled")},callback:async function(response){payload.paystackRef=response.reference;const r=await fetch("/api/book",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json();if(d.boardingUrl){window.location=d.boardingUrl}else{alert(d.error||"Booking failed");btn.innerText="Pay NGN 2,150 with Paystack & Generate Boarding Pass";btn.disabled=false}}}); handler.openIframe();} document.addEventListener("click",e=>{if(!e.target.closest(".rel"))document.querySelectorAll(".suggest").forEach(s=>s.style.display="none")});<\/script><\/body><\/html>');
});

app.post('/api/book', async (req,res)=>{
  const {name,from,to,depart,class:cls,paystackRef}=req.body;
  if(!paystackRef){ return res.status(400).json({error:'Payment required - Pay NGN 2,150 first'}); }
  if(process.env.PAYSTACK_SECRET_KEY && axios){
    try{
      const verify = await axios.get('https://api.paystack.co/transaction/verify/'+paystackRef,{headers:{Authorization:'Bearer '+process.env.PAYSTACK_SECRET_KEY}});
      if(!verify.data.status || verify.data.data.status!=='success'){ return res.status(400).json({error:'Payment not verified'}); }
    }catch(e){ console.log('Verify skip', e.message); }
  }
  const tracking='TRK-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const booking=genCode('SKY');
  const flight='SKY-'+Math.floor(100+Math.random()*899);
  const gate='G'+Math.floor(10+Math.random()*90);
  const terminal='T'+Math.floor(1+Math.random()*3);
  const seat=Math.floor(10+Math.random()*30)+['A','B','C','D','E','F'][Math.floor(Math.random()*6)];
  const fromA=findAirport(from),toA=findAirport(to);
  const departDate=depart?new Date(depart):new Date(Date.now()+7200000);
  const arriveDate=new Date(departDate.getTime()+8*3600000);
  const record={booking,tracking,name:name.toUpperCase(),from:fromA.code,fromFull:fromA.code+' - '+fromA.city+', '+fromA.country+' ('+fromA.name+')',to:toA.code,toFull:toA.code+' - '+toA.city+', '+toA.country+' ('+toA.name+')',flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:arriveDate.toISOString(),fromTz:fromA.tz,toTz:toA.tz,baggage:'23KG',paystackRef,amount:2150,createdAt:new Date().toISOString()};
  await savePermanent(tracking, record);
  res.json({tracking,booking,boardingUrl:'/boarding-pass?code='+tracking,trackUrl:'/track?code='+tracking});
});

app.get('/skylink-admin-gospel-2024', async (req,res)=>{
  let all=[];const seen=new Set();
  if(dbConnected && BookingModel){
    const docs=await BookingModel.find({}).sort({createdAt:-1});
    docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} });
  } else {
    try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  }
  let rows = all.map(b=>'<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:10px;font-weight:800">'+b.booking+'</td><td style="padding:10px;font-weight:800">'+b.tracking+'</td><td style="padding:10px">'+b.name+'</td><td style="padding:10px">'+b.from+'->'+b.to+'</td><td style="padding:10px">'+new Date(b.departISO).toLocaleString()+'</td><td style="padding:10px">NGN '+(b.amount||2150)+'</td><td style="padding:10px"><a href="/boarding-pass?code='+b.tracking+'" style="background:#000;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;font-size:11px">Pass</a> <a href="/track?code='+b.tracking+'" style="background:#22c55e;color:#fff;padding:6px 10px;border-radius:6px;text-decoration:none;font-size:11px">Track</a></td></tr>').join('');
  res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK Admin</title><style>body{margin:0;font-family:Arial;background:#f8fafc;padding:20px}.card{background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(0,0,0,.06);overflow:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{padding:12px;text-align:left;background:#0f172a;color:#fff;font-size:11px}</style></head><body><h2>SKYLINK AIRLINES - Admin Dashboard</h2><p>Total Bookings: <b>'+all.length+'</b> | Revenue: <b>NGN '+(all.length*2150)+'</b> | All Countries Active | Cloud Never Deletes</p><div class="card"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>DEPARTURE</th><th>AMOUNT</th><th>ACTION</th></tr>'+(rows||'<tr><td colspan=7 style="padding:20px;text-align:center">No bookings yet</td></tr>')+'</table></div><p><a href="/" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:10px;text-decoration:none">Home</a></p></body></html>');
});

app.get('/admin', (req,res)=> res.redirect('/'));
app.get('/boarding-pass', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && dbConnected && BookingModel){const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('Booking not found');}
  const departDate=new Date(b.departISO),arriveDate=new Date(b.arriveISO);
  const trackUrl='https://'+req.get('host')+'/track?code='+b.tracking;
  const qr=await QRCode.toDataURL(trackUrl).catch(()=>'');

  res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boarding Pass '+b.booking+'</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#eef2f7;display:flex;justify-content:center;padding:18px;font-family:Helvetica,Arial}#bp{width:800px;max-width:100%;background:#FFF!important;color:#000!important;border-radius:12px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);border:1.5px solid #000}.header{padding:18px 28px;border-bottom:3px solid #000;display:flex;justify-content:space-between;background:#fff}.logo{font-weight:900;font-size:22px}.logo span:last-child{color:#FACC15}.small{font-size:9px;font-weight:800;margin-top:2px}.content{padding:24px 28px;background:#fff}.label{font-size:9px;font-weight:800;color:#374151;text-transform:uppercase;margin-bottom:3px}.value{font-size:13px;font-weight:900;color:#000;text-transform:uppercase}.big{font-size:17px;font-weight:900}.row{display:flex;justify-content:space-between;margin-bottom:14px;gap:12px}.qr{width:140px;height:140px;border:2px solid #000;padding:6px;background:#fff}.divider{border-top:2px dashed #000;margin:18px 0}.footer{background:#000;color:#fff;padding:10px 28px;font-size:8px;font-weight:800;display:flex;justify-content:space-between}.btn-row{display:flex;gap:10px;justify-content:center;padding:18px;background:#f9fafb;flex-wrap:wrap}.btn{padding:12px 18px;border-radius:10px;font-size:13px;font-weight:900;cursor:pointer;border:none}.btn-dark{background:#000;color:#fff}.btn-light{background:#fff;border:2px solid #000;color:#000}.track-box{margin-top:10px;background:#f1f5f9;border:1px dashed #000;padding:10px;border-radius:8px;font-size:11px;font-weight:700;word-break:break-all}@media print{body{background:#fff!important;padding:0!important}#bp{box-shadow:none!important;width:100%!important}.btn-row{display:none!important}}</style></head><body><div id="bp"><div class="header"><div><div class="logo"><span>SKYLINK</span><span>AIRLINES</span></div><div class="small">IATA CERTIFIED - EST. 2014 - OFFICIAL BOARDING PASS</div></div><div style="font-size:10px;font-weight:700">'+req.get('host')+'</div></div><div class="content"><div class="label">Passenger Name</div><div class="value big" style="margin-bottom:14px">'+b.name+'</div><div class="row"><div style="flex:1"><div class="label">From</div><div class="value">'+b.fromFull+'</div></div><div style="text-align:center"><img class="qr" src="'+qr+'"><div style="font-size:8px;font-weight:900;margin-top:6px">SCAN TO TRACK</div><div style="font-size:8px;font-weight:700">'+b.booking+'</div></div></div><div class="row"><div style="flex:1"><div class="label">To</div><div class="value">'+b.toFull+'</div></div></div><div class="row"><div><div class="label">Flight</div><div class="value">'+b.flight+'</div></div><div><div class="label">Date</div><div class="value">'+departDate.toLocaleDateString('en-GB')+'</div></div><div><div class="label">Seat</div><div class="value">'+b.seat+'</div></div></div><div class="row"><div><div class="label">Gate</div><div class="value">'+b.gate+'</div></div><div><div class="label">Terminal</div><div class="value">'+b.terminal+'</div></div><div><div class="label">Class</div><div class="value">'+b.class+'</div></div></div><div class="row"><div><div class="label">Baggage</div><div class="value">'+b.baggage+'</div></div><div><div class="label">Tracking Code</div><div class="value">'+b.tracking+'</div></div><div><div class="label">Status</div><div class="value">CONFIRMED</div></div></div><div class="divider"></div><div class="row"><div style="flex:1"><div class="label">Departure ('+b.from+' Local - '+b.fromTz+')</div><div class="value">'+departDate.toLocaleString('en-US',{timeZone:b.fromTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})+'</div></div></div><div class="row"><div style="flex:1"><div class="label">Arrival ('+b.to+' Local - '+b.toTz+')</div><div class="value">'+arriveDate.toLocaleString('en-US',{timeZone:b.toTz,weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true})+'</div></div></div><div class="track-box">Track live: <b>https://'+req.get('host')+'/track?code='+b.tracking+'</b> - Copy and track on Google/Chrome</div></div><div class="footer"><div>BOARDING PASS - OFFICIAL</div><div>'+b.name+' | '+b.flight+' | '+b.from+'-'+b.to+' | '+b.tracking+'</div></div></div><div class="btn-row"><button class="btn btn-dark" onclick="downloadPDF()">Print / Save PDF - Bright</button><button class="btn btn-light" onclick="location.href=\'/track?code='+b.tracking+'\'">Track Live</button><button class="btn btn-light" onclick="navigator.clipboard.writeText(\'https://'+req.get('host')+'/track?code='+b.tracking+'\'); alert(\'Copied!\')">Copy Link</button></div><script>function downloadPDF(){const el=document.getElementById("bp");html2canvas(el,{scale:3,useCORS:true,backgroundColor:"#ffffff"}).then(c=>{const img=c.toDataURL("image/png",1.0);const {jsPDF}=window.jspdf;const pdf=new jsPDF("p","mm","a4");const w=pdf.internal.pageSize.getWidth();const h=(c.height*w)/c.width;pdf.addImage(img,"PNG",8,8,w-16,h);pdf.save("Skylink-BoardingPass-'+b.tracking+'.pdf")})}<\/script><\/body><\/html>');
});

app.get('/track', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && dbConnected && BookingModel){const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject();}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<h2>Invalid tracking code</h2>');}
  const tzJson = JSON.stringify(IATA_TZ);
  const bookingJson = JSON.stringify(b);
  res.send('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flight '+b.tracking+'</title><style>body{margin:0;background:#f1f5f9;font-family:Inter,Arial;display:flex;justify-content:center;padding:12px}.card{width:100%;max-width:560px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.12);border:2px solid #000}.head{background:#000;color:#fff;padding:22px;text-align:center}.head h1{margin:0;font-size:22px;font-weight:900}.head p{margin:8px 0 0;font-size:12px;font-weight:800;opacity:.9}.body{padding:22px}.info{font-size:14px;line-height:1.8;font-weight:700}.info b{font-weight:900}.box{margin-top:18px;padding:18px;background:#f8fafc;border:2px solid #000;border-radius:14px}.label{font-size:11px;font-weight:900;color:#475569}.value{font-size:28px;font-weight:900;margin-top:6px;text-transform:uppercase}.progress{height:18px;background:#e2e8f0;border-radius:20px;overflow:hidden;margin-top:12px;border:1.5px solid #000}.bar{height:100%;background:#22c55e;width:0%;transition:width 1s}.big{background:#000;color:#fff;border-radius:14px;padding:22px;text-align:center;margin-top:18px}.time{font-size:42px;font-weight:900;margin-top:8px}.route{font-size:17px;font-weight:800;margin-top:12px;line-height:1.4}</style></head><body><div class="card"><div class="head"><h1>FLIGHT STATUS</h1><p>LIVE FROM '+b.from+' - '+b.fromTz+'</p></div><div class="body"><div class="info"><b>Booking:</b> '+b.booking+' | <b>Tracking:</b> <span style="background:#000;color:#fff;padding:3px 10px;border-radius:6px;font-size:16px">'+b.tracking+'</span><br><b>Passenger:</b> '+b.name+'<br><b>Flight:</b> '+b.flight+' | Seat '+b.seat+' | Gate '+b.gate+' | Terminal '+b.terminal+'<br><b>Route:</b> '+b.fromFull+' to '+b.toFull+'<br><b>Departure ('+b.from+' Local):</b> <span id="dep"></span><br><b>Arrival ('+b.to+' Local):</b> <span id="arr"></span></div><div class="box"><div class="label">CURRENT FLIGHT STATUS</div><div class="value" id="status">BOARDING</div><div class="progress"><div class="bar" id="bar"></div></div><div style="font-size:16px;font-weight:900;margin-top:10px" id="pct">0%</div><div style="font-size:13px;font-weight:700;margin-top:8px" id="elapsed"></div></div><div class="big"><div style="font-size:11px;font-weight:900;opacity:.7">LIVE TIME AT DEPARTURE CITY - '+b.from+'</div><div class="time" id="live-time">--:--:--</div><div class="route" id="live-route">Loading...</div><div style="font-size:11px;margin-top:12px;opacity:.6" id="utc"></div></div></div></div><script>const IATA_TZ='+tzJson+';const booking='+bookingJson+'; const fromTz=IATA_TZ[booking.from]||booking.fromTz||"UTC"; const toTz=IATA_TZ[booking.to]||booking.toTz||"UTC"; const departDate=new Date(booking.departISO),arriveDate=new Date(booking.arriveISO); document.getElementById("dep").innerText=departDate.toLocaleString("en-US",{timeZone:fromTz,weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})+" ("+fromTz+")"; document.getElementById("arr").innerText=arriveDate.toLocaleString("en-US",{timeZone:toTz,weekday:"short",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"})+" ("+toTz+")"; function update(){const now=new Date();const diff=departDate-now;const mins=Math.floor(diff/60000);const elapsedMins=Math.floor((now-departDate)/60000);let status="SCHEDULED",pct=5,msg="",elapsedText="";if(mins>120){status="SCHEDULED - NOT DEPARTED";pct=5;msg="Flight has not departed yet. Departing in "+Math.floor(mins/60)+"h "+(mins%60)+"m from "+booking.from;elapsedText="Scheduled: "+departDate.toLocaleString("en-US",{timeZone:fromTz})}else if(mins>60){status="CHECK-IN OPEN";pct=25;msg="Check-in OPEN at Terminal "+booking.terminal}else if(mins>30){status="BOARDING";pct=60;msg="Boarding NOW at Gate "+booking.gate+" - "+mins+" mins left"}else if(mins>0){status="FINAL BOARDING";pct=85;msg="Final Boarding - Gate "+booking.gate+" Closing in "+mins+" mins"}else if(mins>-60){status="DEPARTED - IN AIR";pct=90;msg="Departed from "+booking.from+" - In Air for "+Math.abs(elapsedMins)+"m";elapsedText="Flying for "+Math.abs(elapsedMins)+" mins"}else if(mins>-480){status="IN-FLIGHT";pct=95;let totalAir=Math.abs(elapsedMins);msg="In Flight to "+booking.to+" - Flying for "+Math.floor(totalAir/60)+"h "+(totalAir%60)+"m";elapsedText="Airborne: "+Math.floor(totalAir/60)+"h "+(totalAir%60)+"m"}else{status="ARRIVED";pct=100;msg="Arrived at "+booking.to;elapsedText="Flight completed"}document.getElementById("status").innerText=status;document.getElementById("bar").style.width=pct+"%";document.getElementById("pct").innerText=pct+"% completed";document.getElementById("elapsed").innerText=elapsedText;const fromTime=now.toLocaleString("en-US",{timeZone:fromTz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});const fromDate=now.toLocaleDateString("en-US",{timeZone:fromTz,weekday:"short",month:"short",day:"numeric",year:"numeric"});document.getElementById("live-time").innerText=fromTime;document.getElementById("live-route").innerHTML=msg+"<br><small style=\\"opacity:.8\\">Current time at "+booking.from+": "+fromDate+" "+fromTime+" ("+fromTz+")<br>Exact departure you booked: "+departDate.toLocaleString("en-US",{timeZone:fromTz})+"</small>";document.getElementById("utc").innerText="Local: "+now.toLocaleString()+" | UTC: "+now.toUTCString()} update(); setInterval(update,10000);<\/script><\/body><\/html>');
});

app.get('/health',(req,res)=> res.send('OK - '+bookings.size+' bookings'));
app.listen(PORT, ()=> console.log('SKYLINK FULL running on '+PORT));
