(() => {
  const map = document.getElementById('project-map');
  if (!map) return;
  const viewport = map.closest('.board-viewport');
  const shell = viewport.closest('.board-shell');
  const svg = map.querySelector('svg');
  const cards = [...map.querySelectorAll('[data-project]')];
  const years = [...map.querySelectorAll('.map-year')];
  const byId = new Map(cards.map(card => [card.dataset.project, card]));
  const status = shell.querySelector('.board-save-status');
  const storageKey = `bob-lee-project-wall-v1:${location.pathname}`;
  const minScale = .2, maxScale = 2;
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  let offsets = {}, undo = null, storageAvailable = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (saved.version === 1 && saved.positions && typeof saved.positions === 'object') {
      cards.forEach(card => {
        const p = saved.positions[card.dataset.project];
        if (p && p.date === card.dataset.date && Number.isFinite(p.dx) && Number.isFinite(p.dy)) {
          offsets[card.dataset.project] = {date:p.date, dx:clamp(p.dx,-20000,20000), dy:clamp(p.dy,-20000,20000)};
        }
      });
    }
  } catch { /* Malformed or unavailable storage must not prevent using the wall. */ }
  const positions = new Map(), defaults = new Map(), anchors = new Map();
  const view = {x:24, y:24, scale:1};
  let world = {width:1000, height:650}, edges = [];
  let pinned = null, hovered = null, focused = null, gesture = null;
  let frame = 0, suppressClickUntil = 0;
  const pointers = new Map();
  const activeId = () => (gesture?.kind === 'note' ? gesture.id : null) || hovered || focused || pinned;

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({version:1, positions:offsets}));
      storageAvailable = true;
      status.textContent = '位置已保存 · 当前浏览器';
    } catch {
      storageAvailable = false;
      status.textContent = '当前浏览器无法保存位置，刷新后将恢复默认';
    }
  }
  function addEdge(kind, ids, points) {
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('class', `map-link map-link-${kind}`);
    svg.append(path); edges.push({path, ids, points});
  }
  function setupEdges() {
    svg.replaceChildren(); edges = [];
    years.forEach((year, i) => {
      const group = [...year.querySelectorAll('[data-project]')].map(c => c.dataset.project);
      if (i < years.length-1) {
        const next = years[i+1];
        addEdge('year', [...group,...next.querySelectorAll('[data-project]')].map(c=>typeof c==='string'?c:c.dataset.project), {fromYear:year.dataset.year,toYear:next.dataset.year});
      }
      if (group.length) addEdge('branch', [group[0]], {fromYear:year.dataset.year,to:group[0]});
      group.slice(1).forEach((id,j)=>addEdge('sequence',[group[j],id],{from:group[j],to:id}));
    });
    const seen = new Set();
    cards.forEach(card => card.dataset.related.split(/\s+/).filter(Boolean).forEach(id => {
      const from = card.dataset.project, key = [from,id].sort().join('|');
      if (!byId.has(id) || seen.has(key)) return;
      seen.add(key); addEdge('relation',[from,id],{from,to:id,lane:seen.size%3});
    }));
  }
  function measure() {
    let y = 42;
    years.forEach(year => {
      const group = [...year.querySelectorAll('[data-project]')];
      const height = Math.max(228,...group.map(c=>c.offsetHeight));
      const noteY = y + 64;
      const anchorY = group.length ? noteY + height/2 : y + 45;
      anchors.set(year.dataset.year,{x:162,y:anchorY});
      const header = year.querySelector('.map-year-heading');
      header.style.left = '28px'; header.style.top = `${anchorY-40}px`;
      group.forEach((card,i) => {
        const id = card.dataset.project, base = {x:220+i*308,y:noteY};
        defaults.set(id,base);
        const saved = offsets[id] || {dx:0,dy:0};
        positions.set(id,{x:Math.max(200,base.x+saved.dx),y:Math.max(28,base.y+saved.dy),width:card.offsetWidth,height:card.offsetHeight});
      });
      y += group.length ? height+160 : 98;
    });
    world.height = y+40;
    updateBounds(); render();
  }
  function updateBounds() {
    world.width = Math.max(650,...[...positions.values()].map(p=>p.x+p.width+80));
    world.height = Math.max(160,...[...anchors.values()].map(p=>p.y+100),...[...positions.values()].map(p=>p.y+p.height+80));
  }
  function render() {
    const active = activeId();
    map.style.width = `${world.width}px`; map.style.height = `${world.height}px`;
    map.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
    viewport.style.backgroundSize = `${24*view.scale}px ${24*view.scale}px`;
    viewport.style.backgroundPosition = `${view.x}px ${view.y}px`;
    shell.querySelector('.board-zoom').textContent = `${Math.round(view.scale*100)}%`;
    shell.querySelector('[data-action=zoom-out]').disabled = view.scale <= minScale;
    shell.querySelector('[data-action=zoom-in]').disabled = view.scale >= maxScale;
    map.classList.toggle('has-active',Boolean(active));
    cards.forEach(card => {
      const id = card.dataset.project, p = positions.get(id);
      card.style.left = `${p.x}px`; card.style.top = `${p.y}px`;
      card.classList.toggle('is-active',id===active);
      card.classList.toggle('is-dragging',gesture?.kind==='note'&&gesture.id===id);
      card.querySelector('.map-pin').setAttribute('aria-pressed',String(id===pinned));
    });
    svg.setAttribute('viewBox',`0 0 ${world.width} ${world.height}`);
    const rect = id => {const p=positions.get(id);return {...p,y:p.y-(active===id?7:0)};};
    edges.forEach(({path,ids,points:p}) => {
      let d;
      if (p.toYear) {
        const a=anchors.get(p.fromYear),b=anchors.get(p.toYear);
        d=`M ${a.x} ${a.y} L ${b.x} ${b.y}`;
      } else if (p.fromYear) {
        const a=anchors.get(p.fromYear),b=rect(p.to),endY=b.y+b.height/2;
        d=`M ${a.x} ${a.y} C ${a.x+32} ${a.y}, ${b.x-30} ${endY}, ${b.x} ${endY}`;
      } else {
        const a=rect(p.from),b=rect(p.to);
        if (p.lane !== undefined) {
          const x1=a.x+a.width/2,x2=b.x+b.width/2,bend=Math.max(8,Math.min(a.y,b.y)-42-p.lane*18);
          d=`M ${x1} ${a.y} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${b.y}`;
        } else {
          const x1=a.x+a.width,x2=b.x,y1=a.y+a.height/2,y2=b.y+b.height/2,bend=(x1+x2)/2;
          d=`M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`;
        }
      }
      path.setAttribute('d',d);path.classList.toggle('is-active',ids.includes(active));
    });
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(()=>{frame=0;render();}); }
  function fit(initial=false) {
    view.scale=clamp(Math.min((viewport.clientWidth-48)/world.width,(viewport.clientHeight-48)/world.height),initial ? .65 : minScale,1);
    view.x=initial&&world.width*view.scale>viewport.clientWidth?20:(viewport.clientWidth-world.width*view.scale)/2;
    view.y=24; render();
  }
  function localPoint(event) {const r=viewport.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
  function zoom(scale,at={x:viewport.clientWidth/2,y:viewport.clientHeight/2}) {
    const next=clamp(scale,minScale,maxScale), ratio=next/view.scale;
    view.x=at.x-(at.x-view.x)*ratio;view.y=at.y-(at.y-view.y)*ratio;view.scale=next;schedule();
  }
  function moveNote(id,x,y) {
    const p=positions.get(id),base=defaults.get(id);
    p.x=clamp(x,200,base.x+20000);p.y=clamp(y,28,base.y+20000);
    offsets[id]={date:byId.get(id).dataset.date,dx:p.x-base.x,dy:p.y-base.y};
    updateBounds();schedule();
  }
  function startPinch() {
    if (gesture?.kind==='note'&&gesture.moved) save();
    const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    gesture={kind:'pinch',distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),scale:view.scale,worldX:(mid.x-view.x)/view.scale,worldY:(mid.y-view.y)/view.scale,moved:true};
    viewport.classList.remove('is-dragging');viewport.classList.add('is-panning');
  }
  viewport.addEventListener('pointerdown',event=>{
    if (event.button!==0 || event.target.closest('a,.map-pin')) return;
    const at=localPoint(event);pointers.set(event.pointerId,at);
    viewport.setPointerCapture(event.pointerId);event.preventDefault();
    if (pointers.size>=2) {startPinch();return;}
    const card=event.target.closest('.map-project');
    if(card){
      const id=card.dataset.project,p=positions.get(id);
      gesture={kind:'note',id,start:at,x:p.x,y:p.y,moved:false};
      card.querySelector('.note-handle').focus({preventScroll:true});
      viewport.classList.add('is-dragging');
    } else {
      pinned=hovered=focused=null;viewport.focus({preventScroll:true});
      gesture={kind:'pan',start:at,x:view.x,y:view.y,moved:false};viewport.classList.add('is-panning');
    }
    schedule();
  });
  viewport.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!gesture)return;
    pointers.set(event.pointerId,localPoint(event));
    if(gesture.kind==='pinch'){
      if(pointers.size<2)return;
      const [a,b]=[...pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      view.scale=clamp(gesture.scale*Math.hypot(a.x-b.x,a.y-b.y)/gesture.distance,minScale,maxScale);
      view.x=mid.x-gesture.worldX*view.scale;view.y=mid.y-gesture.worldY*view.scale;schedule();return;
    }
    const at=pointers.get(event.pointerId),dx=at.x-gesture.start.x,dy=at.y-gesture.start.y;
    if(Math.hypot(dx,dy)>3)gesture.moved=true;
    if(!gesture.moved)return;
    if(gesture.kind==='note')moveNote(gesture.id,gesture.x+dx/view.scale,gesture.y+dy/view.scale);
    else{view.x=gesture.x+dx;view.y=gesture.y+dy;schedule();}
  });
  function endPointer(event){
    if(!pointers.has(event.pointerId))return;
    if(gesture?.moved){suppressClickUntil=performance.now()+350;if(gesture.kind==='note')save();}
    pointers.delete(event.pointerId);
    if(pointers.size===1){const at=[...pointers.values()][0];gesture={kind:'pan',start:at,x:view.x,y:view.y,moved:false};}
    else if(!pointers.size){gesture=null;viewport.classList.remove('is-dragging','is-panning');}
    schedule();
  }
  viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);viewport.addEventListener('lostpointercapture',endPointer);
  viewport.addEventListener('click',event=>{if(performance.now()<suppressClickUntil){event.preventDefault();event.stopPropagation();}},true);
  viewport.addEventListener('wheel',event=>{
    event.preventDefault();const factor=event.deltaMode===1?16:event.deltaMode===2?viewport.clientHeight:1;
    if(event.ctrlKey||event.metaKey)zoom(view.scale*Math.exp(-event.deltaY*factor*.008),localPoint(event));
    else{view.x-=event.deltaX*factor;view.y-=event.deltaY*factor;schedule();}
  },{passive:false});
  cards.forEach(card=>{
    const id=card.dataset.project,handle=card.querySelector('.note-handle'),pin=card.querySelector('.map-pin');
    handle.disabled=false;pin.hidden=false;
    card.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch'&&!gesture){hovered=id;schedule();}});
    card.addEventListener('pointerleave',()=>{hovered=null;schedule();});
    card.addEventListener('focusin',()=>{
      focused=id;
      if(!gesture){const p=positions.get(id),left=p.x*view.scale+view.x,top=p.y*view.scale+view.y;
        if(left<0||left+p.width*view.scale>viewport.clientWidth)view.x=(viewport.clientWidth-p.width*view.scale)/2-p.x*view.scale;
        if(top<0||top+p.height*view.scale>viewport.clientHeight)view.y=(viewport.clientHeight-p.height*view.scale)/2-p.y*view.scale;}
      schedule();
    });
    card.addEventListener('focusout',event=>{if(!card.contains(event.relatedTarget)){focused=null;schedule();}});
    pin.addEventListener('click',()=>{pinned=pinned===id?null:id;if(!pinned)focused=null;schedule();});
    handle.addEventListener('keydown',event=>{
      const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if(!delta)return;event.preventDefault();event.stopPropagation();const p=positions.get(id),step=event.shiftKey?40:10;
      moveNote(id,p.x+delta[0]*step,p.y+delta[1]*step);save();
    });
  });
  viewport.addEventListener('keydown',event=>{
    if(event.key==='Escape'){pinned=hovered=focused=null;schedule();return;}
    if(event.target!==viewport)return;
    const delta={ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]}[event.key];
    if(delta){event.preventDefault();view.x+=delta[0];view.y+=delta[1];schedule();}
    if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')fit();else zoom(view.scale*(event.key==='-'?1/1.2:1.2));}
  });
  shell.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>{
    const action=button.dataset.action;
    if(action==='zoom-in')zoom(view.scale*1.2);
    if(action==='zoom-out')zoom(view.scale/1.2);
    if(action==='fit')fit();
    if(action==='reset'){
      undo=JSON.parse(JSON.stringify(offsets));offsets={};pinned=hovered=focused=null;measure();fit(true);save();
      if(storageAvailable)status.textContent='已恢复按时间排列';shell.querySelector('.board-undo').hidden=false;
    }
  }));
  shell.querySelector('.board-undo').addEventListener('click',()=>{
    if(!undo)return;offsets=undo;undo=null;measure();fit(true);save();shell.querySelector('.board-undo').hidden=true;
  });
  shell.querySelectorAll('[data-jump-year]').forEach(button=>button.addEventListener('click',()=>{
    const a=anchors.get(button.dataset.jumpYear);view.scale=Math.max(.8,view.scale);view.x=20;view.y=viewport.clientHeight/2-a.y*view.scale;
    pinned=hovered=focused=null;schedule();
  }));
  document.addEventListener('pointerdown',event=>{if(!shell.contains(event.target)){pinned=hovered=focused=null;schedule();}});
  const fullscreenButton = shell.querySelector('.board-fullscreen');
  let expanded = false, fallbackFullscreen = false, fullscreenBusy = false;
  let previousView = null, previousScroll = null, backgroundElements = [];

  function syncFullscreen() {
    const next = document.fullscreenElement === shell || fallbackFullscreen;
    if (next === expanded) return;
    expanded = next;
    shell.classList.toggle('is-fullscreen', expanded);
    document.documentElement.classList.toggle('board-fullscreen-open', expanded);
    fullscreenButton.setAttribute('aria-pressed', String(expanded));
    fullscreenButton.setAttribute('aria-label', expanded ? '退出全屏显示' : '全屏显示项目便签墙');
    fullscreenButton.title = expanded ? '退出全屏（Esc）' : '全屏显示';
    if (expanded) {
      shell.setAttribute('role', 'dialog');
      shell.setAttribute('aria-modal', 'true');
      // Keep background content out of keyboard and screen-reader navigation.
      let current = shell;
      while (current.parentElement && current.parentElement !== document.documentElement) {
        [...current.parentElement.children].filter(node => node !== current).forEach(node => {
          backgroundElements.push({node, inert:node.inert}); node.inert = true;
        });
        current = current.parentElement;
      }
      fit(true);
    } else {
      shell.removeAttribute('role'); shell.removeAttribute('aria-modal');
      backgroundElements.forEach(({node,inert}) => { node.inert = inert; });
      backgroundElements = [];
      if (previousView) Object.assign(view, previousView);
      render();
      if (previousScroll) window.scrollTo({left:previousScroll.x, top:previousScroll.y, behavior:'instant'});
    }
    fullscreenButton.focus({preventScroll:true});
  }
  async function toggleFullscreen() {
    if (fullscreenBusy) return;
    fullscreenBusy = true;
    try {
      if (expanded) {
        if (document.fullscreenElement === shell) await document.exitFullscreen();
        else { fallbackFullscreen = false; syncFullscreen(); }
      } else {
        previousView = {...view}; previousScroll = {x:window.scrollX,y:window.scrollY};
        if (shell.requestFullscreen && document.fullscreenEnabled) {
          try { await shell.requestFullscreen(); syncFullscreen(); }
          catch { fallbackFullscreen = true; syncFullscreen(); }
        } else { fallbackFullscreen = true; syncFullscreen(); }
      }
    } finally { fullscreenBusy = false; }
  }
  fullscreenButton.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('keydown', event => {
    if (!expanded) return;
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); toggleFullscreen();
    } else if (event.key === 'Tab') {
      const controls = [...shell.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(node => node.getClientRects().length);
      const first = controls[0], last = controls[controls.length-1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }, true);
  map.classList.add('is-ready');viewport.classList.add('is-ready');
  shell.querySelector('.board-tools').hidden=false;shell.querySelector('.board-year-nav').hidden=false;
  setupEdges();measure();fit(true);
  new ResizeObserver(schedule).observe(viewport);
  document.fonts.ready.then(()=>{measure();fit(true);});
})();
