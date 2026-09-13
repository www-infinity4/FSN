(function(){
  "use strict";
  const MASTER_URL="https://raw.githubusercontent.com/www-infinity4/Omni-Control/main/channels.json";
  const FALLBACK=[
    ["Hermit TV","Hermit-TV"],["Star Launcher","Star-Launcher"],["HBO","HBO"],["Cinemax","Cinemax"],["Showtime","Showtime"],["Starz","Starz"],["Encore","Encore"],
    ["Cartoon Network","Cartoon-Network"],["Nickelodeon","Nickelodeon"],["Disney","Disney"],["WGN","WGN"],["NBC","NBC"],["FOX","FOX"],["PBS","PBS"],["TNT","TNT"],
    ["FX","FX"],["Discovery","Discovery"],["History Channel","History-Channel"],["Chiller","Chiller"],["Trump TV","Trump-TV"],["ShopLC","ShopLC"],["FSN","FSN"],["Ozzy TV","Ozzy-TV"],
    ["StarQuest","TV-Database"],["Astraflix","Astraflix"],["Syncord","Syncord"],["Vintech","Vintech"],["Abstractia","Abstractia-"],["Flix Blender","Flix-Blender"],["Animasync","Animasync"]
  ].map(([name,slug])=>({name,slug,url:`https://www-infinity4.github.io/${slug}/`}));

  function currentSlug(){return location.pathname.split("/").filter(Boolean)[0]||"FSN";}
  function normalize(list){
    if(!Array.isArray(list)) return FALLBACK;
    return list.map(item=>{
      if(Array.isArray(item)) return {name:item[0],slug:item[1],url:item[2]||`https://www-infinity4.github.io/${item[1]}/`};
      if(!item||!item.name||!item.slug) return null;
      return {name:String(item.name),slug:String(item.slug),url:item.url||`https://www-infinity4.github.io/${item.slug}/`,group:item.group||"TV"};
    }).filter(Boolean);
  }
  function unique(list){
    const seen=new Set();
    return list.filter(ch=>{const key=ch.slug.toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
  }
  function render(list){
    const active=currentSlug().toLowerCase();
    document.querySelectorAll("[data-channel-nav]").forEach(nav=>{
      nav.innerHTML=unique(list).map(ch=>`<a ${ch.slug.toLowerCase()===active?'aria-current="page"':''} href="${ch.url}">${ch.name}</a>`).join("");
    });
  }
  render(FALLBACK);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),1800);
  fetch(`${MASTER_URL}?v=${Date.now()}`,{cache:"no-store",signal:controller.signal})
    .then(r=>r.ok?r.json():Promise.reject(new Error("master unavailable")))
    .then(data=>render(normalize(data.channels||data)))
    .catch(()=>{})
    .finally(()=>clearTimeout(timer));
})();
