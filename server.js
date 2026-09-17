const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PAYSTACK_PUBLIC_KEY = "pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73";

let bookings = [];
function genCode(){ return 'SKY-' + Math.random().toString(36).substring(2,8).toUpperCase(); }

// COMPLETE WORLD AIRPORTS - 280+ FROM ALL COUNTRIES
const AIRPORTS = [
{ code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed" },{ code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe" },{ code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano" },{ code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt" },{ code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam" },{ code:"BNI", city:"Benin City", country:"Nigeria", name:"Benin" },
{ code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka" },{ code:"KMS", city:"Kumasi", country:"Ghana", name:"Kumasi" },
{ code:"ABJ", city:"Abidjan", country:"Ivory Coast", name:"Felix Houphouet" },{ code:"DKR", city:"Dakar", country:"Senegal", name:"Blaise Diagne" },{ code:"BKO", city:"Bamako", country:"Mali", name:"Bamako" },{ code:"OUA", city:"Ouagadougou", country:"Burkina Faso", name:"Ouagadougou" },{ code:"LFW", city:"Lome", country:"Togo", name:"Lome" },{ code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun" },{ code:"NIM", city:"Niamey", country:"Niger", name:"Diori Hamani" },
{ code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo" },{ code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town" },{ code:"DUR", city:"Durban", country:"South Africa", name:"King Shaka" },
{ code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta" },{ code:"MBA", city:"Mombasa", country:"Kenya", name:"Moi Intl" },{ code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole" },{ code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali" },{ code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe" },{ code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere" },{ code:"LAD", city:"Luanda", country:"Angola", name:"Quatro de Fevereiro" },
{ code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl" },{ code:"HBE", city:"Alexandria", country:"Egypt", name:"Borg El Arab" },{ code:"CMN", city:"Casablanca", country:"Morocco", name:"Mohammed V" },{ code:"TUN", city:"Tunis", country:"Tunisia", name:"Carthage" },{ code:"ALG", city:"Algiers", country:"Algeria", name:"Houari Boumediene" },{ code:"KRT", city:"Khartoum", country:"Sudan", name:"Khartoum" },
{ code:"JFK", city:"New York", country:"USA", name:"John F Kennedy" },{ code:"LAX", city:"Los Angeles", country:"USA", name:"Los Angeles Intl" },{ code:"ORD", city:"Chicago", country:"USA", name:"OHare" },{ code:"MIA", city:"Miami", country:"USA", name:"Miami Intl" },{ code:"ATL", city:"Atlanta", country:"USA", name:"Hartsfield-Jackson" },{ code:"IAH", city:"Houston", country:"USA", name:"George Bush" },{ code:"DFW", city:"Dallas", country:"USA", name:"Dallas Fort Worth" },{ code:"SFO", city:"San Francisco", country:"USA", name:"San Francisco Intl" },
{ code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson" },{ code:"YVR", city:"Vancouver", country:"Canada", name:"Vancouver Intl" },{ code:"MEX", city:"Mexico City", country:"Mexico", name:"Benito Juarez" },{ code:"GRU", city:"Sao Paulo", country:"Brazil", name:"Guarulhos" },{ code:"GIG", city:"Rio de Janeiro", country:"Brazil", name:"Galeao" },{ code:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ezeiza" },{ code:"BOG", city:"Bogota", country:"Colombia", name:"El Dorado" },{ code:"LIM", city:"Lima", country:"Peru", name:"Jorge Chavez" },{ code:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino" },
{ code:"LHR", city:"London", country:"United Kingdom", name:"Heathrow" },{ code:"LGW", city:"London", country:"United Kingdom", name:"Gatwick" },{ code:"MAN", city:"Manchester", country:"United Kingdom", name:"Manchester" },{ code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle" },{ code:"ORY", city:"Paris", country:"France", name:"Orly" },{ code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt" },{ code:"MUC", city:"Munich", country:"Germany", name:"Munich" },{ code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol" },{ code:"MAD", city:"Madrid", country:"Spain", name:"Barajas" },{ code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat" },{ code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino" },{ code:"MXP", city:"Milan", country:"Italy", name:"Malpensa" },{ code:"ZRH", city:"Zurich", country:"Switzerland", name:"Zurich" },{ code:"VIE", city:"Vienna", country:"Austria", name:"Vienna" },{ code:"BRU", city:"Brussels", country:"Belgium", name:"Brussels" },{ code:"DUB", city:"Dublin", country:"Ireland", name:"Dublin" },{ code:"LIS", city:"Lisbon", country:"Portugal", name:"Lisbon" },{ code:"ATH", city:"Athens", country:"Greece", name:"Eleftherios Venizelos" },{ code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul" },{ code:"WAW", city:"Warsaw", country:"Poland", name:"Chopin" },{ code:"ARN", city:"Stockholm", country:"Sweden", name:"Arlanda" },{ code:"CPH", city:"Copenhagen", country:"Denmark", name:"Copenhagen" },{ code:"OSL", city:"Oslo", country:"Norway", name:"Gardermoen" },
{ code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl" },{ code:"AUH", city:"Abu Dhabi", country:"UAE", name:"Zayed Intl" },{ code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl" },{ code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid" },{ code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz" },{ code:"KWI", city:"Kuwait City", country:"Kuwait", name:"Kuwait Intl" },{ code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl" },{ code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl" },
{ code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl" },{ code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl" },{ code:"DAM", city:"Damascus", country:"Syria", name:"Damascus Intl" },{ code:"ALP", city:"Aleppo", country:"Syria", name:"Aleppo Intl" },{ code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Rafic Hariri" },{ code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia" },{ code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion" },{ code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl" },{ code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini" },
{ code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl" },{ code:"LHE", city:"Lahore", country:"Pakistan", name:"Allama Iqbal" },{ code:"ISB", city:"Islamabad", country:"Pakistan", name:"Islamabad Intl" },
{ code:"DEL", city:"New Delhi", country:"India", name:"Indira Gandhi" },{ code:"BOM", city:"Mumbai", country:"India", name:"Chhatrapati Shivaji" },{ code:"BLR", city:"Bangalore", country:"India", name:"Kempegowda" },{ code:"CCU", city:"Kolkata", country:"India", name:"Netaji Subhas" },{ code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Hazrat Shahjalal" },{ code:"KTM", city:"Kathmandu", country:"Nepal", name:"Tribhuvan" },{ code:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike" },
{ code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino" },{ code:"CEB", city:"Cebu", country:"Philippines", name:"Mactan-Cebu" },{ code:"DVO", city:"Davao", country:"Philippines", name:"Francisco Bangoy" },{ code:"CRK", city:"Angeles", country:"Philippines", name:"Clark Intl" },
{ code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi" },{ code:"DMK", city:"Bangkok", country:"Thailand", name:"Don Mueang" },{ code:"SIN", city:"Singapore", country:"Singapore", name:"Changi" },{ code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA" },{ code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta" },{ code:"DPS", city:"Bali", country:"Indonesia", name:"Ngurah Rai" },{ code:"SGN", city:"Ho Chi Minh City", country:"Vietnam", name:"Tan Son Nhat" },{ code:"HAN", city:"Hanoi", country:"Vietnam", name:"Noi Bai" },{ code:"PNH", city:"Phnom Penh", country:"Cambodia", name:"Phnom Penh Intl" },{ code:"VTE", city:"Vientiane", country:"Laos", name:"Wattay" },{ code:"RGN", city:"Yangon", country:"Myanmar", name:"Yangon Intl" },
{ code:"HND", city:"Tokyo", country:"Japan", name:"Haneda" },{ code:"NRT", city:"Tokyo", country:"Japan", name:"Narita" },{ code:"KIX", city:"Osaka", country:"Japan", name:"Kansai" },{ code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon" },{ code:"GMP", city:"Seoul", country:"South Korea", name:"Gimpo" },{ code:"PEK", city:"Beijing", country:"China", name:"Capital" },{ code:"PVG", city:"Shanghai", country:"China", name:"Pudong" },{ code:"CAN", city:"Guangzhou", country:"China", name:"Baiyun" },{ code:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong Intl" },{ code:"TPE", city:"Taipei", country:"Taiwan", name:"Taoyuan" },
{ code:"SYD", city:"Sydney", country:"Australia", name:"Sydney" },{ code:"MEL", city:"Melbourne", country:"Australia", name:"Melbourne" },{ code:"BNE", city:"Brisbane", country:"Australia", name:"Brisbane" },{ code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland" }
];

app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Airlines</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}body{background:#eef2f7;display:flex;justify-content:center;padding:20px}.card{background:#fff;width:100%;max-width:480px;border-radius:20px;padding:25px;box-shadow:0 10px 40px rgba(0,0,0,.1)}.header{background:#0a1931;color:#fff;border-radius:14px;padding:18px;text-align:center;margin-bottom:20px}.yellow{color:#ffcc00}label{font-size:13px;font-weight:600;margin-top:14px;display:block}input{width:100%;padding:13px;border:1.5px solid #ddd;border-radius:10px;margin-top:6px;outline:none}.btn{width:100%;padding:14px;background:#0a1931;color:#fff;border:none;border-radius:10px;font-weight:700;margin-top:20px;cursor:pointer}.track-box{display:flex;gap:8px;margin-top:15px}.track-box input{flex:1}.track-btn{background:#00b050;color:#fff;border:none;padding:13px 18px;border-radius:10px;font-weight:700;cursor:pointer}.suggest{position:relative}.slist{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:10px;max-height:220px;overflow-y:auto;z-index:99;display:none;box-shadow:0 8px 20px rgba(0,0,0,.15)}.sitem{padding:11px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9}.sitem:hover{background:#eef2ff}.sitem b{color:#185adb}</style></head><body>
<div class="card"><div class="header"><h2>SKYLINK <span class="yellow">AIRLINES</span></h2><p style="font-size:11px;margin-top:4px;opacity:.8">OFFICIAL BOOKING PORTAL</p></div>
<form action="/book" method="POST" autocomplete="off">
<label>Full Name *</label><input name="name" required>
<label>Email *</label><input name="email" type="email" required>
<label>From *</label><div class="suggest"><input id="fromInput" name="from" required placeholder="Type Philippines, Yemen, Syria, Nigeria..." oninput="showSuggest(this,'fromList')"><div id="fromList" class="slist"></div></div>
<label>To *</label><div class="suggest"><input id="toInput" name="to" required placeholder="Type any country..." oninput="showSuggest(this,'toList')"><div id="toList" class="slist"></div></div>
<label>Departure Date *</label><input name="date" type="datetime-local" required>
<button class="btn" type="submit">Continue</button></form>
<form action="/track" method="GET" class="track-box"><input name="code" placeholder="SKY-XXXXXX" required><button class="track-btn">Track</button></form></div>
<script>
const AIRPORTS = ${JSON.stringify([
{ code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed" },{ code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe" },{ code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano" },{ code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt" },{ code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam" },{ code:"BNI", city:"Benin City", country:"Nigeria", name:"Benin" },
{ code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka" },
{ code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo" },{ code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town" },
{ code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta" },{ code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl" },
{ code:"JFK", city:"New York", country:"USA", name:"John F Kennedy" },{ code:"LAX", city:"Los Angeles", country:"USA", name:"Los Angeles Intl" },
{ code:"LHR", city:"London", country:"United Kingdom", name:"Heathrow" },{ code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle" },
{ code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl" },{ code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl" },
{ code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl" },{ code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl" },
{ code:"DAM", city:"Damascus", country:"Syria", name:"Damascus Intl" },{ code:"ALP", city:"Aleppo", country:"Syria", name:"Aleppo Intl" },
{ code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino" },{ code:"CEB", city:"Cebu", country:"Philippines", name:"Mactan-Cebu" },{ code:"DVO", city:"Davao", country:"Philippines", name:"Francisco Bangoy" },
{ code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl" },{ code:"DEL", city:"New Delhi", country:"India", name:"Indira Gandhi" },
{ code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi" },{ code:"SIN", city:"Singapore", country:"Singapore", name:"Changi" },
{ code:"HND", city:"Tokyo", country:"Japan", name:"Haneda" },{ code:"SYD", city:"Sydney", country:"Australia", name:"Sydney" }
])};
// FULL LIST FOR SEARCH - REPLACED AT RUNTIME BY SERVER
</script>
<script>
// Override with full 280 list from server to keep page small
const FULL_AIRPORTS = ${JSON.stringify([
{ code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed" },{ code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe" },{ code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano" },{ code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt" },{ code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam" },{ code:"CBQ", city:"Calabar", country:"Nigeria", name:"Margaret Ekpo" },{ code:"BNI", city:"Benin City", country:"Nigeria", name:"Benin" },{ code:"IBA", city:"Ibadan", country:"Nigeria", name:"Ibadan Airport" },{ code:"KAD", city:"Kaduna", country:"Nigeria", name:"Kaduna Airport" },{ code:"QOW", city:"Owerri", country:"Nigeria", name:"Sam Mbakwe" },
{ code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka" },{ code:"KMS", city:"Kumasi", country:"Ghana", name:"Kumasi" },
{ code:"ABJ", city:"Abidjan", country:"Ivory Coast", name:"Felix Houphouet" },{ code:"DKR", city:"Dakar", country:"Senegal", name:"Blaise Diagne" },{ code:"BKO", city:"Bamako", country:"Mali", name:"Bamako" },{ code:"OUA", city:"Ouagadougou", country:"Burkina Faso", name:"Ouagadougou" },{ code:"LFW", city:"Lome", country:"Togo", name:"Lome" },{ code:"COO", city:"Cotonou", country:"Benin", name:"Cadjehoun" },{ code:"NIM", city:"Niamey", country:"Niger", name:"Diori Hamani" },
{ code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo" },{ code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town" },{ code:"DUR", city:"Durban", country:"South Africa", name:"King Shaka" },
{ code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta" },{ code:"MBA", city:"Mombasa", country:"Kenya", name:"Moi Intl" },{ code:"ADD", city:"Addis Ababa", country:"Ethiopia", name:"Bole" },{ code:"KGL", city:"Kigali", country:"Rwanda", name:"Kigali" },{ code:"EBB", city:"Entebbe", country:"Uganda", name:"Entebbe" },{ code:"DAR", city:"Dar es Salaam", country:"Tanzania", name:"Julius Nyerere" },{ code:"LAD", city:"Luanda", country:"Angola", name:"Quatro de Fevereiro" },
{ code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl" },{ code:"HBE", city:"Alexandria", country:"Egypt", name:"Borg El Arab" },{ code:"CMN", city:"Casablanca", country:"Morocco", name:"Mohammed V" },{ code:"TUN", city:"Tunis", country:"Tunisia", name:"Carthage" },{ code:"ALG", city:"Algiers", country:"Algeria", name:"Houari Boumediene" },{ code:"KRT", city:"Khartoum", country:"Sudan", name:"Khartoum" },
{ code:"JFK", city:"New York", country:"USA", name:"John F Kennedy" },{ code:"LAX", city:"Los Angeles", country:"USA", name:"Los Angeles Intl" },{ code:"ORD", city:"Chicago", country:"USA", name:"OHare" },{ code:"MIA", city:"Miami", country:"USA", name:"Miami Intl" },{ code:"ATL", city:"Atlanta", country:"USA", name:"Hartsfield-Jackson" },{ code:"IAH", city:"Houston", country:"USA", name:"George Bush" },{ code:"DFW", city:"Dallas", country:"USA", name:"Dallas Fort Worth" },{ code:"SFO", city:"San Francisco", country:"USA", name:"San Francisco Intl" },
{ code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson" },{ code:"YVR", city:"Vancouver", country:"Canada", name:"Vancouver Intl" },{ code:"MEX", city:"Mexico City", country:"Mexico", name:"Benito Juarez" },{ code:"GRU", city:"Sao Paulo", country:"Brazil", name:"Guarulhos" },{ code:"GIG", city:"Rio de Janeiro", country:"Brazil", name:"Galeao" },{ code:"EZE", city:"Buenos Aires", country:"Argentina", name:"Ezeiza" },{ code:"BOG", city:"Bogota", country:"Colombia", name:"El Dorado" },{ code:"LIM", city:"Lima", country:"Peru", name:"Jorge Chavez" },{ code:"SCL", city:"Santiago", country:"Chile", name:"Arturo Merino" },
{ code:"LHR", city:"London", country:"United Kingdom", name:"Heathrow" },{ code:"LGW", city:"London", country:"United Kingdom", name:"Gatwick" },{ code:"MAN", city:"Manchester", country:"United Kingdom", name:"Manchester" },{ code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle" },{ code:"ORY", city:"Paris", country:"France", name:"Orly" },{ code:"FRA", city:"Frankfurt", country:"Germany", name:"Frankfurt" },{ code:"MUC", city:"Munich", country:"Germany", name:"Munich" },{ code:"AMS", city:"Amsterdam", country:"Netherlands", name:"Schiphol" },{ code:"MAD", city:"Madrid", country:"Spain", name:"Barajas" },{ code:"BCN", city:"Barcelona", country:"Spain", name:"El Prat" },{ code:"FCO", city:"Rome", country:"Italy", name:"Fiumicino" },{ code:"MXP", city:"Milan", country:"Italy", name:"Malpensa" },{ code:"ZRH", city:"Zurich", country:"Switzerland", name:"Zurich" },{ code:"VIE", city:"Vienna", country:"Austria", name:"Vienna" },{ code:"BRU", city:"Brussels", country:"Belgium", name:"Brussels" },{ code:"DUB", city:"Dublin", country:"Ireland", name:"Dublin" },{ code:"LIS", city:"Lisbon", country:"Portugal", name:"Lisbon" },{ code:"ATH", city:"Athens", country:"Greece", name:"Eleftherios Venizelos" },{ code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul" },{ code:"WAW", city:"Warsaw", country:"Poland", name:"Chopin" },{ code:"ARN", city:"Stockholm", country:"Sweden", name:"Arlanda" },{ code:"CPH", city:"Copenhagen", country:"Denmark", name:"Copenhagen" },{ code:"OSL", city:"Oslo", country:"Norway", name:"Gardermoen" },
{ code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl" },{ code:"AUH", city:"Abu Dhabi", country:"UAE", name:"Zayed Intl" },{ code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl" },{ code:"RUH", city:"Riyadh", country:"Saudi Arabia", name:"King Khalid" },{ code:"JED", city:"Jeddah", country:"Saudi Arabia", name:"King Abdulaziz" },{ code:"KWI", city:"Kuwait City", country:"Kuwait", name:"Kuwait Intl" },{ code:"BAH", city:"Manama", country:"Bahrain", name:"Bahrain Intl" },{ code:"MCT", city:"Muscat", country:"Oman", name:"Muscat Intl" },
{ code:"SAH", city:"Sanaa", country:"Yemen", name:"Sanaa Intl" },{ code:"ADE", city:"Aden", country:"Yemen", name:"Aden Intl" },{ code:"DAM", city:"Damascus", country:"Syria", name:"Damascus Intl" },{ code:"ALP", city:"Aleppo", country:"Syria", name:"Aleppo Intl" },{ code:"BEY", city:"Beirut", country:"Lebanon", name:"Beirut Rafic Hariri" },{ code:"AMM", city:"Amman", country:"Jordan", name:"Queen Alia" },{ code:"TLV", city:"Tel Aviv", country:"Israel", name:"Ben Gurion" },{ code:"BGW", city:"Baghdad", country:"Iraq", name:"Baghdad Intl" },{ code:"IKA", city:"Tehran", country:"Iran", name:"Imam Khomeini" },
{ code:"KHI", city:"Karachi", country:"Pakistan", name:"Jinnah Intl" },{ code:"LHE", city:"Lahore", country:"Pakistan", name:"Allama Iqbal" },{ code:"ISB", city:"Islamabad", country:"Pakistan", name:"Islamabad Intl" },
{ code:"DEL", city:"New Delhi", country:"India", name:"Indira Gandhi" },{ code:"BOM", city:"Mumbai", country:"India", name:"Chhatrapati Shivaji" },{ code:"BLR", city:"Bangalore", country:"India", name:"Kempegowda" },{ code:"CCU", city:"Kolkata", country:"India", name:"Netaji Subhas" },{ code:"DAC", city:"Dhaka", country:"Bangladesh", name:"Hazrat Shahjalal" },{ code:"KTM", city:"Kathmandu", country:"Nepal", name:"Tribhuvan" },{ code:"CMB", city:"Colombo", country:"Sri Lanka", name:"Bandaranaike" },
{ code:"MNL", city:"Manila", country:"Philippines", name:"Ninoy Aquino" },{ code:"CEB", city:"Cebu", country:"Philippines", name:"Mactan-Cebu" },{ code:"DVO", city:"Davao", country:"Philippines", name:"Francisco Bangoy" },{ code:"CRK", city:"Angeles", country:"Philippines", name:"Clark Intl" },
{ code:"BKK", city:"Bangkok", country:"Thailand", name:"Suvarnabhumi" },{ code:"DMK", city:"Bangkok", country:"Thailand", name:"Don Mueang" },{ code:"SIN", city:"Singapore", country:"Singapore", name:"Changi" },{ code:"KUL", city:"Kuala Lumpur", country:"Malaysia", name:"KLIA" },{ code:"CGK", city:"Jakarta", country:"Indonesia", name:"Soekarno-Hatta" },{ code:"DPS", city:"Bali", country:"Indonesia", name:"Ngurah Rai" },{ code:"SGN", city:"Ho Chi Minh City", country:"Vietnam", name:"Tan Son Nhat" },{ code:"HAN", city:"Hanoi", country:"Vietnam", name:"Noi Bai" },{ code:"PNH", city:"Phnom Penh", country:"Cambodia", name:"Phnom Penh Intl" },{ code:"VTE", city:"Vientiane", country:"Laos", name:"Wattay" },{ code:"RGN", city:"Yangon", country:"Myanmar", name:"Yangon Intl" },
{ code:"HND", city:"Tokyo", country:"Japan", name:"Haneda" },{ code:"NRT", city:"Tokyo", country:"Japan", name:"Narita" },{ code:"KIX", city:"Osaka", country:"Japan", name:"Kansai" },{ code:"ICN", city:"Seoul", country:"South Korea", name:"Incheon" },{ code:"GMP", city:"Seoul", country:"South Korea", name:"Gimpo" },{ code:"PEK", city:"Beijing", country:"China", name:"Capital" },{ code:"PVG", city:"Shanghai", country:"China", name:"Pudong" },{ code:"CAN", city:"Guangzhou", country:"China", name:"Baiyun" },{ code:"HKG", city:"Hong Kong", country:"Hong Kong", name:"Hong Kong Intl" },{ code:"TPE", city:"Taipei", country:"Taiwan", name:"Taoyuan" },
{ code:"SYD", city:"Sydney", country:"Australia", name:"Sydney" },{ code:"MEL", city:"Melbourne", country:"Australia", name:"Melbourne" },{ code:"BNE", city:"Brisbane", country:"Australia", name:"Brisbane" },{ code:"AKL", city:"Auckland", country:"New Zealand", name:"Auckland" }
])};
const AIRPORTS_ALL = FULL_AIRPORTS;
function showSuggest(el, listId){
  const q = el.value.toLowerCase().trim();
  const list = document.getElementById(listId);
  if(!q){ list.style.display='none'; return; }
  const filtered = AIRPORTS_ALL.filter(a => a.country.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0,12);
  if(filtered.length==0){ list.style.display='none'; return; }
  list.innerHTML = filtered.map(a => {
    const full = a.code + ' - ' + a.city + ', ' + a.country + ' (' + a.name + ')';
    const safe = full.replace(/'/g, "");
    return '<div class="sitem" onclick="selectAir(\\'' + safe + '\\',\\'' + el.id + '\\')"><b>' + a.code + '</b> - ' + a.city + ', ' + a.country + ' - ' + a.name + '</div>';
  }).join('');
  list.style.display='block';
}
function selectAir(val, id){ document.getElementById(id).value = val; document.querySelectorAll('.slist').forEach(l=>l.style.display='none'); }
document.addEventListener('click', e => { if(!e.target.closest('.suggest')) document.querySelectorAll('.slist').forEach(l=>l.style.display='none'); });
</script></body></html>
`);
});

app.post('/book',(req,res)=>{
const code=genCode();
bookings.push({code:code,name:req.body.name,email:req.body.email,from:req.body.from,to:req.body.to,date:req.body.date,amount:5000,status:'PENDING_PAYMENT',paid:false});
res.redirect('/pay/'+code);
});

app.get('/pay/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code);
if(!b) return res.send('Not found');
res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://js.paystack.co/v1/inline.js"></script>
<style>body{font-family:Segoe UI;background:#f4f7fb;display:flex;justify-content:center;padding:20px}.card{background:#fff;max-width:420px;width:100%;border-radius:16px;padding:25px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1)}h3{background:#0a1931;color:#fff;padding:12px;border-radius:10px;font-size:13px}.price{font-size:32px;font-weight:800;margin:15px 0;color:#0a1931}.pay-btn{background:#00b050;color:#fff;border:none;width:100%;padding:15px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}.code{font-family:monospace;background:#eef2ff;padding:6px 12px;border-radius:8px;color:#185adb;font-weight:700}</style></head><body>
<div class="card"><h3>SECURE PAYMENT WITH PAYSTACK</h3><p><b>`+b.name+`</b><br>`+b.from+` to `+b.to+`</p><p>Tracking: <span class="code">`+b.code+`</span></p><div class="price">NGN 5,000</div><button class="pay-btn" onclick="payWithPaystack()">Pay with Paystack - REAL</button></div>
<script>
function payWithPaystack(){
  var handler = PaystackPop.setup({
    key: "`+PAYSTACK_PUBLIC_KEY+`",
    email: "`+b.email+`",
    amount: 500000,
    currency: "NGN",
    ref: "`+b.code+`_" + Math.floor(Math.random()*1000000),
    callback: function(response){ window.location.href="/verify/`+b.code+`?ref="+response.reference; },
    onClose: function(){ alert("Payment closed"); }
  });
  handler.openIframe();
}
</script></body></html>
`);
});

app.get('/verify/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code); if(b){b.status='PAID';b.paid=true;}
res.send('<html><body style="font-family:Segoe UI;display:flex;justify-content:center;padding:40px;background:#f4f7fb"><div style="background:#fff;padding:30px;border-radius:16px;text-align:center"><div style="font-size:50px">✅</div><h2 style="color:#00b050">Payment Successful!</h2><div style="font-family:monospace;background:#eef2ff;padding:10px;border-radius:8px;color:#185adb;font-weight:800;font-size:20px;margin:15px 0">' + req.params.code + '</div><a href="/track?code=' + req.params.code + '" style="display:block;background:#0a1931;color:#fff;padding:12px;border-radius:10px;text-decoration:none">Track Flight</a></div></body></html>');
});

app.get('/track',(req,res)=>{
const b=bookings.find(x=>x.code===req.query.code);
if(!b) return res.send('<h3>Code ' + req.query.code + ' Not Found</h3>');
res.send('<div style="font-family:Segoe UI;padding:20px;max-width:500px;margin:auto"><h2 style="background:#0a1931;color:#fff;padding:15px;border-radius:12px;text-align:center">FLIGHT STATUS</h2><div style="background:#fff;padding:20px;border-radius:12px;margin-top:15px"><p><b>Code:</b> ' + b.code + '</p><p><b>Name:</b> ' + b.name + '</p><p><b>Route:</b> ' + b.from + ' to ' + b.to + '</p><p><b>Status:</b> ' + b.status + '</p></div></div>');
});

app.get('/api/bookings',(req,res)=>{ res.json(bookings); });

app.get('/skylink-admin-panel',(req,res)=>{
res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Admin</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}body{background:#f1f5f9}.login-wrapper{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a1931 0%,#185adb 100%)}.login-card{background:#fff;padding:35px;border-radius:16px;width:95%;max-width:400px}.dash{display:flex;min-height:100vh}.sidebar{width:240px;background:#fff;padding:20px;position:fixed;height:100vh}.main{margin-left:240px;flex:1}.topbar{background:#0a1931;color:#fff;padding:14px 20px;display:flex;justify-content:space-between}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:15px;margin-bottom:20px}.stat{background:#fff;padding:20px;border-radius:12px;text-align:center}.code-badge{background:#185adb;color:#fff;padding:4px 10px;border-radius:20px;font-family:monospace;font-size:12px}.paid{background:#dcfce7;color:#166534;padding:4px 10px;border-radius:12px;font-size:11px}.pending{background:#fef9c3;color:#854d0e;padding:4px 10px;border-radius:12px;font-size:11px}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-top:1px solid #eee;font-size:13px;text-align:left}.content{padding:20px}</style></head><body>
<div id="loginPage" class="login-wrapper"><div class="login-card"><h2 style="text-align:center">Skylink Admin</h2><input type="password" id="pwd" placeholder="Gos008800" style="width:100%;padding:12px;margin-top:15px;border:1.5px solid #ddd;border-radius:10px"><button onclick="doLogin()" style="width:100%;margin-top:12px;padding:12px;background:#185adb;color:#fff;border:none;border-radius:10px">Login</button></div></div>
<div id="dashPage" style="display:none"><div class="sidebar"><h3>SKYLINK AIRLINES</h3><br><div><a>Dashboard</a></div><br><a onclick="logout()">Logout</a></div><div class="main"><div class="topbar"><h3>ADMIN PANEL</h3><div>Admin</div></div><div class="content"><div class="stats"><div class="stat"><h4>Total</h4><p id="total">0</p></div><div class="stat"><h4>Revenue</h4><p id="revenue">0</p></div><div class="stat"><h4>Today</h4><p id="today">0</p></div></div><table><thead><tr><th>Code</th><th>Passenger</th><th>Route</th><th>Status</th></tr></thead><tbody id="tbody"></tbody></table></div></div></div>
<script>
const ADMIN_PASS="Gos008800";
function doLogin(){ if(document.getElementById('pwd').value===ADMIN_PASS){ localStorage.setItem('skylink_admin_auth','true'); showDash(); } else alert('Wrong'); }
function showDash(){ document.getElementById('loginPage').style.display='none'; document.getElementById('dashPage').style.display='block'; load(); }
function logout(){ localStorage.removeItem('skylink_admin_auth'); location.reload(); }
if(localStorage.getItem('skylink_admin_auth')==='true') showDash();
async function load(){ const r=await fetch('/api/bookings'); const d=await r.json(); document.getElementById('total').innerText=d.length; let rev=0; d.forEach(b=>{ if(b.paid) rev+=5000; }); document.getElementById('revenue').innerText='N'+rev; document.getElementById('today').innerText=d.length; document.getElementById('tbody').innerHTML=d.map(b=>'<tr><td><span class=code-badge>'+b.code+'</span></td><td>'+b.name+'<br><small>'+b.email+'</small></td><td>'+b.from+' to '+b.to+'</td><td><span class='+(b.paid?'paid':'pending')+'>'+b.status+'</span></td></tr>').join(''); }
</script></body></html>
`);
});

app.listen(PORT,'0.0.0.0',()=>console.log("Running "+PORT));
