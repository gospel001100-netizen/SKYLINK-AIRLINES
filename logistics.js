// logistics.js
// SKYLINK LOGISTICS - REAL PAYSTACK + PERMANENT MONGODB RECORDS
// Designed to be installed alongside the existing SKYLINK AIRLINES V9 server.
// Does not modify existing Airlines booking logic.

const crypto = require('crypto');

let QRCode = null;
try {
  QRCode = require('qrcode');
} catch (e) {
  console.log('QRCode package not available.');
}

let mongoose = null;
try {
  mongoose = require('mongoose');
} catch (e) {
  console.log('Mongoose not available.');
}

let DateTime = null;
try {
  DateTime = require('luxon').DateTime;
} catch (e) {
  console.log('Luxon not available.');
}

const LOGISTICS_PRICE_NGN = 3000;
const LOGISTICS_AMOUNT_KOBO = LOGISTICS_PRICE_NGN * 100;

let LogisticsModel = null;
let logisticsReady = false;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function clean(value, max = 500) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function makeTrackingCode() {
  return (
    'SLK-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    crypto.randomBytes(3).toString('hex').toUpperCase()
  );
}

function makeShipmentId() {
  return (
    'SLS-' +
    Date.now().toString(36).toUpperCase() +
    '-' +
    crypto.randomBytes(3).toString('hex').toUpperCase()
  );
}

function makeReference() {
  return (
    'SLKLOG-' +
    Date.now().toString(36).toUpperCase() +
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );
}

function baseUrl(req) {
  const configured = String(
    process.env.PUBLIC_BASE_URL || 'https://www.skylinkairlines.com.ng'
  ).trim();

  return configured.replace(/\/+$/, '');
}

function trackingUrl(req, tracking) {
  return baseUrl(req) + '/logistics/track/' + encodeURIComponent(tracking);
}

function nowISO() {
  return new Date().toISOString();
}

function formatDate(iso, zone) {
  try {
    if (DateTime) {
      return DateTime.fromISO(iso, { zone: zone || 'UTC' }).toFormat(
        'dd LLL yyyy, hh:mm a ZZZZ'
      );
    }

    return new Date(iso).toLocaleString('en-US', {
      timeZone: zone || 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  } catch (e) {
    return new Date(iso).toISOString();
  }
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const p1 = Number(lat1) * Math.PI / 180;
  const p2 = Number(lat2) * Math.PI / 180;

  const dLat = (Number(lat2) - Number(lat1)) * Math.PI / 180;
  const dLon = (Number(lon2) - Number(lon1)) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(p1) *
      Math.cos(p2) *
      Math.sin(dLon / 2) ** 2;

  return Math.round(
    R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
}

/*
|--------------------------------------------------------------------------
| MongoDB
|--------------------------------------------------------------------------
*/

function createModel() {
  if (!mongoose || !mongoose.connection) return null;

  if (mongoose.models.SkylinkLogisticsShipment) {
    return mongoose.models.SkylinkLogisticsShipment;
  }

  const schema = new mongoose.Schema(
    {
      shipmentId: {
        type: String,
        unique: true,
        index: true
      },

      tracking: {
        type: String,
        unique: true,
        index: true
      },

      paymentReference: {
        type: String,
        unique: true,
        sparse: true,
        index: true
      },

      customerName: String,
      customerEmail: String,
      customerPhone: String,
      receiverName: String,

      originCountry: String,
      originCity: String,
      originAddress: String,

      destinationCountry: String,
      destinationCity: String,
      destinationAddress: String,

      originLat: Number,
      originLon: Number,

      destinationLat: Number,
      destinationLon: Number,

      originTimezone: String,
      destinationTimezone: String,

      distanceKm: Number,

      packageDescription: String,
      packageWeight: String,
      packageQuantity: String,
      shipDate: String,
      shipTime: String,

      status: {
        type: String,
        default: 'Payment Pending'
      },

      paymentStatus: {
        type: String,
        default: 'pending'
      },

      paymentVerified: {
        type: Boolean,
        default: false
      },

      currency: {
        type: String,
        default: 'NGN'
      },

      amountKobo: {
        type: Number,
        default: LOGISTICS_AMOUNT_KOBO
      },

      paystackReference: String,

      createdAt: String,
      paidAt: String,
      updatedAt: String,

      approvedAt: String,
      approvalText: {
        type: String,
        default: 'Electronically approved by Skylink Logistics'
      }
    },
    {
      collection: 'skylink_logistics_shipments',
      timestamps: false
    }
  );

  return mongoose.model(
    'SkylinkLogisticsShipment',
    schema
  );
}

async function initLogisticsDB() {
  if (!mongoose) {
    console.log('SKYLINK LOGISTICS: mongoose unavailable.');
    return;
  }

  if (mongoose.connection.readyState === 1) {
    LogisticsModel = createModel();
    logisticsReady = !!LogisticsModel;
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.log(
      'SKYLINK LOGISTICS WARNING: MONGODB_URI is not configured.'
    );
    console.log(
      'Logistics requires MongoDB for permanent production records.'
    );
    return;
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    LogisticsModel = createModel();
    logisticsReady = !!LogisticsModel;

    console.log('SKYLINK LOGISTICS MongoDB ready.');
  } catch (err) {
    console.error(
      'SKYLINK LOGISTICS MongoDB error:',
      err.message
    );
  }
}

/*
|--------------------------------------------------------------------------
| Paystack
|--------------------------------------------------------------------------
*/

function getPaystackSecret() {
  return String(process.env.PAYSTACK_SECRET_KEY || '').trim();
}

async function paystackRequest(endpoint, options = {}) {
  const secret = getPaystackSecret();

  if (!secret) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not configured on the server.'
    );
  }

  const response = await fetch(
    'https://api.paystack.co' + endpoint,
    {
      ...options,
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    }
  );

  let data;

  try {
    data = await response.json();
  } catch (e) {
    throw new Error(
      'Paystack returned an invalid response.'
    );
  }

  if (!response.ok || !data.status) {
    throw new Error(
      data.message || 'Paystack request failed.'
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Find shipment
|--------------------------------------------------------------------------
*/

async function findShipment(code) {
  if (!code) return null;

  if (LogisticsModel) {
    try {
      const doc = await LogisticsModel.findOne({
        $or: [
          { tracking: code },
          { shipmentId: code },
          { paymentReference: code },
          { paystackReference: code }
        ]
      });

      if (doc) return doc.toObject();
    } catch (e) {
      console.error(
        'Logistics MongoDB lookup:',
        e.message
      );
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| Save shipment
|--------------------------------------------------------------------------
*/

async function saveShipment(record) {
  if (!LogisticsModel) {
    throw new Error(
      'Logistics database is not ready. Configure MONGODB_URI on Render.'
    );
  }

  record.updatedAt = nowISO();

  const saved = await LogisticsModel.findOneAndUpdate(
    { tracking: record.tracking },
    record,
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true
    }
  );

  return saved.toObject();
}

/*
|--------------------------------------------------------------------------
| Electronic approval
|--------------------------------------------------------------------------
*/

function approvalMarkup(record) {
  return `
    <div style="
      margin-top:20px;
      border:1px solid #cbd5e1;
      border-radius:12px;
      padding:14px;
      background:#f8fafc;
    ">
      <div style="
        font-size:10px;
        font-weight:900;
        letter-spacing:1px;
        color:#64748b;
        text-transform:uppercase;
      ">
        Skylink Logistics Approval
      </div>

      <div style="
        font-family:cursive;
        font-size:26px;
        font-style:italic;
        font-weight:700;
        color:#0f2e6d;
        margin-top:5px;
      ">
        Skylink
      </div>

      <div style="
        font-size:11px;
        font-weight:800;
        color:#166534;
        margin-top:2px;
      ">
        ✓ Electronically Approved
      </div>

      <div style="
        font-size:10px;
        color:#64748b;
        margin-top:5px;
      ">
        ${escapeHtml(record.approvedAt || '')}
      </div>
    </div>
  `;
}

/*
|--------------------------------------------------------------------------
| Customer Logistics Home
|--------------------------------------------------------------------------
*/

function logisticsHome(req, res, airports) {
  const locations = Array.isArray(airports)
    ? airports
    : [];

  const locationJSON = JSON.stringify(
    locations.map(a => ({
      code: a.code,
      city: a.city,
      country: a.country,
      name: a.name,
      tz: a.tz,
      lat: a.lat,
      lon: a.lon
    }))
  );

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport"
      content="width=device-width,initial-scale=1">

<title>Skylink Logistics</title>

<style>
*{box-sizing:border-box}

body{
  margin:0;
  background:#f1f5f9;
  font-family:Arial,Helvetica,sans-serif;
  color:#0f172a;
}

.wrap{
  width:100%;
  min-height:100vh;
  padding:14px;
  display:flex;
  justify-content:center;
}

.card{
  width:100%;
  max-width:620px;
  background:#fff;
  border:1px solid #e2e8f0;
  border-radius:20px;
  padding:24px;
  box-shadow:0 10px 35px rgba(0,0,0,.08);
}

.logo{
  text-align:center;
  font-size:24px;
  font-weight:900;
  color:#0f2e6d;
}

.logo span{
  color:#facc15;
}

.sub{
  text-align:center;
  color:#64748b;
  font-size:11px;
  font-weight:800;
  letter-spacing:.8px;
  margin-top:5px;
  margin-bottom:24px;
}

.section{
  margin-top:22px;
  padding-top:18px;
  border-top:1px solid #e2e8f0;
}

h2{
  font-size:16px;
  margin:0 0 14px;
}

label{
  display:block;
  font-size:12px;
  font-weight:900;
  margin:14px 0 6px;
}

input,textarea{
  width:100%;
  border:1.5px solid #dbe3ec;
  border-radius:11px;
  padding:14px;
  font-size:16px;
  outline:none;
  background:#f8fafc;
}

textarea{
  min-height:80px;
  resize:vertical;
}

input:focus,
textarea:focus{
  border-color:#0f2e6d;
  background:#fff;
}

.location{
  position:relative;
}

.suggestions{
  display:none;
  position:absolute;
  left:0;
  right:0;
  top:100%;
  background:#fff;
  border:1px solid #dbe3ec;
  border-radius:10px;
  z-index:50;
  max-height:200px;
  overflow:auto;
  box-shadow:0 10px 25px rgba(0,0,0,.1);
}

.suggestions div{
  padding:12px;
  border-bottom:1px solid #f1f5f9;
  cursor:pointer;
  font-size:13px;
  font-weight:700;
}

.price{
  margin-top:20px;
  padding:16px;
  border-radius:12px;
  background:#eff6ff;
  border:1px solid #bfdbfe;
  text-align:center;
}

.price small{
  display:block;
  color:#475569;
  font-size:11px;
  font-weight:800;
}

.price strong{
  display:block;
  margin-top:5px;
  color:#0f2e6d;
  font-size:25px;
}

.pay{
  width:100%;
  border:0;
  border-radius:12px;
  padding:16px;
  margin-top:16px;
  background:#0f2e6d;
  color:#fff;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
}

.pay:disabled{
  opacity:.55;
}

.notice{
  margin-top:12px;
  font-size:11px;
  color:#64748b;
  text-align:center;
  line-height:1.5;
}

.trackBox{
  margin-top:24px;
  padding-top:20px;
  border-top:1px solid #e2e8f0;
}

.trackRow{
  display:flex;
  gap:8px;
}

.trackRow input{
  min-width:0;
}

.trackBtn{
  border:0;
  background:#16a34a;
  color:#fff;
  border-radius:10px;
  padding:0 18px;
  font-weight:900;
}

.msg{
  margin-top:12px;
  text-align:center;
  font-size:12px;
  font-weight:800;
}

@media(max-width:480px){
  .card{
    padding:18px;
  }

  .trackRow{
    flex-direction:column;
  }

  .trackBtn{
    min-height:48px;
  }
}
</style>
</head>

<body>

<div class="wrap">
<div class="card">

<div class="logo">
  SKYLINK <span>LOGISTICS</span>
</div>

<div class="sub">
  SHIPMENT BOOKING & TRACKING
</div>

<form id="logisticsForm">

<label>Customer Name *</label>
<input
  id="customerName"
  required
  maxlength="120"
  placeholder="Full name">

<label>Email *</label>
<input
  id="customerEmail"
  type="email"
  required
  maxlength="160"
  placeholder="Email address">

<label>Phone *</label>
<input
  id="customerPhone"
  required
  maxlength="40"
  placeholder="Phone number">

<label>Receiver Name *</label>
<input
  id="receiverName"
  required
  maxlength="120"
  placeholder="Receiver full name">

<div class="section">

<h2>Shipment Route</h2>

<label>From *</label>

<div class="location">
<input
  id="origin"
  required
  autocomplete="off"
  placeholder="City / airport">

<div
  id="originSuggestions"
  class="suggestions">
</div>
</div>

<label>To *</label>

<div class="location">
<input
  id="destination"
  required
  autocomplete="off"
  placeholder="City / airport">

<div
  id="destinationSuggestions"
  class="suggestions">
</div>
</div>

<label>Origin Address</label>
<textarea
  id="originAddress"
  maxlength="500"
  placeholder="Pickup / origin address"></textarea>

<label>Destination Address</label>
<textarea
  id="destinationAddress"
  maxlength="500"
  placeholder="Delivery / destination address"></textarea>

<label>Shipment Date</label>
<input
  id="shipDate"
  type="date"
  required
>

<label>Shipment Time</label>
<input
  id="shipTime"
  type="time"
  required
>

</div>

<div class="section">

<h2>Package Information</h2>

<label>Description *</label>
<input
  id="packageDescription"
  required
  maxlength="250"
  placeholder="e.g. Documents, clothing, electronics">

<label>Weight</label>
<input
  id="packageWeight"
  maxlength="50"
  placeholder="e.g. 2 KG">

<label>Quantity</label>
<input
  id="packageQuantity"
  maxlength="30"
  placeholder="e.g. 1">

</div>

<div class="price">
  <small>LOGISTICS SERVICE FEE</small>
  <strong>NGN 3,000</strong>
</div>

<button
  id="payButton"
  class="pay"
  type="submit">
  Continue to Secure Payment
</button>

<div class="notice">
  Payment is processed securely through Paystack.
  The receipt generated after successful payment does not display
  the service fee.
</div>

</form>

<div class="trackBox">

<h2>Track a Shipment</h2>

<div class="trackRow">
<input
  id="trackingInput"
  placeholder="SLK-XXXXXXXX">
<button
  class="trackBtn"
  type="button"
  onclick="trackShipment()">
  Track
</button>
</div>

<div
  id="message"
  class="msg">
</div>

</div>

</div>
</div>

<script src="https://js.paystack.co/v1/inline.js"><\/script>

<script>

const locations = ${locationJSON};

let selectedOrigin = null;
let selectedDestination = null;
let paymentReference = null;

function setupLocation(inputId, boxId, setter){

  const input = document.getElementById(inputId);
  const box = document.getElementById(boxId);

  input.addEventListener("input", function(){

    const q = input.value.trim().toLowerCase();

    selectedOrigin = inputId === "origin"
      ? null
      : selectedOrigin;

    selectedDestination = inputId === "destination"
      ? null
      : selectedDestination;

    if(!q){
      box.style.display = "none";
      return;
    }

    const results = locations
      .filter(function(a){
        return (
          (a.code+" "+a.city+" "+a.country+" "+a.name)
          .toLowerCase()
          .includes(q)
        );
      })
      .slice(0,10);

    if(!results.length){
      box.style.display = "none";
      return;
    }

    box.innerHTML = results.map(function(a){

      return '<div data-code="' +
        a.code +
        '">' +
        '<b>' + a.code + '</b> - ' +
        a.city + ', ' +
        a.country +
        ' - ' +
        a.name +
        '</div>';

    }).join("");

    box.style.display = "block";

    box.querySelectorAll("div").forEach(function(el){

      el.addEventListener("click", function(){

        const a = locations.find(
          function(x){
            return x.code === el.dataset.code;
          }
        );

        if(!a) return;

        setter(a);

        input.value =
          a.code +
          " - " +
          a.city +
          ", " +
          a.country;

        box.style.display = "none";
      });

    });

  });
}

setupLocation(
  "origin",
  "originSuggestions",
  function(a){
    selectedOrigin = a;
  }
);

setupLocation(
  "destination",
  "destinationSuggestions",
  function(a){
    selectedDestination = a;
  }
);

function trackShipment(){

  const code =
    document.getElementById("trackingInput")
    .value.trim();

  if(!code){
    document.getElementById("message").innerText =
      "Enter your tracking number.";
    return;
  }

  window.location.href =
    "/logistics/track/" +
    encodeURIComponent(code);
}

document
  .getElementById("logisticsForm")
  .addEventListener("submit", async function(e){

    e.preventDefault();

    const button =
      document.getElementById("payButton");

    if(!selectedOrigin || !selectedDestination){

      document.getElementById("message").innerText =
        "Please select a valid origin and destination.";

      return;
    }

    if(
      selectedOrigin.code ===
      selectedDestination.code
    ){

      document.getElementById("message").innerText =
        "Origin and destination cannot be the same.";

      return;
    }

    button.disabled = true;
    button.innerText =
      "Preparing Secure Payment...";

    const payload = {

      customerName:
        document.getElementById("customerName")
        .value.trim(),

      customerEmail:
        document.getElementById("customerEmail")
        .value.trim(),

      customerPhone:
        document.getElementById("customerPhone")
        .value.trim(),

      receiverName:
        document.getElementById("receiverName")
        .value.trim(),

      originCountry:
        selectedOrigin.country,

      originCity:
        selectedOrigin.city,

      originAddress:
        document.getElementById("originAddress")
        .value.trim(),

      destinationCountry:
        selectedDestination.country,

      destinationCity:
        selectedDestination.city,

      destinationAddress:
        document.getElementById("destinationAddress")
        .value.trim(),

      originLat:
        selectedOrigin.lat,

      originLon:
        selectedOrigin.lon,

      destinationLat:
        selectedDestination.lat,

      destinationLon:
        selectedDestination.lon,

      originTimezone:
        selectedOrigin.tz,

      destinationTimezone:
        selectedDestination.tz,

      packageDescription:
        document.getElementById("packageDescription")
        .value.trim(),

      packageWeight:
        document.getElementById("packageWeight")
        .value.trim(),

      packageQuantity:
        document.getElementById("packageQuantity")
        .value.trim(),

      shipDate:
        document.getElementById("shipDate")
        .value.trim(),

      shipTime:
        document.getElementById("shipTime")
        .value.trim()

    };

    try{

      const response =
        await fetch(
          "/api/logistics/payment/initialize",
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json"
            },
            body:JSON.stringify(payload)
          }
        );

      const data = await response.json();

      if(!response.ok || !data.status){

        throw new Error(
          data.error ||
          "Unable to initialize payment."
        );
      }

      paymentReference =
        data.reference;

      if(
        typeof PaystackPop ===
        "undefined"
      ){

        throw new Error(
          "Paystack checkout failed to load."
        );
      }

      const handler =
        PaystackPop.setup({

          key:
            data.publicKey,

          email:
            payload.customerEmail,

          amount:
            data.amount,

          currency:"NGN",

          ref:
            data.reference,

          callback:
            function(response){

              verifyPayment(
                response.reference,
                button
              );

            },

          onClose:
            function(){

              button.disabled = false;

              button.innerText =
                "Continue to Secure Payment";

            }

        });

      handler.openIframe();

    }catch(err){

      button.disabled = false;

      button.innerText =
        "Continue to Secure Payment";

      document.getElementById("message")
        .innerText =
        err.message ||
        "Payment initialization failed.";

    }

  });

async function verifyPayment(reference, button){

  button.disabled = true;
  button.innerText =
    "Verifying Payment...";

  try{

    const response =
      await fetch(
        "/api/logistics/payment/verify",
        {
          method:"POST",
          headers:{
            "Content-Type":"application/json"
          },
          body:JSON.stringify({
            reference:reference
          })
        }
      );

    const data =
      await response.json();

    if(
      !response.ok ||
      !data.status ||
      !data.receiptUrl
    ){

      throw new Error(
        data.error ||
        "Payment verification failed."
      );

    }

    window.location.href =
      data.receiptUrl;

  }catch(err){

    button.disabled = false;

    button.innerText =
      "Continue to Secure Payment";

    document.getElementById("message")
      .innerText =
      err.message ||
      "Unable to verify payment.";

  }

}

document.addEventListener(
  "click",
  function(e){

    if(!e.target.closest(".location")){

      document
        .querySelectorAll(".suggestions")
        .forEach(function(x){
          x.style.display = "none";
        });

    }

  }
);

<\/script>

</body>
</html>
`);
}

/*
|--------------------------------------------------------------------------
| Payment initialization
|--------------------------------------------------------------------------
*/

async function initializePayment(req, res) {

  try {

    const body = req.body || {};

    const customerName =
      clean(body.customerName, 120);

    const customerEmail =
      clean(body.customerEmail, 160);

    const customerPhone =
      clean(body.customerPhone, 40);

    const receiverName =
      clean(body.receiverName, 120);

    const originCountry =
      clean(body.originCountry, 100);

    const originCity =
      clean(body.originCity, 100);

    const destinationCountry =
      clean(body.destinationCountry, 100);

    const destinationCity =
      clean(body.destinationCity, 100);

    const packageDescription =
      clean(body.packageDescription, 250);

    const shipDate =
      clean(body.shipDate, 30);

    const shipTime =
      clean(body.shipTime, 30);

    if(
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !receiverName ||
      !originCountry ||
      !originCity ||
      !destinationCountry ||
      !destinationCity ||
      !packageDescription ||
      !shipDate ||
      !shipTime
    ) {

      return res.status(400).json({
        status:false,
        error:"Please complete all required shipment fields."
      });

    }

    if(
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        customerEmail
      )
    ){

      return res.status(400).json({
        status:false,
        error:"Please enter a valid email address."
      });

    }

    if(!LogisticsModel){

      return res.status(503).json({
        status:false,
        error:
          "Logistics database is not available. Configure MONGODB_URI on Render."
      });

    }

    const shipmentId =
      makeShipmentId();

    const tracking =
      makeTrackingCode();

    const reference =
      makeReference();

    const originLat =
      Number(body.originLat);

    const originLon =
      Number(body.originLon);

    const destinationLat =
      Number(body.destinationLat);

    const destinationLon =
      Number(body.destinationLon);

    let distanceKm = 0;

    if(
      Number.isFinite(originLat) &&
      Number.isFinite(originLon) &&
      Number.isFinite(destinationLat) &&
      Number.isFinite(destinationLon)
    ){

      distanceKm =
        haversine(
          originLat,
          originLon,
          destinationLat,
          destinationLon
        );

    }

    const record = {

      shipmentId,

      tracking,

      paymentReference:reference,

      customerName,

      customerEmail,

      customerPhone,

      receiverName,

      originCountry,

      originCity,

      originAddress:
        clean(body.originAddress, 500),

      destinationCountry,

      destinationCity,

      destinationAddress:
        clean(body.destinationAddress, 500),

      originLat:
        Number.isFinite(originLat)
          ? originLat
          : null,

      originLon:
        Number.isFinite(originLon)
          ? originLon
          : null,

      destinationLat:
        Number.isFinite(destinationLat)
          ? destinationLat
          : null,

      destinationLon:
        Number.isFinite(destinationLon)
          ? destinationLon
          : null,

      originTimezone:
        clean(body.originTimezone, 100) ||
        "UTC",

      destinationTimezone:
        clean(body.destinationTimezone, 100) ||
        "UTC",

      distanceKm,

      packageDescription,

      shipDate,

      shipTime,

      packageWeight:
        clean(body.packageWeight, 50),

      packageQuantity:
        clean(body.packageQuantity, 30),

      status:"Payment Pending",

      paymentStatus:"pending",

      paymentVerified:false,

      currency:"NGN",

      amountKobo:
        LOGISTICS_AMOUNT_KOBO,

      paystackReference:
        reference,

      createdAt:
        nowISO(),

      paidAt:null,

      updatedAt:
        nowISO(),

      approvedAt:null,

      approvalText:
        "Electronically approved by Skylink Logistics"
    };

    await saveShipment(record);

    const paystack =
      await paystackRequest(
        "/transaction/initialize",
        {
          method:"POST",
          body:JSON.stringify({

            email:
              customerEmail,

            amount:
              LOGISTICS_AMOUNT_KOBO,

            currency:"NGN",

            reference,

            callback_url:
              baseUrl(req) +
              "/logistics/payment/callback",

            metadata:{
              service:"SKYLINK LOGISTICS",
              shipment_id:shipmentId,
              tracking_code:tracking
            }

          })
        }
      );

    return res.json({

      status:true,

      publicKey:
        process.env.PAYSTACK_PUBLIC_KEY || "",

      reference,

      accessCode:
        paystack.data &&
        paystack.data.access_code,

      authorizationUrl:
        paystack.data &&
        paystack.data.authorization_url,

      amount:
        LOGISTICS_AMOUNT_KOBO,

      shipmentId,

      tracking

    });

  } catch(err){

    console.error(
      "LOGISTICS PAYMENT INITIALIZE:",
      err
    );

    return res.status(500).json({

      status:false,

      error:
        err.message ||
        "Unable to initialize Logistics payment."

    });

  }

}

/*
|--------------------------------------------------------------------------
| Verify payment
|--------------------------------------------------------------------------
*/

async function verifyPayment(req, res){

  try{

    const reference =
      clean(
        req.body &&
        req.body.reference,
        150
      );

    if(!reference){

      return res.status(400).json({

        status:false,

        error:"Payment reference is required."

      });

    }

    const paystack =
      await paystackRequest(
        "/transaction/verify/" +
        encodeURIComponent(reference),
        {
          method:"GET"
        }
      );

    const transaction =
      paystack.data;

    if(!transaction){

      return res.status(400).json({

        status:false,

        error:"Paystack transaction not found."

      });

    }

    /*
    |--------------------------------------------------------------------------
    | CRITICAL PAYMENT CHECKS
    |--------------------------------------------------------------------------
    */

    if(transaction.status !== "success"){

      return res.status(400).json({

        status:false,

        error:
          "Payment has not been confirmed as successful."

      });

    }

    if(
      Number(transaction.amount) !==
      LOGISTICS_AMOUNT_KOBO
    ){

      return res.status(400).json({

        status:false,

        error:
          "Payment amount does not match the required Logistics fee."

      });

    }

    if(
      String(transaction.currency || "")
        .toUpperCase() !== "NGN"
    ){

      return res.status(400).json({

        status:false,

        error:
          "Invalid payment currency."

      });

    }

    const record =
      await findShipment(reference);

    if(!record){

      return res.status(404).json({

        status:false,

        error:
          "Logistics shipment associated with this payment was not found."

      });

    }

    /*
    |--------------------------------------------------------------------------
    | Prevent duplicate fulfillment
    |--------------------------------------------------------------------------
    */

    if(record.paymentVerified){

      return res.json({

        status:true,

        alreadyProcessed:true,

        tracking:
          record.tracking,

        receiptUrl:
          "/logistics/receipt/" +
          encodeURIComponent(
            record.tracking
          )

      });

    }

    record.paymentStatus =
      "success";

    record.paymentVerified =
      true;

    record.paystackReference =
      reference;

    record.paidAt =
      nowISO();

    record.approvedAt =
      nowISO();

    record.status =
      "Shipment Booked";

    record.approvalText =
      "Electronically approved by Skylink Logistics";

    await saveShipment(record);

    return res.json({

      status:true,

      tracking:
        record.tracking,

      shipmentId:
        record.shipmentId,

      receiptUrl:
        "/logistics/receipt/" +
        encodeURIComponent(
          record.tracking
        )

    });

  } catch(err){

    console.error(
      "LOGISTICS PAYMENT VERIFY:",
      err
    );

    return res.status(500).json({

      status:false,

      error:
        err.message ||
        "Payment verification failed."

    });

  }

}

/*
|--------------------------------------------------------------------------
| Paystack Webhook
|--------------------------------------------------------------------------
*/

async function webhook(req, res){

  try{

    const secret =
      getPaystackSecret();

    if(!secret){

      return res
        .status(500)
        .send("Webhook secret not configured.");

    }

    const signature =
      req.headers[
        "x-paystack-signature"
      ];

    if(!signature){

      return res
        .status(401)
        .send("Missing signature.");

    }

    const rawBody =
      JSON.stringify(req.body);

    const expected =
      crypto
        .createHmac(
          "sha512",
          secret
        )
        .update(rawBody)
        .digest("hex");

    if(
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expected)
      )
    ){

      return res
        .status(401)
        .send("Invalid signature.");

    }

    const event =
      req.body || {};

    if(
      event.event !==
      "charge.success"
    ){

      return res.send("OK");

    }

    const transaction =
      event.data || {};

    const reference =
      transaction.reference;

    if(!reference){

      return res.send("OK");

    }

    if(
      transaction.status !==
      "success"
    ){

      return res.send("OK");

    }

    if(
      Number(transaction.amount) !==
      LOGISTICS_AMOUNT_KOBO
    ){

      console.log(
        "LOGISTICS WEBHOOK amount mismatch:",
        reference
      );

      return res.send("OK");

    }

    if(
      String(transaction.currency || "")
        .toUpperCase() !== "NGN"
    ){

      return res.send("OK");

    }

    const record =
      await findShipment(reference);

    if(!record){

      console.log(
        "Logistics webhook shipment not found:",
        reference
      );

      return res.send("OK");

    }

    if(!record.paymentVerified){

      record.paymentStatus =
        "success";

      record.paymentVerified =
        true;

      record.paystackReference =
        reference;

      record.paidAt =
        nowISO();

      record.approvedAt =
        nowISO();

      record.status =
        "Shipment Booked";

      await saveShipment(record);

    }

    return res.send("OK");

  } catch(err){

    console.error(
      "LOGISTICS WEBHOOK:",
      err
    );

    return res
      .status(500)
      .send("Webhook processing error.");

  }

}

/*
|--------------------------------------------------------------------------
| Receipt
|--------------------------------------------------------------------------
*/

async function receipt(req, res){

  const code =
    clean(req.params.code, 150);

  const record =
    await findShipment(code);

  if(!record){

    return res.status(404).send(
      notFoundPage(
        "Logistics Receipt Not Found"
      )
    );

  }

  if(!record.paymentVerified){

    return res.status(403).send(
      notFoundPage(
        "Receipt Available After Confirmed Payment"
      )
    );

  }

  const link =
    trackingUrl(
      req,
      record.tracking
    );

  let qr = "";

  if(QRCode){

    try{

      qr =
        await QRCode.toDataURL(
          link,
          {
            width:220,
            margin:2,
            errorCorrectionLevel:"H"
          }
        );

    }catch(e){

      console.error(
        "QR generation:",
        e
      );

    }

  }

  const originTime =
    formatDate(
      record.createdAt,
      record.originTimezone
    );

  const trackingTime =
    formatDate(
      record.createdAt,
      record.destinationTimezone
    );

  const qrHtml =
    qr
      ? `<img src="${qr}"
              alt="Shipment tracking barcode"
              style="width:210px;height:210px;display:block;margin:auto">`
      : `
        <div style="
          width:210px;
          height:210px;
          display:flex;
          align-items:center;
          justify-content:center;
          border:1px solid #ddd;
          margin:auto;
          font-weight:800;
        ">
          TRACKING QR
        </div>
      `;

  /*
  IMPORTANT:
  The NGN 3,000 amount is deliberately NOT printed anywhere
  in this receipt.
  */

  res.send(`
<!DOCTYPE html>
<html>
<head>

<meta charset="utf-8">

<meta
 name="viewport"
 content="width=device-width,initial-scale=1">

<title>
Skylink Logistics Receipt ${escapeHtml(record.tracking)}
</title>

<style>

*{
 box-sizing:border-box;
}

body{
 margin:0;
 background:#eef2f7;
 font-family:Arial,Helvetica,sans-serif;
 color:#111827;
}

.page{
 width:100%;
 min-height:100vh;
 padding:14px;
 display:flex;
 justify-content:center;
}

.receipt{
 width:100%;
 max-width:760px;
 background:#fff;
 border:1px solid #dbe3ec;
 border-radius:18px;
 overflow:hidden;
 box-shadow:0 10px 35px rgba(0,0,0,.08);
}

.header{
 background:#0f2e6d;
 color:#fff;
 padding:22px;
 display:flex;
 justify-content:space-between;
 gap:20px;
 align-items:center;
}

.logo{
 font-size:23px;
 font-weight:900;
}

.logo span{
 color:#facc15;
}

.headerSmall{
 font-size:9px;
 opacity:.85;
 margin-top:5px;
 letter-spacing:.6px;
}

.approved{
 background:#dcfce7;
 color:#166534;
 padding:8px 12px;
 border-radius:20px;
 font-size:10px;
 font-weight:900;
 white-space:nowrap;
}

.body{
 padding:22px;
}

.receiptTitle{
 font-size:19px;
 font-weight:900;
 margin-bottom:18px;
}

.grid{
 display:grid;
 grid-template-columns:1fr 1fr;
 gap:12px;
}

.item{
 border:1px solid #e2e8f0;
 border-radius:11px;
 padding:12px;
}

.label{
 font-size:9px;
 font-weight:900;
 color:#64748b;
 text-transform:uppercase;
 letter-spacing:.5px;
}

.value{
 font-size:13px;
 font-weight:800;
 margin-top:5px;
 line-height:1.4;
 word-break:break-word;
}

.route{
 margin-top:15px;
 border:1px solid #dbeafe;
 background:#eff6ff;
 border-radius:12px;
 padding:15px;
}

.routeLine{
 font-size:16px;
 font-weight:900;
 color:#0f2e6d;
}

.qrSection{
 margin-top:20px;
 border-top:1px dashed #cbd5e1;
 padding-top:20px;
 text-align:center;
}

.scanText{
 margin-top:8px;
 font-size:11px;
 font-weight:900;
 color:#0f2e6d;
}

.scanSub{
 margin-top:4px;
 font-size:10px;
 color:#64748b;
}

.actions{
 display:flex;
 flex-wrap:wrap;
 gap:8px;
 margin-top:20px;
}

button{
 border:0;
 border-radius:9px;
 padding:12px 15px;
 font-size:12px;
 font-weight:900;
 cursor:pointer;
}

.download{
 background:#16a34a;
 color:#fff;
}

.copy{
 background:#0f2e6d;
 color:#fff;
}

.track{
 background:#fff;
 color:#0f2e6d;
 border:1.5px solid #0f2e6d;
}

.approval{
 margin-top:20px;
}

.footer{
 background:#0f2e6d;
 color:#cbd5e1;
 padding:12px;
 text-align:center;
 font-size:9px;
 line-height:1.5;
}

.message{
 text-align:center;
 color:#16a34a;
 font-size:11px;
 font-weight:800;
 margin-top:8px;
 display:none;
}

@media(max-width:600px){

 .header{
   flex-direction:column;
   align-items:flex-start;
 }

 .grid{
   grid-template-columns:1fr;
 }

 .actions button{
   width:100%;
 }

}

@media print{

 body{
   background:#fff;
 }

 .page{
   padding:0;
 }

 .receipt{
   box-shadow:none;
   border:0;
 }

 .actions,
 .message{
   display:none !important;
 }

}

</style>

</head>

<body>

<div class="page">

<div class="receipt" id="receipt">

<div class="header">

<div>

<div class="logo">
SKYLINK <span>LOGISTICS</span>
</div>

<div class="headerSmall">
OFFICIAL SHIPMENT RECEIPT
</div>

</div>

<div class="approved">
✓ PAYMENT VERIFIED
</div>

</div>

<div class="body">

<div class="receiptTitle">
Shipment Receipt
</div>

<div class="grid">

<div class="item">
<div class="label">Shipment ID</div>
<div class="value">
${escapeHtml(record.shipmentId)}
</div>
</div>

<div class="item">
<div class="label">Tracking Number</div>
<div class="value">
${escapeHtml(record.tracking)}
</div>
</div>

<div class="item">
<div class="label">Customer</div>
<div class="value">
${escapeHtml(record.customerName)}
</div>
</div>

<div class="item">
<div class="label">Receiver Name</div>
<div class="value">
${escapeHtml(record.receiverName)}
</div>
</div>

<div class="item">
<div class="label">Phone</div>
<div class="value">
${escapeHtml(record.customerPhone)}
</div>
</div>

<div class="item">
<div class="label">Email</div>
<div class="value">
${escapeHtml(record.customerEmail)}
</div>
</div>

<div class="item">
<div class="label">Shipment Status</div>
<div class="value" style="color:#16a34a">
${escapeHtml(record.status)}
</div>
</div>

</div>

<div class="route">

<div class="label">
Shipment Route
</div>

<div class="routeLine">
${escapeHtml(record.originCity)},
${escapeHtml(record.originCountry)}
&nbsp; → &nbsp;
${escapeHtml(record.destinationCity)},
${escapeHtml(record.destinationCountry)}
</div>

<div style="
 margin-top:8px;
 font-size:11px;
 color:#64748b;
">
Distance:
${escapeHtml(record.distanceKm || 0)} km
</div>

</div>

<div class="grid" style="margin-top:15px">

<div class="item">
<div class="label">Package</div>
<div class="value">
${escapeHtml(record.packageDescription)}
</div>
</div>

<div class="item">
<div class="label">Weight</div>
<div class="value">
${escapeHtml(record.packageWeight || "Not specified")}
</div>
</div>

<div class="item">
<div class="label">Quantity</div>
<div class="value">
${escapeHtml(record.packageQuantity || "Not specified")}
</div>
</div>

<div class="item">
<div class="label">Issued</div>
<div class="value">
${escapeHtml(originTime)}
</div>
</div>

</div>

<div class="qrSection">

${qrHtml}

<div class="scanText">
SCAN TO TRACK THIS SHIPMENT
</div>

<div class="scanSub">
Scanning this code opens the shipment tracking page.
</div>

</div>

<div class="approval">

${approvalMarkup(record)}

</div>

<div class="actions">

<button
 class="download"
 onclick="downloadReceipt()">
 Download Receipt
</button>

<button
 class="copy"
 onclick="copyTracking()">
 Copy Tracking Link
</button>

<button
 class="track"
 onclick="openTracking()">
 Track Shipment
</button>

</div>

<div
 id="message"
 class="message">
</div>

</div>

<div class="footer">
Skylink Logistics • Shipment document •
Electronically approved by Skylink Logistics
</div>

</div>

</div>

<script>

const trackingLink =
${JSON.stringify(link)};

function showMessage(text){

 const el =
   document.getElementById("message");

 el.innerText = text;
 el.style.display = "block";

 setTimeout(function(){
   el.style.display = "none";
 },4000);

}

async function copyTracking(){

 try{

   if(
     navigator.clipboard &&
     window.isSecureContext
   ){

     await navigator.clipboard
       .writeText(trackingLink);

     showMessage(
       "Tracking link copied: " +
       trackingLink
     );

     return;
   }

 }catch(e){}

 const textarea =
   document.createElement("textarea");

 textarea.value =
   trackingLink;

 textarea.style.position =
   "fixed";

 textarea.style.left =
   "-9999px";

 document.body.appendChild(
   textarea
 );

 textarea.select();

 try{
   document.execCommand("copy");
 }catch(e){}

 textarea.remove();

 showMessage(
   "Tracking link copied: " +
   trackingLink
 );

}

function openTracking(){

 window.location.href =
   trackingLink;

}

function downloadReceipt(){

 /*
  The downloaded document contains no service price.
  It opens as a standalone HTML receipt that can be
  saved on the phone.
 */

 const receipt =
   document.getElementById("receipt");

 const clone =
   receipt.cloneNode(true);

 clone
   .querySelectorAll(".actions,.message")
   .forEach(function(x){
     x.remove();
   });

 const html =
 '<!DOCTYPE html>' +
 '<html><head>' +
 '<meta charset="utf-8">' +
 '<meta name="viewport" content="width=device-width,initial-scale=1">' +
 '<title>Skylink Logistics Receipt</title>' +
 '<style>' +
 'body{font-family:Arial;margin:20px;background:#fff;color:#111827}' +
 '.receipt{max-width:760px;margin:auto;border:1px solid #ddd;border-radius:15px;overflow:hidden}' +
 '.header{background:#0f2e6d;color:white;padding:20px}' +
 '.logo{font-size:22px;font-weight:900}' +
 '.logo span{color:#facc15}' +
 '.body{padding:20px}' +
 '.item{border:1px solid #ddd;padding:12px;margin-bottom:10px;border-radius:8px}' +
 '.label{font-size:9px;font-weight:900;color:#64748b}' +
 '.value{font-size:13px;font-weight:800;margin-top:4px}' +
 '</style>' +
 '</head><body>' +
 clone.outerHTML +
 '</body></html>';

 const blob =
   new Blob(
     [html],
     {type:"text/html"}
   );

 const url =
   URL.createObjectURL(blob);

 const a =
   document.createElement("a");

 a.href = url;

 a.download =
   "Skylink-Logistics-" +
   ${JSON.stringify(record.tracking)} +
   "-Receipt.html";

 document.body.appendChild(a);

 a.click();

 a.remove();

 setTimeout(function(){
   URL.revokeObjectURL(url);
 },1000);

 showMessage(
   "Receipt saved."
 );

}

<\/script>

</body>
</html>
`);

}

/*
|--------------------------------------------------------------------------
| Dedicated tracking page
|--------------------------------------------------------------------------
|
| IMPORTANT:
| No receipt link.
| No main-site link.
| No Airlines link.
|
*/

async function trackingPage(req, res){
  const code = clean(req.params.code, 150);
  const record = await findShipment(code);
  if(!record){
    return res.status(404).send(notFoundPage("Shipment Not Found"));
  }

  const fromLat = Number(record.originLat);
  const fromLon = Number(record.originLon);
  const toLat = Number(record.destinationLat);
  const toLon = Number(record.destinationLon);

  const hasMap =
    record.originLat != null && record.originLat !== "" && isFinite(Number(record.originLat)) &&
    record.originLon != null && record.originLon !== "" && isFinite(Number(record.originLon)) &&
    record.destinationLat != null && record.destinationLat !== "" && isFinite(Number(record.destinationLat)) &&
    record.destinationLon != null && record.destinationLon !== "" && isFinite(Number(record.destinationLon));

  const datePart = typeof record.shipDate === "string" ? record.shipDate.trim() : "";
  const timePart = typeof record.shipTime === "string" ? record.shipTime.trim() : "";
  let depTimeMs = NaN;
  let depTimeLuxon = null;

  if(datePart && timePart && record.originTimezone && typeof DateTime !== "undefined"){
    try{
      const d = DateTime.fromISO(datePart+"T"+timePart+":00",{zone:record.originTimezone});
      if(d && d.isValid){ depTimeMs = d.toMillis(); depTimeLuxon = d; }
    }catch(e){}
  }
  if(!Number.isFinite(depTimeMs) && datePart && timePart){
    try{ const d2=new Date(datePart+"T"+timePart+":00Z"); depTimeMs=d2.getTime(); }catch(e){}
  }
  if(!Number.isFinite(depTimeMs)) depTimeMs = Date.now();

  let distance = Number(record.distanceKm);
  if(!Number.isFinite(distance)) distance = 0;
  const totalHours = distance>0 ? Math.max(2, distance/850) : 22;
  const diffHours = (Date.now() - depTimeMs)/3600000;

  let liveStatus, progress, remainingMs, elapsedMs;
  if(diffHours < 0){ 
    liveStatus="Shipment Booked"; progress=0; remainingMs=Math.abs(Date.now()-depTimeMs); elapsedMs=0;
  } else if(diffHours < totalHours){ 
    liveStatus="In Transit"; progress=Math.min(0.99, Math.max(0, diffHours/totalHours));
    remainingMs=(totalHours-diffHours)*3600000; elapsedMs=diffHours*3600000;
  } else { 
    liveStatus="Arrived at Destination"; progress=1; remainingMs=0; elapsedMs=totalHours*3600000;
  }
  progress = Math.min(1, Math.max(0, Number.isFinite(progress)?progress:0));
  record.status = liveStatus;

  const originTime = formatDate(record.createdAt, record.originTimezone);
  const destinationTime = formatDate(record.createdAt, record.destinationTimezone);

  const mapHTML = hasMap ? `
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<div class="mapCard">
<div class="liveHeader"><div class="liveLeft"><span class="pulse"></span><span id="liveText">${liveStatus}</span></div><div class="countdown" id="countdown">Calculating...</div></div>
<div id="map"></div>
<div class="progressBar"><div class="progressFill" id="progressFill" style="width:${progress*100}%"></div></div>
</div>
<div class="steps">
<div class="step ${progress==0?'active':''} ${progress>0?'completed':''}"><div class="ic">${progress>0?'✅':'📦'}</div><div class="tx">Booked</div></div>
<div class="step ${progress>0 && progress<1?'active moving':''} ${progress>=1?'completed':''}"><div class="ic">🚚</div><div class="tx">In Transit</div></div>
<div class="step ${progress>=1?'active':''}"><div class="ic">✅</div><div class="tx">Arrived</div></div>
</div>
  let progress=${JSON.stringify(progress)};
  let depTime=${JSON.stringify(depTimeMs)};
  let totalHours=${JSON.stringify(totalHours)};
  let status=${JSON.stringify(liveStatus)};

  function shortestLon(lon1,lon2,p){ let d=lon2-lon1; if(d>180)d-=360; if(d<-180)d+=360; let cur=lon1+d*p; cur=((cur+180)%360+360)%360-180; return cur; }
  function getPos(p){ const lat=fromLat+(toLat-fromLat)*p; const lon=shortestLon(fromLon,toLon,p); return [lat,lon]; }
  const currentPosition=getPos(progress);
  const map=L.map("map",{worldCopyJump:true, zoomControl:true}).setView(currentPosition,3);
  
  // FIXED TILE - NO API KEY NEEDED - SHOWS COUNTRIES CLEARLY
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,
    attribution:"© OpenStreetMap"
  }).addTo(map);

  L.polyline([[fromLat,fromLon],[toLat,toLon]],{color:"#94a3b8",weight:2,dashArray:"10,10",opacity:0.8}).addTo(map);
  const traveledLine=L.polyline([[fromLat,fromLon],currentPosition],{color:"#0f2e6d",weight:4}).addTo(map);
  L.marker([fromLat,fromLon]).addTo(map).bindPopup("FROM: ${String(record.originCity||"").replace(/"/g,'')}");
  L.marker([toLat,toLon]).addTo(map).bindPopup("TO: ${String(record.destinationCity||"").replace(/"/g,'')}");
  const planeIcon=L.divIcon({className:"plane-icon",html:"✈️",iconSize:[36,36],iconAnchor:[18,18]});
  const planeMarker=L.marker(currentPosition,{icon:planeIcon}).addTo(map);
  
  function updatePlane(){
    const pos=getPos(progress);
    planeMarker.setLatLng(pos);
    traveledLine.setLatLngs([[fromLat,fromLon],pos]);
    document.getElementById("progressFill").style.width=(progress*100)+"%";
  }
  function formatHMS(ms){
    if(ms<=0) return "0h 0m";
    const h=Math.floor(ms/3600000);
    const m=Math.floor((ms%3600000)/60000);
    if(h>24){ const d=Math.floor(h/24); return d+"d "+(h%24)+"h "+m+"m"; }
    return h+"h "+m+"m";
  }
  function updateCountdown(){
    const now=Date.now();
    const diff=now-depTime;
    const el=document.getElementById("countdown");
    const live=document.getElementById("liveText");
    if(diff<0){
      const remain=Math.abs(diff);
      el.innerHTML="⏳ Cargo starts moving in <b>"+formatHMS(remain)+"</b>";
      live.textContent="Shipment Booked";
      progress=0;
    } else if(diff/3600000 < totalHours){
      const remain=(totalHours*3600000)-diff;
      el.innerHTML="🚚 Live in transit — <b>"+formatHMS(diff)+"</b> elapsed — Arriving in <b>"+formatHMS(remain)+"</b>";
      live.textContent="In Transit - Cargo Moving";
      progress=Math.min(0.99, (diff/3600000)/totalHours);
    } else {
      el.innerHTML="✅ Delivered — Total transit <b>"+formatHMS(totalHours*3600000)+"</b>";
      live.textContent="Arrived at Destination";
      progress=1;
    }
    updatePlane();
  }
  updateCountdown();
  updatePlane();
  setTimeout(function(){ map.invalidateSize(); }, 600);
  setInterval(updateCountdown, 1000);
  setInterval(function(){ if(progress<1) progress=Math.min(1, progress+0.00008); updatePlane(); }, 3000);
})();
<\/script>
` : `<div class="noMap">🗺️ Route coordinates not available</div>`;

  res.send(`
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Skylink Tracking - ${escapeHtml(record.tracking)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#f1f5f9;font-family:Inter,Arial,sans-serif;color:#0f172a}
.container{max-width:900px;margin:auto;padding:14px}
.header{padding:14px 0;border-bottom:3px solid #0f2e6d;display:flex;justify-content:space-between}
.logo{font-weight:900;font-size:20px;color:#0f2e6d;letter-spacing:.3px}.logo span{color:#f59e0b}
.badge{padding:5px 12px;background:#e0f2fe;color:#0f2e6d;border-radius:20px;font-size:10px;font-weight:900}
.trackBox{margin-top:16px;background:#fff;border-radius:16px;padding:18px;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(0,0,0,.04)}
.trLabel{font-size:10px;font-weight:900;color:#94a3b8;letter-spacing:1px}.trCode{font-size:22px;font-weight:900;color:#0f2e6d;margin-top:4px;word-break:break-all}
.mapCard{margin-top:14px;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 24px rgba(0,0,0,.06)}
.liveHeader{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;background:#f8fafc;border-bottom:1px solid #e2e8f0;flex-wrap:wrap;gap:8px}
.liveLeft{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:900;color:#0f2e6d}
.pulse{width:10px;height:10px;background:#22c55e;border-radius:50%;display:inline-block;animation:blink 1.2s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
.countdown{font-size:11px;font-weight:700;color:#334155;background:#fff;border:1px solid #e2e8f0;padding:6px 10px;border-radius:20px}
#map{width:100%;height:460px;background:#e2e8f0}
.progressBar{height:6px;background:#e2e8f0}.progressFill{height:100%;background:linear-gradient(90deg,#0f2e6d,#3b82f6);transition:width 1s}
.steps{display:flex;gap:10px;margin-top:14px}
.step{flex:1;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center}
.step.active{background:#16a34a !important; color:#fff !important; border-color:#16a34a !important}
.step.completed{background:#dcfce7 !important}
.step.completed .tx{color:#16a34a !important; font-weight:700}
.step.moving .ic{animation:truckMove 1s infinite alternate}
@keyframes truckMove{0%{transform:translateX(-4px)}100%{transform:translateX(4px)}}
.step .ic{font-size:20px}.step .tx{font-size:10px;font-weight:900;margin-top:4px;color:#64748b}.step.active .tx{color:#0f2e6d}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:14px;display:flex;gap:12px}
.card .ico{width:36px;height:36px;border-radius:10px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;font-size:18px}
.label{font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:.6px}.value{font-size:13px;font-weight:800;margin-top:3px;word-break:break-word}
.subVal{font-size:11px;color:#64748b;margin-top:2px}
.footer{margin-top:24px;text-align:center;color:#94a3b8;font-size:10px;padding:14px}
.plane-icon{background:transparent;border:0;font-size:26px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))}
@media(max-width:600px){.grid{grid-template-columns:1fr}#map{height:380px}.trCode{font-size:18px}}
</style></head><body>
<div class="container">
<div class="header"><div class="logo">SKYLINK <span>LOGISTICS</span></div><div class="badge">LIVE TRACKING</div></div>
<div class="trackBox"><div class="trLabel">TRACKING NUMBER</div><div class="trCode">${escapeHtml(record.tracking)}</div></div>
${mapHTML}
<div class="grid">
<div class="card"><div class="ico">📍</div><div><div class="label">From</div><div class="value">${escapeHtml(record.originCity)}, ${escapeHtml(record.originCountry)}</div><div class="subVal">${escapeHtml(record.originAddress||"")}</div></div></div>
<div class="card"><div class="ico">🎯</div><div><div class="label">To</div><div class="value">${escapeHtml(record.destinationCity)}, ${escapeHtml(record.destinationCountry)}</div><div class="subVal">${escapeHtml(record.destinationAddress||"")}</div></div></div>
<div class="card"><div class="ico">📏</div><div><div class="label">Distance</div><div class="value">${escapeHtml(String(distance))} km</div><div class="subVal">Great circle route</div></div></div>
<div class="card"><div class="ico">📦</div><div><div class="label">Shipment</div><div class="value">${escapeHtml(record.packageDescription)}</div><div class="subVal">Cargo secured</div></div></div>
<div class="card"><div class="ico">🕒</div><div><div class="label">Origin Local Time</div><div class="value">${escapeHtml(originTime)}</div><div class="subVal">${escapeHtml(record.originTimezone||"")}</div></div></div>
<div class="card"><div class="ico">🌍</div><div><div class="label">Destination Local Time</div><div class="value">${escapeHtml(destinationTime)}</div><div class="subVal">${escapeHtml(record.destinationTimezone||"")}</div></div></div>
</div>
<div class="footer">Skylink Logistics — Real-time tracking • Airline-grade GPS</div>
</div></body></html>
`);
}




/*
|--------------------------------------------------------------------------
| Admin Logistics Dashboard
|--------------------------------------------------------------------------
*/

async function adminDashboard(req, res){

  const authenticated =
    typeof req.isAuthenticated === "function"
      ? req.isAuthenticated()
      : false;

  if(!authenticated){

    return res.redirect(
      "/skylink-admin-login"
    );

  }

  let records = [];

  if(LogisticsModel){

    try{

      records =
        await LogisticsModel
          .find({})
          .sort({
            createdAt:-1
          })
          .lean();

    }catch(e){

      console.error(
        "Logistics admin query:",
        e.message
      );

    }

  }

  const total =
    records.length;

  const paid =
    records.filter(
      x => x.paymentVerified
    ).length;

  const today =
    records.filter(
      x =>
        x.createdAt &&
        new Date(
          x.createdAt
        ).toDateString() ===
        new Date().toDateString()
    ).length;

  const rows =
    records.map(
      function(b){

        return `
<tr>

<td>
${escapeHtml(b.shipmentId)}
</td>

<td>
<strong>
${escapeHtml(b.tracking)}
</strong>
</td>

<td>
${escapeHtml(b.customerName)}
<br>
<span style="font-size:10px;color:#64748b">
${escapeHtml(b.customerEmail)}
</span>
</td>

<td>
${escapeHtml(b.originCity)}
 →
${escapeHtml(b.destinationCity)}

<br>

<span style="
font-size:10px;
color:#64748b;
">
${escapeHtml(
  b.distanceKm || 0
)} km
</span>

</td>

<td>
<span style="
background:#dcfce7;
color:#166534;
padding:5px 8px;
border-radius:15px;
font-size:10px;
font-weight:900;
">
${escapeHtml(b.status)}
</span>
</td>

<td>
<span style="
color:#166534;
font-weight:900;
font-size:11px;
">
${b.paymentVerified ? "VERIFIED" : "PENDING"}
</span>

<br>

<span style="
font-size:9px;
color:#64748b;
">
${escapeHtml(
  b.paystackReference || ""
)}
</span>

</td>

<td>
${b.createdAt
  ? escapeHtml(
      new Date(
        b.createdAt
      ).toLocaleString()
    )
  : ""}
</td>

<td>

<a
 href="/logistics/receipt/${encodeURIComponent(b.tracking)}"
 target="_blank"
 style="
 background:#0f2e6d;
 color:#fff;
 padding:7px 10px;
 border-radius:7px;
 text-decoration:none;
 font-size:10px;
 font-weight:900;
 "
>
Receipt
</a>

<a
 href="/logistics/track/${encodeURIComponent(b.tracking)}"
 target="_blank"
 style="
 background:#16a34a;
 color:#fff;
 padding:7px 10px;
 border-radius:7px;
 text-decoration:none;
 font-size:10px;
 font-weight:900;
 margin-left:4px;
 "
>
Track
</a>

</td>

</tr>
`;

      }
    ).join("");

  res.send(`
<!DOCTYPE html>
<html>

<head>

<meta
 name="viewport"
 content="width=device-width,initial-scale=1">

<title>
Skylink Logistics Admin
</title>

<style>

body{
 margin:0;
 background:#f1f5f9;
 font-family:Arial,Helvetica,sans-serif;
 color:#111827;
}

.header{
 background:#0f2e6d;
 color:#fff;
 padding:20px;
}

.headerInner{
 max-width:1250px;
 margin:auto;
 display:flex;
 justify-content:space-between;
 align-items:center;
 gap:15px;
}

.logo{
 font-size:20px;
 font-weight:900;
}

.logo span{
 color:#facc15;
}

.subtitle{
 margin-top:4px;
 font-size:10px;
 opacity:.75;
}

.container{
 max-width:1250px;
 margin:20px auto;
 padding:0 15px;
}

.stats{
 display:grid;
 grid-template-columns:repeat(3,1fr);
 gap:14px;
}

.stat{
 background:#fff;
 border:1px solid #e2e8f0;
 border-radius:13px;
 padding:18px;
}

.statLabel{
 font-size:10px;
 color:#64748b;
 font-weight:900;
}

.statValue{
 margin-top:5px;
 font-size:24px;
 font-weight:900;
 color:#0f2e6d;
}

.tableCard{
 margin-top:18px;
 background:#fff;
 border:1px solid #e2e8f0;
 border-radius:14px;
 overflow:hidden;
}

.tableHeader{
 padding:18px;
 font-weight:900;
}

.tableWrap{
 overflow:auto;
}

table{
 width:100%;
 min-width:1100px;
 border-collapse:collapse;
}

th{
 text-align:left;
 background:#f8fafc;
 padding:12px;
 font-size:10px;
 color:#64748b;
}

td{
 padding:12px;
 border-top:1px solid #edf2f7;
 font-size:11px;
 vertical-align:top;
}

.empty{
 padding:50px;
 text-align:center;
 color:#94a3b8;
}

@media(max-width:700px){

 .stats{
   grid-template-columns:1fr;
 }

 .headerInner{
   flex-direction:column;
   align-items:flex-start;
 }

}

</style>

</head>

<body>

<div class="header">

<div class="headerInner">

<div>

<div class="logo">
SKYLINK <span>LOGISTICS</span>
</div>

<div class="subtitle">
LOGISTICS RECORDS • PRIVATE ADMIN
</div>

</div>

</div>

</div>

</div>

<div class="container">

<div class="stats">

<div class="stat">

<div class="statLabel">
TOTAL LOGISTICS SHIPMENTS
</div>

<div class="statValue">
${total}
</div>

</div>

<div class="stat">

<div class="statLabel">
PAYMENTS VERIFIED
</div>

<div class="statValue">
${paid}
</div>

</div>

<div class="stat">

<div class="statLabel">
TODAY
</div>

<div class="statValue">
${today}
</div>

</div>

</div>

<div class="tableCard">

<div class="tableHeader">
Skylink Logistics Shipments
</div>

<div class="tableWrap">

<table>

<thead>

<tr>

<th>SHIPMENT</th>
<th>TRACKING</th>
<th>CUSTOMER</th>
<th>ROUTE</th>
<th>STATUS</th>
<th>PAYMENT</th>
<th>DATE</th>
<th>ACTION</th>

</tr>

</thead>

<tbody>

${rows ||
`
<tr>
<td
 colspan="8"
 class="empty">
No Logistics shipments yet.
</td>
</tr>
`}

</tbody>

</table>

</div>

</div>

</div>

</body>
</html>
`);

}

/*
|--------------------------------------------------------------------------
| Install into server.js
|--------------------------------------------------------------------------
*/

function install(app, options = {}){

  const airports =
    options.airports || [];

  /*
  Initialize database after existing V9 MongoDB
  connection has had a chance to start.
  */

  setTimeout(
    initLogisticsDB,
    1500
  );

  /*
  Customer Logistics website
  */

  app.get(
    "/logistics",
    function(req,res){
      logisticsHome(
        req,
        res,
        airports
      );
    }
  );

  /*
  Payment initialization
  */

  app.post(
    "/api/logistics/payment/initialize",
    initializePayment
  );

  /*
  Payment verification
  */

  app.post(
    "/api/logistics/payment/verify",
    verifyPayment
  );

  /*
  Paystack webhook

  IMPORTANT:
  This route is registered with express.json()
  already enabled by V9.

  Paystack signature is checked against the
  request body.
  */

  app.post(
    "/api/logistics/webhook",
    webhook
  );

  /*
  Callback fallback.
  The actual payment is still verified server-side.
  */

  app.get(
    "/logistics/payment/callback",
    function(req,res){

      const reference =
        clean(
          req.query.reference,
          150
        );

      if(!reference){

        return res.status(400).send(
          notFoundPage(
            "Payment Reference Missing"
          )
        );

      }

      res.send(`
<!DOCTYPE html>
<html>
<head>
<meta name="viewport"
content="width=device-width,initial-scale=1">
<title>Payment Verification</title>
</head>

<body style="
font-family:Arial;
text-align:center;
padding:50px 20px;
">

<h2>
Verifying your payment...
</h2>

<script>

fetch(
 "/api/logistics/payment/verify",
 {
   method:"POST",
   headers:{
     "Content-Type":"application/json"
   },
   body:JSON.stringify({
     reference:
       ${JSON.stringify(reference)}
   })
 }
)
.then(function(r){
 return r.json();
})
.then(function(data){

 if(
   data.status &&
   data.receiptUrl
 ){

   window.location.href =
     data.receiptUrl;

 }else{

   document.body.innerHTML =
     "<h2>Payment could not be verified.</h2>" +
     "<p>" +
     (data.error || "") +
     "</p>";

 }

})
.catch(function(){

 document.body.innerHTML =
   "<h2>Payment verification error.</h2>";

});

<\/script>

</body>
</html>
`);

    }
  );

  /*
  Receipt
  */

  app.get(
    "/logistics/receipt/:code",
    receipt
  );

  /*
  Dedicated tracking.
  No navigation back to receipt/main website.
  */

  app.get(
    "/logistics/track/:code",
    trackingPage
  );

  /*
  Separate Logistics admin section.
  */

  app.get(
    "/skylink-admin-gospel-2024/logistics",
    adminDashboard
  );

  console.log(
    "SKYLINK LOGISTICS routes installed."
  );

}

module.exports = {
  install,
  initLogisticsDB
};
