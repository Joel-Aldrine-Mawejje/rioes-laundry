<script>
/* ===== PHASE 5: SUBSCRIPTIONS ===== */
var SUBS={},subSv='',subFilt='All',subDet=null,subTab='overview';
var snf={ph:'',plan:'',start:'',notes:'',cprice:'',cmonths:'',cvisits:'',custom:false};
var svf={sched:'',staff:'',orderId:'',vnotes:''};
var spf={date:'',amt:'',method:'Cash',period:'',note:''};

var PLANS_DEFAULT=[
  {name:'Full-Semester',price:120000,months:4,visits:8},
  {name:'Half-Semester',price:70000,months:2,visits:4},
  {name:'Monthly',price:40000,months:1,visits:4}
];
function getPlans(){
  var raw=WA.splans;
  if(!raw||!raw.length)return PLANS_DEFAULT;
  return raw.map(function(p){return Array.isArray(p)?{name:p[0],price:p[1],months:p[2],visits:p[3]}:p});
}
function subId(){return'SUB-'+String(Math.floor(Date.now()/1000)).slice(-6)+String(Math.floor(Math.random()*900)+100)}
function subBalance(sub){
  var paid=(sub.payments||[]).filter(function(p){return p.status!=='Cancelled'}).reduce(function(a,p){return a+(+p.amt||0)},0);
  return Math.max(0,(sub.price||0)-paid);
}
function visLeft(sub){
  return(sub.totalVisits||0)-((sub.visits||[]).filter(function(v){return v.status==='Done'}).length);
}
function subStatus(sub){
  if(sub.status==='Cancelled'||sub.status==='Paused')return sub.status;
  if(sub.endDate&&sub.endDate<td())return'Expired';
  var bl=subBalance(sub);
  if(bl>0&&sub.endDate&&sub.endDate<ld(Date.now()+7*DAY))return'Overdue';
  return'Active';
}
function stCol(st){return{Active:'var(--ok)',Paused:'var(--sky2)',Overdue:'#e5484d',Expired:'var(--mut)',Cancelled:'var(--mut)'}[st]||'var(--ink)'}
function putSub(sub){
  SUBS[sub.id]=sub;
  if(DBH)DBH.doc('subs/'+sub.id).set(sub).catch(function(){});
  else try{var L=JSON.parse(localStorage.getItem('rioes_subs')||'{}');L[sub.id]=sub;localStorage.setItem('rioes_subs',JSON.stringify(L))}catch(e){}
}
function subLog(sub,action,detail){(sub.history=sub.history||[]).unshift({t:Date.now(),by:(window.ME||'').toLowerCase(),name:who()||window.ME||'',action:action,detail:detail})}

function initSubs(){
  if(!DBH){
    try{var L=JSON.parse(localStorage.getItem('rioes_subs')||'{}');Object.keys(L).forEach(function(k){SUBS[k]=L[k]})}catch(e){}
    return;
  }
  firebase.firestore().collection('subs').onSnapshot(function(snap){
    Object.keys(SUBS).forEach(function(k){delete SUBS[k]});
    snap.docs.forEach(function(d){SUBS[d.id]=Object.assign({id:d.id},d.data())});
    if(V==='subs')render();
  },function(){});
}

function subCard(sub){
  var st=subStatus(sub),vl=visLeft(sub),bl=subBalance(sub);
  var done=(sub.visits||[]).filter(function(v){return v.status==='Done'}).length;
  var pct=Math.round(done/(sub.totalVisits||1)*100);
  var c=D.c[sub.ph]||{};
  var alerts=[];
  if(bl>0&&st==='Overdue')alerts.push('⚠️ Overdue payment: '+u(bl));
  if(vl<=1&&st==='Active')alerts.push('⚠️ Only '+vl+' visit'+(vl===1?'':'s')+' remaining');
  if(sub.endDate&&sub.endDate<=ld(Date.now()+7*DAY)&&st==='Active')alerts.push('⏰ Expires '+sub.endDate);
  return'<div class="card" onclick="subDet=\''+sub.id+'\';subTab=\'overview\';render()" style="cursor:pointer">'+
    '<div class="row"><div><b>'+esc(c.name||sub.ph)+'</b> <span class="mut" style="font-size:12px">'+esc(sub.id)+'</span></div>'+
    '<span class="tag" style="color:'+stCol(st)+'">'+st+'</span></div>'+
    '<div class="mut">'+esc(sub.plan)+' • '+u(sub.price)+' • '+sub.totalVisits+' visits • '+sub.months+' months</div>'+
    '<div class="mut">'+sub.startDate+' → '+sub.endDate+'</div>'+
    '<div style="margin:6px 0"><div style="background:var(--line);border-radius:5px;height:8px">'+
    '<div style="background:var(--sky);width:'+pct+'%;height:8px;border-radius:5px;min-width:2px"></div></div>'+
    '<div class="mut" style="font-size:11px;margin-top:2px">'+done+'/'+sub.totalVisits+' visits ('+pct+'%) • '+vl+' left • balance '+u(bl)+'</div></div>'+
    alerts.map(function(a){return'<div style="color:#e5484d;font-size:12px">'+a+'</div>'}).join('')+'</div>';
}

function vSubsPage(){
  var all=Object.values(SUBS).sort(function(a,b){return b.createdAt-a.createdAt});
  if(subDet)return vSubDetail();
  var counts={};['Active','Paused','Overdue','Expired','Cancelled'].forEach(function(x){counts[x]=all.filter(function(s){return subStatus(s)===x}).length});
  var filt=subFilt==='All'?all:all.filter(function(s){return subStatus(s)===subFilt});
  if(subSv)filt=filt.filter(function(s){return(nm(s.ph)+' '+s.ph).toLowerCase().indexOf(subSv.toLowerCase())>=0});
  var pl=getPlans();
  $('#view').innerHTML=
    '<h2>Subscriptions</h2>'+
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-bottom:10px">'+
    '<div class="stat">Active<b style="color:var(--ok)">'+(counts.Active||0)+'</b></div>'+
    '<div class="stat">Overdue<b style="color:#e5484d">'+(counts.Overdue||0)+'</b></div>'+
    '<div class="stat">Paused<b style="color:var(--sky2)">'+(counts.Paused||0)+'</b></div>'+
    '<div class="stat">Expired<b style="color:var(--mut)">'+(counts.Expired||0)+'</b></div>'+
    '</div>'+
    (isO()?
    '<div class="card"><b>New subscription</b>'+
    '<label>Client phone or name</label>'+
    '<input id="snph" list="cs2" value="'+esc(snf.ph)+'" oninput="snf.ph=this.value;snLk()">'+
    '<datalist id="cs2">'+Object.entries(D.c).map(function(e){return'<option value="'+esc(e[1].name)+' · '+e[0]+'">'}).join('')+'</datalist>'+
    '<div id="snlk" class="mut" style="margin:4px 0"></div>'+
    '<label>Plan</label>'+
    '<select id="snpl" onchange="snf.plan=this.value;snf.custom=this.value===\'custom\';render()">'+
    pl.map(function(p){return'<option value="'+esc(p.name)+'"'+(snf.plan===p.name?' selected':'')+'>'+esc(p.name)+' – '+u(p.price)+' / '+p.months+'mo / '+p.visits+' visits</option>'}).join('')+
    '<option value="custom"'+(snf.custom?' selected':'')+'>Custom…</option></select>'+
    (snf.custom?'<label>Price (UGX)</label><input type="number" value="'+esc(snf.cprice)+'" oninput="snf.cprice=this.value"><label>Months</label><input type="number" value="'+esc(snf.cmonths)+'" oninput="snf.cmonths=this.value"><label>Visits</label><input type="number" value="'+esc(snf.cvisits)+'" oninput="snf.cvisits=this.value">':'')+
    '<label>Start date</label><input type="date" value="'+(snf.start||td())+'" onchange="snf.start=this.value">'+
    '<label>Notes (optional)</label><input value="'+esc(snf.notes)+'" oninput="snf.notes=this.value">'+
    '<div class="row2"><button class="p" onclick="createSub()">Create subscription</button></div></div>':'')+ 
    '<div class="chips">'+['All','Active','Paused','Overdue','Expired','Cancelled'].map(function(x){return'<button class="chip '+(subFilt===x?'on':'')+'" onclick="subFilt=\''+x+'\';render()">'+x+(x!=='All'&&counts[x]?' ('+counts[x]+')':'')+'</button>'}).join('')+'</div>'+
    '<input placeholder="Search name or phone" value="'+esc(subSv)+'" oninput="subSv=this.value;render()" style="margin:8px 0">'+
    (filt.map(subCard).join('')||'<div class="card mut">No subscriptions yet.</div>');
}

function snLk(){var p=ph(snf.ph),e=$('#snlk');if(p.length>=10&&D.c[p])e.textContent=D.c[p].name+' found';else if(p.length>=10)e.textContent='Not in clients – add client first';else e.textContent=''}

function createSub(){
  var p=ph(snf.ph);
  if(p.length<10)return toast('Enter a valid client phone');
  if(!D.c[p])return toast('Add this client under Clients first');
  var pl=getPlans().filter(function(x){return x.name===snf.plan})[0]||getPlans()[0];
  if(snf.custom){if(!(+snf.cprice>0)||!(+snf.cmonths>0)||!(+snf.cvisits>0))return toast('Enter price, months and visits');pl={name:'Custom',price:+snf.cprice,months:+snf.cmonths,visits:+snf.cvisits}}
  var sd=snf.start||td(),edDate=new Date(sd+'T00:00:00');edDate.setMonth(edDate.getMonth()+pl.months);
  var sub={id:subId(),ph:p,plan:pl.name,price:pl.price,months:pl.months,totalVisits:pl.visits,
    startDate:sd,endDate:edDate.toISOString().slice(0,10),status:'Active',visits:[],payments:[],history:[],
    notes:snf.notes||'',createdBy:(window.ME||''),createdAt:Date.now()};
  subLog(sub,'Created','Plan: '+pl.name+', '+pl.visits+' visits, '+u(pl.price));
  putSub(sub);audit('add','Subscription '+sub.id,nm(p)+' – '+pl.name);
  snf={ph:'',plan:'',start:'',notes:'',cprice:'',cmonths:'',cvisits:'',custom:false};
  toast('Subscription created');subDet=sub.id;subTab='overview';render();
}

function vSubDetail(){
  var sub=SUBS[subDet];if(!sub){subDet=null;return vSubsPage()}
  var st=subStatus(sub),c=D.c[sub.ph]||{},bl=subBalance(sub);
  var done=(sub.visits||[]).filter(function(v){return v.status==='Done'}).length;
  var vl=visLeft(sub),pct=Math.round(done/(sub.totalVisits||1)*100);
  var nv=(sub.visits||[]).filter(function(v){return v.status==='Scheduled'}).sort(function(a,b){return a.sched.localeCompare(b.sched)})[0];
  var lp=(sub.payments||[]).filter(function(p){return p.status==='Paid'}).sort(function(a,b){return b.date.localeCompare(a.date)})[0];
  var tabs=['overview','visits','billing','history'];
  var tabBar=tabs.map(function(t){return'<button class="chip '+(subTab===t?'on':'')+'" onclick="subTab=\''+t+'\';vSubDetail()">'+t.charAt(0).toUpperCase()+t.slice(1)+'</button>'}).join('');
  var hdr='<button class="g" onclick="subDet=null;render()">← Subscriptions</button>'+
    '<div class="row" style="margin:10px 0 4px"><div><h2 style="margin:0">'+esc(c.name||sub.ph)+'</h2>'+
    '<div class="mut">'+esc(sub.id)+' • '+esc(sub.plan)+'</div></div>'+
    '<span class="tag" style="color:'+stCol(st)+'">'+st+'</span></div>'+
    '<div class="chips">'+tabBar+'</div>';
  var body='';
  if(subTab==='overview'){
    body='<div class="card"><b>Subscription details</b><div class="lines">'+
      '<div><span>ID</span><b>'+esc(sub.id)+'</b></div>'+
      '<div><span>Client</span><span>'+esc(c.name||sub.ph)+' • +'+sub.ph+'</span></div>'+
      (c.addr?'<div><span>Address</span><span>'+esc(c.addr)+(c.room?' • Room '+c.room:'')+'</span></div>':'')+
      '<div><span>Plan</span><span>'+esc(sub.plan)+'</span></div>'+
      '<div><span>Status</span><span style="color:'+stCol(st)+';font-weight:bold">'+st+'</span></div>'+
      '<div><span>Period</span><span>'+sub.startDate+' → '+sub.endDate+'</span></div>'+
      '<div><span>Total value</span><span>'+u(sub.price)+'</span></div>'+
      '<div><span>Visits included</span><span>'+sub.totalVisits+'</span></div>'+
      '<div><span>Visits completed</span><span>'+done+'</span></div>'+
      '<div><span>Visits remaining</span><b>'+vl+'</b></div>'+
      '<div><span>Outstanding balance</span><b style="color:'+(bl>0?'#e5484d':'var(--ok)')+'">'+u(bl)+'</b></div>'+
      (nv?'<div><span>Next visit</span><span>'+nv.sched+'</span></div>':'')+
      (lp?'<div><span>Last payment</span><span>'+lp.date+' • '+u(lp.amt)+'</span></div>':'')+
      '</div>'+
      '<div style="margin:10px 0 4px"><b>Visit progress</b></div>'+
      '<div style="background:var(--line);border-radius:6px;height:14px">'+
      '<div style="background:var(--sky);width:'+pct+'%;height:14px;border-radius:6px;min-width:2px"></div></div>'+
      '<div class="mut" style="margin-top:4px">'+done+' of '+sub.totalVisits+' visits ('+pct+'%)</div>'+
      (sub.notes?'<div class="mut" style="margin-top:8px">📝 '+esc(sub.notes)+'</div>':'')+
      '</div>'+
      (isO()?'<div class="card"><b>Actions</b><div class="row2">'+
        '<button class="p" onclick="subTab=\'visits\';vSubDetail();setTimeout(function(){var e=$(\'#svd\');if(e)e.focus()},100)">Schedule visit</button>'+
        '<button class="g" onclick="subTab=\'visits\';vSubDetail()">Record visit</button>'+
        '<button class="g" onclick="subTab=\'billing\';vSubDetail()">Record payment</button>'+
        (st==='Active'?'<button class="g" onclick="doPause()">Pause</button>':'')+
        (st==='Paused'?'<button class="p" onclick="doResume()">Resume</button>':'')+
        (st!=='Cancelled'&&st!=='Expired'?'<button class="g" onclick="doRenew()">Renew</button><button class="g" onclick="doCancel()">Cancel</button>':'')+
        '</div></div>':'');
  }
  if(subTab==='visits'){
    body='<div class="card"><b>Add a visit</b>'+
      '<label>Scheduled date</label><input type="date" id="svd" value="'+(svf.sched||'')+'">'+
      '<label>Staff member</label><input id="svst" placeholder="Name" value="'+esc(svf.staff||'')+'">'+
      '<label>Linked order ID (optional, e.g. RL1005)</label><input id="svoid" value="'+esc(svf.orderId||'')+'">'+
      '<label>Notes (optional)</label><input id="svn" value="'+esc(svf.vnotes||'')+'">'+
      '<div class="row2"><button class="p" onclick="addVisit(\'Scheduled\')">Save scheduled</button>'+
      '<button class="g" onclick="addVisit(\'Done\')">Record as done now</button></div></div>'+
      '<h3 style="margin:12px 0 6px">Visit history ('+((sub.visits||[]).length)+')</h3>'+
      (sub.visits||[]).slice().reverse().map(function(v,i){
        var ri=(sub.visits.length-1)-i;
        return'<div class="card"><div class="row"><b>Visit '+(i+1)+'</b><span class="tag" style="color:'+(v.status==='Done'?'var(--ok)':v.status==='Missed'?'#e5484d':'var(--sky)')+'">'+v.status+'</span></div>'+
        '<div class="mut">Scheduled: '+(v.sched||'—')+' • Collected: '+(v.actualDate||'—')+'</div>'+
        (v.staff?'<div class="mut">Staff: '+esc(v.staff)+'</div>':'')+
        (v.orderId?'<div class="mut">Order: '+esc(v.orderId)+'</div>':'')+
        (v.vnotes?'<div class="mut">📝 '+esc(v.vnotes)+'</div>':'')+
        (isO()?'<div class="row2">'+
          (v.status==='Scheduled'?'<button class="p" onclick="markVDone('+ri+')">Mark done</button><button class="g" onclick="markVMiss('+ri+')">Mark missed</button>':'')+
          (v.status!=='Cancelled'&&v.status!=='Done'?'<button class="g" onclick="cancelV('+ri+')">Cancel</button>':'')+
          '</div>':'')+'</div>';
      }).join('')||'<div class="card mut">No visits yet.</div>';
  }
  if(subTab==='billing'){
    var totalPaid=(sub.payments||[]).filter(function(p){return p.status==='Paid'}).reduce(function(a,p){return a+(+p.amt||0)},0);
    body=(isO()?'<div class="card"><b>Record a payment</b>'+
      '<label>Date</label><input type="date" id="spd" value="'+(spf.date||td())+'">'+
      '<label>Amount (UGX)</label><input type="number" id="spa" inputmode="numeric" value="'+esc(spf.amt||'')+'">'+
      '<label>Method</label><select id="spm"><option>Cash</option><option>Mobile money</option></select>'+
      '<label>Period (optional, e.g. November 2026)</label><input id="spp" value="'+esc(spf.period||'')+'">'+
      '<label>Notes (optional)</label><input id="spn" value="'+esc(spf.note||'')+'">'+
      '<div class="row2"><button class="p" onclick="addPay()">Record payment</button></div></div>':'')+
      '<div class="card"><b>Billing summary</b><div class="lines">'+
      '<div><span>Total value</span><span>'+u(sub.price)+'</span></div>'+
      '<div><span>Total paid</span><span>'+u(totalPaid)+'</span></div>'+
      '<div><span>Balance</span><b style="color:'+(bl>0?'#e5484d':'var(--ok)')+'">'+u(bl)+'</b></div></div></div>'+
      '<h3 style="margin:12px 0 6px">Payments ('+((sub.payments||[]).length)+')</h3>'+
      (sub.payments||[]).slice().sort(function(a,b){return b.date.localeCompare(a.date)}).map(function(p,i){
        return'<div class="card"><div class="row"><b>'+u(p.amt)+'</b><span class="tag" style="color:'+(p.status==='Paid'?'var(--ok)':'var(--mut)')+'">'+p.status+'</span></div>'+
        '<div class="mut">'+p.date+' • '+esc(p.method)+(p.period?' • '+esc(p.period):'')+'</div>'+
        (p.note?'<div class="mut">📝 '+esc(p.note)+'</div>':'')+
        (isO()&&p.status==='Paid'?'<div class="row2"><button class="g" onclick="cancelPay('+i+')">Cancel this payment</button></div>':'')+
        '</div>';
      }).join('')||'<div class="card mut">No payments yet.</div>';
  }
  if(subTab==='history'){
    body='<h3 style="margin:0 0 8px">History ('+((sub.history||[]).length)+' entries)</h3>'+
      (sub.history||[]).map(function(h){
        return'<div class="card"><div class="row"><b>'+esc(h.action)+'</b>'+
        '<span class="mut">'+new Date(h.t).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true})+'</span></div>'+
        '<div class="mut">'+esc(h.detail)+'</div>'+
        '<div class="mut">'+esc(h.name||h.by)+'</div></div>';
      }).join('')||'<div class="card mut">No history yet.</div>';
  }
  $('#view').innerHTML=hdr+body;
}

function addVisit(status){
  var sub=SUBS[subDet],sched=$('#svd').value,staff=$('#svst').value,orderId=$('#svoid').value,vnotes=$('#svn').value;
  if(!sched)return toast('Pick a scheduled date');
  var v={id:String(Date.now()),sched:sched,actualDate:status==='Done'?sched:'',status:status,staff:staff.trim(),orderId:orderId.trim(),vnotes:vnotes.trim(),addedAt:Date.now(),by:(window.ME||'').toLowerCase()};
  (sub.visits=sub.visits||[]).push(v);
  subLog(sub,'Visit '+status,sched+(staff?' – '+staff:''));
  svf={sched:'',staff:'',orderId:'',vnotes:''};
  putSub(sub);audit('add','Sub visit '+sub.id,status+' '+sched);toast('Visit recorded');vSubDetail();
}
function markVDone(i){var sub=SUBS[subDet],v=sub.visits[i];v.status='Done';v.actualDate=td();subLog(sub,'Visit completed',v.sched);putSub(sub);vSubDetail()}
function markVMiss(i){var sub=SUBS[subDet],v=sub.visits[i];v.status='Missed';subLog(sub,'Visit missed',v.sched);putSub(sub);vSubDetail()}
function cancelV(i){var sub=SUBS[subDet],v=sub.visits[i];v.status='Cancelled';subLog(sub,'Visit cancelled',v.sched);putSub(sub);vSubDetail()}
function addPay(){
  var sub=SUBS[subDet],a=Math.max(0,+$('#spa').value||0);
  if(!a)return toast('Enter an amount');
  var pm={id:String(Date.now()),date:$('#spd').value||td(),amt:a,method:$('#spm').value,period:$('#spp').value.trim(),note:$('#spn').value.trim(),status:'Paid',by:(window.ME||'').toLowerCase()};
  (sub.payments=sub.payments||[]).push(pm);
  subLog(sub,'Payment',u(a)+' – '+pm.method+(pm.period?' ('+pm.period+')':''));
  spf={};putSub(sub);audit('payment','Sub '+sub.id,u(a));toast('Payment recorded');subTab='billing';vSubDetail();
}
function cancelPay(i){if(!isO())return;var sub=SUBS[subDet],p=sub.payments[i];if(p.status==='Cancelled')return;p.status='Cancelled';subLog(sub,'Payment cancelled',u(p.amt)+' on '+p.date);putSub(sub);vSubDetail()}
function doPause(){var sub=SUBS[subDet];sub.status='Paused';subLog(sub,'Paused','');putSub(sub);audit('edit','Sub '+sub.id,'paused');vSubDetail()}
function doResume(){var sub=SUBS[subDet];sub.status='Active';subLog(sub,'Resumed','');putSub(sub);vSubDetail()}
function doRenew(){if(!isO())return;var sub=SUBS[subDet];var ed=new Date(sub.endDate+'T00:00:00');ed.setMonth(ed.getMonth()+sub.months);sub.endDate=ed.toISOString().slice(0,10);sub.status='Active';subLog(sub,'Renewed','New end: '+sub.endDate);putSub(sub);audit('edit','Sub '+sub.id,'renewed');toast('Renewed to '+sub.endDate);vSubDetail()}
function doCancel(){if(!isO())return;if(!confirm('Cancel this subscription?'))return;var sub=SUBS[subDet];sub.status='Cancelled';subLog(sub,'Cancelled','');putSub(sub);audit('edit','Sub '+sub.id,'cancelled');vSubDetail()}

/* Plan settings in Settings tab */
var _vSetOld5=vSet;
vSet=function(){_vSetOld5();if(!isO())return;
  $('#view').insertAdjacentHTML('beforeend',
    '<div class="card"><b>Subscription plans</b>'+
    '<div class="mut" style="margin-bottom:8px">Edit defaults. Staff can still create custom plans.</div>'+
    '<div style="display:grid;grid-template-columns:1fr 90px 50px 50px 32px;gap:4px;margin-bottom:4px">'+
    '<span class="mut">Name</span><span class="mut">Price</span><span class="mut">Months</span><span class="mut">Visits</span><span></span></div>'+
    getPlans().map(function(p,i){return(
      '<div style="display:grid;grid-template-columns:1fr 90px 50px 50px 32px;gap:4px;margin-bottom:4px">'+
      '<input value="'+esc(p.name)+'" onchange="upPl('+i+',\'name\',this.value)" style="font-size:13px">'+
      '<input type="number" value="'+p.price+'" onchange="upPl('+i+',\'price\',+this.value)" style="font-size:13px">'+
      '<input type="number" value="'+p.months+'" onchange="upPl('+i+',\'months\',+this.value)" style="font-size:13px">'+
      '<input type="number" value="'+p.visits+'" onchange="upPl('+i+',\'visits\',+this.value)" style="font-size:13px">'+
      '<button class="g" style="padding:2px 4px;font-size:12px" onclick="delPl('+i+')">✕</button></div>')}).join('')+
    '<div class="row2"><button class="g" onclick="addPl()">Add plan</button></div></div>');
}
function upPl(i,k,v){var P=getPlans();P[i][k]=v;WA.splans=P;cs()}
function addPl(){WA.splans=[...getPlans(),{name:'New plan',price:50000,months:1,visits:4}];cs();vSet()}
function delPl(i){var P=getPlans();P.splice(i,1);WA.splans=P;cs();vSet()}

/* Nudges in tasks */
var _tasksOld5=tasks;
tasks=function(){
  var T=_tasksOld5();
  Object.values(SUBS).forEach(function(sub){
    var st=subStatus(sub),vl=visLeft(sub),bl=subBalance(sub);
    var cname=nm(sub.ph);
    if(st==='Active'&&sub.endDate&&new Date(sub.endDate+'T00:00:00').getTime()-Date.now()<7*DAY)
      T.unshift(['📦 Sub expiring soon',cname+' • '+sub.id+' expires '+sub.endDate,wl(sub.ph,'Hello '+cname+', your '+sub.plan+' subscription ('+sub.id+') at Rioes Laundry expires on '+sub.endDate+'. Contact us to renew and keep your savings!'),"subDet='"+sub.id+"';subTab='overview';go('subs')",'']);
    if(st==='Overdue')
      T.unshift(['💰 Sub balance overdue',cname+' owes '+u(bl)+' on '+sub.id,wl(sub.ph,'Hello '+cname+', your subscription '+sub.id+' has an outstanding balance of '+u(bl)+'. Please clear it to continue your visits.'),"subDet='"+sub.id+"';subTab='billing';go('subs')",'']);
    if(st==='Active'&&vl===0)
      T.unshift(['✅ Sub visits all used',cname+' – '+sub.id+' ('+sub.totalVisits+' visits used)',wl(sub.ph,'Hello '+cname+', you have used all your visits on subscription '+sub.id+'. Contact us to renew!'),"subDet='"+sub.id+"';go('subs')",'']);
  });
  return T;
};

initSubs();
</script>
