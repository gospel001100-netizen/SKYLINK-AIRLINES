// server.js - SKYLINK V9 + SERVICES + LOGISTICS REAL - FINAL CORRECTED + WORLD AIRPORTS + SIGNATURE
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
let QRCode = null; try{ QRCode = require('qrcode'); }catch(e){}
let mongoose = null; try{ mongoose = require('mongoose'); }catch(e){}
let DateTime = null; try{ DateTime = require('luxon').DateTime; }catch(e){}
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
        _id: String, booking: String, tracking: String, name: String, email: String, phone: String,
        receiver: String, receiverEmail: String, receiverAddress: String,
        from: String, fromFull: String, to: String, toFull: String,
        flight: String, gate: String, terminal: String, seat: String,
        class: String, departISO: String, arriveISO: String, durationMins: Number, distanceKm: Number, aircraft: String,
        fromTz: String, toTz: String, baggage: String, paystackRef: String, amount: Number, createdAt: String, type: String, desc: String, weight: String, _fixedV8: Boolean
      }, { _id: false, strict: false });
      BookingModel = mongoose.model('Booking', schema);
      const all = await BookingModel.find({});
      all.forEach(d=>{ bookings.set(d.tracking, d.toObject()); bookings.set(d.booking, d.toObject()); });
    }catch(e){}
  }
  try{ const raw = fs.readFileSync(DATA_FILE,'utf8'); const obj = JSON.parse(raw||'{}'); Object.keys(obj).forEach(k=> bookings.set(k, obj[k])); }catch(e){}
  try{ bookings.forEach(b => { if(b && b.departISO &&!b._fixedV8) migrateOldBookingToReal(b); }); }catch(e){}
}
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
  // SYRIA AIRPORTS - ADDED FULL
  {code:"DAM", city:"Damascus", country:"Syria", name:"Damascus Intl", tz:"Asia/Damascus", lat:33.411, lon:36.515},
  {code:"ALP", city:"Aleppo", country:"Syria", name:"Aleppo Intl", tz:"Asia/Damascus", lat:36.180, lon:37.224},
  {code:"LTK", city:"Latakia", country:"Syria", name:"Bassel Al-Assad Intl", tz:"Asia/Damascus", lat:35.401, lon:35.948},
  {code:"DEZ", city:"Deir Ez-Zor", country:"Syria", name:"Deir Ez-Zor Airport", tz:"Asia/Damascus", lat:35.285, lon:40.175},
  {code:"KAC", city:"Qamishli", country:"Syria", name:"Kamishly Airport", tz:"Asia/Damascus", lat:37.020, lon:41.191},
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
  {code:"DUR", city:"Durban", country:"South Africa", name:"King Shaka", tz:"Africa/Johannesburg", lat:-29.614, lon:31.119},
  {code:"LHR", city:"London", country:"UK", name:"Heathrow", tz:"Europe/London", lat:51.47, lon:-0.454},
  {code:"LGW", city:"London", country:"UK", name:"Gatwick", tz:"Europe/London", lat:51.148, lon:-0.190},
  {code:"MAN", city:"Manchester", country:"UK", name:"Manchester", tz:"Europe/London", lat:53.353, lon:-2.274},
  {code:"STN", city:"London", country:"UK", name:"Stansted", tz:"Europe/London", lat:51.885, lon:0.235},
  {code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris", lat:49.012, lon:2.55},
  {code:"ORY", city:"Paris", country:"France", name:"Orly", tz:"Europe/Paris", lat:48.725, lon:2.359},
  {code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin", lat:50.037, lon:8.562},
  {code:"MUC", city:"Munich", country:"Germany", name:"Munich", tz:"Europe/Berlin", lat:48.353, lon:11.786},
  {code:"BER", city:"Berlin", country:"Germany", name:"Brandenburg", tz:"Europe/Berlin", lat:52.362, lon:13.5},
  {code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam", lat:52.308, lon:4.763},
  {code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome", lat:41.8, lon:12.238},
  {code:"MXP", city:"Milan", country:"Italy", name:"Malpensa", tz:"Europe/Rome", lat:45.63, lon:8.723},
  {code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid", lat:40.489, lon:-3.592},
  {code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat", tz:"Europe/Madrid", lat:41.297, lon:2.083},
  {code:"LIS", city:"Lisbon", country:"Portugal", name:"Lisbon", tz:"Europe/Lisbon", lat:38.774, lon:-9.134},
  {code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul", lat:41.275, lon:28.751},
  {code:"SAW", city:"Istanbul", country:"Turkey", name:"Sabiha Gokcen", tz:"Europe/Istanbul", lat:40.898, lon:29.309},
  {code:"ATH", city:"Athens", country:"Greece", name:"Eleftherios Venizelos", tz:"Europe/Athens", lat:37.936, lon:23.944},
  {code:"VIE", city:"Vienna", country:"Austria", name:"Vienna Intl", tz:"Europe/Vienna", lat:48.110, lon:16.569},
  {code:"ZRH", city:"Zurich", country:"Switzerland", name:"Zurich", tz:"Europe/Zurich", lat:47.458, lon:8.555},
  {code:"BRU", city:"Brussels", country:"Belgium", name:"Brussels", tz:"Europe/Brussels", lat:50.901, lon:4.484},
  {code:"CPH", city:"Copenhagen", country:"Denmark", name:"Kastrup", tz:"Europe/Copenhagen", lat:55.618, lon:12.656},
  {code:"ARN", city:"Stockholm", country:"Sweden", name:"Arlanda", tz:"Europe/Stockholm", lat:59.651, lon:17.918},
  {code:"OSL", city:"Oslo", country:"Norway", name:"Gardermoen", tz:"Europe/Oslo", lat:60.193, lon:11.1},
  {code:"WAW", city:"Warsaw", country:"Poland", name:"Chopin", tz:"Europe/Warsaw", lat:52.165, lon:20.967},
  {code:"PRG", city:"Prague", country:"Czech Republic", name:"Vaclav Havel", tz:"Europe/Prague", lat:50.100, lon:14.26},
  {code:"JFK", city:"New York", country:"USA", name:"JFK", tz:"America/New_York", lat:40.641, lon:-73.778},
  {code:"LGA", city:"New York", country:"USA", name:"LaGuardia", tz:"America/New_York", lat:40.776, lon:-73.874},
  {code:"LAX", city:"Los Angeles", country:"USA", name:"LAX", tz:"America/Los_Angeles", lat:33.941, lon:-118.408},
  {code:"SFO", city:"San Francisco", country:"USA", name:"SFO", tz:"America/Los_Angeles", lat:37.618, lon:-122.375},
  {code:"ORD", city:"Chicago", country:"USA", name:"O'Hare", tz:"America/Chicago", lat:41.974, lon:-87.907},
  {code:"MIA", city:"Miami", country:"USA", name:"Miami Intl", tz:"America/New_York", lat:25.793, lon:-80.290},
  {code:"ATL", city:"Atlanta", country:"USA", name:"Hartsfield", tz:"America/New_York", lat:33.64, lon:-84.427},
  {code:"DFW", city:"Dallas", country:"USA", name:"DFW", tz:"America/Chicago", lat:32.896, lon:-97.038},
  {code:"IAH", city:"Houston", country:"USA", name:"Bush Intercontinental", tz:"America/Chicago", lat:29.984, lon:-95.341},
  {code:"SEA", city:"Seattle", country:"USA", name:"Seattle-Tacoma", tz:"America/Los_Angeles", lat:47.449, lon:-122.309},
  {code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto", lat:43.677, lon:-79.624},
  {code:"YVR", city:"Vancouver", country:"Canada", name:"Vancouver Intl", tz:"America/Vancouver", lat:49.193, lon:-123.183},
  {code:"MEX", city:"Mexico City", country:"Mexico", name:"Benito Juarez", tz:"America/Mexico_City", lat:19.436, lon:-99.071},
  {code:"GRU", city:"Sao Paulo", country:"Brazil", name:"Guarulhos", tz:"America/Sao_Paulo", lat:-23.435, lon:-46.473},
  {code:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ezeiza", tz:"America/Argentina/Buenos_Aires", lat:-34.822, lon:-58.535},
  {code:"BOG", city:"Bogota", country:"Colombia", name:"El Dorado", tz:"America/Bogota", lat:4.701, lon:-74.146},
  {code:"LIM", city:"Lima", country:"Peru", name:"Jorge Chavez", tz:"America/Lima", lat:-12.021, lon:-77.114},
  {code:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino", tz:"America/Santiago", lat:-33.392, lon:-70.785},
  {code:"BOM", city:"Mumbai", country:"India", name:"Mumbai", tz:"Asia/Kolkata", lat:19.088, lon:72.867},
  {code:"DEL", city:"Delhi", country:"India", name:"Delhi", tz:"Asia/Kolkata", lat:28.556, lon:77.100},
  {code:"BLR", city:"Bangalore", country:"India", name:"Kempegowda", tz:"Asia/Kolkata", lat:13.197, lon:77.706},
  {code:"HYD", city:"Hyderabad", country:"India", name:"Rajiv Gandhi", tz:"Asia/Kolkata", lat:17.24, lon:78.429},
  {code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl", tz:"Asia/Karachi", lat:24.906, lon:67.16},
  {code:"LHE", city:"Lahore", country:"Pakistan", name:"Allama Iqbal", tz:"Asia/Karachi", lat:31.521, lon:74.403},
  {code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Hazrat Shahjalal", tz:"Asia/Dhaka", lat:23.843, lon:90.397},
  {code:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike", tz:"Asia/Colombo", lat:7.180, lon:79.884},
  {code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore", lat:1.364, lon:103.991},
  {code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA", tz:"Asia/Kuala_Lumpur", lat:2.745, lon:101.709},
  {code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok", lat:13.681, lon:100.747},
  {code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta", lat:-6.125, lon:106.655},
  {code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila", lat:14.508, lon:121.019},
  {code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo", lat:35.764, lon:140.386},
  {code:"HND", city:"Tokyo", country:"Japan", name:"Haneda", tz:"Asia/Tokyo", lat:35.549, lon:139.779},
  {code:"KIX", city:"Osaka", country:"Japan", name:"Kansai", tz:"Asia/Tokyo", lat:34.434, lon:135.244},
  {code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul", lat:37.460, lon:126.44},
  {code:"PEK", city:"Beijing", country:"China", name:"Capital", tz:"Asia/Shanghai", lat:40.08, lon:116.584},
  {code:"PVG", city:"Shanghai", country:"China", name:"Pudong", tz:"Asia/Shanghai", lat:31.143, lon:121.805},
  {code:"CAN", city:"Guangzhou", country:"China", name:"Baiyun", tz:"Asia/Shanghai", lat:23.392, lon:113.298},
  {code:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong Intl", tz:"Asia/Hong_Kong", lat:22.308, lon:113.918},
  {code:"TPE", city:"Taipei", country:"Taiwan", name:"Taoyuan", tz:"Asia/Taipei", lat:25.077, lon:121.232},
  {code:"SYD", city:"Sydney", country:"Australia", name:"Sydney", tz:"Australia/Sydney", lat:-33.939, lon:151.175},
  {code:"MEL", city:"Melbourne", country:"Australia", name:"Melbourne", tz:"Australia/Melbourne", lat:-37.673, lon:144.843},
  {code:"BNE", city:"Brisbane", country:"Australia", name:"Brisbane", tz:"Australia/Brisbane", lat:-27.384, lon:153.117},
  {code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland Intl", tz:"Pacific/Auckland", lat:-37.008, lon:174.791},
  {code:"CMN", city:"Casablanca", country:"Morocco", name:"Mohammed V", tz:"Africa/Casablanca", lat:33.367, lon:-7.589},
  {code:"TUN", city:"Tunis", country:"Tunisia", name:"Carthage", tz:"Africa/Tunis", lat:36.851, lon:10.227},
  {code:"ALG", city:"Algiers", country:"Algeria", name:"Houari Boumediene", tz:"Africa/Algiers", lat:36.691, lon:3.215},
  {code:"KRT", city:"Khartoum", country:"Sudan", name:"Khartoum Intl", tz:"Africa/Khartoum", lat:15.589, lon:32.553},
  {code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz", tz:"Asia/Riyadh", lat:21.681, lon:39.155},
];
function haversine(lat1, lon1, lat2, lon2){ const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
function getFlightDetails(from, to){
  const f=findAirport(from), t=findAirport(to);
  if(!f.lat ||!t.lat || f.lat===0 || t.lat===0) return {durationMins:7*60, distanceKm:5500, aircraft:"Boeing 787-9 Dreamliner"};
  const dist=haversine(f.lat,f.lon,t.lat,t.lon);
  const hours=dist/850 + 0.8;
  const durationMins=Math.max(60, Math.round(hours*60));
  let aircraft="Boeing 737-800";
  if(dist<1000) aircraft="ATR 72-600";
  else if(dist<2500) aircraft="Boeing 737-800";
  else if(dist<5000) aircraft="Boeing 737 MAX 8";
  else if(dist<8000) aircraft="Airbus A330-300";
  else aircraft="Boeing 787-9 Dreamliner";
  return {durationMins, distanceKm:Math.round(dist), aircraft};
}
function genCode(p){return p+'-'+Math.random().toString(36).substring(2,7).toUpperCase()}
function findAirport(c){return AIRPORTS.find(a=>a.code===c.toUpperCase())||{code:c.toUpperCase(), city:c, country:"", name:"Intl", tz:"UTC", lat:0, lon:0}}
function isAuthenticated(req){ const cookie = req.headers.cookie || ''; return cookie.includes('admin_auth=Skylink1824'); }
function wallTimeToUTC(wallStr, tz){
  if(DateTime){ const dt = DateTime.fromISO(wallStr, { zone: tz }); if(dt.isValid) return dt.toUTC().toJSDate(); }
  return new Date(wallStr);
}
function formatRealInTz(isoStr, tz){
  try{ return new Date(isoStr).toLocaleString('en-US',{ timeZone: tz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' ('+tz+')'; }
  catch(e){ return new Date(isoStr).toLocaleString('en-US',{month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' ('+tz+')'; }
}
function isOldBugBooking(b){ if(!b ||!b.departISO ||!b.fromTz) return false; if(b._fixedV8) return false; return true; }
function migrateOldBookingToReal(b){
  if(!isOldBugBooking(b)) return b;
  try{
    const wrongDate = new Date(b.departISO);
    const yyyy = wrongDate.getUTCFullYear(); const mm = String(wrongDate.getUTCMonth()+1).padStart(2,'0'); const dd = String(wrongDate.getUTCDate()).padStart(2,'0'); const hh = String(wrongDate.getUTCHours()).padStart(2,'0'); const mi = String(wrongDate.getUTCMinutes()).padStart(2,'0');
    const wallStr = `${yyyy}-${mm}-${dd}T${hh}:${mi}`; const realDepart = wallTimeToUTC(wallStr, b.fromTz); const durationMs = (b.durationMins || 0) * 60000 || (new Date(b.arriveISO).getTime() - new Date(b.departISO).getTime()); const realArrive = new Date(realDepart.getTime() + durationMs);
    b.departISO = realDepart.toISOString(); b.arriveISO = realArrive.toISOString(); b._fixedV8 = true; savePerm(b.tracking, b);
  }catch(e){} return b;
}
// SIGNATURE GENERATOR - DIFFERENT FOR EVERY BOOKING
function generateSenderSignature(name, tracking){
  const seed = (tracking+name).split('').reduce((a,c)=>a+c.charCodeAt(0),0);
  const fonts = ["'Brush Script MT', cursive", "'Segoe Script', cursive", "'Lucida Handwriting', cursive"];
  const font = fonts[seed % fonts.length];
  const rotate = (seed % 7) - 3; // -3 to 3 deg
  const skew = (seed % 5);
  const cleanName = name.split(' ').map(n=>n.charAt(0).toUpperCase()+n.slice(1).toLowerCase()).join(' ');
  return `<div style="font-family:${font};font-size:32px;transform:rotate(${rotate}deg) skewX(-${skew}deg);color:#0f172a;line-height:1;font-weight:400;letter-spacing:0.5px;text-shadow:0 0 0.5px #000">${cleanName}</div><div style="font-family:${font};font-size:12px;color:#64748b;margin-top:2px;transform:rotate(${rotate}deg)">✍︎ ${cleanName.split(' ').map(n=>n[0]).join('.')}. - ${tracking}</div>`;
}
initDB();

app.get('/skylink-admin-login', (req,res)=>{ res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0f2e6d;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial}.card{background:#fff;padding:30px;border-radius:16px;width:100%;max-width:360px;box-shadow:0 10px 40px rgba(0,0,0,.3)}input{width:100%;padding:13px;border-radius:10px;border:1.5px solid #e2e8f0;margin-top:12px;box-sizing:border-box;font-size:14px}button{width:100%;background:#0f2e6d;color:#fff;padding:13px;border-radius:10px;border:none;font-weight:900;margin-top:14px;cursor:pointer}</style></head><body><div class="card"><div style="text-align:center;font-weight:900;font-size:20px">✈️ SKYLINK ADMIN</div><div style="text-align:center;font-size:11px;color:#64748b;margin-top:6px;letter-spacing:1px">ADMIN LOGIN ONLY</div><form method="POST" action="/api/admin-login"><input type="password" name="password" placeholder="Enter admin password" required><button type="submit">Login →</button></form></div></body></html>`);});
app.post('/api/admin-login', (req,res)=>{ const pass = req.body.password || ''; if(pass === ADMIN_PASSWORD){ res.setHeader('Set-Cookie', 'admin_auth=Skylink1824; Path=/; Max-Age=86400; HttpOnly'); res.redirect('/skylink-admin-gospel-2024'); } else { res.send('<script>alert("Wrong password"); location.href="/skylink-admin-login"</script>'); } });
app.get('/skylink-admin-logout', (req,res)=>{ res.setHeader('Set-Cookie', 'admin_auth=; Path=/; Max-Age=0'); res.redirect('/skylink-admin-login'); });

app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK SERVICES</title><style>body{margin:0;font-family:Inter,Arial;background:#f1f5f9;display:flex;justify-content:center;padding:12px}.card{max-width:540px;width:100%;background:#fff;border-radius:20px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08);border:1px solid #e2e8f0;margin-top:12px}.pill{background:#0f2e6d;color:#fff;padding:14px 26px;border-radius:30px;font-weight:900;font-size:17px;display:flex;align-items:center;gap:8px;justify-content:center}.pill span:last-child{color:#FACC15}.opt{border:2px solid #e2e8f0;border-radius:14px;padding:18px;margin-top:14px;cursor:pointer;display:flex;gap:14px;align-items:center}.opt:hover{border-color:#0f2e6d;background:#f8fafc}.icon{font-size:30px}.t{font-weight:900;font-size:15px}.d{font-size:12px;color:#64748b;margin-top:2px}</style></head><body><div class="card">
  <div class="pill">✈️ SKYLINK <span>AIRLINES</span></div>
  <div style="text-align:center;margin-top:10px;font-weight:800;font-size:13px;color:#334155;letter-spacing:1px">SELECT SERVICE</div>
  <div class="opt" onclick="location.href='/flights'"><div class="icon">✈️</div><div><div class="t">Flight Booking</div><div class="d">Book international flights</div></div></div>
  <div class="opt" onclick="location.href='/logistics'"><div class="icon">📦</div><div><div class="t">Logistics</div><div class="d">Ship cargo worldwide</div></div></div>
  </div></body></html>`);
});

app.get('/flights', (req,res)=>{
  const aj = JSON.stringify(AIRPORTS);
  const pk = process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73';
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>SKYLINK AIRLINES</title><script src="https://js.paystack.co/v1/inline.js"><\/script><style>
*{box-sizing:border-box} html{font-size:16px}
body{margin:0;font-family:Inter,Arial;background:#f1f5f9;padding:0;display:block}
.wrapper{width:100%;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:12px}
.card{width:100%;max-width:540px;background:#fff;border-radius:20px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08);border:1px solid #e2e8f0;margin-top:10px}
.header{display:flex;justify-content:center;margin-bottom:8px}
.pill{background:#0f2e6d;color:#fff;padding:14px 26px;border-radius:30px;font-weight:900;font-size:17px;display:flex;align-items:center;gap:8px}
.pill span:last-child{color:#FACC15}
.sub{font-size:11px;font-weight:800;color:#64748b;text-align:center;margin-bottom:18px;letter-spacing:0.8px}
label{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;margin-top:16px;margin-bottom:6px;color:#0f172a}
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
<label>Email *</label><input id="email" type="email" required placeholder="" autocomplete="off">
<label>From *</label><div class="rel"><input id="from" autocomplete="off" oninput="autoSuggest('from')" placeholder="JFK - New York, USA" required><div id="from-suggest" class="suggest"></div></div>
<label>To *</label><div class="rel"><input id="to" autocomplete="off" oninput="autoSuggest('to')" placeholder="LHR - London, UK" required><div id="to-suggest" class="suggest"></div></div>
<label>Departure Date & Time *</label><input type="datetime-local" id="depart" required>
<button class="btn-main" type="submit">Continue →</button>
</form>
<div class="track-row"><input id="trk" placeholder="TRK-XXXXXXX" style="flex:1;background:#fff;padding:14px;border-radius:10px;border:1.5px solid #e2e8f0"><button class="btn-track" onclick="if(document.getElementById('trk').value) location.href='/track?code='+document.getElementById('trk').value">Track</button></div>
<div style="margin-top:10px;text-align:center"><a href="/" style="font-size:11px;color:#64748b;text-decoration:none">← Back to Services</a></div>
</div>
<div id="step2">
<div class="summary" id="summary"></div>
<div class="warning">WARNING!!! Transfer this exact amount: <b>NGN 2,150</b> - Do not pay more or less to avoid booking failure.</div>
<button class="btn-main" id="payBtn" onclick="payWithPaystack(2150,'flight')">Pay NGN 2,150 & Generate Boarding Pass</button>
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
  pendingPayload={name,email,from,to,depart,class:"ECONOMY",type:"flight"};
  document.getElementById("summary").innerHTML="<b>Passenger:</b> "+name+"<br><b>Route:</b> "+from+" → "+to+"<br><b>Departure:</b> "+new Date(depart).toLocaleString()+"<br><b>Amount:</b> NGN 2,150";
  document.getElementById("step1").style.display="none";
  document.getElementById("step2").style.display="block";
}
function backToForm(){document.getElementById("step2").style.display="none";document.getElementById("step1").style.display="block";}
function payWithPaystack(amount,type){
  var btn=document.getElementById("payBtn");
  if(typeof PaystackPop === 'undefined'){ alert("Paystack not loaded"); btn.disabled=false; return; }
  btn.innerText="Processing Payment..."; btn.disabled=true;
  try{
    var handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: pendingPayload.email,
      amount: amount * 100,
      currency: "NGN",
      ref: "SKY-" + Math.floor(Math.random()*1000000000),
      onClose: function(){ btn.innerText="Pay NGN "+amount+" & Generate Boarding Pass"; btn.disabled=false; },
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

app.get('/logistics', (req,res)=>{
  const aj = JSON.stringify(AIRPORTS);
  const pk = process.env.PAYSTACK_PUBLIC_KEY || 'pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73';
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><title>SKYLINK LOGISTICS</title><script src="https://js.paystack.co/v1/inline.js"><\/script><style>
*{box-sizing:border-box} html{font-size:16px}
body{margin:0;font-family:Inter,Arial;background:#f1f5f9;padding:0;display:block}
.wrapper{width:100%;min-height:100vh;display:flex;justify-content:center;align-items:flex-start;padding:12px}
.card{width:100%;max-width:560px;background:#fff;border-radius:20px;padding:24px;box-shadow:0 8px 30px rgba(0,0,0,.08);border:1px solid #e2e8f0;margin-top:10px}
.header{display:flex;justify-content:center;margin-bottom:8px}
.pill{background:#0f2e6d;color:#fff;padding:14px 26px;border-radius:30px;font-weight:900;font-size:17px;display:flex;align-items:center;gap:8px}
.pill span:last-child{color:#FACC15}
.sub{font-size:11px;font-weight:800;color:#64748b;text-align:center;margin-bottom:18px;letter-spacing:0.8px}
label{font-size:13px;font-weight:800;display:flex;align-items:center;gap:6px;margin-top:16px;margin-bottom:6px;color:#0f172a}
input{width:100%;padding:14px 16px;border-radius:12px;border:1.5px solid #e2e8f0;font-size:15px;font-weight:600;background:#f8fafc;color:#000;outline:none}
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
.sec{font-size:12px;font-weight:900;color:#0f2e6d;margin-top:20px;background:#dbeafe;padding:6px 10px;border-radius:8px}
</style></head><body><div class="wrapper"><div class="card">
<div class="header"><div class="pill">📦 SKYLINK <span>LOGISTICS</span></div></div>
<div class="sub">OFFICIAL LOGISTICS PORTAL</div>
<div id="step1">
<form onsubmit="goToPayment(event)">
<div class="sec">SENDER DETAILS</div>
<label>Sender Full Name *</label><input id="pname" required placeholder="Sender full name" autocomplete="off">
<label>Sender Phone Number *</label><input id="phone" required placeholder="e.g. +234 801 234 5678" autocomplete="off">
<label>Sender Email *</label><input id="email" type="email" required placeholder="" autocomplete="off">
<div class="sec">RECEIVER DETAILS</div>
<label>Receiver Full Name *</label><input id="receiver" required placeholder="Receiver full name" autocomplete="off">
<label>Receiver Email *</label><input id="receiverEmail" required placeholder="Receiver email address" type="email">
<label>Receiver House Address *</label><input id="receiverAddress" required placeholder="Street, City, State, Country">
<div class="sec">SHIPMENT DETAILS</div>
<label>From *</label><div class="rel"><input id="from" autocomplete="off" oninput="autoSuggest('from')" placeholder="JFK - New York, USA" required><div id="from-suggest" class="suggest"></div></div>
<label>To *</label><div class="rel"><input id="to" autocomplete="off" oninput="autoSuggest('to')" placeholder="LHR - London, UK" required><div id="to-suggest" class="suggest"></div></div>
<label>Departure Date & Time *</label><input type="datetime-local" id="depart" required>
<label>Package Description *</label><input id="desc" required placeholder="What do you want to deliver? e.g. Documents, Clothes">
<label>Package Weight (KG) *</label><input id="weight" required placeholder="Enter package weight e.g. 5kg">
<button class="btn-main" type="submit">Continue →</button>
</form>
<div style="margin-top:10px;text-align:center"><a href="/" style="font-size:11px;color:#64748b;text-decoration:none">← Back to Services</a></div>
</div>
<div id="step2">
<div class="summary" id="summary"></div>
<div class="warning">WARNING!!! Transfer this exact amount: <b>NGN 3,000</b> - Do not pay more or less to avoid shipment failure.</div>
<button class="btn-main" id="payBtn" onclick="payWithPaystack()">Pay NGN 3,000 & Generate Shipment Receipt</button>
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
  const phone=document.getElementById("phone").value.trim();
  const email=document.getElementById("email").value.trim();
  const receiver=document.getElementById("receiver").value.trim();
  const receiverEmail=document.getElementById("receiverEmail").value.trim();
  const receiverAddress=document.getElementById("receiverAddress").value.trim();
  const from=document.getElementById("from").dataset.code||document.getElementById("from").value.split(" ")[0].toUpperCase();
  const to=document.getElementById("to").dataset.code||document.getElementById("to").value.split(" ")[0].toUpperCase();
  const depart=document.getElementById("depart").value;
  const desc=document.getElementById("desc").value.trim();
  const weight=document.getElementById("weight").value.trim();
  if(!name||!phone||!email||!receiver||!receiverEmail||!receiverAddress||!from||!to||!depart||!desc||!weight){alert("Fill all required fields");return}
  pendingPayload={name,phone,email,receiver,receiverEmail,receiverAddress,from,to,depart,desc,weight,class:"CARGO",type:"logistics"};
  document.getElementById("summary").innerHTML="<b>Sender:</b> "+name+" ("+phone+")<br><b>Receiver:</b> "+receiver+"<br><b>Address:</b> "+receiverAddress+"<br><b>Route:</b> "+from+" → "+to+"<br><b>Package:</b> "+desc+" - "+weight+"<br><b>Departure:</b> "+new Date(depart).toLocaleString()+"<br><b>Amount:</b> NGN 3,000";
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
      amount: 3000 * 100,
      currency: "NGN",
      ref: "LOG-" + Math.floor(Math.random()*1000000000),
      onClose: function(){ btn.innerText="Pay NGN 3,000 & Generate Shipment Receipt"; btn.disabled=false; },
      callback: function(response){
        btn.innerText="Payment successful! Generating receipt...";
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
  const {name,email,from,to,depart,class:cls,paystackRef,receiver,receiverEmail,receiverAddress,desc,weight,phone,type}=req.body;
  if(!paystackRef){ return res.status(400).json({error:'Payment required'}); }
  const tracking='TRK-'+Math.random().toString(36).substring(2,8).toUpperCase();
  const booking=genCode(type==='logistics'?'LOG':'SKY');
  const flight= type==='logistics'? 'CARGO-'+Math.floor(100+Math.random()*899) : 'SKY-'+Math.floor(100+Math.random()*899);
  const gate='G'+Math.floor(10+Math.random()*90);
  const terminal='T'+Math.floor(1+Math.random()*3);
  const seat=Math.floor(10+Math.random()*30)+['A','B','C','D','E','F'][Math.floor(Math.random()*6)];
  const fromA=findAirport(from),toA=findAirport(to);
  const departDate=depart? wallTimeToUTC(depart, fromA.tz) : new Date(Date.now()+7200000);
  const details=getFlightDetails(fromA.code,toA.code);
  const arriveDate=new Date(departDate.getTime()+details.durationMins*60000);
  const rec={booking,tracking,name:name.toUpperCase(),phone:phone||'',receiver:(receiver||'').toUpperCase(),receiverEmail:receiverEmail||'',receiverAddress:receiverAddress||'',desc:desc||'',weight:weight||'',email:email||"",from:fromA.code,fromFull:fromA.code+' - '+fromA.city+', '+fromA.country+' ('+fromA.name+')',to:toA.code,toFull:toA.code+' - '+toA.city+', '+toA.country+' ('+toA.name+')',flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:arriveDate.toISOString(),durationMins:details.durationMins,distanceKm:details.distanceKm,aircraft: type==='logistics'? 'Boeing 747-400F Cargo' : details.aircraft,fromTz:fromA.tz,toTz:toA.tz,baggage: type==='logistics'? (weight||'CARGO') : '23KG',paystackRef,amount: type==='logistics'?3000:2150,type:type||'flight',createdAt:new Date().toISOString(), _fixedV8: true};
  await savePerm(tracking, rec);
  res.json({boardingUrl:'/boarding-pass?code='+tracking});
});
app.get('/skylink-admin-gospel-2024', async (req,res)=>{
  if(!isAuthenticated(req)){ return res.redirect('/skylink-admin-login'); }
  let all=[];const seen=new Set();
  if(BookingModel){ try{ const docs=await BookingModel.find({}).sort({createdAt:-1}); docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} }); }catch(e){} }
  try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  const totalFlight = all.filter(b=>b.type!=='logistics').length * 2150;
  const totalLog = all.filter(b=>b.type==='logistics').length * 3000;
  const total = totalFlight + totalLog;
  const today = all.filter(b=> b.createdAt && new Date(b.createdAt).toDateString() === new Date().toDateString()).length;
  let rows = all.map(b=>`<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:14px;font-weight:800;color:#0f2e6d">${b.booking}</td><td style="padding:14px"><span style="background:${b.type==='logistics'?'#fef3c7':'#e0f2fe'};color:${b.type==='logistics'?'#92400e':'#0c4a6e'};padding:4px 10px;border-radius:20px;font-weight:800;font-size:11px">${b.tracking} ${b.type==='logistics'?'📦':''}</span></td><td style="padding:14px;font-weight:700">${b.name} ${b.receiver?'<br><span style="font-size:10px;color:#64748b">→ '+b.receiver+'</span>':''}</td><td style="padding:14px;font-weight:700">${b.from} → ${b.to} <br><span style="font-size:10px;color:#16a34a">${b.durationMins? Math.floor(b.durationMins/60)+'h '+(b.durationMins%60)+'m':''} | ${b.distanceKm? b.distanceKm+'km':''}</span></td><td style="padding:14px;font-weight:900;color:#16a34a">NGN ${b.amount||2150}</td><td style="padding:14px;font-size:11px">${b.paystackRef||''}</td><td style="padding:14px;font-size:11px">${b.createdAt? new Date(b.createdAt).toLocaleString():''}</td><td style="padding:14px"><a href="/boarding-pass?code=${b.tracking}" style="background:#0f2e6d;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:11px;font-weight:800">View Pass</a></td></tr>`).join('');
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK Admin</title><style>body{margin:0;font-family:Inter,Arial;background:#f1f5f9}.header{background:#0f2e6d;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.card{max-width:1200px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);overflow:hidden;border:1px solid #e2e8f0}.stats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;padding:20px}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}.stat h3{margin:0;font-size:11px;color:#64748b}.stat p{margin:6px 0 0;font-size:22px;font-weight:900}.table-wrap{overflow:auto} table{width:100%;border-collapse:collapse;min-width:900px} th{background:#f8fafc;text-align:left;padding:12px 14px;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0} a.logout{background:#ef4444;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px}</style></head><body><div class="header"><div><div style="font-weight:900;font-size:20px">✈️ SKYLINK AIRLINES - ADMIN</div><div style="font-size:11px;opacity:0.8">Real Money Dashboard</div></div><div><a class="logout" href="/skylink-admin-logout">Logout</a></div></div><div class="card"><div class="stats"><div class="stat"><h3>TOTAL BOOKINGS</h3><p>${all.length}</p></div><div class="stat"><h3>TOTAL REVENUE</h3><p style="color:#16a34a">NGN ${total.toLocaleString()}</p></div><div class="stat"><h3>FLIGHT 2150</h3><p>NGN ${totalFlight.toLocaleString()}</p></div><div class="stat"><h3>LOGISTICS 3000</h3><p>NGN ${totalLog.toLocaleString()}</p></div></div><div style="padding:0 20px 10px;font-weight:900">All Bookings - ${today} Today</div><div class="table-wrap"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>AMOUNT</th><th>PAYSTACK REF</th><th>DATE</th><th>ACTION</th></tr>${rows || '<tr><td colspan=8 style="padding:40px;text-align:center;color:#94a3b8">No bookings yet</td></tr>'}</table></div></div></body></html>`);
});

app.get('/boarding-pass', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<h2 style="font-family:Arial;text-align:center;margin-top:50px">Boarding Pass Not Found</h2>');}
  b = migrateOldBookingToReal(b);
  let qr=''; if(QRCode){ try{ qr=await QRCode.toDataURL('https://'+req.get('host')+'/track?code='+b.tracking); }catch(e){} }
  const host = req.get('host');
  const trackLink = 'https://'+host+'/track?code='+b.tracking;
  const durH = b.durationMins? Math.floor(b.durationMins/60) : 8;
  const durM = b.durationMins? b.durationMins%60 : 0;
  const departStr = formatRealInTz(b.departISO, b.fromTz);
  const arriveStr = formatRealInTz(b.arriveISO, b.toTz);
  const realDetailsBP = getFlightDetails(b.from, b.to);
  const aircraft = b.aircraft || realDetailsBP.aircraft;
  const distance = (b.distanceKm || realDetailsBP.distanceKm) + " km";
  const isLog = b.type==='logistics';
  const qrHtml = qr? '<img src="' + qr + '">' : '<div style="width:180px;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center">QR</div>';
  const senderSig = isLog? generateSenderSignature(b.name, b.tracking) : '';

  if(isLog){
    // === LOGISTICS OFFICIAL RECEIPT - LIKE PHOTO RIGHT SIDE + SIGNATURES ===
    return res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Shipment ${b.booking}</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><style>
*{box-sizing:border-box}body{margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;display:flex;flex-direction:column;align-items:center;padding:12px}
.receipt-outer{width:100%;max-width:760px;background:#fff;border-radius:4px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.15);border:1px solid #cbd5e1}
.header{background:#0f2e6d;color:#fff;padding:18px 20px;display:flex;justify-content:space-between;align-items:center}
.header h1{margin:0;font-size:22px;font-weight:900;letter-spacing:0.5px}
.header h1 span{color:#facc15}
.header-right{font-size:22px}
.sub-header{background:#1e3a8a;color:#fff;text-align:center;padding:8px;font-weight:900;font-size:13px;letter-spacing:1px}
.body{padding:18px 20px;background:#fff}
.tracking-code{font-size:18px;font-weight:900;color:#0f2e6d;border-bottom:2px solid #0f2e6d;padding-bottom:8px;margin-bottom:14px}
.section-title{font-size:14px;font-weight:900;color:#0f2e6d;margin-top:16px;margin-bottom:6px;text-transform:uppercase}
.line{font-size:13px;margin:3px 0;line-height:1.4}
.label{font-weight:800;color:#334155}.value{font-weight:600;color:#000}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;border:1px solid #e2e8f0;border-radius:8px;padding:10px;background:#f8fafc}
.barcode-area{display:flex;justify-content:space-between;align-items:center;margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px;gap:10px;flex-wrap:wrap}
.qr-box{border:1px solid #cbd5e1;border-radius:8px;padding:8px;text-align:center}
.qr-box img{width:130px;height:130px}
.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:18px;border-top:2px solid #0f2e6d;padding-top:14px}
.sig-box{border:1px solid #e2e8f0;border-radius:8px;padding:12px;min-height:90px}
.sig-label{font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;margin-bottom:8px}
.footer{background:#0f2e6d;color:#cbd5e1;padding:8px 12px;font-size:8px;text-align:center}
.btn-area{display:flex;gap:8px;margin-top:14px;justify-content:center;flex-wrap:wrap}
.btn-dl{background:#16a34a;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer}
.btn-tr{background:#0f2e6d;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer}
.btn-cp{background:#fff;color:#0f2e6d;border:1.5px solid #0f2e6d;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer}
</style></head><body>
<div class="receipt-outer" id="ticketCapture">
<div class="header"><h1>SKYLINK LOGISTICS</h1><div class="header-right">✈️🌐</div></div>
<div class="sub-header">OFFICIAL SHIPMENT RECEIPT</div>
<div class="body">
<div class="tracking-code">TRACKING CODE: ${b.tracking}</div>

<div class="section-title">SENDER:</div>
<div class="line"><span class="label">Name:</span> <span class="value">${b.name}</span></div>
<div class="line"><span class="label">Phone:</span> <span class="value">${b.phone||''}</span></div>
<div class="line"><span class="label">Email:</span> <span class="value">${b.email||''}</span></div>
<div class="line"><span class="label">Address:</span> <span class="value">${b.fromFull}</span></div>

<div class="section-title">RECEIVER:</div>
<div class="line"><span class="label">Name:</span> <span class="value">${b.receiver||''}</span></div>
<div class="line"><span class="label">Phone:</span> <span class="value">${b.receiverEmail||''}</span></div>
<div class="line"><span class="label">Email:</span> <span class="value">${b.receiverEmail||''}</span></div>
<div class="line"><span class="label">Address:</span> <span class="value">${b.receiverAddress||''}</span></div>

<div class="section-title">SHIPMENT DETAILS:</div>
<div class="grid2">
<div>
<div class="line"><span class="label">Package Description:</span> <span class="value">${b.desc||''}</span></div>
<div class="line"><span class="label">Weight:</span> <span class="value">${b.weight||''}</span></div>
<div class="line"><span class="label">Packages:</span> <span class="value">1 Box</span></div>
<div class="line"><span class="label">Declared Value:</span> <span class="value">NGN ${b.amount||3000}</span></div>
<div class="line"><span class="label">Aircraft:</span> <span class="value">${aircraft}</span></div>
</div>
<div>
<div class="line"><span class="label">FLIGHT:</span> <span class="value">${b.flight}</span></div>
<div class="line"><span class="label">Departure:</span> <span class="value">${b.from} - ${departStr}</span></div>
<div class="line"><span class="label">Arrival:</span> <span class="value">${b.to} - ${arriveStr}</span></div>
<div class="line"><span class="label">Duration:</span> <span class="value">${durH}h ${durM}m</span></div>
<div class="line"><span class="label">Service:</span> <span class="value">AIR CARGO EXPRESS</span></div>
<div class="line"><span class="label">Distance:</span> <span class="value">${distance}</span></div>
</div>
</div>

<div class="barcode-area">
<div class="qr-box"><div style="font-size:9px;font-weight:800;margin-bottom:4px">SCAN TO TRACK SHIPMENT</div>${qrHtml}</div>
<div style="flex:1;text-align:center"><div style="font-size:10px;font-weight:900">TRACKING BARCODE:</div><div style="font-family:monospace;font-size:22px;letter-spacing:2px;margin-top:6px">||| ${b.tracking} |||</div><div style="margin-top:12px;font-size:11px"><span class="label">NOTES:</span> Handle with Care - Fragile</div></div>
</div>

<div class="sig-area">
<div class="sig-box"><div class="sig-label">Sender Signature / Signed By:</div><img src="signature.png" style="width:190px;height:auto;margin-top:8px;transform:rotate(-3deg)" alt="signature"><div style="font-size:8px;color:#64748b;margin-top:2px">S.G.C - ${b.tracking}</div></div>
<div class="sig-box"><div class="sig-label">Receiver Signature / Received By:</div><div style="height:50px"></div></div>
</div>

<div class="footer">SKYLINK LOGISTICS • +65 6700 8899 • support@skylinklogistics.com • www.skylinklogistics.com</div>
</div>
</div> <!-- CLOSE receipt-outer / ticketCapture HERE! BEFORE BUTTONS! -->

<div class="btn-area"><button class="btn-dl" onclick="downloadHD()">Download Bright HD Receipt</button>
<script>
function copyRobust(t){try{if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(t).then(()=>showMsg("Copied: "+t)).catch(()=>fallback(t))}else{fallback(t)}}catch(e){fallback(t)}}
function fallback(t){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");showMsg("Copied: "+t)}catch(e){showMsg(t)}document.body.removeChild(ta)}
function showMsg(m){const el=document.getElementById("msg");el.innerText=m;el.style.display="block";setTimeout(()=>el.style.display="none",4000)}
function downloadHD(){const el=document.getElementById("ticketCapture");html2canvas(el,{scale:3,backgroundColor:"#ffffff",useCORS:true}).then(canvas=>{const link=document.createElement("a");link.download="SKYLINK-LOGISTICS-${b.booking}-${b.tracking}-HD.png";link.href=canvas.toDataURL("image/png",1.0);link.click();showMsg("Saved - Bright HD")}).catch(()=>{window.print()})}
<\/script></body></html>`);
  }

  // FLIGHT BOARDING PASS - KEEP V9 BRIGHT
  res.send('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boarding Pass ' + b.booking + '</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><style>*{box-sizing:border-box} html,body{margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif}.wrap{width:100%;min-height:100vh;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;padding:10px}.ticket-outer{width:100%;max-width:1000px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);border:1px solid #e2e8f0}.ticket{width:100%;background:#fff;filter:brightness(1.08)}.header{background:#0f2b5c;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}.header h1{margin:0;font-size:22px;font-weight:900;letter-spacing:.5px}.header h1 span{color:#facc15}.header-right{font-size:9px;opacity:.9;text-align:right;line-height:1.3}.header-sub{font-size:8px;letter-spacing:.6px;opacity:.85;margin-top:2px}.content{padding:14px 16px;display:grid;grid-template-columns:1fr 190px;gap:14px;background:#fff}.label{font-size:9px;color:#6b7280;font-weight:700;letter-spacing:.4px;text-transform:uppercase;margin-top:10px}.value{font-size:13px;font-weight:800;color:#111827;margin-top:1px;word-break:break-word;line-height:1.2}.big-name{font-size:15px;font-weight:900;text-transform:uppercase}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.status-green{color:#16a34a;font-weight:900;font-size:11px}.qr-box{border:1.5px solid #d1d5db;border-radius:12px;padding:10px;text-align:center;background:#fff;height:fit-content}.qr-box img{width:100%;max-width:170px;height:auto}.bottom-bar{background:#0f2b5c;color:#cbd5e1;padding:8px 16px;font-size:7.5px;text-align:center;letter-spacing:.4px}.stub{padding:8px 16px;background:#fff;border-top:2px dashed #9ca3af;font-size:9px;font-weight:800;line-height:1.3}.btn-area{width:100%;max-width:1000px;padding:12px;display:flex;gap:8px;justify-content:center;background:transparent;margin-top:8px;flex-wrap:wrap}.btn-dl{background:#16a34a;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}.btn-tr{background:#0f2e6d;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}.btn-cp{background:#fff;color:#0f2e6d;border:1.5px solid #0f2e6d;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}</style></head><body><div class="wrap"><div class="ticket-outer" id="ticketCapture"><div class="ticket"><div class="header"><div><h1>SKYLINK<span> AIRLINES</span></h1><div class="header-sub">IATA CERTIFIED • EST. 2018 • OFFICIAL BOARDING PASS</div></div><div class="header-right">' + host + '<br>' + b.tracking + '<br>OFFICIAL</div></div><div class="content"><div><div class="label">PASSENGER NAME</div><div class="value big-name">' + b.name + '</div><div class="grid2"><div><div class="label">FROM / DE</div><div class="value">' + b.fromFull + '</div></div><div><div class="label">TO / A</div><div class="value">' + b.toFull + '</div></div></div><div class="grid3"><div><div class="label">FLIGHT / VOL</div><div class="value">' + b.flight + '</div></div><div><div class="label">DATE</div><div class="value">' + new Date(b.departISO).toLocaleDateString('en-GB') + '</div></div><div><div class="label">SEAT / SIEGE</div><div class="value" style="font-size:15px">' + b.seat + '</div></div></div><div class="grid3"><div><div class="label">GATE / PORTE</div><div class="value">' + b.gate + '</div></div><div><div class="label">TERMINAL</div><div class="value">' + b.terminal + '</div></div><div><div class="label">CLASS</div><div class="value">' + b.class + '</div></div></div><div class="grid3"><div><div class="label">BAGGAGE</div><div class="value">' + b.baggage + '</div></div><div><div class="label">TRACKING CODE</div><div class="value" style="font-size:11px">' + b.tracking + '</div></div><div><div class="label">STATUS</div><div class="value status-green">CONFIRMED / CONFIRME</div></div></div><div style="margin-top:10px"><div class="label">DEPARTURE / DEPART</div><div class="value">' + departStr + '</div><div class="label">ARRIVAL / ARRIVEE</div><div class="value">' + arriveStr + '</div></div><div style="margin-top:10px;font-size:10px;line-height:1.4"><b>AIRCRAFT:</b> ' + aircraft + ' (' + distance + ') | <b>DURATION:</b> ' + durH + 'h ' + durM.toString().padStart(2,'0') + 'm | <b>AMOUNT:</b> NGN '+(b.amount||2150)+'<br><b>IMPORTANT:</b> Present this boarding pass with valid ID at check-in counter 2 hours before departure.</div></div><div class="qr-box">' + qrHtml + '<div style="font-size:9px;font-weight:800;margin-top:8px;color:#0f2b5c">SCAN TO TRACK LIVE FLIGHT STATUS</div></div></div><div class="bottom-bar">This is an official e-ticket issued by SKYLINK AIRLINES. Non-transferable.</div><div class="stub">BOARDING PASS STUB<br>' + b.name + ' | ' + b.flight + ' | ' + b.from + ' ' + b.to + ' | SEAT ' + b.seat + ' | GATE ' + b.gate + ' | ' + b.tracking + '</div></div></div><div class="btn-area"><button class="btn-dl" onclick="downloadHD()">Download Bright HD</button><button class="btn-tr" onclick="location.href=\'/track?code=' + b.tracking + '\'">Live Track</button><button class="btn-cp" onclick="copyRobust(\'' + trackLink + '\')">Copy Tracking Link</button></div><div id="msg" style="font-size:12px;font-weight:800;color:#16a34a;text-align:center;margin:8px;display:none"></div></div><script>function copyRobust(t){try{if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(t).then(()=>showMsg("Copied Tracking Link: "+t)).catch(()=>fallback(t))}else{fallback(t)}}catch(e){fallback(t)}}function fallback(t){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");showMsg("Copied Tracking Link: "+t)}catch(e){showMsg(t)}document.body.removeChild(ta)}function showMsg(m){const el=document.getElementById("msg");el.innerText=m;el.style.display="block";setTimeout(()=>el.style.display="none",4000)}function downloadHD(){const el=document.getElementById("ticketCapture");showMsg("Generating HD...");html2canvas(el,{scale:3,backgroundColor:"#ffffff",useCORS:true}).then(canvas=>{const link=document.createElement("a");link.download="SKYLINK-' + b.booking + '-' + b.tracking + '-HD.png";link.href=canvas.toDataURL("image/png",1.0);link.click();showMsg("Saved - Bright HD")}).catch(()=>{window.print()})}<\/script></body></html>');
});

// === TRACKING - FLIGHT + LOGISTICS BOTH PLAIN WHITE, NO API KEY ===
app.get('/track', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<html><body style="font-family:Arial;padding:20px">Invalid Tracking Code - Not Found: '+code+'</body></html>');}
  b = migrateOldBookingToReal(b);
  const departISO = b.departISO; const arriveISO = b.arriveISO;
  const totalMs = new Date(arriveISO).getTime() - new Date(departISO).getTime();
  const totalH = Math.floor(totalMs/3600000); const totalM = Math.floor((totalMs%3600000)/60000);
  let departStr = ''; let arriveStr = '';
  try{
    departStr = new Date(departISO).toLocaleString('en-US',{ timeZone: b.fromTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' ('+b.fromTz+')';
    arriveStr = new Date(arriveISO).toLocaleString('en-US',{ timeZone: b.toTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' ('+b.toTz+')';
  }catch(e){
    departStr = new Date(departISO).toLocaleString(); arriveStr = new Date(arriveISO).toLocaleString();
  }
  const realDetails = getFlightDetails(b.from, b.to);
  const realAircraft = b.aircraft || realDetails.aircraft;
  const realDistance = b.distanceKm || realDetails.distanceKm;
  const fromA = findAirport(b.from); const toA = findAirport(b.to);
  const fromLat = fromA.lat || 15; const fromLon = fromA.lon || 45; const toLat = toA.lat || fromLat+5; const toLon = toA.lon || fromLon+5;
  const isLog = b.type==='logistics';

  const leafletHead = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script><style>#map{height:380px;width:100%;border-radius:12px;border:1px solid #e2e8f0;margin-top:12px;background:#f1f5f9}</style>`;

  if(isLog){
    return res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK LOGISTICS - Live Shipment ${b.tracking}</title>${leafletHead}
<style>body{margin:0;font-family:Arial;background:#f1f5f9;padding:12px;display:flex;justify-content:center}.card{width:100%;max-width:540px;background:#fff;border-radius:16px;padding:20px;box-shadow:0 4px 20px rgba(0,0,0,.06);border:1px solid #e2e8f0}.label{font-size:11px;color:#64748b;font-weight:800;text-transform:uppercase;margin-top:10px}.value{font-size:13px;font-weight:800;color:#0f172a;margin-top:2px}.progress{width:100%;height:10px;background:#e2e8f0;border-radius:20px;overflow:hidden;margin-top:8px}.bar{height:100%;background:#16a34a;transition:width 0.5s}.steps{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px}.step{border:1.5px solid #e2e8f0;border-radius:10px;padding:10px;text-align:center;font-size:12px;font-weight:800}.step.active{border-color:#16a34a;background:#f0fdf4;color:#15803d}.step.done{background:#f8fafc;color:#64748b}</style></head><body>
<div class="card">
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:900;font-size:14px">📦 SKYLINK LOGISTICS - Live Shipment</div><div style="background:#facc15;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:900">${b.tracking}</div></div>

<div class="label">Sender:</div><div class="value">${b.name} (${b.phone||''})</div>
<div class="label">Receiver:</div><div class="value">${b.receiver||''} - ${b.receiverEmail||''}</div>
<div class="label">Address:</div><div class="value">${b.receiverAddress||''}</div>
<div class="label">Package:</div><div class="value">${b.desc||'Gold'} - ${b.weight||'2.6 KG'}</div>
<div class="label">Route:</div><div class="value">${b.from} → ${b.to}</div>
<div class="label">Departure:</div><div class="value">${departStr}</div>
<div class="label">Arrival:</div><div class="value">${arriveStr}</div>
<div class="label">Carrier:</div><div class="value">${realAircraft} | Distance: ${realDistance}km</div>
<div class="label">Status:</div><div id="statusText" style="font-weight:900;color:#16a34a;margin-top:4px">Calculating...</div>

<div class="progress"><div id="pBar" class="bar" style="width:0%"></div></div>
<div style="display:flex;justify-content:space-between;font-size:10px;margin-top:4px;color:#64748b"><span id="pPercent">0%</span><span id="pTime"></span></div>

<div class="steps">
<div id="s1" class="step">📋 Order Received</div>
<div id="s2" class="step">🚐 Pickup Van Collected</div>
<div id="s3" class="step">✈️ In Transit Cargo Flight</div>
<div id="s4" class="step">🏠 Delivered</div>
</div>

<div class="label" style="margin-top:16px">Shipment Route Map</div>
<div id="map"></div>

</div>

<script>
const departISO="${b.departISO}"; const arriveISO="${b.arriveISO}"; const fromLat=${fromLat}; const fromLon=${fromLon}; const toLat=${toLat}; const toLon=${toLon};
function initMap(){
  const map = L.map('map').setView([fromLat, fromLon], 4);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 18
  }).addTo(map);
  const latlngs = [[fromLat, fromLon],[toLat, toLon]];
  L.polyline(latlngs, {color:'#16a34a', weight:3, dashArray:'6 8'}).addTo(map);
  L.marker([fromLat, fromLon]).addTo(map).bindPopup("${b.from}");
  L.marker([toLat, toLon]).addTo(map).bindPopup("${b.to}");
  window._cargoMap = map;
  window._cargoMarker = L.marker([fromLat, fromLon], {icon: L.divIcon({html:'📦', className:'', iconSize:[30,30]})}).addTo(map);
}
function update(){
  const now = new Date(); const dep = new Date(departISO); const arr = new Date(arriveISO);
  const total = arr - dep; const elapsed = now - dep; let p = Math.max(0, Math.min(1, elapsed/total));
  const remainMs = arr - now; const diff = now - dep;
  document.getElementById('pBar').style.width = (p*100).toFixed(0)+'%';
  document.getElementById('pPercent').innerText = (p*100).toFixed(0)+'%';
  if(remainMs>0){
    const h=Math.floor(remainMs/3600000); const m=Math.floor((remainMs%3600000)/60000); const s=Math.floor((remainMs%60000)/1000);
    document.getElementById('pTime').innerText = h+'h '+m+'m '+s+'s remaining to delivery';
  } else {
    document.getElementById('pTime').innerText = 'Delivered';
  }
  const s1=document.getElementById('s1'), s2=document.getElementById('s2'), s3=document.getElementById('s3'), s4=document.getElementById('s4');
  [s1,s2,s3,s4].forEach(s=>{s.className='step';});
  let statusT='';
  if(diff<0){
    const waitMs = dep - now; const wh=Math.floor(waitMs/3600000); const wm=Math.floor((waitMs%3600000)/60000);
    s1.className='step active'; statusT='Ready for Pickup - Van arrives in '+wh+'h '+wm+'m';
    if(window._cargoMarker) window._cargoMarker.setLatLng([fromLat, fromLon]);
  } else if(p<0.15){
    s1.className='step done'; s2.className='step active'; statusT='Pickup Van Collected - In Transit to Airport';
  } else if(p<0.95){
    s1.className='step done'; s2.className='step done'; s3.className='step active'; statusT='In Transit - Cargo Flight Airborne';
    if(window._cargoMarker){
      const lat = fromLat + (toLat-fromLat)*p;
      const lon = fromLon + (toLon-fromLon)*p;
      window._cargoMarker.setLatLng([lat, lon]);
    }
  } else {
    s1.className='step done'; s2.className='step done'; s3.className='step done'; s4.className='step active'; statusT='Delivered';
    if(window._cargoMarker) window._cargoMarker.setLatLng([toLat, toLon]);
  }
  document.getElementById('statusText').innerText = statusT;
}
initMap(); update(); setInterval(update,1000);
<\/script></body></html>`);
  }

app.get('/track', async (req,res)=>{
  const code=req.query.code;let b=bookings.get(code);
  if(!b && BookingModel){try{const doc=await BookingModel.findOne({$or:[{tracking:code},{booking:code}]});if(doc)b=doc.toObject()}catch(e){}}
  if(!b){try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');b=obj[code]}catch(e){}}
  if(!b){return res.send('<html><body style="font-family:Arial;padding:20px">Invalid Tracking Code - Not Found: '+code+'</body></html>');}
  b = migrateOldBookingToReal(b);
  const departISO = b.departISO;
  const arriveISO = b.arriveISO;
  const totalMs = new Date(arriveISO).getTime() - new Date(departISO).getTime();
  const totalH = Math.floor(totalMs/3600000);
  const totalM = Math.floor((totalMs%3600000)/60000);
  let departStr = ''; let arriveStr = '';
  try{
    departStr = new Date(departISO).toLocaleString('en-US',{ timeZone: b.fromTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' ('+b.fromTz+')';
    arriveStr = new Date(arriveISO).toLocaleString('en-US',{ timeZone: b.toTz, month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' ('+b.toTz+')';
  }catch(e){
    departStr = new Date(departISO).toLocaleString('en-US',{month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' ('+b.fromTz+')';
    arriveStr = new Date(arriveISO).toLocaleString('en-US',{month:'long', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' ('+b.toTz+')';
  }
  
  const realDetails = getFlightDetails(b.from, b.to);
  const realAircraft = realDetails.aircraft;
  const realDistance = b.distanceKm || realDetails.distanceKm;
  const fromA = findAirport(b.from);
  const toA = findAirport(b.to);
  const fromLat = fromA.lat || 0;
  const fromLon = fromA.lon || 0;
  const toLat = toA.lat || 0;
  const toLon = toA.lon || 0;
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Live Flight Tracking ${b.tracking}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>body{margin:0;background:#fff;font-family:Arial,Helvetica,sans-serif;padding:16px;color:#111}.container{max-width:700px}h2{margin:0 0 16px;font-size:18px;font-weight:700;display:flex;align-items:center;gap:6px}.line{margin:8px 0;font-size:14px}.label{font-weight:700}.value{font-weight:400}.divider{border:none;border-top:1.5px solid #1a2b5e;margin:16px 0}.live{margin-top:10px}.status-box{padding:6px 10px;border-radius:6px;font-weight:900;font-size:13px;display:inline-block}#map{width:100%;height:380px;border-radius:12px;border:1.5px solid #1a2b5e;margin-top:16px;z-index:1}.map-title{font-weight:900;margin-top:18px;font-size:14px}</style></head><body><div class="container">
<h2>📍 Live Flight Tracking</h2>
<div class="line"><span class="label">Tracking Code:</span> <span class="value">${b.tracking}</span></div>
<div class="line"><span class="label">Passenger:</span> <span class="value">${b.name}</span></div>
<div class="line"><span class="label">Flight:</span> <span class="value">${b.flight}</span></div>
<div class="line"><span class="label">Route:</span> <span class="value">${b.from} → ${b.to} (${b.fromFull} to ${b.toFull})</span></div>
<div class="line"><span class="label">Departure:</span> <span class="value">${departStr}</span></div>
<div class="line"><span class="label">Est. Duration:</span> <span class="value">${totalH}h ${totalM}m${realDistance? ' | '+realDistance+'km':''}</span></div>
<div class="line"><span class="label">Est. Arrival:</span> <span class="value">${arriveStr}</span></div>
<div class="line"><span class="label">Aircraft:</span> <span class="value">${realAircraft}</span></div>
<hr class="divider">
<div class="live"><div style="font-weight:700;margin-bottom:8px">Live Status</div>
<div class="line"><span class="label">Status:</span> <span id="status" class="status-box">Loading...</span></div>
<div class="line"><span class="label">Time in Air:</span> <span id="timeInAir" class="value" style="font-weight:900;font-size:16px">Calculating...</span></div>
<div class="line"><span class="label">Altitude:</span> <span id="alt" class="value">N/A</span></div>
<div class="line"><span class="label">Speed:</span> <span id="spd" class="value">N/A</span></div>
<div class="line" style="margin-top:12px;font-size:12px;color:#64748b"><span id="countdown"></span></div>
</div>
<div class="map-title">🗺️ Live Flight Map</div>
<div id="map"></div>
<div style="font-size:11px;color:#64748b;margin-top:6px;text-align:center">${b.from} ✈️ ${b.to} - Live Aircraft Position</div>
</div>
<script>
const departISO="${departISO}";const arriveISO="${arriveISO}";
const fromLat=${fromLat};const fromLon=${fromLon};const toLat=${toLat};const toLon=${toLon};
const departMs=new Date(departISO).getTime();const arriveMs=new Date(arriveISO).getTime();const totalMs=arriveMs-departMs;
const map = L.map('map').setView([(fromLat+toLat)/2, (fromLon+toLon)/2], 3);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18, attribution:'© OpenStreetMap'}).addTo(map);
const routeLine = L.polyline([[fromLat, fromLon],[toLat, toLon]], {color:'#1a2b5e', weight:3, dashArray:'6,8', opacity:0.7}).addTo(map);
L.marker([fromLat, fromLon]).addTo(map).bindPopup('${b.from} - Departure');
L.marker([toLat, toLon]).addTo(map).bindPopup('${b.to} - Arrival');
const planeIcon = L.divIcon({html:'✈️', className:'plane-icon', iconSize:[24,24]});
const planeMarker = L.marker([fromLat, fromLon], {icon: planeIcon}).addTo(map);
map.fitBounds(routeLine.getBounds(), {padding:[30,30]});
function updateLive(){
  const now=Date.now();const diff=now-departMs;const remain=arriveMs-now;
  const statusEl=document.getElementById("status");const timeEl=document.getElementById("timeInAir");
  const altEl=document.getElementById("alt");const spdEl=document.getElementById("spd");const cdEl=document.getElementById("countdown");
  let progress=0;
  if(diff<0){progress=0;const abs=Math.abs(diff);const hrs=Math.floor(abs/3600000);const mins=Math.floor((abs%3600000)/60000);const secs=Math.floor((abs%60000)/1000);
    statusEl.innerText="Scheduled";statusEl.style.background="#dbeafe";statusEl.style.color="#1e40af";
    timeEl.innerText="Not Departed";timeEl.style.color="#1e40af";
    altEl.innerText="0 ft (On Ground)";spdEl.innerText="0 km/h";
    cdEl.innerText="Departs in "+hrs+"h "+mins+"m "+secs+"s";
  }else if(diff>=totalMs){progress=1;
    statusEl.innerText="Landed ✅";statusEl.style.background="#dcfce7";statusEl.style.color="#166534";
    const th=Math.floor(totalMs/3600000);const tm=Math.floor((totalMs%3600000)/60000);
    timeEl.innerText=th+"h "+tm+"m (Flight Completed)";timeEl.style.color="#16a34a";
    altEl.innerText="0 ft (Landed)";spdEl.innerText="0 km/h";
    cdEl.innerText="Flight completed at "+new Date(arriveISO).toLocaleString();
  }else{
    progress=Math.min(1, Math.max(0, diff/totalMs));
    const h=Math.floor(diff/3600000);const m=Math.floor((diff%3600000)/60000);const s=Math.floor((diff%60000)/1000);
    let stat="Cruising ✈️";let alt=0;let spd=0;
    if(diff<5*60000){stat="Boarding / Taxiing";alt=0;spd=25}
    else if(diff<15*60000){stat="Departed - Climbing";const prog=(diff-5*60000)/(10*60000);alt=Math.floor(prog*35000);spd=Math.floor(250+prog*300)}
    else if(diff>totalMs-20*60000){stat="Descending";const prog=(totalMs-diff)/(20*60000);alt=Math.floor(prog*35000);spd=Math.floor(300+prog*400)}
    else{stat="Cruising ✈️";alt=35000;spd=880}
    statusEl.innerText=stat;statusEl.style.background="#dcfce7";statusEl.style.color="#166534";
    timeEl.innerText=h+"h "+m+"m "+s+"s";timeEl.style.color="#16a34a";
    altEl.innerText=alt.toLocaleString()+" ft";spdEl.innerText=spd+" km/h";
    const rh=Math.floor(remain/3600000);const rm=Math.floor((remain%3600000)/60000);const rs=Math.floor((remain%60000)/1000);
    cdEl.innerText=rh+"h "+rm+"m "+rs+"s remaining";
  }
  const curLat = fromLat + (toLat - fromLat)*progress;
  const curLon = fromLon + (toLon - fromLon)*progress;
  planeMarker.setLatLng([curLat, curLon]);
}
updateLive();setInterval(updateLive,1000);
<\/script></body></html>`);
});
  
app.get('/health',(req,res)=> res.send('OK'));
app.listen(PORT, ()=> console.log('SKYLINK FINAL - WORLD AIRPORTS + SIGNATURE + DARK CARGO READY '+PORT));
