(function(){
  "use strict";
  const games=window.FSN_FULL_GAMES||[];
  const highlights=window.FSN_HIGHLIGHTS||[];
  const rules=window.FSN_SEASON_RULES||{highlightHour:17,fullGameBlockHours:3};
  const $=id=>document.getElementById(id);
  const els={clock:$("clock"),title:$("nowTitle"),meta:$("nowMeta"),slot:$("slotTime"),enter:$("enter"),card:$("stationCard"),cardTitle:$("stationCardTitle"),cardText:$("stationCardText"),guide:$("guideRows"),next:$("nextCards"),progress:$("progressBar"),position:$("positionLabel"),remaining:$("remainingLabel"),startOver:$("startOver"),rewind:$("rewind"),live:$("joinLive"),share:$("share"),shareStatus:$("shareStatus"),source:$("sourceLink"),season:$("seasonLabel"),highlightList:$("highlightList")};
  const BLOCK_MS=(rules.fullGameBlockHours||3)*3600000;
  let player=null,ready=false,entered=false,mode="live",shiftBase=0,shiftStarted=0,loadedKey="",failed=new Set(),schedule=[],scheduleDay="";

  function hash(text){let h=2166136261;for(let i=0;i<text.length;i++)h=Math.imul(h^text.charCodeAt(i),16777619);return h>>>0;}
  function shuffle(list,seedText){let seed=hash(seedText),a=list.slice();const rnd=()=>{seed+=0x6D2B79F5;let t=seed;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
  function midnight(d=new Date()){return new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime();}
  function weekKey(d=new Date()){const x=new Date(d.getFullYear(),d.getMonth(),d.getDate());const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);return dateKey(x);}
  function seasonName(){const m=new Date().getMonth()+1;if((rules.baseballMonths||[]).includes(m))return "BASEBALL SEASON · MLB / WBC FULL GAMES";if((rules.footballMonths||[]).includes(m))return "FOOTBALL SEASON · PRO SPORTS";return "PRO SPORTS VAULT";}
  function formatTime(ms){return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(new Date(ms));}
  function fmt(sec){sec=Math.max(0,Math.floor(sec));const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60);return h?`${h}h ${String(m).padStart(2,"0")}m`:`${m}m`;}
  function clockMs(){return mode==="live"?Date.now():shiftBase+(Date.now()-shiftStarted);}
  function chooseDay(now=new Date()){
    const key=dateKey(now);if(key===scheduleDay&&schedule.length)return;
    scheduleDay=key;
    const start=midnight(now),wk=weekKey(now),dayIndex=Math.floor((start-new Date(wk+"T00:00:00").getTime())/86400000);
    const ordered=shuffle(games,`FSN-${wk}-weekly-v2`);
    const rotated=ordered.length?ordered.slice((dayIndex*8)%ordered.length).concat(ordered.slice(0,(dayIndex*8)%ordered.length)):[];
    const picked=[];
    for(let slot=0;slot<8;slot++){
      let pick=rotated.find(g=>!picked.includes(g)&&(!picked.length||!g.teams.some(t=>(picked[picked.length-1].teams||[]).includes(t))));
      if(!pick)pick=rotated.find(g=>!picked.includes(g))||rotated[slot%Math.max(1,rotated.length)];
      if(pick)picked.push(pick);
    }
    schedule=picked.map((game,i)=>({id:`${key}-${i}`,game,start:start+i*BLOCK_MS,end:start+(i+1)*BLOCK_MS}));
    renderGuide();renderNext();
  }
  function stateAt(ms){chooseDay(new Date(ms));let slot=schedule.find(s=>ms>=s.start&&ms<s.end);if(!slot)slot=schedule[0];if(!slot)return null;return {slot,elapsed:Math.max(0,(ms-slot.start)/1000),remaining:Math.max(0,(slot.end-ms)/1000)};}
  function thumbnail(game){return game&&game.videoId?`https://i.ytimg.com/vi/${game.videoId}/hqdefault.jpg`:"";}
  function renderGuide(){
    if(!schedule.length){els.guide.innerHTML='<p class="empty">No full-game sources loaded.</p>';return;}
    els.guide.innerHTML=schedule.map(s=>`<article class="guide-row" data-id="${s.id}" style="--thumb:url('${thumbnail(s.game)}')"><time>${formatTime(s.start)}</time><div><strong>${s.game.title}</strong><span>${s.game.league} · ${s.game.source}</span></div></article>`).join("");
  }
  function renderNext(current){
    if(!schedule.length)return;const idx=current?schedule.findIndex(s=>s.id===current.id):-1;const list=(idx>=0?schedule.slice(idx+1):schedule).slice(0,3);
    els.next.innerHTML=list.map(s=>`<article class="next-card" style="--thumb:url('${thumbnail(s.game)}')"><time>${formatTime(s.start)}</time><strong>${s.game.title}</strong><small>${s.game.league}</small></article>`).join("");
  }
  function renderHighlights(){
    if(!els.highlightList)return;els.highlightList.innerHTML=highlights.slice(0,8).map(h=>`<article><img src="https://i.ytimg.com/vi/${h.videoId}/mqdefault.jpg" alt=""><div><strong>${h.title}</strong><small>${h.source}</small></div></article>`).join("");
  }
  function showCard(title,text){els.card.hidden=false;els.cardTitle.textContent=title;els.cardText.textContent=text;}
  function hideCard(){els.card.hidden=true;}
  function highlightFallback(ms){
    const d=new Date(ms);if(d.getHours()!==rules.highlightHour||!highlights.length)return null;
    const index=(d.getMinutes()/10|0)%highlights.length;const h=highlights[index];return {videoId:h.videoId,title:h.title,offset:(d.getMinutes()%10)*60+d.getSeconds(),key:`highlight-${dateKey(d)}-${index}`};
  }
  function loadState(st){
    if(!entered||!ready||!st)return;const game=st.slot.game;const fail=failed.has(game.videoId);
    if(fail){const h=highlightFallback(clockMs());if(h){hideCard();const key=h.key;if(loadedKey!==key){loadedKey=key;player.loadVideoById({videoId:h.videoId,startSeconds:h.offset});}}else{showCard("SOURCE UNAVAILABLE",`${game.title} stays in the guide. If a source fails, FSN does not reshuffle the live schedule.`);player.stopVideo();}return;}
    hideCard();const key=`${st.slot.id}:${game.videoId}`;if(loadedKey!==key){loadedKey=key;player.loadVideoById({videoId:game.videoId,startSeconds:Math.max(0,Math.floor(st.elapsed))});return;}
    if(mode==="live"&&player.getPlayerState()===YT.PlayerState.PLAYING){const drift=st.elapsed-player.getCurrentTime();if(Math.abs(drift)>4)player.seekTo(st.elapsed,true);}
  }
  function tick(){
    const now=clockMs();chooseDay(new Date(now));const st=stateAt(now);els.clock.textContent=`${formatTime(Date.now())} local`;els.season.textContent=seasonName();if(!st)return;
    const g=st.slot.game;els.title.textContent=g.title;els.meta.textContent=`${g.league} · ${g.source} · full-game window`;els.slot.textContent=`${formatTime(st.slot.start)}–${formatTime(st.slot.end)}`;els.position.textContent=mode==="live"?"Synced to FSN live schedule":`Time shifted · ${fmt(st.elapsed)}`;els.remaining.textContent=`${fmt(st.remaining)} until next game`;els.progress.style.width=`${Math.min(100,(st.elapsed/(BLOCK_MS/1000))*100)}%`;els.source.href=`https://www.youtube.com/watch?v=${g.videoId}`;document.body.style.setProperty("--hero",`url('${thumbnail(g)}')`);document.querySelectorAll(".guide-row").forEach(r=>r.classList.toggle("current",r.dataset.id===st.slot.id));renderNext(st.slot);loadState(st);
  }
  function enter(){entered=true;els.enter.hidden=true;if(window.YT&&YT.Player)return initPlayer();const s=document.createElement("script");s.src="https://www.youtube.com/iframe_api";document.head.appendChild(s);}
  function initPlayer(){if(player)return;player=new YT.Player("player",{width:"100%",height:"100%",playerVars:{playsinline:1,controls:1,enablejsapi:1,rel:0,modestbranding:1,origin:location.origin},events:{onReady:e=>{ready=true;try{e.target.getIframe().setAttribute("allow","autoplay; encrypted-media; picture-in-picture; fullscreen");}catch(_){}e.target.unMute();e.target.setVolume(100);tick();},onError:e=>{const st=stateAt(clockMs());if(st&&st.slot&&st.slot.game)failed.add(st.slot.game.videoId);loadedKey="";setTimeout(tick,100);},onStateChange:e=>{if(e.data===YT.PlayerState.ENDED){const h=highlightFallback(clockMs());if(h){loadedKey="";tick();}else showCard("FSN",`Game source ended early. The next scheduled game begins at ${formatTime(stateAt(clockMs()).slot.end)}.`);}}}});}
  window.onYouTubeIframeAPIReady=initPlayer;
  function startOver(){const live=stateAt(Date.now());if(!live)return;mode="shift";shiftBase=live.slot.start;shiftStarted=Date.now();loadedKey="";tick();}
  function rewind(){mode="shift";shiftBase=clockMs()-30000;shiftStarted=Date.now();loadedKey="";tick();}
  function joinLive(){mode="live";loadedKey="";scheduleDay="";tick();}
  function creditShare(){const key="infinity_channel_share_progress_v1";let n=0;try{n=Number(localStorage.getItem(key))||0;}catch(_){}n++;const awarded=n>=10;if(awarded)n=0;try{localStorage.setItem(key,String(n));}catch(_){}return{n,awarded};}
  async function share(){const st=stateAt(clockMs()),title=st?st.slot.game.title:"FSN";try{if(navigator.share){await navigator.share({title:`${title} · FSN`,text:`Watch ${title} on FSN.`,url:location.href});const r=creditShare();els.shareStatus.textContent=r.awarded?"Shared · 1 StarCoin completed!":`Shared · StarCoin progress ${r.n}/10`;}else{await navigator.clipboard.writeText(location.href);els.shareStatus.textContent="FSN link copied.";}}catch(e){if(!e||e.name!=="AbortError")els.shareStatus.textContent="Share did not complete.";}}
  els.enter.addEventListener("click",enter);els.startOver.addEventListener("click",startOver);els.rewind.addEventListener("click",rewind);els.live.addEventListener("click",joinLive);els.share.addEventListener("click",share);
  renderHighlights();chooseDay(new Date());tick();setInterval(tick,1000);
})();
