import{g as a,a as c}from"./index-D_TaRqHT.js";function g(i){const r=()=>{const n=document.createElement("div");n.id="engine-indicator",n.className="engine-indicator",n.style.cssText=`
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 1000;
      border: 2px solid;
      opacity: 0.9;
      transition: all 0.3s ease;
    `;const e=()=>{const o=a(),t=c(),d=t==="dice"?"#00ff00":"#ffaa00";n.style.borderColor=d,n.innerHTML=`
        <div style="font-weight: bold; margin-bottom: 4px;">
          ${o.name}
        </div>
        <div style="font-size: 10px; opacity: 0.8;">
          ${o.description}
        </div>
        <div style="font-size: 10px; margin-top: 4px; opacity: 0.7;">
          Engine: ${t}
        </div>
      `};return e(),i.on("ui:engineChanged",()=>{e()}),n};if(typeof document<"u"){const n=document.getElementById("engine-indicator");n&&n.remove();const e=r();document.body.appendChild(e)}i.on("ui:engineChanged",({engine:n})=>{console.log(`Engine changed to: ${n}`)})}export{g as registerEngineIndicator};
//# sourceMappingURL=EngineIndicator-BBoOvHZM.js.map
