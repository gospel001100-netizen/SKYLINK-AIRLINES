const express = require('express');
const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
let bookings = [];
function genCode(){ return 'SKY-' + Math.random().toString(36).substring(2,8).toUpperCase(); }

// --- CUSTOMER BOOKING PAGE ---
app.get('/', (req,res)=>{
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Airlines</title>
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}body{background:#eef2f7;display:flex;justify-content:center;padding:20px}.card{background:#fff;width:100%;max-width:450px;border-radius:20px;padding:25px;box-shadow:0 10px 40px rgba(0,0,0,.1)}.header{background:#0a1931;color:#fff;border-radius:14px;padding:18px;text-align:center;margin-bottom:20px}.yellow{color:#ffcc00}label{font-size:13px;font-weight:600;margin-top:12px;display:block}input,select{width:100%;padding:13px;border:1.5px solid #ddd;border-radius:10px;margin-top:6px}.btn{width:100%;padding:14px;background:#0a1931;color:#fff;border:none;border-radius:10px;font-weight:700;margin-top:18px;cursor:pointer}.track-box{display:flex;gap:8px;margin-top:15px}.track-box input{flex:1}.track-btn{background:#00b050;color:#fff;border:none;padding:13px 18px;border-radius:10px;font-weight:700}</style></head><body>
<div class="card"><div class="header"><h2>✈️ SKYLINK <span class="yellow">AIRLINES</span></h2><p style="font-size:11px;margin-top:4px;opacity:.8">OFFICIAL BOOKING PORTAL</p></div>
<form action="/book" method="POST"><label>Full Name *</label><input name="name" required><label>Email *</label><input name="email" type="email" required placeholder="boarding pass will be sent here"><label>From *</label><input name="from" required placeholder="e.g. LOS - Lagos"><label>To *</label><input name="to" required placeholder="e.g. JFK - New York"><label>Departure Date & Time *</label><input name="date" type="datetime-local" required><button class="btn" type="submit">Continue →</button></form>
<form action="/track" method="GET" class="track-box"><input name="code" placeholder="SKY-XXXXXX" required><button class="track-btn">Track</button></form></div></body></html>`);
});

app.post('/book',(req,res)=>{
const code=genCode();
bookings.push({id:Date.now(),code:code,trackingCode:code,bookingReference:code,name:req.body.name,email:req.body.email,from:req.body.from,to:req.body.to,destination:req.body.to,date:req.body.date,amount:5000,price:5000,status:'PENDING_PAYMENT',paid:false,createdAt:new Date()});
res.redirect('/pay/'+code);
});

app.get('/pay/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code);
if(!b) return res.send('Not found');
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="https://js.paystack.co/v1/inline.js"></script>
<style>body{font-family:Segoe UI;background:#f4f7fb;display:flex;justify-content:center;padding:20px}.card{background:#fff;max-width:420px;width:100%;border-radius:16px;padding:25px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.1)}h3{background:#0a1931;color:#fff;padding:12px;border-radius:10px;font-size:13px}.price{font-size:32px;font-weight:800;margin:15px 0;color:#0a1931}.pay-btn{background:#00b050;color:#fff;border:none;width:100%;padding:15px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer}.code{font-family:monospace;background:#eef2ff;padding:6px 12px;border-radius:8px;color:#185adb;font-weight:700}</style></head><body>
<div class="card"><h3>SECURE PAYMENT WITH PAYSTACK</h3><p style="margin-top:12px"><b>${b.name}</b><br>${b.from} → ${b.to}</p><p style="margin-top:8px">Tracking: <span class="code">${b.code}</span></p><div class="price">₦5,000</div><button class="pay-btn" onclick="payWithPaystack()">Pay with Paystack</button></div>
<script>function payWithPaystack(){var h=PaystackPop.setup({key:'pk_test_xxxxxxxxxx',email:'${b.email}',amount:500000,ref:'${b.code}_'+Math.floor(Math.random()*1000000),callback:function(r){window.location.href='/verify/${b.code}?ref='+r.reference},onClose:function(){alert('Closed')}});h.openIframe();}</script></body></html>`);
});

app.get('/verify/:code',(req,res)=>{
const b=bookings.find(x=>x.code===req.params.code); if(b){b.status='PAID';b.paid=true;}
res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Segoe UI;display:flex;justify-content:center;padding:30px;background:#f4f7fb}.card{background:#fff;max-width:420px;width:100%;padding:30px;border-radius:16px;text-align:center}</style></head><body><div class="card"><div style="font-size:50px">✅</div><h2 style="color:#00b050">Payment Successful!</h2><p>Your Permanent Code:</p><div style="font-family:monospace;background:#eef2ff;padding:10px;border-radius:8px;color:#185adb;font-weight:800;font-size:20px;margin:15px 0">${req.params.code}</div><a href="/track?code=${req.params.code}" style="display:block;background:#0a1931;color:#fff;padding:12px;border-radius:10px;text-decoration:none">Track Flight</a></div></body></html>`);
});

app.get('/track',(req,res)=>{
const b=bookings.find(x=>x.code===req.query.code);
if(!b) return res.send('<h3 style="text-align:center;margin-top:50px;font-family:sans-serif">❌ Code '+req.query.code+' Not Found</h3>');
res.send(`<div style="font-family:Segoe UI;padding:20px;max-width:500px;margin:0 auto"><h2 style="background:#0a1931;color:#fff;padding:15px;border-radius:12px;text-align:center">✈️ FLIGHT STATUS</h2><div style="background:#fff;padding:20px;border-radius:12px;margin-top:15px"><p><b>Code:</b> ${b.code}</p><p><b>Name:</b> ${b.name}</p><p><b>Route:</b> ${b.from} → ${b.to}</p><p><b>Status:</b> ${b.status}</p></div></div>`);
});

app.get('/api/bookings',(req,res)=>{ res.json(bookings); });

// --- SUPER AUTHENTIC PROFESSIONAL ADMIN PANEL ---
app.get('/skylink-admin-panel',(req,res)=>{
res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Skylink Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',sans-serif}
body{background:#f1f5f9}
.login-wrapper{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a1931 0%,#185adb 100%)}
.login-card{background:#fff;padding:40px 35px;border-radius:16px;width:95%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.dash{display:flex;min-height:100vh}
.sidebar{width:240px;background:#fff;border-right:1px solid #e2e8f0;padding:20px 15px;position:fixed;height:100vh}
.sidebar h2{color:#0a1931;font-size:18px;margin-bottom:25px} .logo{color:#185adb}
.menu a{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:10px;text-decoration:none;color:#475569;font-size:14px;margin-bottom:4px}
.menu a.active{background:#185adb;color:#fff;font-weight:600}
.main{margin-left:240px;flex:1}
.topbar{background:#0a1931;color:#fff;padding:14px 25px;display:flex;justify-content:space-between;align-items:center}
.topbar h1{font-size:20px;letter-spacing:.5px}
.content{padding:25px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-bottom:22px}
.stat{background:#fff;padding:22px;border-radius:14px;box-shadow:0 2px 10px rgba(0,0,0,.05);text-align:center;border:1px solid #eef2ff}
.stat h3{font-size:13px;color:#64748b;text-transform:uppercase} .stat p{font-size:32px;font-weight:800;color:#0f172a;margin-top:6px}
.stat span{font-size:13px;color:#16a34a;font-weight:600}
.table-card{background:#fff;border-radius:14px;box-shadow:0 2px 12px rgba(0,0,0,.06);overflow:hidden}
.table-head{padding:18px 20px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f1f5f9}
.table-head h3{font-size:16px} .search{padding:9px 14px;border:1px solid #e2e8f0;border-radius:10px;width:240px}
table{width:100%;border-collapse:collapse} th{background:#f8fafc;text-align:left;padding:13px 16px;font-size:11px;color:#64748b;text-transform:uppercase} td{padding:14px 16px;border-top:1px solid #f1f5f9;font-size:14px}
.code-badge{background:#185adb;color:#fff;padding:5px 12px;border-radius:20px;font-family:monospace;font-size:12px;font-weight:700}
.paid{background:#dcfce7;color:#166534;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700}
.pending{background:#fef9c3;color:#854d0e;padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700}
@media(max-width:800px){.sidebar{display:none}.main{margin-left:0}}
</style></head><body>
<div id="loginPage" class="login-wrapper"><div class="login-card"><div style="text-align:center;font-size:40px">✈️</div><h1 style="text-align:center;color:#0a1931;margin:10px 0">Skylink Admin</h1><p style="text-align:center;color:#666;font-size:13px;margin-bottom:20px">Secure Professional Access</p><div id="err" style="display:none;background:#ffebee;color:#c62828;padding:10px;border-radius:8px;font-size:13px;margin-bottom:12px">Incorrect password</div><input type="password" id="pwd" placeholder="Enter password Gos008800" style="width:100%;padding:14px;border:1.5px solid #ddd;border-radius:10px"><button onclick="doLogin()" style="width:100%;margin-top:12px;padding:14px;background:#185adb;color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer">Login to Dashboard</button></div></div>

<div id="dashPage" style="display:none" class="dash">
<div class="sidebar"><h2>✈️ SKYLINK <span class="logo">AIRLINES</span></h2>
<div class="menu">
<a class="active">✈️ Dashboard</a><a>🎟️ Bookings</a><a>👥 Passengers</a><a>🛫 Flights</a><a>📍 Tracking</a><a>📊 Analytics</a><a>📄 Reports</a><a style="margin-top:30px">⚙️ Settings</a><a onclick="logout()" style="cursor:pointer">🚪 Logout</a>
</div></div>
<div class="main">
<div class="topbar"><h1>SKYLINK ADMIN PANEL</h1><div style="display:flex;align-items:center;gap:12px"><span style="background:#185adb;padding:6px 12px;border-radius:20px;font-size:12px">AD Admin</span><span style="font-size:13px">admin@skylink.com</span></div></div>
<div class="content">
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px"><div><h2 style="font-size:24px">Dashboard Overview</h2><p style="color:#64748b;font-size:13px">Monitor bookings, revenue, and passenger activity in real time</p></div><div><button style="background:#185adb;color:#fff;border:none;padding:10px 16px;border-radius:10px;font-weight:600;margin-right:8px">+ New Booking</button><button style="background:#fff;border:1px solid #ddd;padding:10px 16px;border-radius:10px">⬇ Export CSV</button></div></div>

<div class="stats">
<div class="stat"><div style="font-size:28px">🎟️</div><h3>Total Bookings</h3><p id="total">0</p><span id="totalSub">Live data</span></div>
<div class="stat"><div style="font-size:28px">💲</div><h3>Total Revenue</h3><p id="revenue">₦0</p><span>vs last month</span></div>
<div class="stat"><div style="font-size:28px">📅</div><h3>Today's Bookings</h3><p id="today">0</p><span>Updated just now</span></div>
<div class="stat"><div style="font-size:28px">🎯</div><h3>Tracking Active</h3><p style="color:#16a34a">Live</p><span>Permanent Codes</span></div>
</div>

<div class="table-card">
<div class="table-head"><div><h3>Passenger Records</h3><p style="font-size:12px;color:#64748b">Recent passenger bookings and tracking status</p></div><div><input class="search" id="search" placeholder="🔍 Search passengers..." onkeyup="filterTable()"></div></div>
<div style="overflow-x:auto"><table><thead><tr><th>Tracking Code</th><th>Passenger</th><th>Route</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="tbody"><tr><td colspan="6" style="text-align:center;padding:30px">Loading bookings...</td></tr></tbody></table></div>
</div>

</div></div></div>

<script>
const ADMIN_PASS="Gos008800";
function doLogin(){if(document.getElementById('pwd').value===ADMIN_PASS){localStorage.setItem('skylink_admin_auth','true');showDash()}else{document.getElementById('err').style.display='block'}}
function showDash(){document.getElementById('loginPage').style.display='none';document.getElementById('dashPage').style.display='block';loadBookings()}
function logout(){localStorage.removeItem('skylink_admin_auth');location.reload()}
if(localStorage.getItem('skylink_admin_auth')==='true'){showDash()}
async function loadBookings(){
const res=await fetch('/api/bookings');const data=await res.json();
let rev=0;data.forEach(b=>{if(b.paid) rev+=b.amount});
document.getElementById('total').innerText=data.length;
document.getElementById('revenue').innerText='₦'+rev.toLocaleString();
document.getElementById('today').innerText=data.length;
if(data.length===0){document.getElementById('tbody').innerHTML='<tr><td colspan=6 style="text-align:center;padding:30px;color:#888">No bookings yet - Book a flight to test!</td></tr>';return}
document.getElementById('tbody').innerHTML=data.map(b=>'<tr><td><span class=code-badge>'+b.code+'</span></td><td><b>'+b.name+'</b><br><small style=color:#64748b>'+b.email+'</small></td><td>'+b.from+' → '+b.to+'</td><td>'+(b.date||'').toString().slice(0,10)+'</td><td>₦'+b.amount.toLocaleString()+'</td><td><span class='+(b.paid?'paid':'pending')+'>'+b.status+'</span></td></tr>').join('');
}
function filterTable(){let v=document.getElementById('search').value.toLowerCase();let rows=document.querySelectorAll('#tbody tr');rows.forEach(r=>{r.style.display=r.innerText.toLowerCase().includes(v)?'':'none'})}
</script></body></html>
`);
});

app.listen(PORT,'0.0.0.0',()=>console.log("Running "+PORT));
