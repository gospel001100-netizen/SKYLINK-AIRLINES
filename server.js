const express = require('express');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

if (!fs.existsSync('./tickets')) { try{ fs.mkdirSync('./tickets',{recursive:true}) }catch(e){} }
const DB_FILE = './tickets/bookings.json';
let bookings = {};
if (fs.existsSync(DB_FILE)) { try{ bookings = JSON.parse(fs.readFileSync(DB_FILE)) }catch(e){} }
function saveBookings(){ try{ fs.writeFileSync(DB_FILE, JSON.stringify(bookings,null,2)) }catch(e){} }

let transporter = null;
if(process.env.EMAIL_USER && process.env.EMAIL_PASS){
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS.replace(/\s/g,'') }
  });
}

let airports = {};
let allAirportsList = [];
function loadWorldAirports(){
  const fallback = {
    "LOS": ["Murtala Muhammed Intl","Lagos","Lagos","Nigeria","Africa/Lagos"],
    "ABV": ["Nnamdi Azikiwe Intl","Abuja","FCT","Nigeria","Africa/Lagos"],
    "BKK": ["Suvarnabhumi Intl","Bangkok","Bangkok","Thailand","Asia/Bangkok"],
    "JFK": ["John F Kennedy Intl","New York","New York","USA","America/New_York"],
    "LHR": ["Heathrow","London","London","UK","Europe/London"],
    "DXB": ["Dubai Intl","Dubai","Dubai","UAE","Asia/Dubai"]
  };
  airports = fallback;
  allAirportsList = Object.keys(fallback).map(code=>{
    let a=fallback[code]; return {code, name:a[0], city:a[1], country:a[3], label:code+' - '+a[0]+', '+a[1]+', '+a[3], tz:a[4]};
  });
  https.get('https://raw.githubusercontent.com/mwgg/Airports/master/airports.json', res=>{
    let data=''; res.on('data', c=> data+=c);
    res.on('end', ()=>{
      try{
        let json = JSON.parse(data);
        let newAirports={}; let newList=[];
        for(let key in json){
          let ap=json[key];
          let code = (ap.iata && ap.iata.length==3)? ap.iata.toUpperCase() : null;
          if(!code) continue;
          newAirports[code]=[ap.name||'',ap.city||'',ap.state||'',ap.country||'',ap.tz||'UTC'];
          newList.push({code, name:ap.name||'', city:ap.city||'', country:ap.country||'', label:code+' - '+ap.name+', '+ap.city+', '+ap.country, tz:ap.tz||'UTC'});
        }
        if(newList.length>5000){ airports=newAirports; allAirportsList=newList; console.log('Loaded',newList.length); }
      }catch(e){}
    });
  }).on('error', ()=>{});
}
loadWorldAirports();

function getTimezone(code){ if(!code) return "UTC"; let c=code.trim().substring(0,3).toUpperCase(); return airports[c]? airports[c][4] : "UTC"; }
function formatExactInput(dateTimeStr, tz){
  if(!dateTimeStr) return ""; try{
  let parts=dateTimeStr.split('T'); let d=parts[0].split('-'); let t=parts[1].split(':');
  let year=parseInt(d[0]); let month=parseInt(d[1])-1; let day=parseInt(d[2]); let hour=parseInt(t[0]); let minute=parseInt(t[1]);
  let months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h12=hour%12; if(h12===0)h12=12; let ampm=hour>=12?'PM':'AM'; return months[month]+' '+day+', '+year+', '+h12+':'+String(minute).padStart(2,'0')+' '+ampm+' - '+tz;
  }catch(e){ return dateTimeStr; }
}
function addHoursToInput(dateTimeStr, hours){
  let parts=dateTimeStr.split('T'); let d=parts[0].split('-'); let t=parts[1].split(':');
  let date=new Date(parseInt(d[0]),parseInt(d[1])-1,parseInt(d[2]),parseInt(t[0]),parseInt(t[1]));
  date.setHours(date.getHours()+hours);
  return date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0')+'T'+String(date.getHours()).padStart(2,'0')+':'+String(date.getMinutes()).padStart(2,'0');
}
function extractCode(input){ if(!input) return ''; let m1=input.match(/^([A-Z]{3})\b/i); if(m1) return m1[1].toUpperCase(); let m2=input.match(/\(([A-Z]{3})\)/i); if(m2) return m2[1].toUpperCase(); return input.substring(0,3).toUpperCase(); }
function randomSeat(){ let letters=['A','B','C','D','E','F']; return Math.floor(10+Math.random()*30)+letters[Math.floor(Math.random()*6)]; }
function randomGate(){ return 'G'+Math.floor(10+Math.random()*40); }
function randomTerminal(){ return 'T'+Math.floor(1+Math.random()*3); }

app.get('/search-airports', (req,res)=>{
  let q=(req.query.q||'').toLowerCase().trim(); if(!q) return res.json([]);
  let r=allAirportsList.filter(a=> a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) || a.country.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)).slice(0,18);
  res.json(r);
});

app.get('/', (req,res)=>{
  res.send(`<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>SKYLINK</title><style>body{font-family:Arial;background:#eef2f7;padding:12px;margin:0}.card{background:white;padding:22px;border-radius:20px;max-width:520px;margin:20px auto;box-shadow:0 12px 40px rgba(0,0,0,0.08)}.wrap{position:relative}.suggest{position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #ddd;border-radius:14px;max-height:300px;overflow-y:auto;z-index:9999;display:none;box-shadow:0 16px 40px rgba(0,0,0,0.18)}.item{padding:12px;border-bottom:1px solid #f0f0f0;cursor:pointer;display:flex;justify-content:space-between;align-items:center}.item:hover{background:#f0f6ff}.code{background:#00205b;color:white;padding:5px 10px;border-radius:7px;font-size:12px;font-weight:800} input{width:100%;padding:14px;margin:6px 0 12px;border-radius:12px;border:1.5px solid #d0d7e3;box-sizing:border-box;font-size:15px;background:#f7f9ff} button{width:100%;padding:15px;border-radius:12px;border:none;font-weight:800;cursor:pointer;font-size:16px}.btn-blue{background:#00205b;color:white}.btn-green{background:#0a9d4a;color:white}.badge{display:inline-block;background:#e6f0ff;color:#00205b;font-size:10px;font-weight:800;padding:4px 8px;border-radius:20px;margin-left:6px}</style></head><body><div class="card"><div style="text-align:center;margin-bottom:18px"><div style="display:inline-flex;align-items:center;gap:10px;background:#00205b;padding:12px 26px;border-radius:50px"><span style="font-size:22px">✈️</span><span style="color:white;font-weight:900;font-size:18px">SKYLINK</span><span style="color:#ffcc00;font-weight:900;font-size:18px">AIRLINES</span></div><div style="margin-top:8px;font-size:11px;font-weight:700;color:#6b7280">OFFICIAL BOOKING PORTAL</div></div><form action="/book" method="POST"><label style="font-weight:700;font-size:13px">Full Name *</label><input name="name" required placeholder="As on passport"><label style="font-weight:700;font-size:13px">Email *</label><input name="email" type="email" required placeholder="boarding pass will be sent here"><label style="font-weight:700;font-size:13px">From * <span class="badge">WORLDWIDE</span></label><div class="wrap"><input id="fromInput" name="from" required autocomplete="off" placeholder="e.g. LOS - Lagos"><div id="fromSuggest" class="suggest"></div></div><label style="font-weight:700;font-size:13px">To *</label><div class="wrap"><input id="toInput" name="to" required autocomplete="off" placeholder="e.g. JFK - New York"><div id="toSuggest" class="suggest"></div></div><label style="font-weight:700;font-size:13px">Departure Date & Time *</label><input name="depDateTime" type="datetime-local" required><button class="btn-blue">Continue →</button></form><br><form action="/track" method="GET"><div style="display:flex;gap:8px"><input name="code" placeholder="TRK-XXXXXXX" style="margin:0"><button class="btn-green" style="width:100px">Track</button></div></form></div><script>function setupSearch(inputId, boxId){var input=document.getElementById(inputId);var box=document.getElementById(boxId);var timer=null;input.addEventListener("input",function(){clearTimeout(timer);var q=input.value.trim();if(q.length<1){box.style.display="none";return;}timer=setTimeout(function(){fetch("/search-airports?q="+encodeURIComponent(q)).then(function(r){return r.json();}).then(function(list){if(!list.length){box.style.display="none";return;}var html="";for(var i=0;i<list.length;i++){var a=list[i];html+="<div class=item data-val=\\""+a.label.replace(/"/g,"&quot;")+"\\"><div><div style=\\"font-weight:700;font-size:13px\\">"+a.city+" - "+a.country+" <span style=\\"font-size:10px;color:#888\\">"+a.code+"</span></div><div style=\\"font-size:11px;color:#666\\">"+a.name+"</div></div><div class=code>"+a.code+"</div></div>";}box.innerHTML=html;box.style.display="block";var items=box.querySelectorAll(".item");for(var j=0;j<items.length;j++){items[j].addEventListener("click",function(){input.value=this.getAttribute("data-val");box.style.display="none";});}});},200);});document.addEventListener("click",function(e){if(!box.contains(e.target)&&e.target!==input)box.style.display="none";});}setupSearch("fromInput","fromSuggest");setupSearch("toInput","toSuggest");</script></body></html>`);
});

app.post('/book', (req,res)=>{
  let name=req.body.name, email=req.body.email, from=req.body.from, to=req.body.to, depDateTime=req.body.depDateTime;
  let fromCode=extractCode(from); let toCode=extractCode(to);
  let flightNumber='SKY-'+Math.floor(100+Math.random()*900);
  let trackingCode='TRK-'+Math.random().toString(36).substr(2,8).toUpperCase();
  let seat=randomSeat(); let gate=randomGate(); let terminal=randomTerminal();
  let depReal=new Date(depDateTime);
  bookings[trackingCode]={name,email,from,to,fromCode,toCode,flightNumber,seat,gate,terminal,depDateTime,depIso:depReal.toISOString(),fromTz:getTimezone(fromCode),toTz:getTimezone(toCode),paid:false,pending:false,created:new Date().toISOString()};
  saveBookings(); res.redirect('/pay/'+trackingCode);
});

app.get('/pay/:code', (req,res)=>{
  let b=bookings[req.params.code]; if(!b) return res.send('Invalid');
  if(b.paid) return res.send(`<div style="font-family:Arial;text-align:center;padding:40px"><h2 style="color:green">✅ Already Confirmed</h2><p>Boarding pass sent to ${b.email}</p><a href="/t/${req.params.code}">Track</a></div>`);
  if(b.pending) return res.send(`<div style="font-family:Arial;text-align:center;padding:40px"><h2>⏳ Pending</h2><p>Payment pending approval for ${b.name}<br>Will auto-email to ${b.email}</p></div>`);
  res.send(`<div style="font-family:Arial;max-width:480px;margin:auto;background:white;padding:22px;border-radius:18px;text-align:center"><div style="background:#00205b;color:white;padding:10px;border-radius:10px;font-weight:900">SECURE PAYMENT</div><p><b>${b.name}</b><br>${b.from} → ${b.to}<br><small>${b.flightNumber} | ${req.params.code}</small></p><div style="background:#f0f6ff;border:2px dashed #00205b;padding:18px;border-radius:14px;text-align:left"><div style="text-align:center;font-weight:900;color:#00205b">TRANSFER TO</div>Bank: OPAY (Paycom)<br><b>Account: Gospel Chimezirim Sylvester</b><br><div style="font-size:26px;font-weight:900;color:#00205b">7034997419</div></div><h1>₦5,000</h1><form action="/pay/${req.params.code}" method="POST"><button style="background:#28a745;color:white;padding:18px;width:100%;border:none;border-radius:12px;font-weight:900;font-size:18px">✅ I HAVE PAID</button></form></div>`);
});

app.post('/pay/:code', (req,res)=>{ let b=bookings[req.params.code]; if(!b) return res.send('Invalid'); b.pending=true; saveBookings(); res.send(`<div style="font-family:Arial;text-align:center;padding:50px"><h2>⏳ Received - Pending Verification</h2><p>Hi ${b.name}, boarding pass will be auto-emailed to ${b.email} after approval.</p><a href="/t/${req.params.code}">Track</a></div>`); });

function generateCleanPDF(code, b){
  return new Promise(async (resolve)=>{
    try{
      let dep=new Date(b.depIso); let fDep=formatExactInput(b.depDateTime, b.fromTz); let arrivalInput=addHoursToInput(b.depDateTime, 8); let fArr=formatExactInput(arrivalInput, b.toTz);
      let base='https://skylink-airlines.onrender.com'; let fp='./tickets/'+code+'.pdf';
      let qr=await QRCode.toDataURL(base+'/t/'+code);
      let doc=new PDFDocument({size:'A4',margin:0}); doc.pipe(fs.createWriteStream(fp));
      doc.rect(0,0,595,75).fill('#00205b'); doc.fillColor('white').fontSize(24).font('Helvetica-Bold').text('SKYLINK',40,20); doc.fillColor('#ffcc00').text('AIRLINES',145,20);
      doc.fillColor('black').fontSize(7).font('Helvetica').text('PASSENGER NAME',40,85); doc.font('Helvetica-Bold').fontSize(12).text(b.name.toUpperCase(),40,95);
      doc.font('Helvetica').fontSize(7).text('FROM',40,115); doc.font('Helvetica-Bold').fontSize(10).text(b.from,40,124,{width:300});
      doc.font('Helvetica').fontSize(7).text('TO',40,150); doc.font('Helvetica-Bold').fontSize(10).text(b.to,40,159,{width:300});
      doc.font('Helvetica').fontSize(7).text('FLIGHT',40,185); doc.font('Helvetica-Bold').fontSize(10).text(b.flightNumber,40,194);
      doc.font('Helvetica').fontSize(7).text('SEAT',200,185); doc.font('Helvetica-Bold').fontSize(12).text(b.seat,200,194);
      doc.font('Helvetica').fontSize(7).text('GATE',40,212); doc.font('Helvetica-Bold').fontSize(10).text(b.gate,40,221);
      doc.font('Helvetica').fontSize(7).text('TERMINAL',100,212); doc.font('Helvetica-Bold').fontSize(10).text(b.terminal,100,221);
      doc.font('Helvetica').fontSize(7).text('TRACKING',40,240); doc.font('Helvetica-Bold').fontSize(10).text(code,40,249);
      doc.font('Helvetica').fontSize(7).text('DEPARTURE',40,272); doc.font('Helvetica-Bold').fontSize(9).text(fDep,40,281,{width:320});
      doc.font('Helvetica').fontSize(7).text('ARRIVAL',40,300); doc.font('Helvetica-Bold').fontSize(9).text(fArr,40,309,{width:320});
      doc.image(qr,400,85,{width:150}); doc.fontSize(7).text('SCAN TO TRACK',400,240,{width:150,align:'center'}); doc.rect(395,80,160,175).stroke('#00205b');
      doc.rect(0,370,595,20).fill('#00205b'); doc.fillColor('white').fontSize(6).text('Official e-ticket - SKYLINK AIRLINES',40,376,{align:'center'}); doc.end(); doc.on('finish', ()=> resolve(fp));
    }catch(e){ resolve(null); }
  });
}

app.get('/t/:code', (req,res)=>{
  let b=bookings[req.params.code]; if(!b) return res.send('Invalid');
  if(!b.paid){ return res.send(`<div style="font-family:Arial;text-align:center;padding:40px"><h2>⏳ Pending Verification</h2><p>Flight ${b.fromCode}→${b.toCode} awaiting approval<br>${b.email}</p></div>`); }
  let dep=new Date(b.depIso), arr=new Date(dep.getTime()+480*60000), now=new Date();
  let fDep=formatExactInput(b.depDateTime, b.fromTz); let fArr=formatExactInput(addHoursToInput(b.depDateTime,8), b.toTz);
  function fmt(ms){ let m=Math.floor(Math.abs(ms)/60000); let h=Math.floor(m/60); let mm=m%60; return h>0? h+'h '+mm+'m' : mm+'m'; }
  let status='', info='', pct=0;
  if(now<dep){ status='Scheduled - Gate '+b.gate; info='Departs in '+fmt(dep-now); }
  else if(now<=arr){ let el=now-dep; pct=Math.round(el/(arr-dep)*100); status='In Flight '+pct+'%'; info='Air '+fmt(el)+' | '+fmt(arr-now)+' left'; }
  else { status='Landed '+b.toCode; info='Completed'; pct=100; }
  res.send(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:Arial;background:#eef2f7;margin:0;padding:18px}.card{max-width:520px;margin:auto;background:white;padding:20px;border-radius:16px}.status{background:#00205b;color:white;padding:12px;border-radius:12px;text-align:center;font-weight:800}</style></head><body><div class="card"><h2>✈️ SKYLINK LIVE ${b.flightNumber}</h2><p>${b.name} | ${b.fromCode}→${b.toCode} | Seat ${b.seat}</p><p><b>Dep:</b> ${fDep}<br><b>Arr:</b> ${fArr}</p><div class="status">${status}</div><p>${info}</p><div style="background:#eee;height:8px;border-radius:10px"><div style="background:#00205b;height:8px;width:${pct}%;border-radius:10px"></div></div><p><small>Tracking ${req.params.code}</small></p></div><script>setTimeout(()=>location.reload(),30000)</script></body></html>`);
});

// NEW SKYLINK ADMIN - PERMANENT TRACKING
app.get('/skylink-admin-panel', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skylink Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:Segoe UI,sans-serif}
body{background:#f4f7fb;min-height:100vh}
.login-wrapper{display:flex;justify-content:center;align-items:center;min-height:100vh;background:linear-gradient(135deg,#0a1931 0%,#185adb 100%)}
.login-card{background:#fff;padding:40px 35px;border-radius:16px;width:95%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.login-card h1{color:#0a1931;font-size:24px;margin-bottom:8px;text-align:center}
.login-card p{color:#666;font-size:14px;text-align:center;margin-bottom:25px}
.login-card input{width:100%;padding:14px;border:1.5px solid #ddd;border-radius:10px;font-size:16px;margin-bottom:15px}
.login-card button{width:100%;padding:14px;background:#185adb;color:#fff;border:none;border-radius:10px;font-size:16px;font-weight:600;cursor:pointer}
.error{background:#ffebee;color:#c62828;padding:10px;border-radius:8px;font-size:13px;margin-bottom:15px;display:none}
.header{background:#0a1931;color:#fff;padding:18px 25px;display:flex;justify-content:space-between;align-items:center}
.container{padding:20px;max-width:1200px;margin:0 auto}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-bottom:25px}
.stat-card{background:#fff;padding:20px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,.06);border-left:4px solid #185adb}
.stat-card h3{font-size:13px;color:#888;text-transform:uppercase}
.stat-card p{font-size:28px;font-weight:700;color:#0a1931;margin-top:5px}
.table-wrap{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.06)}
table{width:100%;border-collapse:collapse}th{background:#f8f9fa;text-align:left;padding:12px 15px;font-size:12px;color:#666;text-transform:uppercase}td{padding:14px 15px;border-top:1px solid #f0f0f0;font-size:14px}
.code{font-family:monospace;background:#eef2ff;padding:4px 8px;border-radius:6px;font-weight:700;color:#185adb}
.badge{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#e8f5e9;color:#2e7d32}
</style></head><body>
<div id="loginPage" class="login-wrapper">
<div class="login-card">
<div style="text-align:center;font-size:32px;margin-bottom:20px">✈️</div>
<h1>Skylink Admin</h1><p>Secure access - Authorized only</p>
<div id="err" class="error">Incorrect password</div>
<input type="password" id="pwd" placeholder="Enter admin password">
<button onclick="doLogin()">Login to Dashboard</button>
</div></div>
<div id="dashPage" style="display:none">
<div class="header"><h2>✈️ SKYLINK ADMIN PANEL</h2><a href="#" onclick="logout()" style="background:#185adb;color:#fff;padding:8px 16px;border-radius:8px;text-decoration:none;font-size:13px">Logout</a></div>
<div class="container">
<div class="stats">
<div class="stat-card"><h3>Total Bookings</h3><p id="total">0</p></div>
<div class="stat-card"><h3>Total Revenue</h3><p id="revenue">₦0</p></div>
<div class="stat-card"><h3>Today's Bookings</h3><p id="today">0</p></div>
<div class="stat-card"><h3>Tracking Active</h3><p style="color:#2e7d32">✓ Permanent</p></div>
</div>
<div class="table-wrap" style="padding:20px">
<h3>All Passenger Records & Permanent Tracking Codes</h3>
<div style="overflow-x:auto;margin-top:15px"><table><thead><tr><th>Tracking Code</th><th>Passenger</th><th>Route</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="tbody"><tr><td colspan="6" style="text-align:center;padding:30px;color:#999">Loading...</td></tr></tbody></table></div>
</div></div></div>
<script>
const ADMIN_PASS="Gos008800";
function doLogin(){const v=document.getElementById('pwd').value;if(v===ADMIN_PASS){localStorage.setItem('skylink_admin_auth','true');showDash()}else{document.getElementById('err').style.display='block'}}
function showDash(){document.getElementById('loginPage').style.display='none';document.getElementById('dashPage').style.display='block';loadBookings()}
function logout(){localStorage.removeItem('skylink_admin_auth');location.reload()}
if(localStorage.getItem('skylink_admin_auth')==='true'){showDash()}
async function loadBookings(){
 try{
  const res=await fetch('/api/bookings');
  const data=await res.json();
  let rev=0; data.forEach(b=>rev+=(b.amount||b.price||0));
  document.getElementById('total').innerText=data.length;
  document.getElementById('revenue').innerText='₦'+rev.toLocaleString();
  document.getElementById('today').innerText=data.length;
  document.getElementById('tbody').innerHTML=data.map(b=>'<tr><td><span class=code>'+(b.bookingReference||b.trackingCode||b.code||'SKY-'+(b._id||'').slice(-6).toUpperCase())+'</span></td><td>'+(b.name||b.passengerName||b.email||'Passenger')+'</td><td>'+(b.from||'')+' '+(b.from?'→':'')+' '+(b.to||b.destination||'')+'</td><td>'+(b.date||'').toString().slice(0,10)+'</td><td>₦'+(b.amount||b.price||0).toLocaleString()+'</td><td><span class=badge>PAID</span></td></tr>').join('');
 }catch(e){
  document.getElementById('tbody').innerHTML='<tr><td colspan=6 style=\"text-align:center;padding:20px\">Connect /api/bookings route to see real bookings. Your DB is safe!</td></tr>';
 }
}
</script></body></html>
  `);
});

app.get('/track', (req,res)=>{ if(!req.query.code) return res.send('Enter code'); res.redirect('/t/'+req.query.code); });
app.listen(PORT,'0.0.0.0', ()=> console.log('Running '+PORT));
