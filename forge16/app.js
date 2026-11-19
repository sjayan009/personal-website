(()=>{'use strict';
const D=window.FORGE_DATA;
if(!D){document.getElementById('content').textContent='Training data could not be loaded. Refresh the page.';return;}
const START=new Date(D.start+'T12:00:00'),DAY=86400000,DAY_NAMES=['MON','TUE','WED','THU','FRI','SAT','SUN'],DAY_FULL=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'],KEY='forge16-progress-v1';
const escapeHTML=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateOf=(week,day)=>new Date(START.getTime()+(((week-1)*7)+day)*DAY);
const iso=(d)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const niceDate=(d,options={month:'short',day:'numeric'})=>d.toLocaleDateString('en-US',options);
const compact=(s,n=120)=>{s=String(s??'');return s.length>n?s.slice(0,n-1)+'…':s};
const simpleText=(s)=>escapeHTML(compact(s,500));
const isValidUrl=(u)=>{try{const x=new URL(u);return ['https:','http:'].includes(x.protocol)?x.href:'#'}catch{return '#'}};
const storageRead=()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');if(!o||typeof o!=='object')return {};return o}catch{return {}}};
let saved=storageRead(),state={view:'dashboard',week:Math.min(16,Math.max(1,Math.floor((Date.now()-START.getTime())/(7*DAY))+1)),day:0,query:'',topic:'all',difficulty:'all',statusFilter:'all',tab:'all',timer:null,clock:null,modalId:null};
const realToday=new Date(),realTodayIso=iso(realToday);
let currentIndex=Math.floor((new Date(realTodayIso+'T12:00:00').getTime()-START.getTime())/DAY);
if(currentIndex>=0&&currentIndex<112){state.day=currentIndex%7;state.week=Math.floor(currentIndex/7)+1;}
function entry(id){return saved[id]&&typeof saved[id]==='object'?saved[id]:{}}
function isDone(t){return !!entry(t.id).done}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(saved))}catch{toast('Browser storage unavailable. Export a backup regularly.')}}
function mark(id,done){const was=!!entry(id).done;const current=entry(id);saved[id]={...current,done,doneAt:done?(current.doneAt||new Date().toISOString()):null};persist();render();if(done&&!was)toast('Mission complete · +'+xpFor(byId[id]||{kind:'review'})+' XP')}
function updateEntry(id,field,value){saved[id]={...entry(id),[field]:value};persist()}
const WEEK_TASKS={},ALL=[];
function add(w,day,item){const t={...item,week:w,day:Math.min(6,Math.max(0,day))};if(!WEEK_TASKS[w])WEEK_TASKS[w]=Array.from({length:7},()=>[]);WEEK_TASKS[w][t.day].push(t);ALL.push(t);return t}
const slots=[0,1,3,4,5,0,1,3,4,5,2,0,1,3,4,5];
for(const wk of D.weeks){
 const w=wk.week,problems=D.problems.filter(p=>p.week===w);
 problems.forEach((p,ix)=>add(w,slots[ix%slots.length],{id:'lc-'+p.id,kind:'leetcode',name:p.title,description:p.topic+' · '+p.difficulty,minutes:p.difficulty==='Hard'?45:p.difficulty==='Easy'?20:35,url:p.url,raw:p,optional:false,group:'LEETCODE'}));
 for(let k=0;k<Math.max(2,wk.blind||2);k++)add(w,[1,3,5,0,4,2][k%6],{id:'blind-'+w+'-'+k,kind:'blind',name:'Unseen medium · #'+(k+1),description:'Cold attempt · no hints · explain invariants',minutes:35,url:'https://leetcode.com/problemset/',optional:false,group:'BLIND PRACTICE'});
 for(let k=0;k<Math.min(4,Math.max(2,Math.ceil((wk.reviews||4)/2)));k++)add(w,[0,2,4,6][k],{id:'recall-'+w+'-'+k,kind:'review',name:'Active recall · '+Math.max(1,Math.ceil((wk.reviews||4)/4))+' problems',description:'1 / 3 / 7 / 21-day missed problems; cold solve',minutes:20,url:null,optional:false,group:'SPACED RECALL'});
}
for(const t of D.interviews){
 if(!t.week||t.week<1||t.week>16)continue;
 const type=(t.type||'').toLowerCase();
 let day=type.includes('online assessment')?5:type.includes('traditional')?4:type.includes('practical')?6:type.includes('systems')?6:type.includes('ml')?6:6;
 add(t.week,day,{id:'int-'+t.id,kind:'interview',name:t.title,description:(t.followup||'')+' · '+t.type,minutes:t.minutes||60,url:t.url,followupUrl:t.followupUrl,raw:t,optional:t.priority==='Stretch',group:'INTERVIEW ARENA'});
}
for(const t of D.ai){
 if(!t.week||t.week<1||t.week>16)continue;
 const cap=t.priority==='Capstone';
 add(t.week,cap?5:t.priority==='Core'?2:6,{id:'ai-'+t.id,kind:'ai',name:t.title,description:t.type+' · '+t.difficulty,minutes:t.minutes||60,url:t.url,raw:t,optional:t.priority==='Stretch',group:cap?'REPO CAPSTONE':'AI PROJECT'});
}
const byId=Object.fromEntries(ALL.map(t=>[t.id,t]));
const tasksFor=(week,day,optional=true)=>((WEEK_TASKS[week]||[])[day]||[]).filter(t=>optional||!t.optional);
const weekTasks=(week)=>((WEEK_TASKS[week]||[]).flat());
const required=(tasks)=>tasks.filter(t=>!t.optional);
const completed=(tasks)=>tasks.filter(isDone);
const percent=(tasks)=>{const x=required(tasks);return x.length?Math.round(completed(x).length/x.length*100):0};
const xpFor=(t)=>({leetcode:25,blind:30,review:12,interview:60,ai:65}[t.kind]||15)+(t.group==='REPO CAPSTONE'?30:0);
const allXP=()=>ALL.filter(isDone).reduce((n,t)=>n+xpFor(t),0);
const level=()=>Math.floor(Math.sqrt(allXP()/150))+1;
const totalCompleted=()=>completed(ALL).length;
function streak(){
 const dates=new Set(Object.values(saved).filter(v=>v?.done&&v.doneAt).map(v=>String(v.doneAt).slice(0,10)));
 let d=new Date(realTodayIso+'T12:00:00');let n=0;
 if(!dates.has(iso(d)))d=new Date(d.getTime()-DAY);
 while(dates.has(iso(d))){n++;d=new Date(d.getTime()-DAY)}return n;
}
const dailyIndex=()=>currentIndex>=0&&currentIndex<112?currentIndex:null;
function header(title,desc,extra=''){return '<div class="page-heading"><div><div class="eyebrow">FORGE16 / YOUR PROTOCOL</div><h1>'+escapeHTML(title)+'</h1><p>'+escapeHTML(desc)+'</p></div>'+extra+'</div>'}
const metric=(icon,value,name,suffix='')=>'<div class="metric"><div class="metric-icon">'+icon+'</div><div class="metric-value">'+escapeHTML(value)+' <span class="metric-suffix">'+escapeHTML(suffix)+'</span></div><div class="metric-name">'+escapeHTML(name)+'</div></div>';
const ring=(pct)=>'<div class="ring"><svg viewBox="0 0 150 150" role="img" aria-label="'+pct+' percent completion"><circle cx="75" cy="75" r="61"/><circle class="ring-val" cx="75" cy="75" r="61" stroke-dasharray="'+(2*Math.PI*61)+'" stroke-dashoffset="'+(2*Math.PI*61*(1-pct/100))+'"/></svg><div class="ring-text"><div class="ring-big">'+pct+'<span>%</span></div><div class="ring-label">COMPLETED</div></div></div>';
const tag=(t)=>'<span class="pill '+(t.kind==='leetcode'?'lc':t.kind==='interview'?'interview':t.kind==='ai'?'ai':t.kind==='review'?'review':'')+'">'+escapeHTML(t.group)+'</span>';
function tileDay(week,day){const d=dateOf(week,day),tasks=tasksFor(week,day),done=completed(required(tasks)).length,total=required(tasks).length;const sel=state.day===day?' selected':'';return '<button class="day-tile'+sel+(done?' hasdone':'')+(total&&done===total?' complete':'')+(iso(d)===realTodayIso?' today':'')+'" data-day="'+day+'" aria-label="'+DAY_FULL[day]+' '+done+' of '+total+' complete"><div class="dow">'+DAY_NAMES[day]+'</div><div class="date-num">'+d.getDate()+'</div><div class="day-meta"><i class="tiny-dot"></i><span class="day-task-count">'+done+'/'+total+' done</span></div></button>'}
function taskRow(t){const done=isDone(t);return '<div class="task-row"><button class="task-check '+(done?'done':'')+'" data-toggle="'+escapeHTML(t.id)+'" aria-label="'+(done?'Mark incomplete':'Mark complete')+'">'+(done?'✓':'')+'</button><div class="task-main"><a href="#" data-task="'+escapeHTML(t.id)+'" class="task-title '+(done?'done':'')+'">'+escapeHTML(t.name)+'</a><div class="task-sub">'+escapeHTML(compact(t.description,145))+'</div><div class="task-meta">'+tag(t)+'<span class="pill">'+t.minutes+' MIN</span>'+(t.optional?'<span class="pill optional">OPTIONAL</span>':'')+'</div></div><button class="task-open" data-task="'+escapeHTML(t.id)+'" aria-label="Task details">↗</button></div>'}
function renderDashboard(){
 const w=state.week,wk=D.weeks[w-1],tasks=weekTasks(w),daytasks=tasksFor(w,state.day),d=dateOf(w,state.day),wp=percent(tasks),totalreq=required(ALL);
 return '<div class="eyebrow">ACTIVATE YOUR POTENTIAL</div><h1 class="display">Build a <span class="em">sharper mind.</span><br/>One day at a time.</h1><p class="sub">A 16-week training system for technical mastery. Every problem, every interview, every project — one focused mission at a time.</p>'+
 '<div class="hero"><div class="hero-main"><div class="hero-kicker">◉ NOW TRAINING · WEEK '+String(w).padStart(2,'0')+'/16</div><div class="hero-title">'+escapeHTML(wk.focus)+'.<br/><span>Own the pattern.</span></div><div class="hero-copy">'+escapeHTML(compact(wk.depth,210))+'</div><div class="hero-footer"><button class="primary-btn" data-go="week">Open this week ↗</button><button class="secondary-btn" data-go="problems">Problem vault</button><span class="hero-sub-stat">'+escapeHTML(wk.dates)+' · '+completed(required(tasks)).length+'/'+required(tasks).length+' missions</span></div></div><div class="hero-card"><div class="hero-card-top">WEEKLY MASTERY</div><div class="ring-wrap">'+ring(wp)+'</div><div class="ring-bottom"><span><strong>'+completed(required(tasks)).length+'</strong> finished</span><span><strong>'+Math.max(0,required(tasks).length-completed(required(tasks)).length)+'</strong> remaining</span></div></div></div>'+
 '<div class="metrics">'+metric('⚡',allXP(),'Total XP earned','XP')+metric('◈',level(),'Training level','LVL')+metric('↗',streak(),'Current streak','DAYS')+metric('✓',completed(totalreq).length+'/'+totalreq.length,'Required missions completed')+'</div>'+
 '<div class="section-head"><h2>This week, mapped.</h2><button class="section-link" data-go="week">Full week schedule ↗</button></div><div class="week-strip">'+DAY_NAMES.map((_,i)=>tileDay(w,i)).join('')+'</div>'+
 '<div class="section-head"><h2>'+escapeHTML(DAY_FULL[state.day])+' · '+escapeHTML(niceDate(d,{month:'long',day:'numeric'}))+'</h2><span class="section-note">'+completed(required(daytasks)).length+'/'+required(daytasks).length+' essentials complete</span></div>'+
 '<div class="daily-layout"><div class="panel"><div class="panel-header"><strong>Your mission queue</strong><span>One task at a time</span></div>'+(daytasks.length?daytasks.map(taskRow).join(''):'<div class="empty">Nothing scheduled. Enjoy the breathing room.</div>')+'</div>'+
 '<div class="side-stack"><div class="sidepanel"><span class="tag">THIS WEEK\'S FOCUS</span><div class="side-highlight">'+escapeHTML(wk.focus)+'</div><p>'+escapeHTML(compact(wk.gate,220))+'</p><button class="small-btn" data-go="week">See exit criteria ↗</button></div><div class="sidepanel"><h3>Discipline beats intensity.</h3><p>Cold solve before opening editorials. Explain the invariant aloud. Test edge cases. Let deliberate repetition do the rest.</p><div class="progress-track"><span style="width:'+percent(ALL)+'%"></span></div><p style="margin-top:11px">'+percent(ALL)+'% of your full program complete</p></div><div class="sidepanel"><h3>Ready for a focus block?</h3><p>Choose a task, start its timer, close distractions, and work one problem all the way through.</p><button class="small-btn solid" data-open-timer="25">Start 25-minute focus ↗</button></div></div></div>';
}
function renderWeek(){
 const w=state.week,wk=D.weeks[w-1],tasks=weekTasks(w);
 return header('The weekly playbook','Seven days. One deliberate trajectory. Every spreadsheet assignment mapped to a real calendar.',
 '<div class="week-select"><button class="week-arrow" data-week="-1" aria-label="Previous week">‹</button><div class="week-current">WEEK '+String(w).padStart(2,'0')+'</div><button class="week-arrow" data-week="1" aria-label="Next week">›</button></div>')+
 '<div class="week-overview"><div><span class="week-badge">WEEK '+w+' OF 16 · '+escapeHTML(wk.dates)+'</span><h2>'+escapeHTML(wk.focus)+'</h2><p>'+escapeHTML(wk.depth)+'<br/><strong style="color:#d8edc1">Exit gate:</strong> '+escapeHTML(wk.gate)+'</p></div><div class="week-target"><strong>'+completed(required(tasks)).length+' / '+required(tasks).length+'</strong><span>ESSENTIAL MISSIONS</span><div class="progress-track" style="margin-top:11px;min-width:135px"><span style="width:'+percent(tasks)+'%"></span></div></div></div>'+
 '<div class="week-days-grid">'+DAY_NAMES.map((name,i)=>{let day=tasksFor(w,i),req=required(day),done=completed(req).length;return '<div class="week-col"><div class="week-col-head"><strong>'+name+'</strong><span>'+dateOf(w,i).getDate()+' · '+done+'/'+req.length+'</span></div>'+day.map(t=>'<div class="week-card '+(isDone(t)?'completed':'')+'" data-task="'+escapeHTML(t.id)+'"><span class="week-tag">'+escapeHTML(t.group)+'</span>'+(isDone(t)?'<span class="done-icon">✓</span>':'')+'<div class="week-task-title">'+escapeHTML(t.name)+'</div><div class="week-task-meta">'+t.minutes+'m'+(t.optional?' · optional':'')+'</div></div>').join('')+'</div>'}).join('')+'</div><p class="subtle-note" style="margin-top:14px">Only Core / required tasks count toward your weekly completion rate. Stretch assignments remain visible but never block progress.</p>';
}
function renderProblems(){
 const q=state.query.toLowerCase(),arr=D.problems.filter(p=>(!q||[p.title,p.topic,p.id].join(' ').toLowerCase().includes(q))&&(state.topic==='all'||p.topic===state.topic)&&(state.difficulty==='all'||p.difficulty===state.difficulty)&&(state.statusFilter==='all'||(state.statusFilter==='done'?isDone(byId['lc-'+p.id]):!isDone(byId['lc-'+p.id]))));
 const topics=[...new Set(D.problems.map(p=>p.topic))].sort();
 return header('Problem vault','136 real LeetCode problems, grouped by pattern and mapped to your 16-week plan.', '<button class="small-btn" data-go="week">↗ Weekly roadmap</button>')+
 '<div class="controls"><input class="search-input" id="vaultQuery" placeholder="Search a pattern or problem… ( / )" value="'+escapeHTML(state.query)+'"/><select class="select" id="topicSelect"><option value="all">All patterns</option>'+topics.map(t=>'<option value="'+escapeHTML(t)+'" '+(state.topic===t?'selected':'')+'>'+escapeHTML(t)+'</option>').join('')+'</select><select class="select" id="difficultySelect">'+['all','Easy','Medium','Hard'].map(v=>'<option value="'+v+'" '+(state.difficulty===v?'selected':'')+'>'+ (v==='all'?'All difficulty':v)+'</option>').join('')+'</select><select class="select" id="statusSelect"><option value="all">All statuses</option><option value="done" '+(state.statusFilter==='done'?'selected':'')+'>Completed</option><option value="todo" '+(state.statusFilter==='todo'?'selected':'')+'>To do</option></select></div>'+
 '<div class="section-head"><h2>'+arr.length+' problems</h2><span class="section-note">Click any row for notes and a focus timer</span></div><div class="library-table"><div class="library-head"><span>ID</span><span>PROBLEM</span><span>PATTERN</span><span>DIFFICULTY</span><span>WEEK</span><span>STATUS</span></div>'+arr.map(p=>{const t=byId['lc-'+p.id];return '<div class="library-row" data-task="'+escapeHTML(t.id)+'"><span class="num">#'+escapeHTML(p.id)+'</span><span class="name">'+escapeHTML(p.title)+'</span><span class="topic">'+escapeHTML(p.topic)+'</span><span class="difficulty '+escapeHTML(p.difficulty)+'">'+escapeHTML(p.difficulty)+'</span><span class="num">W'+p.week+'</span><span class="status '+(isDone(t)?'done':'')+'">'+(isDone(t)?'✓ Done':'Not started')+'</span></div>'}).join('')+(arr.length?'':'<div class="empty">No matching problems. Try another filter.</div>')+'</div>';
}
function renderInterviews(){
 const q=state.query.toLowerCase(),list=D.interviews.filter(t=>(state.tab==='all'||(state.tab==='Core'?t.priority==='Core':t.type===state.tab))&&(!q||[t.title,t.type,t.followup].join(' ').toLowerCase().includes(q)));
 const modes=['all',...new Set(D.interviews.map(t=>t.type))];
 return header('Interview arena','Real timed technical screens, HackerRank OAs, implementation design, systems and ML questioning.')+
 '<div class="controls"><input class="search-input" id="vaultQuery" placeholder="Find a drill or topic…" value="'+escapeHTML(state.query)+'"/><select class="select" id="tabSelect"><option value="all">All formats</option><option value="Core" '+(state.tab==='Core'?'selected':'')+'>Core only</option>'+modes.filter(x=>x!=='all').map(v=>'<option value="'+escapeHTML(v)+'" '+(state.tab===v?'selected':'')+'>'+escapeHTML(v)+'</option>').join('')+'</select></div>'+
 '<div class="section-head"><h2>'+list.length+' interview rounds</h2><span class="section-note">No AI during traditional practice</span></div><div class="list-cards">'+list.map(t=>{const x=byId['int-'+t.id];return '<div class="resource-card" data-task="'+escapeHTML(x.id)+'"><div class="resource-num">'+escapeHTML(t.id)+'</div><div class="resource-content"><div class="resource-title">'+escapeHTML(t.title)+'</div><div class="resource-desc">'+escapeHTML(compact(t.instructions,180))+'</div><div class="resource-meta"><span class="pill interview">'+escapeHTML(t.type)+'</span><span class="pill">WEEK '+t.week+'</span><span class="pill">'+t.minutes+' MIN</span>'+(t.priority==='Stretch'?'<span class="pill optional">STRETCH</span>':'')+'</div></div><span class="resource-status '+(isDone(x)?'done':'')+'">'+(isDone(x)?'✓ Finished':'↗ Details')+'</span></div>'}).join('')+'</div>';
}
function renderAI(){
 const q=state.query.toLowerCase(),list=D.ai.filter(t=>(state.tab==='all'||t.priority===state.tab)&&(!q||[t.title,t.type,t.task].join(' ').toLowerCase().includes(q)));
 const count=D.ai.filter(t=>t.type.startsWith('LeetCode Project')).length;
 return header('AI engineering lab','Master agent-directed coding with '+count+' official LeetCode Premium projects and real repository capstones.')+
 '<div class="controls"><input class="search-input" id="vaultQuery" placeholder="Search AI projects, concurrency, debugging…" value="'+escapeHTML(state.query)+'"/><select id="tabSelect" class="select">'+['all','Core','Stretch','Capstone'].map(v=>'<option value="'+v+'" '+(state.tab===v?'selected':'')+'>'+ (v==='all'?'All priorities':v)+'</option>').join('')+'</select></div>'+
 '<div class="section-head"><h2>'+list.length+' AI-assisted challenges</h2><span class="section-note">One Core project weekly. Stretch is optional.</span></div><div class="list-cards">'+list.map(t=>{const x=byId['ai-'+t.id];return '<div class="resource-card" data-task="'+escapeHTML(x.id)+'"><div class="resource-num">'+escapeHTML(t.id)+'</div><div class="resource-content"><div class="resource-title">'+escapeHTML(t.title)+'</div><div class="resource-desc">'+escapeHTML(compact(t.task,180))+'</div><div class="resource-meta"><span class="pill ai">'+escapeHTML(t.priority)+'</span><span class="pill">WEEK '+t.week+'</span><span class="pill">'+t.minutes+' MIN</span><span class="pill">'+escapeHTML(t.difficulty)+'</span></div></div><span class="resource-status '+(isDone(x)?'done':'')+'">'+(isDone(x)?'✓ Finished':'↗ Details')+'</span></div>'}).join('')+'</div>';
}
function renderProgress(){
 const done=completed(ALL),lc=completed(ALL.filter(t=>t.kind==='leetcode')).length,int=completed(ALL.filter(t=>t.kind==='interview')).length,ai=completed(ALL.filter(t=>t.kind==='ai')).length;
 return header('Your progress, quantified.','Track what you can control. The streak is encouragement; the proof is consistent, independent problem-solving.')+
 '<div class="metrics metrics-section">'+metric('⚡',allXP(),'Experience points')+metric('⌘',lc+'/'+D.problems.length,'LeetCode solved')+metric('◇',int+'/'+D.interviews.length,'Interview rounds')+metric('✳',ai+'/'+D.ai.length,'AI projects')+'</div>'+
 '<div class="intro-split"><div class="panel panel-pad"><div class="section-head" style="margin:0 0 8px"><h2>16-week completion</h2><span class="section-note">Required missions</span></div><div class="bars">'+D.weeks.map(w=>'<div class="barcol" title="Week '+w.week+': '+percent(weekTasks(w.week))+'%"><div class="bar-fillwrap"><div class="bar-fill" style="height:'+percent(weekTasks(w.week))+'%"></div></div><div class="bar-label">W'+w.week+'</div></div>').join('')+'</div><div class="section-head"><h2>Skill milestones</h2><span class="section-note">Earned, not assumed</span></div><div class="milestone-list">'+[
 ['First ignition','Complete any mission',done.length>=1],['Pattern recognition','Solve 10 LeetCode problems',lc>=10],['Interview contender','Finish 5 timed interview drills',int>=5],['Agent supervisor','Complete 5 AI projects',ai>=5],['Disciplined builder','Earn 1,000 XP',allXP()>=1000],['Mastery protocol','Finish every required mission',percent(ALL)===100]
 ].map(([title,desc,unlocked])=>'<div class="milestone '+(unlocked?'unlocked':'')+'"><span class="milestone-ico">'+(unlocked?'✓':'◈')+'</span><div><strong>'+escapeHTML(title)+'</strong><p>'+escapeHTML(desc)+'</p></div><span class="state">'+(unlocked?'UNLOCKED':'LOCKED')+'</span></div>').join('')+'</div></div><div class="side-stack"><div class="sidepanel"><h3>Level '+level()+' · '+allXP().toLocaleString()+' XP</h3><div class="ring-wrap">'+ring(percent(ALL))+'</div><p>Your advancement comes from completed tasks. Optional work adds XP without blocking your progression.</p></div><div class="sidepanel"><h3>Keep your data safe.</h3><p>Progress lives in this browser only. Export a JSON backup regularly, especially when switching devices or clearing browser data.</p><button class="small-btn solid" id="progressExport">Export progress ↗</button><button style="margin-left:8px" class="small-btn" id="progressImport">Restore ↗</button></div><div class="sidepanel"><h3>The 4/5 rule.</h3><p>A completed interview should include a score, notes about mistakes and your independent verification. Progress shows work completed, not proof of skill by itself.</p></div></div></div>';
}
function render(){
 const nav=document.querySelectorAll('.nav-item');nav.forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));
 const names={dashboard:'COMMAND CENTER',week:'WEEKLY PLAN',problems:'PROBLEM VAULT',interviews:'INTERVIEW ARENA',ai:'AI ENGINEERING LAB',progress:'ANALYTICS'};
 document.getElementById('viewCrumb').textContent=names[state.view];
 document.getElementById('todayDate').textContent=niceDate(realToday,{weekday:'short',month:'short',day:'numeric',year:'numeric'}).toUpperCase();
 document.getElementById('sidebarProgressBar').style.width=percent(ALL)+'%';
 document.getElementById('sidebarProgressText').textContent=percent(ALL)+'% complete';
 document.getElementById('navProblemCount').textContent=D.problems.length;
 const fn={dashboard:renderDashboard,week:renderWeek,problems:renderProblems,interviews:renderInterviews,ai:renderAI,progress:renderProgress};
 document.getElementById('content').innerHTML=fn[state.view]();
}
function go(view){state.view=view;state.query='';state.tab='all';state.statusFilter='all';state.topic='all';state.difficulty='all';closeSide();render();scrollTo({top:0,behavior:'smooth'})}
function closeSide(){document.getElementById('sidebar').classList.remove('open');document.getElementById('mobileScrim').classList.remove('show')}
function toast(message){const d=document.createElement('div');d.className='toast';d.textContent=message;document.getElementById('toasts').appendChild(d);setTimeout(()=>d.remove(),3300)}
function fieldBlock(label,body){return '<div class="modal-block"><div class="modal-block-label">'+escapeHTML(label)+'</div><p>'+escapeHTML(body)+'</p></div>'}
function openModal(id){if(!byId[id])return;const t=byId[id];state.modalId=id;const e=entry(id);let details='';
 if(t.kind==='leetcode'){details=fieldBlock('PATTERN',t.raw.topic+' · '+t.raw.difficulty+' · Suggested Week '+t.week)+fieldBlock('COLD SOLVE PROTOCOL','Clarify the input, derive brute force, state an optimized invariant, code from scratch, then test empty/singleton/duplicates/large constraints.')+fieldBlock('SPACED RECALL','If this concept fails, try cold again after 1, 3, 7 and 21 days; do not count an editorial-assisted solve as mastery.');}
 if(t.kind==='interview'){details=fieldBlock('INTERVIEW SETUP',t.raw.instructions)+fieldBlock('ACCEPTANCE GATE',t.raw.acceptance)+fieldBlock('INTERVIEW FOLLOW-UP',t.raw.followup||'Explain why the solution is correct.')+'<div class="modal-block"><div class="modal-block-label">ASSESSMENT POLICY</div><p>'+escapeHTML(t.raw.rules||'No AI unless explicitly permitted')+'</p></div>';}
 if(t.kind==='ai'){details=fieldBlock('EXACT PRACTICE TICKET',t.raw.task)+fieldBlock('INDEPENDENT ACCEPTANCE TESTS',t.raw.tests)+fieldBlock('AI COLLABORATION CHALLENGE',t.raw.steering)+fieldBlock('INTERVIEW FOLLOW-UP',t.raw.followup);}
 if(t.kind==='blind'){details=fieldBlock('THE RULE','Choose an unseen medium from the public problemset. No topic tags, no AI, no hints for 35 minutes. Explain the invariant and edge cases.');}
 if(t.kind==='review'){details=fieldBlock('ACTIVE RECALL','Pick missed problems from your learning log. Start from a blank editor. If unable to retrieve the invariant, write the failure in your notes and repeat again later.');}
 const url=t.url?'<a class="small-btn" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(isValidUrl(t.url))+'">Open original assignment ↗</a>':'';
 const follow=t.followupUrl?'<a class="small-btn" target="_blank" rel="noopener noreferrer" href="'+escapeHTML(isValidUrl(t.followupUrl))+'">Follow-up problem ↗</a>':'';
 document.getElementById('modalContent').innerHTML='<div class="modal-header"><div><div class="eyebrow">WEEK '+t.week+' · '+escapeHTML(DAY_FULL[t.day])+' / '+escapeHTML(t.group)+'</div><h2>'+escapeHTML(t.name)+'</h2><div class="flex-wrap"><span class="pill">'+t.minutes+' MIN</span>'+tag(t)+(t.optional?'<span class="pill optional">OPTIONAL</span>':'')+'</div></div><button class="modal-x" data-close="1" aria-label="Close task">×</button></div>'+details+
 '<div class="modal-block"><div class="modal-block-label">YOUR SESSION NOTES</div><textarea id="taskNotes" class="textarea" placeholder="What was hard? What did you learn?">'+escapeHTML(e.notes||'')+'</textarea><label class="field-label" for="taskScore">Performance score (0–5, optional)</label><select id="taskScore" class="field"><option value="">No score yet</option>'+[0,1,2,3,4,5].map(x=>'<option value="'+x+'" '+(String(e.score)===String(x)?'selected':'')+'>'+x+' / 5</option>').join('')+'</select></div>'+
 '<div class="modal-buttons">'+url+follow+'<button class="small-btn" data-timer="'+t.minutes+'">◷ Focus timer</button><button class="small-btn solid" data-toggle="'+escapeHTML(t.id)+'">'+(isDone(t)?'✓ Mark incomplete':'✓ Mark complete')+'</button></div>'+
 '<p style="font-size:10px;margin:15px 0 0">Saved locally on this browser · Your score is self-reported</p>';
 document.getElementById('modalLayer').classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeModal(){document.getElementById('modalLayer').classList.add('hidden');document.body.style.overflow='';state.modalId=null;if(state.clock){clearInterval(state.clock);state.clock=null}state.timer=null}
function launchTimer(minutes){const min=Math.max(1,Math.min(180,Number(minutes)||25));state.timer={remaining:min*60,running:false,minutes:min};paintTimer();}
function paintTimer(){const t=state.timer;if(!t)return;const root=document.getElementById('modalContent');root.innerHTML='<div class="modal-header"><div><div class="eyebrow">DEEP WORK / FOCUS MODE</div><h2>One thing. Fully.</h2></div><button class="modal-x" data-close="1" aria-label="Close timer">×</button></div><p>Work the problem. When you get stuck, reason instead of switching tabs.</p><div class="timer" id="timerDigits">'+String(Math.floor(t.remaining/60)).padStart(2,'0')+':'+String(t.remaining%60).padStart(2,'0')+'</div><div class="timer-actions"><button class="primary-btn" id="timerToggle">'+(t.running?'Pause':'Start')+' timer</button><button class="small-btn" id="timerReset">Reset</button></div><p style="text-align:center;margin-top:23px;font-size:10px">Closing this timer stops it. No tracking across browser tabs.</p>';}
function tickTimer(){if(!state.timer?.running)return;state.timer.remaining=Math.max(0,state.timer.remaining-1);const el=document.getElementById('timerDigits');if(el)el.textContent=String(Math.floor(state.timer.remaining/60)).padStart(2,'0')+':'+String(state.timer.remaining%60).padStart(2,'0');if(state.timer.remaining<=0){state.timer.running=false;clearInterval(state.clock);state.clock=null;paintTimer();toast('Focus block complete. Review your work.')}}
function saveModalFields(){if(!state.modalId||state.timer)return;const n=document.getElementById('taskNotes'),s=document.getElementById('taskScore');if(n)updateEntry(state.modalId,'notes',n.value);if(s)updateEntry(state.modalId,'score',s.value)}
function exportProgress(){const blob=new Blob([JSON.stringify({app:'FORGE16',version:1,exported:new Date().toISOString(),entries:saved},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='forge16-progress-'+realTodayIso+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('Progress backup exported')}
function restoreProgress(file){if(!file)return;const r=new FileReader();r.onload=()=>{try{const j=JSON.parse(String(r.result)),e=j?.entries;if(j.app!=='FORGE16'||!e||typeof e!=='object'||Array.isArray(e))throw Error('Invalid backup');let n=0;for(const [id,value] of Object.entries(e)){if(byId[id]&&value&&typeof value==='object'){saved[id]={...entry(id),done:!!value.done,doneAt:typeof value.doneAt==='string'?value.doneAt:null,notes:typeof value.notes==='string'?value.notes.slice(0,4000):'',score:['','0','1','2','3','4','5'].includes(String(value.score??''))?String(value.score??''):''};n++}}persist();render();toast('Restored '+n+' task records.')}catch(err){toast('Could not import this backup')}};r.readAsText(file)}
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-view]');if(nav){go(nav.dataset.view);return;}
 const day=e.target.closest('[data-day]');if(day){state.day=Number(day.dataset.day);render();return}
 const week=e.target.closest('[data-week]');if(week){state.week=Math.max(1,Math.min(16,state.week+Number(week.dataset.week)));render();return}
 const goEl=e.target.closest('[data-go]');if(goEl){go(goEl.dataset.go);return}
 const check=e.target.closest('[data-toggle]');if(check){saveModalFields();mark(check.dataset.toggle,!entry(check.dataset.toggle).done);if(!document.getElementById('modalLayer').classList.contains('hidden'))openModal(check.dataset.toggle);return}
 const task=e.target.closest('[data-task]');if(task){e.preventDefault();openModal(task.dataset.task);return}
 if(e.target.closest('[data-close]')){saveModalFields();closeModal();return}
 const timer=e.target.closest('[data-timer]');if(timer){saveModalFields();launchTimer(Number(timer.dataset.timer));return}
 const manual=e.target.closest('[data-open-timer]');if(manual){document.getElementById('modalLayer').classList.remove('hidden');document.body.style.overflow='hidden';launchTimer(Number(manual.dataset.openTimer));return}
 if(e.target.id==='timerToggle'){state.timer.running=!state.timer.running;if(state.clock){clearInterval(state.clock);state.clock=null}if(state.timer.running)state.clock=setInterval(tickTimer,1000);paintTimer();return}
 if(e.target.id==='timerReset'){if(state.clock)clearInterval(state.clock);state.clock=null;state.timer.remaining=state.timer.minutes*60;state.timer.running=false;paintTimer();return}
 if(e.target.id==='searchTrigger'){go('problems');const q=document.getElementById('vaultQuery');if(q)q.focus();return}
 if(e.target.id==='sidebarExport'||e.target.id==='progressExport'){exportProgress();return}
 if(e.target.id==='sidebarImport'||e.target.id==='progressImport'){document.getElementById('importFile').click();return}
 if(e.target.id==='mobileMenu'){document.getElementById('sidebar').classList.toggle('open');document.getElementById('mobileScrim').classList.toggle('show');return}
 if(e.target.id==='mobileScrim'){closeSide();return}
});
document.addEventListener('input',e=>{if(e.target.id==='vaultQuery'){const start=e.target.selectionStart;state.query=e.target.value;render();const replacement=document.getElementById('vaultQuery');if(replacement){replacement.focus();replacement.setSelectionRange(start,start)}}if(e.target.id==='taskNotes'||e.target.id==='taskScore')saveModalFields()});
document.addEventListener('change',e=>{const map={topicSelect:'topic',difficultySelect:'difficulty',statusSelect:'statusFilter',tabSelect:'tab'};if(map[e.target.id]){state[map[e.target.id]]=e.target.value;render()}if(e.target.id==='importFile'){restoreProgress(e.target.files?.[0]);e.target.value=''}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(!document.getElementById('modalLayer').classList.contains('hidden')){saveModalFields();closeModal()}else closeSide();return}if(e.key==='/'&&!/input|textarea/i.test(document.activeElement?.tagName||'')){e.preventDefault();go('problems');document.getElementById('vaultQuery')?.focus()}if(e.key.toLowerCase()==='g'&&!/input|textarea/i.test(document.activeElement?.tagName||'')){go('dashboard')}});
render();
})();
