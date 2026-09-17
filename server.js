const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// YOUR REAL PAYSTACK LIVE KEY - ALREADY SET!
const PAYSTACK_PUBLIC_KEY = "pk_live_d820c59c33c0628f48f10176e8ff25b243fd6c73";

let bookings = [];
function genCode(){ return 'SKY-' + Math.random().toString(36).substring(2,8).toUpperCase(); }

const AIRPORTS = [
{ code:"LOS", city:"Lagos", country:"Nigeria", name:"Murtala Muhammed" },
{ code:"ABV", city:"Abuja", country:"Nigeria", name:"Nnamdi Azikiwe" },
{ code:"KAN", city:"Kano", country:"Nigeria", name:"Mallam Aminu Kano" },
{ code:"PHC", city:"Port Harcourt", country:"Nigeria", name:"Port Harcourt Intl" },
{ code:"ENU", city:"Enugu", country:"Nigeria", name:"Akanu Ibiam" },
{ code:"CBQ", city:"Calabar", country:"Nigeria", name:"Margaret Ekpo" },
{ code:"BNI", city:"Benin City", country:"Nigeria", name:"Benin" },
{ code:"IBA", city:"Ibadan", country:"Nigeria", name:"Ibadan Airport" },
{ code:"KAD", city:"Kaduna", country:"Nigeria", name:"Kaduna Airport" },
{ code:"QOW", city:"Owerri", country:"Nigeria", name:"Sam Mbakwe" },
{ code:"JFK", city:"New York", country:"USA", name:"John F Kennedy" },
{ code:"LAX", city:"Los Angeles", country:"USA", name:"Los Angeles Intl" },
{ code:"ORD", city:"Chicago", country:"USA", name:"O'Hare" },
{ code:"MIA", city:"Miami", country:"USA", name:"Miami Intl" },
{ code:"ATL", city:"Atlanta", country:"USA", name:"Hartsfield-Jackson" },
{ code:"LHR", city:"London", country:"United Kingdom", name:"Heathrow" },
{ code:"LGW", city:"London", country:"United Kingdom", name:"Gatwick" },
{ code:"MAN", city:"Manchester", country:"United Kingdom", name:"Manchester" },
{ code:"CDG", city:"Paris", country:"France", name:"Charles de Gaulle" },
{ code:"DXB", city:"Dubai", country:"UAE", name:"Dubai Intl" },
{ code:"DOH", city:"Doha", country:"Qatar", name:"Hamad Intl" },
{ code:"JNB", city:"Johannesburg", country:"South Africa", name:"O R Tambo" },
{ code:"CPT", city:"Cape Town", country:"South Africa", name:"Cape Town Intl" },
{ code:"ACC", city:"Accra", country:"Ghana", name:"Kotoka" },
{ code:"NBO", city:"Nairobi", country:"Kenya", name:"Jomo Kenyatta" },
{ code:"CAI", city:"Cairo", country:"Egypt", name:"Cairo Intl" },
{ code:"IST", city:"Istanbul", country:"Turkey", name:"Istanbul" },
{ code:"YYZ", city:"Toronto", country:"Canada", name:"Pearson" },
{ code:"SIN", city:"Singapore", country:"Singapore", name:"Changi" },
{ code:"HND", city:"Tokyo", country:"Japan", name:"Haneda" }
];

app.get('/', (req,res)=>{
  const airportsJson = JSON.stringify(AIRPORTS);
  res.send('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Airlines</title>'
+ '<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}body{background:#eef2f7;display:flex;justify-content:center;padding:20px}.card{background:#fff;width:100%;max-width:480px;border-radius:20px;padding:25px;box-shadow:0 10px 40px rgba(0,0,0,.1)}.header{background:#0a1931;color:#fff;border-radius:14px;padding:18px;text-align:center;margin-bottom:20px}.yellow{color:#ffcc00}label{font-size:13px;font-weight:600;margin-top:14px;display:block}input{width:100%;padding:13px;border:1.5px solid #ddd;border-radius:10px;margin-top:6px;outline:none}.btn{width:100%;padding:14px;background:#0a1931;color:#fff;border:none;border-radius:10px;font-weight:700;margin-top:20px;cursor:pointer}.track-box{display:flex;gap:8px;margin-top:15px}.track-box input{flex:1}.track-btn{background:#00b050;color:#fff;border:none;padding:13px 18px;border-radius:10px;font-weight:700;cursor:pointer}'
+ '.suggest{position:relative}.slist{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid #ddd;border-radius:10px;max-height:220px;overflow-y:auto;z-index:99;display:none;box-shadow:0 8px 20px rgba(0,0,0,.15)}.sitem{padding:11px 12px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9}.sitem:hover{background:#eef2ff}.sitem b{color:#185adb}</style></head><body>'
+ '<div class="card"><div class="header"><h2>SKYLINK <span class="yellow">AIRLINES</span></h2><p style="font-size:11px;margin-top:4px;opacity:.8">OFFICIAL BOOKING PORTAL</p></div>'
+ '<form action="/book" method="POST" autocomplete="off">'
+ '<label>Full Name *</label><input name="name" required>'
+ '<label>Email *</label><input name="email" type="email" required placeholder="boarding pass will be sent here">'
+ '<label>From *</label><div class="suggest"><input id="fromInput" name="from" required placeholder="Type Nigeria, USA, UK, Ghana..." oninput="showSuggest(this,\'fromList\')"><div id="fromList" class="slist"></div></div>'
+ '<label>To *</label><div class="suggest"><input id="toInput" name="to" required placeholder="Type country to see airports" oninput="showSuggest(this,\'toList\')"><div id="toList" class="slist"></div></div>'
+ '<label>Departure Date & Time *</label><input name="date" type="datetime-local" required>'
+ '<button class="btn" type="submit">Continue</button></form>'
+ '<form action="/track" method="GET" class="track-box"><input name="code" placeholder="SKY-XXXXXX" required><button class="track-btn">Track</button></form></div>'
+ '<script>const AIRPORTS = '+airportsJson+';'
+ 'function showSuggest(inputEl, listId){'
+ ' const q = inputEl.value.toLowerCase().trim();'
+ ' const list = document.getElementById(listId);'
+ ' if(q.length < 1){ list.style.display="none"; return; }'
+ ' const filtered = AIRPORTS.filter(a => a.country.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0,12);'
+ ' if(filtered.length===0){ list.style.display="none"; return; }'
+ ' list.innerHTML = filtered.map(a => "<div class=\\"sitem\\" onclick=\\"selectAir(\\'"+a.code+" - "+a.city+", "+a.country+" ("+a.name+")\\',\\'"+inputEl.id+"\\')\\"><b>"+a.code+"</b> - "+a.city+", "+a.country+" - "+a.name+"</div>").join("");'
+ ' list.style.display="block"; }'
+ 'function selectAir(val, inputId){ document.getElementById(inputId).value = val; document.querySelectorAll(".slist").forEach(l=>l.style.display="none"); }'
+ 'document.addEventListener("click", function(e){ if(!e.target.closest(".suggest")){ document.querySelectorAll(".slist").forEach(l=>l.style.display="none"); } });'
+ '</script></body></html>');
});

app.post('/book',(req,res)=>{
const code=genCode();
bookings.push({code:code,name:req.body.name,email:req.body.email,from:req.body.from,to:req.body.to,date:req.body.date,amount:5000,status:'PENDING_PAYMENT',paid:false});
res.redirect('/pay/'+code);
});

app.get('/pay/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code);
if(!b) return res.send('Not found');
res.send('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://js.paystack.co/v1/inline.js"></script>'
+ '<style>body{font-family:Segoe UI;background:#f4f7fb;display:flex;justify-content:center;padding:20px}.card{background:#fff;max-width:420px;width:100%;border-radius:16px;padding:25px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1)}h3{background:#0a1931;color:#fff;padding:12px;border-radius:10px;font-size:13px}.price{font-size:32px;font-weight:800;margin:15px 0;color:#0a1931}.pay-btn{background:#00b050;color:#fff;border:none;width:100%;padding:15px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}.code{font-family:monospace;background:#eef2ff;padding:6px 12px;border-radius:8px;color:#185adb;font-weight:700}</style></head><body>'
+ '<div class="card"><h3>SECURE PAYMENT WITH PAYSTACK</h3><p style="margin-top:12px"><b>'+b.name+'</b><br>'+b.from+' to '+b.to+'</p><p style="margin-top:8px">Tracking: <span class="code">'+b.code+'</span></p><div class="price">NGN 5,000</div><button class="pay-btn" onclick="payWithPaystack()">Pay with Paystack - REAL</button><p style="font-size:11px;color:#888;margin-top:10px">Secured by Paystack LIVE</p></div>'
+ '<script>function payWithPaystack(){'
+ ' var handler = PaystackPop.setup({ key: "'+PAYSTACK_PUBLIC_KEY+'", email: "'+b.email+'", amount: 500000, currency: "NGN", ref: "'+b.code+'_"+Math.floor(Math.random()*1000000), callback: function(response){ window.location.href="/verify/'+b.code+'?ref="+response.reference; }, onClose: function(){ alert("Payment closed"); } });'
+ ' handler.openIframe(); }</script></body></html>');
});

app.get('/verify/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code); if(b){b.status='PAID';b.paid=true;}
res.send('<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Segoe UI;display:flex;justify-content:center;padding:30px;background:#f4f7fb}.card{background:#fff;max-width:420px;width:100%;padding:30px;border-radius:16px;text-align:center}</style></head><body><div class="card"><div style="font-size:50px">✅</div><h2 style="color:#00b050">Payment Successful!</h2><div style="font-family:monospace;background:#eef2ff;padding:10px;border-radius:8px;color:#185adb;font-weight:800;font-size:20px;margin:15px 0">'+req.params.code+'</div><a href="/track?code='+req.params.code+'" style="display:block;background:#0a1931;color:#fff;padding:12px;border-radius:10px;text-decoration:none">Track Flight</a></div></body></html>');
});

app.get('/track',(req,res)=>{
const b=bookings.find(x=>x.code===req.query.code);
if(!b) return res.send('<h3 style="text-align:center;margin-top:50px;font-family:sans-serif">Code '+req.query.code+' Not Found</h3>');
res.send('<div style="font-family:Segoe UI;padding:20px;max-width:500px;margin:0 auto"><h2 style="background:#0a1931;color:#fff;padding:15px;border-radius:12px;text-align:center">FLIGHT STATUS</h2><div style="background:#fff;padding:20px;border-radius:12px;margin-top:15px"><p><b>Code:</b> '+b.code+'</p><p><b>Name:</b> '+b.name+'</p><p><b>Route:</b> '+b.from+' to '+b.to+'</p><p><b>Status:</b> '+b.status+'</p></div></div>');
});

app.get('/api/bookings',(req,res)=>{ res.json(bookings); });

app.get('/skylink-admin-panel',(req,res)=>{
res.send('<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Admin</title><style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}body{background:#f1f5f9}.login-wrapper{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a1931 0%,#185adb 100%)}.login-card{background:#fff;padding:40px 35px;border-radius:16px;width:95%;max-width:400px}.dash{display:flex;min-height:100vh}.sidebar{width:240px;background:#fff;border-right:1px solid #e2e8f0;padding:20px 15px;position:fixed;height:100vh}.sidebar h2{color:#0a1931;font-size:18px;margin-bottom:25px}.logo{color:#185adb}.menu a{display:flex;gap:10px;padding:12px 14px;border-radius:10px;text-decoration:none;color:#475569;font-size:14px;margin-bottom:4px;cursor:pointer}.menu a.active{background:#185adb;color:#fff}.main{margin-left:240px;flex:1}.topbar{background:#0a1931;color:#fff;padding:14px 25px;display:flex;justify-content:space-between}.content{padding:25px}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:18px;margin-bottom:22px}.stat{background:#fff;padding:22px;border-radius:14px;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.05)}.stat h3{font-size:13px;color:#64748b}.stat p{font-size:32px;font-weight:800}.table-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}table{width:100%;border-collapse:collapse}th{background:#f8fafc;padding:13px 16px;font-size:11px;color:#64748b;text-align:left}td{padding:14px 16px;border-top:1px solid #f1f5f9;font-size:14px}.code-badge{background:#185adb;color:#fff;padding:5px 12px;border-radius:20px;font-family:monospace;font-size:12px}.paid{background:#dcfce7;color:#166534;padding:5px 12px;border-radius:20px;font-size:11px}.pending{background:#fef9c3;color:#854d0e;padding:5px 12px;border-radius:20px;font-size:11px}@media(max-width:800px){.sidebar{display:none}.main{margin-left:0}}</style></head><body>'
+ '<div id="loginPage" class="login-wrapper"><div class="login-card"><h1 style="text-align:center;color:#0a1931">Skylink Admin</h1><input type="password" id="pwd" placeholder="Gos008800" style="width:100%;padding:14px;border:1.5px solid #ddd;border-radius:10px;margin-top:15px"><button onclick="doLogin()" style="width:100%;margin-top:12px;padding:14px;background:#185adb;color:#fff;border:none;border-radius:10px;font-weight:700">Login</button></div></div>'
+ '<div id="dashPage" style="display:none" class="dash"><div class="sidebar"><h2>SKYLINK <span class="logo">AIRLINES</span></h2><div class="menu"><a class="active">Dashboard</a><a>Bookings</a><a onclick="logout()">Logout</a></div></div><div class="main"><div class="topbar"><h1>SKYLINK ADMIN PANEL</h1><div>AD Admin</div></div><div class="content"><div class="stats"><div class="stat"><h3>Total Bookings</h3><p id="total">0</p></div><div class="stat"><h3>Revenue</h3><p id="revenue">N0</p></div><div class="stat"><h3>Today</h3><p id="today">0</p></div></div><div class="table-card"><div style="padding:18px"><h3>Passenger Records</h3></div><div style="overflow-x:auto"><table><thead><tr><th>Tracking Code</th><th>Passenger</th><th>Route</th><th>Status</th></tr></thead><tbody id="tbody"></tbody></table></div></div></div></div></div>'
+ '<script>const ADMIN_PASS="Gos008800";function doLogin(){if(document.getElementById("pwd").value===ADMIN_PASS){localStorage.setItem("skylink_admin_auth","true");showDash()}else{alert("Wrong")}}function showDash(){document.getElementById("loginPage").style.display="none";document.getElementById("dashPage").style.display="block";loadBookings()}function logout(){localStorage.removeItem("skylink_admin_auth");location.reload()}if(localStorage.getItem("skylink_admin_auth")==="true"){showDash()}async function loadBookings(){const res=await fetch("/api/bookings");const data=await res.json();let rev=0;data.forEach(b=>{if(b.paid) rev+=b.amount});document.getElementById("total").innerText=data.length;document.getElementById("revenue").innerText="N"+rev.toLocaleString();document.getElementById("today").innerText=data.length;document.getElementById("tbody").innerHTML=data.map(b=>"<tr><td><span class=code-badge>"+b.code+"</span></td><td>"+b.name+"<br><small>"+b.email+"</small></td><td>"+b.from+" to "+b.to+"</td><td><span class="+(b.paid?"paid":"pending")+">"+b.status+"</span></td></tr>").join("");}</script></body></html>');
});

app.listen(PORT,'0.0.0.0',()=>console.log("Running "+PORT));
