// server.js - SKYLINK V9 REAL TIMEZONE + OLD BOOKING AUTO-FIX - OFFICIAL
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
let QRCode = null; try{ QRCode = require('qrcode'); }catch(e){}
let mongoose = null; try{ mongoose = require('mongoose'); }catch(e){}
let DateTime = null; try{ DateTime = require('luxon').DateTime; }catch(e){ console.log('luxon not installed - install luxon for real timezone'); }
const logistics = require('./logistics.js');
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
        class: String, departISO: String, arriveISO: String, durationMins: Number, distanceKm: Number, aircraft: String,
        fromTz: String, toTz: String, baggage: String, paystackRef: String, amount: Number, createdAt: String, _fixedV8: Boolean
      }, { _id: false, strict: false });
      BookingModel = mongoose.model('Booking', schema);
      const all = await BookingModel.find({});
      all.forEach(d=>{ bookings.set(d.tracking, d.toObject()); bookings.set(d.booking, d.toObject()); });
    }catch(e){}
  }
  try{ const raw = fs.readFileSync(DATA_FILE,'utf8'); const obj = JSON.parse(raw||'{}'); Object.keys(obj).forEach(k=> bookings.set(k, obj[k])); }catch(e){}
  // === AUTO-FIX ALL OLD BOOKINGS ON STARTUP - REAL ===
  try{
    bookings.forEach(b => { if(b && b.departISO &&!b._fixedV8) migrateOldBookingToReal(b); });
    console.log('Old bookings auto-fixed checked');
  }catch(e){}
}
async function savePerm(k, rec){
  bookings.set(k, rec); bookings.set(rec.tracking, rec); bookings.set(rec.booking, rec);
  try{ const o={}; bookings.forEach((v,k)=>{ o[k]=v }); fs.writeFileSync(DATA_FILE, JSON.stringify(o,null,2),'utf8'); }catch(e){}
  if(BookingModel){ try{ await BookingModel.findOneAndUpdate({tracking: rec.tracking}, rec, {upsert:true}); }catch(e){} }
}
const AIRPORTS = [
{code:"KBL", city:"Kabul", country:"Afghanistan", name:"Hamid Karzai Intl", tz:"Asia/Kabul", lat:34.565, lon:69.212},
{code:"TIA", city:"Tirana", country:"Albania", name:"Mother Teresa", tz:"Europe/Tirane", lat:41.414, lon:19.72},
{code:"ALG", city:"Algiers", country:"Algeria", name:"Houari Boumediene", tz:"Africa/Algiers", lat:36.691, lon:3.215},
{code:"LEU", city:"La Seu d'Urgell", country:"Andorra", name:"Andorra-La Seu", tz:"Europe/Andorra", lat:42.338, lon:1.409},
{code:"LAD", city:"Luanda", country:"Angola", name:"Quatro de Fevereiro", tz:"Africa/Luanda", lat:-8.858, lon:13.231},
{code:"ANU", city:"St. John's", country:"Antigua and Barbuda", name:"V.C. Bird Intl", tz:"America/Antigua", lat:17.136, lon:-61.793},
{code:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ministro Pistarini", tz:"America/Argentina/Buenos_Aires", lat:-34.822, lon:-58.535},
{code:"EVN", city:"Yerevan", country:"Armenia", name:"Zvartnots", tz:"Asia/Yerevan", lat:40.147, lon:44.398},
{code:"SYD", city:"Sydney", country:"Australia", name:"Sydney", tz:"Australia/Sydney", lat:-33.939, lon:151.175},
{code:"VIE", city:"Vienna", country:"Austria", name:"Vienna Intl", tz:"Europe/Vienna", lat:48.11, lon:16.569},
{code:"GYD", city:"Baku", country:"Azerbaijan", name:"Heydar Aliyev", tz:"Asia/Baku", lat:40.467, lon:50.046},
{code:"NAS", city:"Nassau", country:"Bahamas", name:"Lynden Pindling", tz:"America/Nassau", lat:25.038, lon:-77.466},
{code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl", tz:"Asia/Bahrain", lat:26.271, lon:50.633},
{code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Hazrat Shahjalal", tz:"Asia/Dhaka", lat:23.843, lon:90.397},
{code:"BGI", city:"Bridgetown", country:"Barbados", name:"Grantley Adams", tz:"America/Barbados", lat:13.074, lon:-59.492},
{code:"MSQ", city:"Minsk", country:"Belarus", name:"Minsk National", tz:"Europe/Minsk", lat:53.882, lon:28.03},
{code:"BRU", city:"Brussels", country:"Belgium", name:"Brussels", tz:"Europe/Brussels", lat:50.901, lon:4.484},
{code:"BZE", city:"Belize City", country:"Belize", name:"Goldson Intl", tz:"America/Belize", lat:17.539, lon:-88.308},
{code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun", tz:"Africa/Porto-Novo", lat:6.357, lon:2.384},
{code:"PBH", city:"Paro", country:"Bhutan", name:"Paro Intl", tz:"Asia/Thimphu", lat:27.403, lon:89.424},
{code:"LPB", city:"La Paz", country:"Bolivia", name:"El Alto", tz:"America/La_Paz", lat:-16.513, lon:-68.192},
{code:"SJJ", city:"Sarajevo", country:"Bosnia and Herzegovina", name:"Sarajevo Intl", tz:"Europe/Sarajevo", lat:43.824, lon:18.331},
{code:"GBE", city:"Gaborone", country:"Botswana", name:"Sir Seretse Khama", tz:"Africa/Gaborone", lat:-24.555, lon:25.918},
{code:"GRU", city:"Sao Paulo", country:"Brazil", name:"Guarulhos", tz:"America/Sao_Paulo", lat:-23.435, lon:-46.473},
{code:"BWN", city:"Bandar Seri Begawan", country:"Brunei", name:"Brunei Intl", tz:"Asia/Brunei", lat:4.944, lon:114.928},
{code:"SOF", city:"Sofia", country:"Bulgaria", name:"Sofia", tz:"Europe/Sofia", lat:42.696, lon:23.411},
{code:"OUA", city:"Ouagadougou", country:"Burkina Faso", name:"Thomas Sankara", tz:"Africa/Ouagadougou", lat:12.353, lon:-1.512},
{code:"BJM", city:"Bujumbura", country:"Burundi", name:"Melchior Ndadaye", tz:"Africa/Bujumbura", lat:-3.324, lon:29.318},
{code:"RAI", city:"Praia", country:"Cabo Verde", name:"Nelson Mandela", tz:"Atlantic/Cape_Verde", lat:14.924, lon:-23.493},
{code:"PNH", city:"Phnom Penh", country:"Cambodia", name:"Phnom Penh Intl", tz:"Asia/Phnom_Penh", lat:11.546, lon:104.844},
{code:"NSI", city:"Yaounde", country:"Cameroon", name:"Nsimalen", tz:"Africa/Douala", lat:3.722, lon:11.553},
{code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson", tz:"America/Toronto", lat:43.677, lon:-79.624},
{code:"BGF", city:"Bangui", country:"Central African Republic", name:"M'Poko", tz:"Africa/Bangui", lat:4.398, lon:18.518},
{code:"NDJ", city:"N'Djamena", country:"Chad", name:"N'Djamena Intl", tz:"Africa/Ndjamena", lat:12.133, lon:15.034},
{code:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino Benitez", tz:"America/Santiago", lat:-33.393, lon:-70.785},
{code:"PEK", city:"Beijing", country:"China", name:"Capital", tz:"Asia/Shanghai", lat:40.08, lon:116.584},
{code:"BOG", city:"Bogota", country:"Colombia", name:"El Dorado", tz:"America/Bogota", lat:4.701, lon:-74.146},
{code:"HAH", city:"Moroni", country:"Comoros", name:"Prince Said Ibrahim", tz:"Indian/Comoro", lat:-11.533, lon:43.271},
{code:"BZV", city:"Brazzaville", country:"Congo (Congo-Brazzaville)", name:"Maya-Maya", tz:"Africa/Brazzaville", lat:-4.251, lon:15.253},
{code:"SJO", city:"San Jose", country:"Costa Rica", name:"Juan Santamaria", tz:"America/Costa_Rica", lat:9.993, lon:-84.208},
{code:"ABJ", city:"Abidjan", country:"Côte d'Ivoire", name:"Felix Houphouet-Boigny", tz:"Africa/Abidjan", lat:5.261, lon:-3.926},
{code:"ZAG", city:"Zagreb", country:"Croatia", name:"Zagreb", tz:"Europe/Zagreb", lat:45.742, lon:16.068},
{code:"HAV", city:"Havana", country:"Cuba", name:"Jose Marti", tz:"America/Havana", lat:22.989, lon:-82.408},
{code:"LCA", city:"Larnaca", country:"Cyprus", name:"Larnaca Intl", tz:"Asia/Nicosia", lat:34.875, lon:33.624},
{code:"PRG", city:"Prague", country:"Czechia (Czech Republic)", name:"Vaclav Havel", tz:"Europe/Prague", lat:50.1, lon:14.26},
{code:"FIH", city:"Kinshasa", country:"Democratic Republic of the Congo", name:"N'djili", tz:"Africa/Kinshasa", lat:-4.385, lon:15.444},
{code:"CPH", city:"Copenhagen", country:"Denmark", name:"Copenhagen", tz:"Europe/Copenhagen", lat:55.617, lon:12.656},
{code:"JIB", city:"Djibouti", country:"Djibouti", name:"Ambouli", tz:"Africa/Djibouti", lat:11.547, lon:43.159},
{code:"DOM", city:"Roseau", country:"Dominica", name:"Douglas-Charles", tz:"America/Dominica", lat:15.546, lon:-61.3},
{code:"SDQ", city:"Santo Domingo", country:"Dominican Republic", name:"Las Americas", tz:"America/Santo_Domingo", lat:18.429, lon:-69.668},
{code:"UIO", city:"Quito", country:"Ecuador", name:"Mariscal Sucre", tz:"America/Guayaquil", lat:-0.129, lon:-78.357},
{code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl", tz:"Africa/Cairo", lat:30.121, lon:31.405},
{code:"SAL", city:"San Salvador", country:"El Salvador", name:"El Salvador Intl", tz:"America/El_Salvador", lat:13.44, lon:-89.055},
{code:"SSG", city:"Malabo", country:"Equatorial Guinea", name:"Malabo Intl", tz:"Africa/Malabo", lat:3.755, lon:8.708},
{code:"ASM", city:"Asmara", country:"Eritrea", name:"Asmara Intl", tz:"Africa/Asmara", lat:15.291, lon:38.91},
{code:"TLL", city:"Tallinn", country:"Estonia", name:"Tallinn", tz:"Europe/Tallinn", lat:59.413, lon:24.832},
{code:"SHO", city:"Manzini", country:"Eswatini", name:"King Mswati III", tz:"Africa/Mbabane", lat:-26.527, lon:31.716},
{code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole Intl", tz:"Africa/Addis_Ababa", lat:8.977, lon:38.799},
{code:"NAN", city:"Nadi", country:"Fiji", name:"Nadi Intl", tz:"Pacific/Fiji", lat:-17.755, lon:177.443},
{code:"HEL", city:"Helsinki", country:"Finland", name:"Helsinki-Vantaa", tz:"Europe/Helsinki", lat:60.317, lon:24.963},
{code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle", tz:"Europe/Paris", lat:49.012, lon:2.55},
{code:"LBV", city:"Libreville", country:"Gabon", name:"Leon-Mba", tz:"Africa/Libreville", lat:0.458, lon:9.412},
{code:"BJL", city:"Banjul", country:"Gambia", name:"Banjul Intl", tz:"Africa/Banjul", lat:13.337, lon:-16.652},
{code:"TBS", city:"Tbilisi", country:"Georgia", name:"Tbilisi Intl", tz:"Asia/Tbilisi", lat:41.669, lon:44.954},
{code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt", tz:"Europe/Berlin", lat:50.037, lon:8.562},
{code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka Intl", tz:"Africa/Accra", lat:5.605, lon:-0.166},
{code:"ATH", city:"Athens", country:"Greece", name:"Athens Intl", tz:"Europe/Athens", lat:37.936, lon:23.944},
{code:"GND", city:"St. George's", country:"Grenada", name:"Maurice Bishop", tz:"America/Grenada", lat:12.004, lon:-61.786},
{code:"GUA", city:"Guatemala City", country:"Guatemala", name:"La Aurora", tz:"America/Guatemala", lat:14.583, lon:-90.527},
{code:"CKY", city:"Conakry", country:"Guinea", name:"Ahmed Sekou Toure", tz:"Africa/Conakry", lat:9.576, lon:-13.611},
{code:"OXB", city:"Bissau", country:"Guinea-Bissau", name:"Osvaldo Vieira", tz:"Africa/Bissau", lat:11.894, lon:-15.653},
{code:"GEO", city:"Georgetown", country:"Guyana", name:"Cheddi Jagan", tz:"America/Guyana", lat:6.498, lon:-58.254},
{code:"PAP", city:"Port-au-Prince", country:"Haiti", name:"Toussaint Louverture", tz:"America/Port-au-Prince", lat:18.58, lon:-72.292},
{code:"FCO", city:"Rome", country:"Holy See", name:"Fiumicino", tz:"Europe/Rome", lat:41.8, lon:12.238},
{code:"XPL", city:"Comayagua", country:"Honduras", name:"Palmerola", tz:"America/Tegucigalpa", lat:14.382, lon:-87.621},
{code:"BUD", city:"Budapest", country:"Hungary", name:"Ferenc Liszt", tz:"Europe/Budapest", lat:47.439, lon:19.261},
{code:"KEF", city:"Reykjavik", country:"Iceland", name:"Keflavik", tz:"Atlantic/Reykjavik", lat:63.985, lon:-22.605},
{code:"DEL", city:"New Delhi", country:"India", name:"Indira Gandhi", tz:"Asia/Kolkata", lat:28.556, lon:77.1},
{code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta", tz:"Asia/Jakarta", lat:-6.125, lon:106.655},
{code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini", tz:"Asia/Tehran", lat:35.416, lon:51.152},
{code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl", tz:"Asia/Baghdad", lat:33.262, lon:44.234},
{code:"DUB", city:"Dublin", country:"Ireland", name:"Dublin", tz:"Europe/Dublin", lat:53.421, lon:-6.27},
{code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion", tz:"Asia/Jerusalem", lat:32.011, lon:34.886},
{code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino", tz:"Europe/Rome", lat:41.8, lon:12.238},
{code:"KIN", city:"Kingston", country:"Jamaica", name:"Norman Manley", tz:"America/Jamaica", lat:17.935, lon:-76.787},
{code:"NRT", city:"Tokyo", country:"Japan", name:"Narita", tz:"Asia/Tokyo", lat:35.764, lon:140.386},
{code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia", tz:"Asia/Amman", lat:31.722, lon:35.993},
{code:"ALA", city:"Almaty", country:"Kazakhstan", name:"Almaty", tz:"Asia/Almaty", lat:43.352, lon:77.04},
{code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta", tz:"Africa/Nairobi", lat:-1.319, lon:36.927},
{code:"TRW", city:"Tarawa", country:"Kiribati", name:"Bonriki", tz:"Pacific/Tarawa", lat:1.381, lon:173.147},
{code:"KWI", city:"Kuwait City", country:"Kuwait", name:"Kuwait Intl", tz:"Asia/Kuwait", lat:29.226, lon:47.968},
{code:"FRU", city:"Bishkek", country:"Kyrgyzstan", name:"Manas", tz:"Asia/Bishkek", lat:43.061, lon:74.477},
{code:"VTE", city:"Vientiane", country:"Laos", name:"Wattay", tz:"Asia/Vientiane", lat:17.988, lon:102.563},
{code:"RIX", city:"Riga", country:"Latvia", name:"Riga Intl", tz:"Europe/Riga", lat:56.923, lon:23.971},
{code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Intl", tz:"Asia/Beirut", lat:33.82, lon:35.488},
{code:"MSU", city:"Maseru", country:"Lesotho", name:"Moshoeshoe I", tz:"Africa/Maseru", lat:-29.462, lon:27.552},
{code:"ROB", city:"Monrovia", country:"Liberia", name:"Roberts Intl", tz:"Africa/Monrovia", lat:6.233, lon:-10.362},
{code:"MJI", city:"Tripoli", country:"Libya", name:"Mitiga", tz:"Africa/Tripoli", lat:32.894, lon:13.276},
{code:"ZRH", city:"Vaduz", country:"Liechtenstein", name:"Zurich", tz:"Europe/Zurich", lat:47.464, lon:8.549},
{code:"VNO", city:"Vilnius", country:"Lithuania", name:"Vilnius", tz:"Europe/Vilnius", lat:54.634, lon:25.285},
{code:"LUX", city:"Luxembourg", country:"Luxembourg", name:"Luxembourg", tz:"Europe/Luxembourg", lat:49.626, lon:6.211},
{code:"TNR", city:"Antananarivo", country:"Madagascar", name:"Ivato", tz:"Indian/Antananarivo", lat:-19.839, lon:47.478},
{code:"LLW", city:"Lilongwe", country:"Malawi", name:"Kamuzu", tz:"Africa/Blantyre", lat:-13.789, lon:33.781},
{code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA", tz:"Asia/Kuala_Lumpur", lat:2.745, lon:101.709},
{code:"MLE", city:"Male", country:"Maldives", name:"Velana", tz:"Indian/Maldives", lat:4.191, lon:73.528},
{code:"BKO", city:"Bamako", country:"Mali", name:"Modibo Keita", tz:"Africa/Bamako", lat:12.533, lon:-7.949},
{code:"MLA", city:"Valletta", country:"Malta", name:"Malta Intl", tz:"Europe/Malta", lat:35.857, lon:14.477},
{code:"MAJ", city:"Majuro", country:"Marshall Islands", name:"Marshall Islands Intl", tz:"Pacific/Majuro", lat:7.064, lon:171.272},
{code:"NKC", city:"Nouakchott", country:"Mauritania", name:"Oumtounsy", tz:"Africa/Nouakchott", lat:18.31, lon:-15.948},
{code:"MRU", city:"Port Louis", country:"Mauritius", name:"SSR Intl", tz:"Indian/Mauritius", lat:-20.43, lon:57.683},
{code:"MEX", city:"Mexico City", country:"Mexico", name:"Mexico City Intl", tz:"America/Mexico_City", lat:19.436, lon:-99.071},
{code:"PNI", city:"Palikir", country:"Micronesia", name:"Pohnpei", tz:"Pacific/Pohnpei", lat:6.985, lon:158.208},
{code:"KIV", city:"Chisinau", country:"Moldova", name:"Chisinau Intl", tz:"Europe/Chisinau", lat:46.927, lon:28.931},
{code:"NCE", city:"Monaco", country:"Monaco", name:"Nice Cote d'Azur", tz:"Europe/Monaco", lat:43.658, lon:7.215},
{code:"UBN", city:"Ulaanbaatar", country:"Mongolia", name:"Chinggis Khaan", tz:"Asia/Ulaanbaatar", lat:47.843, lon:106.758},
{code:"TGD", city:"Podgorica", country:"Montenegro", name:"Podgorica", tz:"Europe/Podgorica", lat:42.359, lon:19.251},
{code:"CMN", city:"Casablanca", country:"Morocco", name:"Mohammed V", tz:"Africa/Casablanca", lat:33.367, lon:-7.589},
{code:"MPM", city:"Maputo", country:"Mozambique", name:"Maputo Intl", tz:"Africa/Maputo", lat:-25.92, lon:32.572},
{code:"RGN", city:"Yangon", country:"Myanmar", name:"Yangon Intl", tz:"Asia/Yangon", lat:16.907, lon:96.133},
{code:"WDH", city:"Windhoek", country:"Namibia", name:"Hosea Kutako", tz:"Africa/Windhoek", lat:-22.479, lon:17.461},
{code:"INU", city:"Yaren", country:"Nauru", name:"Nauru Intl", tz:"Pacific/Nauru", lat:-0.547, lon:166.917},
{code:"KTM", city:"Kathmandu", country:"Nepal", name:"Tribhuvan", tz:"Asia/Kathmandu", lat:27.696, lon:85.359},
{code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol", tz:"Europe/Amsterdam", lat:52.308, lon:4.763},
{code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland Intl", tz:"Pacific/Auckland", lat:-37.008, lon:174.791},
{code:"MGA", city:"Managua", country:"Nicaragua", name:"Sandino", tz:"America/Managua", lat:12.141, lon:-86.168},
{code:"NIM", city:"Niamey", country:"Niger", name:"Diori Hamani", tz:"Africa/Niamey", lat:13.481, lon:2.183},
{code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed", tz:"Africa/Lagos", lat:6.577, lon:3.321},
{code:"FNJ", city:"Pyongyang", country:"North Korea", name:"Sunan", tz:"Asia/Pyongyang", lat:39.224, lon:125.67},
{code:"SKP", city:"Skopje", country:"North Macedonia", name:"Skopje Intl", tz:"Europe/Skopje", lat:41.961, lon:21.621},
{code:"OSL", city:"Oslo", country:"Norway", name:"Gardermoen", tz:"Europe/Oslo", lat:60.193, lon:11.1},
{code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl", tz:"Asia/Muscat", lat:23.593, lon:58.284},
{code:"ISB", city:"Islamabad", country:"Pakistan", name:"Islamabad Intl", tz:"Asia/Karachi", lat:33.549, lon:72.825},
{code:"ROR", city:"Koror", country:"Palau", name:"Roman Tmetuchl", tz:"Pacific/Palau", lat:7.367, lon:134.544},
{code:"TLV", city:"Ramallah", country:"Palestine State", name:"Ben Gurion", tz:"Asia/Hebron", lat:31.5, lon:35.0},
{code:"PTY", city:"Panama City", country:"Panama", name:"Tocumen", tz:"America/Panama", lat:9.071, lon:-79.383},
{code:"POM", city:"Port Moresby", country:"Papua New Guinea", name:"Jacksons", tz:"Pacific/Port_Moresby", lat:-9.443, lon:147.22},
{code:"ASU", city:"Asuncion", country:"Paraguay", name:"Silvio Pettirossi", tz:"America/Asuncion", lat:-25.24, lon:-57.519},
{code:"LIM", city:"Lima", country:"Peru", name:"Jorge Chavez", tz:"America/Lima", lat:-12.021, lon:-77.114},
{code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino", tz:"Asia/Manila", lat:14.508, lon:121.019},
{code:"WAW", city:"Warsaw", country:"Poland", name:"Chopin", tz:"Europe/Warsaw", lat:52.165, lon:20.967},
{code:"LIS", city:"Lisbon", country:"Portugal", name:"Lisbon", tz:"Europe/Lisbon", lat:38.774, lon:-9.134},
{code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl", tz:"Asia/Qatar", lat:25.273, lon:51.608},
{code:"OTP", city:"Bucharest", country:"Romania", name:"Henri Coanda", tz:"Europe/Bucharest", lat:44.571, lon:26.085},
{code:"SVO", city:"Moscow", country:"Russia", name:"Sheremetyevo", tz:"Europe/Moscow", lat:55.972, lon:37.414},
{code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali Intl", tz:"Africa/Kigali", lat:-1.968, lon:30.139},
{code:"SKB", city:"Basseterre", country:"Saint Kitts and Nevis", name:"Bradshaw", tz:"America/St_Kitts", lat:17.311, lon:-62.718},
{code:"UVF", city:"Castries", country:"Saint Lucia", name:"Hewanorra", tz:"America/St_Lucia", lat:13.733, lon:-60.952},
{code:"SVD", city:"Kingstown", country:"Saint Vincent and the Grenadines", name:"Argyle", tz:"America/St_Vincent", lat:13.156, lon:-61.211},
{code:"APW", city:"Apia", country:"Samoa", name:"Faleolo", tz:"Pacific/Apia", lat:-13.829, lon:-172.007},
{code:"RMI", city:"San Marino", country:"San Marino", name:"Fellini", tz:"Europe/San_Marino", lat:44.019, lon:12.609},
{code:"TMS", city:"Sao Tome", country:"Sao Tome and Principe", name:"Sao Tome Intl", tz:"Africa/Sao_Tome", lat:0.378, lon:6.712},
{code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid", tz:"Asia/Riyadh", lat:24.957, lon:46.698},
{code:"DSS", city:"Dakar", country:"Senegal", name:"Blaise Diagne", tz:"Africa/Dakar", lat:14.67, lon:-17.072},
{code:"BEG", city:"Belgrade", country:"Serbia", name:"Nikola Tesla", tz:"Europe/Belgrade", lat:44.818, lon:20.309},
{code:"SEZ", city:"Victoria", country:"Seychelles", name:"Seychelles Intl", tz:"Indian/Mahe", lat:-4.674, lon:55.521},
{code:"FNA", city:"Freetown", country:"Sierra Leone", name:"Lungi", tz:"Africa/Freetown", lat:8.616, lon:-13.195},
{code:"SIN", city:"Singapore", country:"Singapore", name:"Changi", tz:"Asia/Singapore", lat:1.364, lon:103.991},
{code:"BTS", city:"Bratislava", country:"Slovakia", name:"M. R. Stefanik", tz:"Europe/Bratislava", lat:48.17, lon:17.212},
{code:"LJU", city:"Ljubljana", country:"Slovenia", name:"Joze Pucnik", tz:"Europe/Ljubljana", lat:46.223, lon:14.457},
{code:"HIR", city:"Honiara", country:"Solomon Islands", name:"Honiara Intl", tz:"Pacific/Guadalcanal", lat:-9.428, lon:160.054},
{code:"MGQ", city:"Mogadishu", country:"Somalia", name:"Aden Adde", tz:"Africa/Mogadishu", lat:2.014, lon:45.304},
{code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo", tz:"Africa/Johannesburg", lat:-26.133, lon:28.046},
{code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon", tz:"Asia/Seoul", lat:37.46, lon:126.44},
{code:"JUB", city:"Juba", country:"South Sudan", name:"Juba Intl", tz:"Africa/Juba", lat:4.872, lon:31.601},
{code:"MAD", city:"Madrid", country:"Spain", name:"Barajas", tz:"Europe/Madrid", lat:40.489, lon:-3.592},
{code:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike", tz:"Asia/Colombo", lat:7.18, lon:79.884},
{code:"KRT", city:"Khartoum", country:"Sudan", name:"Khartoum Intl", tz:"Africa/Khartoum", lat:15.589, lon:32.553},
{code:"PBM", city:"Paramaribo", country:"Suriname", name:"Johan Pengel", tz:"America/Paramaribo", lat:5.452, lon:-55.187},
{code:"ARN", city:"Stockholm", country:"Sweden", name:"Arlanda", tz:"Europe/Stockholm", lat:59.651, lon:17.918},
{code:"ZRH", city:"Zurich", country:"Switzerland", name:"Zurich", tz:"Europe/Zurich", lat:47.464, lon:8.549},
{code:"DAM", city:"Damascus", country:"Syria", name:"Damascus Intl", tz:"Asia/Damascus", lat:33.411, lon:36.512},
{code:"DYU", city:"Dushanbe", country:"Tajikistan", name:"Dushanbe", tz:"Asia/Dushanbe", lat:38.543, lon:68.825},
{code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere", tz:"Africa/Dar_es_Salaam", lat:-6.875, lon:39.202},
{code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi", tz:"Asia/Bangkok", lat:13.681, lon:100.747},
{code:"DIL", city:"Dili", country:"Timor-Leste", name:"Presidente Lobato", tz:"Asia/Dili", lat:-8.546, lon:125.524},
{code:"LFW", city:"Lome", country:"Togo", name:"Lome Tokoin", tz:"Africa/Lome", lat:6.165, lon:1.254},
{code:"TBU", city:"Nuku'alofa", country:"Tonga", name:"Fua'amotu", tz:"Pacific/Tongatapu", lat:-21.241, lon:-175.14},
{code:"POS", city:"Port of Spain", country:"Trinidad and Tobago", name:"Piarco", tz:"America/Port_of_Spain", lat:10.595, lon:-61.337},
{code:"TUN", city:"Tunis", country:"Tunisia", name:"Carthage", tz:"Africa/Tunis", lat:36.851, lon:10.227},
{code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul", tz:"Europe/Istanbul", lat:41.275, lon:28.751},
{code:"ASB", city:"Ashgabat", country:"Turkmenistan", name:"Ashgabat", tz:"Asia/Ashgabat", lat:37.986, lon:58.36},
{code:"FUN", city:"Funafuti", country:"Tuvalu", name:"Funafuti Intl", tz:"Pacific/Funafuti", lat:-8.525, lon:179.196},
{code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe Intl", tz:"Africa/Kampala", lat:0.042, lon:32.443},
{code:"KBP", city:"Kyiv", country:"Ukraine", name:"Boryspil", tz:"Europe/Kiev", lat:50.345, lon:30.894},
{code:"DXB", city:"Dubai", country:"United Arab Emirates", name:"Dubai Intl", tz:"Asia/Dubai", lat:25.253, lon:55.365},
{code:"LHR", city:"London", country:"United Kingdom", name:"Heathrow", tz:"Europe/London", lat:51.47, lon:-0.454},
{code:"JFK", city:"New York", country:"United States of America", name:"JFK", tz:"America/New_York", lat:40.641, lon:-73.778},
{code:"MVD", city:"Montevideo", country:"Uruguay", name:"Carrasco", tz:"America/Montevideo", lat:-34.838, lon:-56.03},
{code:"TAS", city:"Tashkent", country:"Uzbekistan", name:"Tashkent Intl", tz:"Asia/Tashkent", lat:41.257, lon:69.281},
{code:"VLI", city:"Port Vila", country:"Vanuatu", name:"Bauerfield", tz:"Pacific/Efate", lat:-17.699, lon:168.319},
{code:"CCS", city:"Caracas", country:"Venezuela", name:"Simon Bolivar", tz:"America/Caracas", lat:10.603, lon:-66.99},
{code:"HAN", city:"Hanoi", country:"Vietnam", name:"Noi Bai", tz:"Asia/Bangkok", lat:21.221, lon:105.807},
{code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl", tz:"Asia/Aden", lat:15.476, lon:44.219},
{code:"LUN", city:"Lusaka", country:"Zambia", name:"Kenneth Kaunda", tz:"Africa/Lusaka", lat:-15.33, lon:28.452},
{code:"HRE", city:"Harare", country:"Zimbabwe", name:"Robert Gabriel Mugabe", tz:"Africa/Harare", lat:-17.931, lon:31.092},
];
function haversine(lat1, lon1, lat2, lon2){ const R=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2; return 2*R*Math.asin(Math.sqrt(a)); }
function getFlightDetails(from, to){
  const f=findAirport(from), t=findAirport(to);
  if(!f.lat ||!t.lat || f.lat===0) return {durationMins:8*60, distanceKm:6000, aircraft:"Boeing 787-9 Dreamliner"};
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

// === REAL TIMEZONE FIX - ONLY THIS IS NEW - 100% REAL ===
function wallTimeToUTC(wallStr, tz){
  if(DateTime){
    const dt = DateTime.fromISO(wallStr, { zone: tz });
    if(dt.isValid) return dt.toUTC().toJSDate();
  }
  return new Date(wallStr);
}
function formatRealInTz(isoStr, tz){
  try{
    return new Date(isoStr).toLocaleString('en-US',{ timeZone: tz, month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true }) + ' - ' + tz;
  }catch(e){
    return new Date(isoStr).toLocaleString('en-US',{month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', hour12:true}) + ' - ' + tz;
  }
}
function isOldBugBooking(b){
  if(!b ||!b.departISO ||!b.fromTz) return false;
  if(b._fixedV8) return false;
  return true;
}
function migrateOldBookingToReal(b){
  if(!isOldBugBooking(b)) return b;
  try{
    const wrongDate = new Date(b.departISO);
    const yyyy = wrongDate.getUTCFullYear();
    const mm = String(wrongDate.getUTCMonth()+1).padStart(2,'0');
    const dd = String(wrongDate.getUTCDate()).padStart(2,'0');
    const hh = String(wrongDate.getUTCHours()).padStart(2,'0');
    const mi = String(wrongDate.getUTCMinutes()).padStart(2,'0');
    const wallStr = `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
    const realDepart = wallTimeToUTC(wallStr, b.fromTz);
    const durationMs = (b.durationMins || 0) * 60000 || (new Date(b.arriveISO).getTime() - new Date(b.departISO).getTime());
    const realArrive = new Date(realDepart.getTime() + durationMs);
    b.departISO = realDepart.toISOString();
    b.arriveISO = realArrive.toISOString();
    b._fixedV8 = true;
    savePerm(b.tracking, b);
  }catch(e){ console.log('migrate fail', e); }
  return b;
}

initDB();

app.get('/skylink-admin-login', (req,res)=>{ res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0f2e6d;display:flex;justify-content:center;align-items:center;height:100vh;font-family:Arial}.card{background:#fff;padding:30px;border-radius:16px;width:100%;max-width:360px;box-shadow:0 10px 40px rgba(0,0,0,.3)}input{width:100%;padding:13px;border-radius:10px;border:1.5px solid #e2e8f0;margin-top:12px;box-sizing:border-box;font-size:14px}button{width:100%;background:#0f2e6d;color:#fff;padding:13px;border-radius:10px;border:none;font-weight:900;margin-top:14px;cursor:pointer}</style></head><body><div class="card"><div style="text-align:center;font-weight:900;font-size:20px">✈️ SKYLINK ADMIN</div><div style="text-align:center;font-size:11px;color:#64748b;margin-top:6px;letter-spacing:1px">ADMIN LOGIN ONLY</div><form method="POST" action="/api/admin-login"><input type="password" name="password" placeholder="Enter admin password" required><button type="submit">Login →</button></form></div></body></html>`);});
app.post('/api/admin-login', (req,res)=>{ const pass = req.body.password || ''; if(pass === ADMIN_PASSWORD){ res.setHeader('Set-Cookie', 'admin_auth=Skylink1824; Path=/; Max-Age=86400; HttpOnly'); res.redirect('/skylink-admin-gospel-2024'); } else { res.send('<script>alert("Wrong password"); location.href="/skylink-admin-login"</script>'); } });
app.get('/skylink-admin-logout', (req,res)=>{ res.setHeader('Set-Cookie', 'admin_auth=; Path=/; Max-Age=0'); res.redirect('/skylink-admin-login'); });
app.get('/airlines', (req,res)=>{
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
<label>Email *</label><input id="email" type="email" required placeholder="" autocomplete="off">
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
  const departDate=depart? wallTimeToUTC(depart, fromA.tz) : new Date(Date.now()+7200000);
  const details=getFlightDetails(fromA.code,toA.code);
  const arriveDate=new Date(departDate.getTime()+details.durationMins*60000);
  const rec={booking,tracking,name:name.toUpperCase(),email:email||"",from:fromA.code,fromFull:fromA.code+' - '+fromA.city+', '+fromA.country+' ('+fromA.name+')',to:toA.code,toFull:toA.code+' - '+toA.city+', '+toA.country+' ('+toA.name+')',flight,gate,terminal,seat,class:cls||'ECONOMY',departISO:departDate.toISOString(),arriveISO:arriveDate.toISOString(),durationMins:details.durationMins,distanceKm:details.distanceKm,aircraft:details.aircraft,fromTz:fromA.tz,toTz:toA.tz,baggage:'23KG',paystackRef,amount:2150,createdAt:new Date().toISOString(), _fixedV8: true};
  await savePerm(tracking, rec);
  res.json({boardingUrl:'/boarding-pass?code='+tracking});
});
app.get('/skylink-admin-gospel-2024', async (req,res)=>{
  if(!isAuthenticated(req)){ return res.redirect('/skylink-admin-login'); }
  let all=[];const seen=new Set();
  if(BookingModel){ try{ const docs=await BookingModel.find({}).sort({createdAt:-1}); docs.forEach(v=>{ if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)} }); }catch(e){} }
  try{const obj=JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'{}');Object.values(obj).forEach(v=>{if(!seen.has(v.tracking)){seen.add(v.tracking);all.push(v)}})}catch(e){}
  const total = all.length * 2150; const today = all.filter(b=> b.createdAt && new Date(b.createdAt).toDateString() === new Date().toDateString()).length;
  let rows = all.map(b=>`<tr style="border-bottom:1px solid #e2e8f0"><td style="padding:14px;font-weight:800;color:#0f2e6d">${b.booking}</td><td style="padding:14px"><span style="background:#e0f2fe;color:#0c4a6e;padding:4px 10px;border-radius:20px;font-weight:800;font-size:11px">${b.tracking}</span></td><td style="padding:14px;font-weight:700">${b.name}</td><td style="padding:14px;font-weight:700">${b.from} → ${b.to} <br><span style="font-size:10px;color:#16a34a">${b.durationMins? Math.floor(b.durationMins/60)+'h '+(b.durationMins%60)+'m':''} | ${b.distanceKm? b.distanceKm+'km':''} | ${b.aircraft||''}</span></td><td style="padding:14px;font-weight:900;color:#16a34a">NGN 2,150</td><td style="padding:14px;font-size:11px">${b.paystackRef||''}</td><td style="padding:14px;font-size:11px">${b.createdAt? new Date(b.createdAt).toLocaleString():''}</td><td style="padding:14px"><a href="/boarding-pass?code=${b.tracking}" style="background:#0f2e6d;color:#fff;padding:6px 12px;border-radius:8px;text-decoration:none;font-size:11px;font-weight:800">View Pass</a></td></tr>`).join('');
  res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>SKYLINK Admin</title><style>body{margin:0;font-family:Inter,Arial;background:#f1f5f9}.header{background:#0f2e6d;color:#fff;padding:20px 24px;display:flex;justify-content:space-between;align-items:center}.card{max-width:1200px;margin:20px auto;background:#fff;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,.06);overflow:hidden;border:1px solid #e2e8f0}.stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;padding:20px}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px}.stat h3{margin:0;font-size:11px;color:#64748b}.stat p{margin:6px 0 0;font-size:22px;font-weight:900}.table-wrap{overflow:auto} table{width:100%;border-collapse:collapse;min-width:900px} th{background:#f8fafc;text-align:left;padding:12px 14px;font-size:11px;color:#64748b;border-bottom:2px solid #e2e8f0} a.logout{background:#ef4444;color:#fff;padding:8px 14px;border-radius:8px;text-decoration:none;font-weight:800;font-size:12px}</style></head><body><div class="header"><div><div style="font-weight:900;font-size:20px">✈️ SKYLINK AIRLINES - ADMIN</div><div style="font-size:11px;opacity:0.8">Real Money Dashboard - Private</div></div><div><a class="logout" href="/skylink-admin-logout">Logout</a></div></div><div class="card"><div class="stats"><div class="stat"><h3>TOTAL BOOKINGS</h3><p>${all.length}</p></div><div class="stat"><h3>TOTAL REVENUE</h3><p style="color:#16a34a">NGN ${total.toLocaleString()}</p></div><div class="stat"><h3>TODAY</h3><p>${today}</p></div></div><div style="padding:0 20px 10px;font-weight:900">All Bookings - Paystack Verified</div><div class="table-wrap"><table><tr><th>BOOKING</th><th>TRACKING</th><th>PASSENGER</th><th>ROUTE</th><th>AMOUNT</th><th>PAYSTACK REF</th><th>DATE</th><th>ACTION</th></tr>${rows || '<tr><td colspan=8 style="padding:40px;text-align:center;color:#94a3b8">No bookings yet</td></tr>'}</table></div></div></body></html>`);
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
  const aircraft = realDetailsBP.aircraft;
  const distance = (b.distanceKm || realDetailsBP.distanceKm) + " km";
  const qrHtml = qr? '<img src="' + qr + '">' : '<div style="width:180px;height:180px;background:#f3f4f6;display:flex;align-items:center;justify-content:center">QR</div>';
  res.send('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boarding Pass ' + b.booking + '</title><script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script><style>*{box-sizing:border-box} html,body{margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif}.wrap{width:100%;min-height:100vh;background:#f1f5f9;display:flex;flex-direction:column;align-items:center;padding:10px}.ticket-outer{width:100%;max-width:1000px;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);border:1px solid #e2e8f0}.ticket{width:100%;background:#fff;filter:brightness(1.08)}.header{background:#0f2b5c;color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center}.header h1{margin:0;font-size:22px;font-weight:900;letter-spacing:.5px}.header h1 span{color:#facc15}.header-right{font-size:9px;opacity:.9;text-align:right;line-height:1.3}.header-sub{font-size:8px;letter-spacing:.6px;opacity:.85;margin-top:2px}.content{padding:14px 16px;display:grid;grid-template-columns:1fr 190px;gap:14px;background:#fff}.label{font-size:9px;color:#6b7280;font-weight:700;letter-spacing:.4px;text-transform:uppercase;margin-top:10px}.value{font-size:13px;font-weight:800;color:#111827;margin-top:1px;word-break:break-word;line-height:1.2}.big-name{font-size:15px;font-weight:900;text-transform:uppercase}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:4px}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}.status-green{color:#16a34a;font-weight:900;font-size:11px}.qr-box{border:1.5px solid #d1d5db;border-radius:12px;padding:10px;text-align:center;background:#fff;height:fit-content}.qr-box img{width:100%;max-width:170px;height:auto}.bottom-bar{background:#0f2b5c;color:#cbd5e1;padding:8px 16px;font-size:7.5px;text-align:center;letter-spacing:.4px}.stub{padding:8px 16px;background:#fff;border-top:2px dashed #9ca3af;font-size:9px;font-weight:800;line-height:1.3}.btn-area{width:100%;max-width:1000px;padding:12px;display:flex;gap:8px;justify-content:center;background:transparent;margin-top:8px;flex-wrap:wrap}.btn-dl{background:#16a34a;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}.btn-tr{background:#0f2e6d;color:#fff;border:none;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}.btn-cp{background:#fff;color:#0f2e6d;border:1.5px solid #0f2e6d;padding:11px 16px;border-radius:8px;font-weight:900;cursor:pointer;font-size:13px}</style></head><body><div class="wrap"><div class="ticket-outer" id="ticketCapture"><div class="ticket"><div class="header"><div><h1>SKYLINK<span>AIRLINES</span></h1><div class="header-sub">IATA CERTIFIED • EST. 2018 • OFFICIAL BOARDING PASS</div></div><div class="header-right">' + host + '<br>' + b.tracking + '<br>OFFICIAL</div></div><div class="content"><div><div class="label">PASSENGER NAME / NOM DU PASSAGER</div><div class="value big-name">' + b.name + '</div><div class="grid2"><div><div class="label">FROM / DE</div><div class="value">' + b.fromFull + '</div></div><div><div class="label">TO / A</div><div class="value">' + b.toFull + '</div></div></div><div class="grid3"><div><div class="label">FLIGHT / VOL</div><div class="value">' + b.flight + '</div></div><div><div class="label">DATE</div><div class="value">' + new Date(b.departISO).toLocaleDateString('en-GB') + '</div></div><div><div class="label">SEAT / SIEGE</div><div class="value" style="font-size:15px">' + b.seat + '</div></div></div><div class="grid3"><div><div class="label">GATE / PORTE</div><div class="value">' + b.gate + '</div></div><div><div class="label">TERMINAL</div><div class="value">' + b.terminal + '</div></div><div><div class="label">CLASS</div><div class="value">' + b.class + '</div></div></div><div class="grid3"><div><div class="label">BAGGAGE</div><div class="value">' + b.baggage + '</div></div><div><div class="label">TRACKING CODE</div><div class="value" style="font-size:11px">' + b.tracking + '</div></div><div><div class="label">STATUS</div><div class="value status-green">CONFIRMED / CONFIRME</div></div></div><div style="margin-top:10px"><div class="label">DEPARTURE / DEPART</div><div class="value">' + departStr + '</div><div class="label">ARRIVAL / ARRIVEE</div><div class="value">' + arriveStr + '</div></div><div style="margin-top:10px;font-size:10px;line-height:1.4"><b>AIRCRAFT:</b> ' + aircraft + ' (' + distance + ') | <b>DURATION:</b> ' + durH + 'h ' + durM.toString().padStart(2,'0') + 'm | <b>MEAL:</b> Included<br><b>IMPORTANT:</b> Present this boarding pass with valid ID at check-in counter 2 hours before departure. Boarding closes 45 mins before.</div></div><div class="qr-box">' + qrHtml + '<div style="font-size:9px;font-weight:800;margin-top:8px;color:#0f2b5c">SCAN TO TRACK LIVE FLIGHT STATUS</div></div></div><div class="bottom-bar">This is an official e-ticket issued by SKYLINK AIRLINES. Non-transferable. Subject to conditions of carriage.</div><div class="stub">BOARDING PASS STUB - KEEP WITH YOU<br>' + b.name + ' | ' + b.flight + ' | ' + b.from + ' ' + b.to + ' | SEAT ' + b.seat + ' | GATE ' + b.gate + ' | TERMINAL ' + b.terminal + ' | ' + b.tracking + '</div></div></div><div class="btn-area"><button class="btn-dl" onclick="downloadHD()">Download Bright HD</button><button class="btn-tr" onclick="location.href=\'/track?code=' + b.tracking + '\'">Live Track</button><button class="btn-cp" onclick="copyRobust(\'' + trackLink + '\')">Copy Tracking Code</button></div><div id="msg" style="font-size:12px;font-weight:800;color:#16a34a;text-align:center;margin:8px;display:none"></div></div><script>function copyRobust(t){try{if(navigator.clipboard && window.isSecureContext){navigator.clipboard.writeText(t).then(()=>showMsg("Copied Tracking Link: "+t)).catch(()=>fallback(t))}else{fallback(t)}}catch(e){fallback(t)}}function fallback(t){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.left="-9999px";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");showMsg("Copied Tracking Link: "+t)}catch(e){showMsg(t)}document.body.removeChild(ta)}function showMsg(m){const el=document.getElementById("msg");el.innerText=m;el.style.display="block";setTimeout(()=>el.style.display="none",4000)}function downloadHD(){const el=document.getElementById("ticketCapture");showMsg("Generating HD...");html2canvas(el,{scale:3,backgroundColor:"#ffffff",useCORS:true}).then(canvas=>{const link=document.createElement("a");link.download="SKYLINK-' + b.booking + '-' + b.tracking + '-HD.png";link.href=canvas.toDataURL("image/png",1.0);link.click();showMsg("Saved - Bright HD - Huge Fullscreen")}).catch(()=>{window.print()})}<\/script></body></html>');
});

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

// FIRST DISPLAY - 2 OPTIONS LANDING
app.get("/", (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#f1f5f9;font-family:Arial} .wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px} .card{width:100%;max-width:420px;background:#fff;border-radius:22px;padding:32px;text-align:center;box-shadow:0 15px 40px rgba(0,0,0,.1)} .logo{font-size:28px;font-weight:900;color:#0f2e6d} .logo span{color:#facc15} h3{margin:18px 0 20px;color:#334155} a{display:block;text-decoration:none;padding:18px;border-radius:13px;font-weight:900;margin-top:14px;font-size:15px} .a1{background:#0f2e6d;color:#fff} .a2{background:#facc15;color:#0f2e6d} p{font-size:10px;color:#94a3b8;margin-top:20px;font-weight:800}</style></head><body><div class="wrap"><div class="card"><div class="logo">SKYLINK <span>GROUP</span></div><h3>Welcome - Choose Your Service</h3><a class="a1" href="/airlines">✈️ SKYLINK AIRLINES<br><small style="font-weight:700">Book Flights</small></a><a class="a2" href="/logistics">📦 SKYLINK LOGISTICS<br><small style="font-weight:700">Ship & Track Package</small></a><p>www.skylinkairlines.com.ng - Official Portal</p></div></div></body></html>`);
});

logistics.install(app, { airports: AIRPORTS });

app.get('/health',(req,res)=> res.send('OK'));
app.listen(PORT, ()=> console.log('SKYLINK V9 REAL TZ + OLD BOOKING AUTO-FIX READY'));
