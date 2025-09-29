function o(e){return typeof document<"u"?document.getElementById(e):null}function l(e){const t=o("log");t&&e.on("log",({message:n})=>{t.textContent=(t.textContent||"")+n+`
`,t.scrollTop=t.scrollHeight})}export{l as registerLog};
