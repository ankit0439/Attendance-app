const STORAGE_KEY = "aju_eee_attendance_v1";
const BACKUP_VERSION = 1;

const subjects = {
  NTA:  { name:"Network Theory and Analysis", short:"NTA", teacher:"Dr. Sweta Baranwal (SB)", type:"Theory", credit:3 },
  EM1:  { name:"Electrical Machine-I", short:"EM-I", teacher:"Dr. Md Irfan Ahmed (IA)", type:"Theory", credit:3 },
  EEM:  { name:"Electrical & Electronics Measurements", short:"EEM", teacher:"Ms. Taniya Ghosh (TG)", type:"Theory", credit:3 },
  AE:   { name:"Analog Electronics", short:"AE", teacher:"Dr. Jonaki Mukherjee (JM)", type:"Theory", credit:3 },
  GTD:  { name:"Generation, Transmission & Distribution", short:"GTD", teacher:"Ms. Taniya Ghosh (TG)", type:"Theory", credit:3 },
  NTAL: { name:"Network Theory & Analysis Laboratory", short:"NTA LAB", teacher:"Mr. Mihir Mahakud (MM) / Dr. Sweta Baranwal (SB)", type:"Lab", credit:1 },
  EEML: { name:"Electrical & Electronic Measurements Laboratory", short:"EEM LAB", teacher:"Ms. Ichha Rani Hansda (IRH) / Ms. Taniya Ghosh (TG)", type:"Lab", credit:1 },
  EM1L: { name:"Electrical Machine I Laboratory", short:"EM-I LAB", teacher:"Md Nasim Ansari (NA) / Dr. Md Irfan Ahmed (IA)", type:"Lab", credit:1 },
  MATLAB:{ name:"MATLAB", short:"MATLAB", teacher:"Md Nasim Ansari (NA) / Mr. Amit Kumar (AK)", type:"Lab", credit:1 },
  TMT:  { name:"Training Module Technical", short:"TMT", teacher:"Dr. Jonaki Mukherjee (JM) / Dr. Sweta Baranwal (SB)", type:"Module", credit:0 }
};

const times = {
  p1:"08:00 – 08:45",
  p2:"08:50 – 09:35",
  p3:"09:40 – 10:25",
  p4:"10:45 – 11:30",
  p5:"11:35 – 12:20"
};

const days = ["MON","TUE","WED","THU","FRI","SAT"];

const timetable = {
  MON: [
    {p:"p1", key:"NTA"}, {p:"p2",key:"EM1"}, {p:"p3",key:"EEM"},
    {p:"p5", group:{D1:"EM1L",D2:"NTAL"}}
  ],
  TUE: [
    {p:"p1",key:"NTA"}, {p:"p2",group:{D1:"EEML",D2:"MATLAB"}},
    {p:"p3",group:{D1:"EEML",D2:"MATLAB"}}, {p:"p4",key:"GTD"}, {p:"p5",key:"AE"}
  ],
  WED: [
    {p:"p1",key:"EM1"}, {p:"p2",key:"NTA"}, {p:"p3",key:"GTD"},
    {p:"p4",key:"AE"}, {p:"p5",key:"AE"}
  ],
  THU: [
    {p:"p1",key:"TMT"}, {p:"p2",key:"NTA"}, {p:"p3",key:"EEM"},
    {p:"p5",group:{D1:"NTAL",D2:"EM1L"}}
  ],
  FRI: [
    {p:"p1",key:"AE"}, {p:"p2",key:"EM1"}, {p:"p3",key:"GTD"},
    {p:"p4",key:"EEM"}, {p:"p5",key:"GTD"}
  ],
  SAT: [
    {p:"p1",key:"EM1"}, {p:"p2",key:"TMT"}, {p:"p3",key:"EEM"},
    {p:"p5",group:{D1:"MATLAB",D2:"EEML"}}
  ]
};

const periodLabels = {p1:"08:00–08:45",p2:"08:50–09:35",p3:"09:40–10:25",p4:"10:45–11:30",p5:"11:35–12:20"};

let state = loadState();
let currentView = "dashboard";
let selectedDate = toISO(new Date());
let calendarCursor = new Date();

function defaultState(){
  return {
    version: BACKUP_VERSION,
    profile: { group:"D1", semester:"3rd Semester", section:"D" },
    records: {}, // {YYYY-MM-DD:{holiday:boolean, reason:"", statuses:{p1:"P"}}}
    updatedAt: new Date().toISOString()
  };
}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(raw) return {...defaultState(), ...JSON.parse(raw)};
  }catch(e){}
  return defaultState();
}
function saveState(){
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function toISO(d){
  const x = new Date(d);
  const off = x.getTimezoneOffset();
  const local = new Date(x.getTime()-off*60000);
  return local.toISOString().slice(0,10);
}
function fromISO(s){ return new Date(s+"T00:00:00"); }
function dayKey(d){ return ["SUN","MON","TUE","WED","THU","FRI","SAT"][d.getDay()]; }
function prettyDate(iso){
  return fromISO(iso).toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
}
function getRecord(iso){
  if(!state.records[iso]) state.records[iso]={holiday:false,reason:"",statuses:{}};
  return state.records[iso];
}
function scheduleFor(dateISO){
  const day = dayKey(fromISO(dateISO));
  if(!timetable[day]) return [];
  return timetable[day].map(x=>{
    const key = x.key || x.group[state.profile.group];
    return {...x,key};
  });
}
function validPeriods(dateISO){
  return scheduleFor(dateISO).filter(x=>subjects[x.key]);
}
function statusFor(iso,p){ return getRecord(iso).statuses[p] || ""; }
function allScheduledRecords(){
  return Object.entries(state.records);
}

function subjectStats(){
  const stats={};
  Object.keys(subjects).forEach(k=>stats[k]={total:0,present:0,absent:0});
  for(const [date,rec] of allScheduledRecords()){
    if(rec.holiday) continue;
    const schedule=scheduleFor(date);
    schedule.forEach(item=>{
      const s=rec.statuses[item.p];
      if(!s) return;
      stats[item.key].total++;
      if(s==="P") stats[item.key].present++;
      if(s==="A") stats[item.key].absent++;
    });
  }
  return stats;
}

function overallStats(){
  let total=0,present=0,absent=0,holidays=0;
  for(const [date,rec] of allScheduledRecords()){
    if(rec.holiday){holidays++;continue}
    scheduleFor(date).forEach(item=>{
      const s=rec.statuses[item.p];
      if(s==="P"){total++;present++}
      else if(s==="A"){total++;absent++}
    });
  }
  return {total,present,absent,holidays,pct:total?Math.round(present/total*100):0};
}

function subjectPercent(k){
  const st=subjectStats()[k];
  return st.total ? Math.round(st.present/st.total*100) : 0;
}

function pctClass(p){
  return p>=75?"good":p>=65?"warn":"bad";
}

function setView(view){
  currentView=view;
  document.querySelectorAll(".view").forEach(el=>el.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  const titles={dashboard:"Attendance Dashboard",today:"Mark Attendance",calendar:"Attendance Calendar",subjects:"Subject-wise Attendance",timetable:"My Timetable",backup:"Backup & Data"};
  document.getElementById("pageTitle").textContent=titles[view];
  renderAll();
}

function renderAll(){
  document.getElementById("groupPill").textContent=`Group ${state.profile.group}`;
  renderDashboard(); renderToday(); renderCalendar(); renderSubjects(); renderTimetable(); renderBackup();
}

function renderDashboard(){
  const s=overallStats();
  const stats=subjectStats();
  const upcoming = nextClass(selectedDate);
  const low = Object.keys(subjects).filter(k=>stats[k].total>0 && subjectPercent(k)<75).sort((a,b)=>subjectPercent(a)-subjectPercent(b)).slice(0,4);

  document.getElementById("dashboardView").innerHTML=`
    <div class="grid grid-4">
      ${statCard("Overall Attendance",`${s.pct}%`,`${s.present} present / ${s.total} marked`)}
      ${statCard("Present",s.present,"Periods attended")}
      ${statCard("Absent",s.absent,"Periods missed")}
      ${statCard("Holidays",s.holidays,"Days excluded")}
    </div>

    <div class="section-head">
      <div><h2>Quick attendance</h2><p>${prettyDate(selectedDate)}</p></div>
      <button class="btn primary" onclick="setView('today')">Mark today →</button>
    </div>

    <div class="card">
      <div class="attendance-row" style="grid-template-columns:1fr auto">
        <div><div class="subject-name">${upcoming ? subjects[upcoming.key].short+" · "+periodLabels[upcoming.p] : "No class scheduled"}</div>
        <div class="teacher">${upcoming ? subjects[upcoming.key].name+" · "+periodLabels[upcoming.p] : "Enjoy your day / holiday"}</div></div>
        <button class="btn" onclick="setView('timetable')">View timetable</button>
      </div>
    </div>

    <div class="section-head"><div><h2>Subjects needing attention</h2><p>Keep each subject at 75% or above.</p></div><button class="btn" onclick="setView('subjects')">View all</button></div>
    <div class="grid grid-2">
      ${low.length ? low.map(k=>subjectMini(k,stats[k])).join("") : `<div class="card empty" style="grid-column:1/-1">Great — no marked subject is currently below 75%.</div>`}
    </div>

    <div class="section-head"><div><h2>This week's schedule</h2><p>Based on your ${state.profile.group} group timetable.</p></div></div>
    <div class="card table-wrap">${weekMiniTable()}</div>
  `;
}
function statCard(label,value,hint){
  return `<div class="card stat"><div class="accent"></div><div class="label">${label}</div><div class="value">${value}</div><div class="hint">${hint}</div></div>`;
}
function subjectMini(k,st){
  const p=st.total?Math.round(st.present/st.total*100):0;
  return `<div class="card subject-card"><div class="subject-top"><div><div class="subject-code">${subjects[k].type.toUpperCase()}</div><h3>${subjects[k].short}</h3><div class="teacher">${subjects[k].name}</div></div><div class="pct">${p}%</div></div><div class="progress"><span style="width:${Math.min(p,100)}%"></span></div><div style="display:flex;justify-content:space-between;margin-top:8px"><span class="pill ${pctClass(p)}">${p<75?"Needs improvement":"On track"}</span><span class="pill">${st.present}/${st.total} present</span></div></div>`;
}

function renderToday(){
  const rec=getRecord(selectedDate);
  const schedule=validPeriods(selectedDate);
  const day=dayKey(fromISO(selectedDate));
  let body="";
  if(!schedule.length){
    body=`<div class="card empty">No classes are scheduled on ${prettyDate(selectedDate)}.</div>`;
  }else{
    body=`<div class="card">${schedule.map(item=>{
      const sub=subjects[item.key], status=rec.statuses[item.p]||"";
      return `<div class="attendance-row">
        <div class="time">${periodLabels[item.p]}</div>
        <div><div class="subject-name">${sub.short} <span class="pill">${sub.type}</span></div><div class="teacher">${sub.name} · ${sub.teacher}</div></div>
        <div class="status-buttons">
          <button class="status-btn present ${status==="P"?"active":""}" ${rec.holiday?"disabled":""} onclick="mark('${selectedDate}','${item.p}','P')">✓ Present</button>
          <button class="status-btn absent ${status==="A"?"active":""}" ${rec.holiday?"disabled":""} onclick="mark('${selectedDate}','${item.p}','A')">✕ Absent</button>
          <button class="status-btn clear ${status===""?"active":""}" ${rec.holiday?"disabled":""} onclick="mark('${selectedDate}','${item.p}','')">Clear</button>
        </div>
      </div>`;
    }).join("")}</div>`;
  }
  document.getElementById("todayView").innerHTML=`
    <div class="card pad">
      <div class="datebar">
        <input class="date-input" type="date" value="${selectedDate}" onchange="changeDate(this.value)">
        <span class="day-chip">${day==="SUN"?"SUNDAY":day}</span>
        <button class="btn" onclick="changeDate(toISO(new Date()))">Today</button>
        <button class="btn" onclick="shiftDate(-1)">← Previous</button>
        <button class="btn" onclick="shiftDate(1)">Next →</button>
      </div>
    </div>
    <div style="height:14px"></div>
    ${rec.holiday ? `<div class="holiday-banner"><div><strong>🏖 Holiday / No classes</strong><br><span>${rec.reason||"This date is excluded from attendance."}</span></div><button class="btn" onclick="toggleHoliday(false)">Remove holiday</button></div><div style="height:14px"></div>`:""}
    ${body}
    <div class="section-head"><div><h2>Day controls</h2><p>Use Holiday when your college gives a holiday or classes are cancelled.</p></div></div>
    <div class="card pad"><button class="btn ${rec.holiday?"danger":""}" onclick="toggleHoliday(${!rec.holiday})">${rec.holiday?"Remove holiday":"Mark this day as Holiday"}</button>${rec.holiday?"":`<span style="font-size:10px;color:var(--muted);margin-left:10px">Holiday days do not count as present or absent.</span>`}</div>
  `;
}
function changeDate(v){selectedDate=v;renderAll();}
function shiftDate(n){selectedDate=toISO(new Date(fromISO(selectedDate).getTime()+n*86400000));renderAll();}
function mark(date,p,status){
  const rec=getRecord(date);
  if(rec.holiday)return;
  if(status) rec.statuses[p]=status; else delete rec.statuses[p];
  saveState(); renderAll(); toast(status==="P"?"Marked Present":"Marked Absent");
}
function toggleHoliday(enable){
  const rec=getRecord(selectedDate);
  if(enable){
    openModal("Mark holiday",`<div class="form-row"><label>Holiday / cancellation reason (optional)</label><input id="holidayReason" placeholder="e.g. College holiday, festival, exam day"></div>`,
      `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="confirmHoliday()">Save holiday</button>`);
  }else{
    rec.holiday=false; rec.reason=""; saveState(); renderAll(); toast("Holiday removed");
  }
}
function confirmHoliday(){
  const rec=getRecord(selectedDate);
  rec.holiday=true; rec.reason=document.getElementById("holidayReason").value.trim();
  rec.statuses={}; saveState(); closeModal(); renderAll(); toast("Holiday saved");
}

function renderSubjects(){
  const stats=subjectStats();
  document.getElementById("subjectsView").innerHTML=`
    <div class="grid grid-3">
      ${Object.keys(subjects).map(k=>{
        const st=stats[k],p=st.total?Math.round(st.present/st.total*100):0;
        return `<div class="card subject-card">
          <div class="subject-top"><div><div class="subject-code">${subjects[k].type} · ${subjects[k].credit} CREDIT</div><h3>${subjects[k].name}</h3></div><div class="pct">${p}%</div></div>
          <div class="teacher">${subjects[k].teacher}</div>
          <div class="progress"><span style="width:${Math.min(p,100)}%"></span></div>
          <div style="display:flex;justify-content:space-between;margin-top:10px"><span class="pill ${pctClass(p)}">${st.total?`${p}% attendance`:"No data yet"}</span><span class="pill">${st.present} P · ${st.absent} A</span></div>
        </div>`;
      }).join("")}
    </div>
  `;
}

function renderCalendar(){
  const y=calendarCursor.getFullYear(),m=calendarCursor.getMonth();
  const first=new Date(y,m,1),last=new Date(y,m+1,0);
  const start=(first.getDay()+6)%7;
  let cells="";
  for(let i=0;i<start;i++) cells+=`<div class="cal-day muted"></div>`;
  for(let d=1;d<=last.getDate();d++){
    const date=new Date(y,m,d), iso=toISO(date), rec=state.records[iso];
    const scheduled=scheduleFor(iso);
    let cls="", label="";
    if(rec?.holiday){cls="holiday";label="HOLIDAY"}
    else if(rec){
      const vals=Object.values(rec.statuses);
      const p=vals.filter(x=>x==="P").length,a=vals.filter(x=>x==="A").length;
      if(a) {cls="absent";label=`${a} absent${p?` · ${p} present`:""}`}
      else if(p) {cls="present";label=`${p} present`}
    }
    cells+=`<button class="cal-day ${iso===selectedDate?"today":""}" onclick="changeDate('${iso}');setView('today')"><span class="cal-num">${d}</span>${scheduled.length?`<span class="cal-status ${cls}">${label||scheduled.length+" class"+(scheduled.length>1?"es":"")}</span>`:""}</button>`;
  }
  document.getElementById("calendarView").innerHTML=`
    <div class="card pad">
      <div class="calendar-head"><div><h2 style="margin:0;font-size:17px">${calendarCursor.toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</h2><p style="margin:5px 0 0;font-size:10px;color:var(--muted)">Click a date to mark individual periods.</p></div>
      <div class="calendar-controls"><button class="btn" onclick="calendarShift(-1)">←</button><button class="btn" onclick="calendarShift(1)">→</button></div></div>
      <div class="calendar-grid">${["MON","TUE","WED","THU","FRI","SAT","SUN"].map(x=>`<div class="cal-label">${x}</div>`).join("")}${cells}</div>
    </div>`;
}
function calendarShift(n){calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+n,1);renderCalendar();}

function renderTimetable(){
  const cols=[["p1",periodLabels.p1],["p2",periodLabels.p2],["p3",periodLabels.p3],["p4",periodLabels.p4],["p5",periodLabels.p5]];
  let rows=days.map(day=>{
    const items=timetable[day]||[];
    const byP={};items.forEach(i=>byP[i.p]=i);
    const cells=cols.map(([p])=>{
      const item=byP[p]; if(!item) return `<td class="tt-cell">—</td>`;
      const key=item.key||item.group[state.profile.group],sub=subjects[key];
      return `<td class="tt-cell"><div class="tt-subject">${sub.short}</div><div class="tt-teacher">${sub.teacher}</div>${item.group?`<div class="pill" style="margin-top:6px">${state.profile.group}</div>`:""}</td>`;
    }).join("");
    return `<tr><td class="timetable-day">${day}</td>${cells}</tr>`;
  }).join("");
  document.getElementById("timetableView").innerHTML=`
    <div class="card table-wrap"><table><thead><tr><th>Day</th>${cols.map(x=>`<th>${x[1]}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
    <div class="section-head"><div><h2>Group settings</h2><p>Labs change automatically for D1 vs D2.</p></div></div>
    <div class="card pad"><button class="btn ${state.profile.group==="D1"?"primary":""}" onclick="setGroup('D1')">Group D1</button> <button class="btn ${state.profile.group==="D2"?"primary":""}" onclick="setGroup('D2')">Group D2</button></div>
  `;
}
function setGroup(g){
  state.profile.group=g;saveState();renderAll();toast(`Group changed to ${g}`);
}

function renderBackup(){
  const s=overallStats();
  document.getElementById("backupView").innerHTML=`
    <div class="grid grid-2">
      <div class="card backup-box"><div class="backup-icon">↥</div><h3>Download backup</h3><p>Save every attendance mark, holiday, group setting and app data as a JSON file. Keep this file somewhere safe such as Google Drive or a USB drive.</p><div class="actions"><button class="btn primary" onclick="downloadBackup()">Download JSON backup</button><button class="btn" onclick="downloadCSV()">Export CSV</button></div></div>
      <div class="card backup-box"><div class="backup-icon">↥</div><h3>Restore backup</h3><p>Import a previously exported JSON backup. This replaces the current attendance data, so make a backup of the current data first.</p><div class="actions"><button class="btn" onclick="document.getElementById('backupFile').click()">Choose JSON backup</button><input id="backupFile" type="file" accept=".json,application/json" style="display:none" onchange="restoreBackup(event)"></div></div>
    </div>
    <div class="section-head"><div><h2>Storage status</h2><p>Browser storage is used automatically after every change.</p></div></div>
    <div class="card pad">
      <div class="notice"><strong>${s.total}</strong> attendance periods marked · <strong>${s.holidays}</strong> holidays · Last saved: <strong>${new Date(state.updatedAt).toLocaleString("en-IN")}</strong><br><br>
      <b>Recommended:</b> download a JSON backup once a week or after major attendance updates. The app does not need internet to save or view your records.</div>
      <div class="actions"><button class="btn danger" onclick="resetAll()">Clear all attendance</button></div>
    </div>
  `;
}
function downloadBackup(){
  const payload={...state,exportedAt:new Date().toISOString(),app:"AJU Attendance — Diploma EEE"};
  downloadBlob(JSON.stringify(payload,null,2),`AJU_Attendance_Backup_${toISO(new Date())}.json`,"application/json");
  toast("Backup downloaded");
}
function downloadCSV(){
  const lines=[["Date","Day","Period","Time","Subject","Group","Status","Holiday","Reason"]];
  Object.keys(state.records).sort().forEach(date=>{
    const rec=state.records[date],sched=scheduleFor(date);
    if(rec.holiday) lines.push([date,dayKey(fromISO(date)),"","","",""+state.profile.group,"HOLIDAY","YES",rec.reason||""]);
    else sched.forEach(i=>{
      const s=rec.statuses[i.p]||"";
      if(s) lines.push([date,dayKey(fromISO(date)),i.p,periodLabels[i.p],subjects[i.key].name,state.profile.group,s,"NO",""]);
    });
  });
  const csv=lines.map(row=>row.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  downloadBlob(csv,`AJU_Attendance_${toISO(new Date())}.csv`,"text/csv");
  toast("CSV exported");
}
function downloadBlob(content,name,type){
  const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
function restoreBackup(e){
  const file=e.target.files[0]; if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const data=JSON.parse(reader.result);
      if(!data.records || !data.profile) throw new Error("Invalid backup");
      state={...defaultState(),...data}; saveState(); renderAll(); toast("Backup restored successfully");
    }catch(err){toast("Invalid backup file");}
    e.target.value="";
  };
  reader.readAsText(file);
}
function resetAll(){
  openModal("Clear attendance",`<div class="notice">This permanently clears all attendance marks and holidays from this browser. Download a backup first if you may need the data later.</div>`,
  `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn danger" onclick="confirmReset()">Clear everything</button>`);
}
function confirmReset(){state=defaultState();saveState();closeModal();renderAll();toast("Attendance cleared");}

function nextClass(dateISO){
  const schedule=validPeriods(dateISO); const rec=getRecord(dateISO);
  return schedule.find(x=>!rec.statuses[x.p])||schedule[0]||null;
}
function weekMiniTable(){
  return `<table><thead><tr><th>Day</th><th>Classes</th><th>Marked</th></tr></thead><tbody>${days.map(day=>{
    const iso=toISO(new Date()); const date=fromISO(iso); const diff=(["SUN","MON","TUE","WED","THU","FRI","SAT"].indexOf(day)-date.getDay()+7)%7;
    const d=new Date(date.getTime()+diff*86400000),ds=toISO(d),items=scheduleFor(ds),rec=state.records[ds];
    const marked=items.filter(i=>rec?.statuses[i.p]).length;
    return `<tr><td><strong>${day}</strong></td><td>${items.map(i=>subjects[i.key].short).join(" · ")||"—"}</td><td>${marked}/${items.length}</td></tr>`;
  }).join("")}</tbody></table>`;
}

function openModal(title,body,actions){
  document.getElementById("modalRoot").innerHTML=`<div class="modal-backdrop" onclick="if(event.target===this)closeModal()"><div class="modal"><h2>${title}</h2><p>Update your attendance data safely.</p>${body}<div class="modal-actions">${actions}</div></div></div>`;
}
function closeModal(){document.getElementById("modalRoot").innerHTML=""}
function toast(msg){
  const el=document.getElementById("toast");el.textContent=msg;el.classList.add("show");
  clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove("show"),1800);
}

document.querySelectorAll(".nav-item").forEach(b=>b.addEventListener("click",()=>setView(b.dataset.view)));
document.getElementById("quickBackup").addEventListener("click",downloadBackup);
document.getElementById("groupPill").addEventListener("click",()=>setView("timetable"));
renderAll();
