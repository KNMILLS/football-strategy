function d(){const e=document.createElement("div");e.className="fallback-hud",e.style.cssText=`
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 8px;
    margin: 10px;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  `;const a=document.createElement("div");a.innerHTML=`
    <div>🏈 Gridiron Strategy</div>
    <div style="font-size: 12px; opacity: 0.8;">Game in Progress</div>
  `;const t=document.createElement("div");t.innerHTML=`
    <div>Q1 15:00</div>
    <div style="font-size: 12px; opacity: 0.8;">1st & 10 at HOME 25</div>
  `;const n=document.createElement("div");return n.innerHTML=`
    <div>HOME 0 — AWAY 0</div>
    <div style="font-size: 12px; opacity: 0.8;">Ready to Play</div>
  `,e.appendChild(a),e.appendChild(t),e.appendChild(n),e}function l(){const e=document.createElement("div");e.className="fallback-log",e.style.cssText=`
    background: #1a1a1a;
    color: #00ff00;
    font-family: 'Courier New', monospace;
    padding: 16px;
    margin: 10px;
    border-radius: 8px;
    height: 300px;
    overflow-y: auto;
    border: 2px solid #333;
  `;const a=document.createElement("div");a.textContent="📜 Game Log",a.style.cssText=`
    color: #ffff00;
    font-weight: bold;
    margin-bottom: 12px;
    text-align: center;
    border-bottom: 1px solid #666;
    padding-bottom: 8px;
  `;const t=document.createElement("div");return t.innerHTML=`
    <div>> Game started successfully</div>
    <div>> Waiting for player input...</div>
    <div>> HUD and field components loading...</div>
  `,e.appendChild(a),e.appendChild(t),e}function s(){const e=document.createElement("div");e.className="fallback-field",e.style.cssText=`
    background: linear-gradient(to bottom, #4a7c59 0%, #2d5a3d 100%);
    border: 4px solid #8b4513;
    border-radius: 12px;
    margin: 10px;
    height: 400px;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  `;const a=document.createElement("div");a.style.cssText=`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      linear-gradient(90deg, transparent 49%, #ffffff 50%, #ffffff 51%, transparent 52%),
      linear-gradient(90deg, transparent 19%, #ffffff 20%, #ffffff 21%, transparent 22%),
      linear-gradient(90deg, transparent 79%, #ffffff 80%, #ffffff 81%, transparent 82%);
    background-size: 100% 100%, 100% 100%, 100% 100%;
    opacity: 0.3;
  `;const t=document.createElement("div");t.textContent="🏟️ Football Field",t.style.cssText=`
    color: #ffffff;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    z-index: 1;
  `;const n=document.createElement("div");return n.style.cssText=`
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-size: 14px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
  `,n.textContent="25 30 35 40 45 50 45 40 35 30 25",e.appendChild(a),e.appendChild(t),e.appendChild(n),e}function c(){const e=document.createElement("div");e.className="fallback-hand",e.style.cssText=`
    display: flex;
    gap: 8px;
    padding: 16px;
    margin: 10px;
    background: #f8f9fa;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    overflow-x: auto;
    min-height: 120px;
  `;const a=document.createElement("div");a.textContent="🃏 Player Hand",a.style.cssText=`
    color: #495057;
    font-weight: bold;
    margin-bottom: 12px;
    flex-shrink: 0;
  `;const t=document.createElement("div");t.style.cssText=`
    display: flex;
    gap: 8px;
    flex: 1;
  `;for(let n=0;n<5;n++){const o=document.createElement("div");o.style.cssText=`
      width: 80px;
      height: 112px;
      background: linear-gradient(135deg, #007bff, #0056b3);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 14px;
      cursor: pointer;
      transition: transform 0.2s;
    `,o.textContent=`Card ${n+1}`,o.title="Click to play card",t.appendChild(o)}return e.appendChild(a),e.appendChild(t),e}function p(){const e=document.createElement("div");return e.className="fallback-controls",e.style.cssText=`
    display: flex;
    gap: 12px;
    padding: 16px;
    margin: 10px;
    background: #e9ecef;
    border: 2px solid #ced4da;
    border-radius: 8px;
    justify-content: center;
  `,[{text:"New Game",icon:"🎮"},{text:"Settings",icon:"⚙️"},{text:"Help",icon:"❓"},{text:"Pause",icon:"⏸️"}].forEach(t=>{const n=document.createElement("button");n.innerHTML=`${t.icon} ${t.text}`,n.style.cssText=`
      padding: 8px 16px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: background-color 0.2s;
    `,n.title=`${t.text} - Feature temporarily unavailable`,n.disabled=!0,n.style.opacity="0.6",e.appendChild(n)}),e}function f(e,a){const t=document.createElement("div");t.className=`fallback-${e.toLowerCase()}`,t.style.cssText=`
    padding: 20px;
    margin: 10px;
    border: 2px solid #ffc107;
    border-radius: 8px;
    background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
    color: #856404;
    text-align: center;
    font-family: Arial, sans-serif;
  `;const n=document.createElement("div");n.textContent="🔧",n.style.fontSize="48px",n.style.marginBottom="12px";const o=document.createElement("h3");o.textContent=`${e} Unavailable`,o.style.margin="0 0 8px 0",o.style.color="#856404";const r=document.createElement("p");r.textContent=a?`The ${e} component encountered an error and couldn't load properly.`:`The ${e} component is temporarily unavailable.`,r.style.margin="0 0 16px 0";const i=document.createElement("p");return i.textContent="Please refresh the page or try again later.",i.style.fontSize="14px",i.style.opacity="0.8",i.style.margin="0",t.appendChild(n),t.appendChild(o),t.appendChild(r),t.appendChild(i),t}function x(e="Loading..."){const a=document.createElement("div");a.className="loading-spinner",a.style.cssText=`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #6c757d;
    font-family: Arial, sans-serif;
  `;const t=document.createElement("div");t.style.cssText=`
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  `;const n=document.createElement("div");if(n.textContent=e,n.style.fontSize="16px",a.appendChild(t),a.appendChild(n),!document.getElementById("loading-spinner-styles")){const o=document.createElement("style");o.id="loading-spinner-styles",o.textContent=`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `,document.head.appendChild(o)}return a}export{p as createFallbackControls,s as createFallbackField,d as createFallbackHUD,c as createFallbackHand,l as createFallbackLog,f as createGenericFallback,x as createLoadingSpinner};
//# sourceMappingURL=FallbackComponents-BxQai0J3.js.map
