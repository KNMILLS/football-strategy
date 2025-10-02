class i{state={hasError:!1,error:null,errorInfo:null,retryCount:0};config;retryTimeoutId=null;originalErrorHandler=null;constructor(r={}){this.config={fallbackComponent:r.fallbackComponent||this.createDefaultFallback,onError:r.onError||this.defaultErrorHandler,isolate:r.isolate??!0,componentName:r.componentName||"UnknownComponent",showErrorDetails:r.showErrorDetails??(typeof process<"u"&&!1)}}static wrap(r,t){return new i(t).wrapElement(r)}static wrapComponent(r,t){const e=new i(t);return((...o)=>{try{const n=r.apply(this,o);return e.wrapElement(n)}catch(n){return e.handleError(n)}})}static wrapEventHandler(r,t,e,a){const o=new i(a),n=(...s)=>{try{return e.apply(this,s)}catch(l){o.handleError(l);return}};return r.on(t,n),()=>r.off(t,n)}wrapElement(r){this.config.isolate&&this.setupErrorIsolation(r);const t=r.addEventListener;return r.addEventListener=(...e)=>{const[a,o,n]=e,s=(...l)=>{try{return o.apply(this,l)}catch(c){this.handleError(c);return}};return t.call(r,a,s,n)},r}setupErrorIsolation(r){this.originalErrorHandler=window.onerror,window.onerror=(e,a,o,n,s)=>{if(s&&this.isErrorFromComponent(s,r))return this.handleError(s),!0;if(this.originalErrorHandler&&s)try{return this.originalErrorHandler(s)}catch{return!1}return!1};const t=new MutationObserver(e=>{e.forEach(a=>{a.removedNodes.forEach(o=>{(o===r||r.contains(o))&&(this.cleanup(),t.disconnect())})})});r.parentNode&&t.observe(r.parentNode,{childList:!0,subtree:!0})}isErrorFromComponent(r,t){const e=r.stack||"";return["HUD","Log","Field","Hand","Controls"].some(o=>e.includes(o)||t.id?.includes(o.toLowerCase()))}handleError(r){this.state.hasError=!0,this.state.error=r,this.state.errorInfo={componentName:this.config.componentName,errorBoundary:"ErrorBoundary"};try{this.config.onError(r,this.state.errorInfo)}catch(t){console.error("Error in error boundary callback:",t)}return console.error(`ErrorBoundary caught error in ${this.config.componentName}:`,r),this.config.fallbackComponent(r,()=>this.retry())}retry(){this.state.retryCount<3&&(this.state.hasError=!1,this.state.error=null,this.state.errorInfo=null,this.state.retryCount++,this.retryTimeoutId&&clearTimeout(this.retryTimeoutId),this.retryTimeoutId=window.setTimeout(()=>{window.dispatchEvent(new CustomEvent("errorBoundaryRetry",{detail:{componentName:this.config.componentName}}))},100*this.state.retryCount))}createDefaultFallback(r,t){const e=document.createElement("div");e.className="error-boundary-fallback",e.style.cssText=`
      padding: 16px;
      margin: 8px;
      border: 2px solid #ff6b6b;
      border-radius: 8px;
      background-color: #fff5f5;
      color: #c92a2a;
      font-family: monospace;
      font-size: 14px;
    `;const a=document.createElement("div");a.textContent=`⚠️ ${this.config.componentName} Error`,a.style.fontWeight="bold",a.style.marginBottom="8px";const o=document.createElement("div");o.textContent=this.config.showErrorDetails?r.message:"Component failed to load";const n=document.createElement("button");return n.textContent="Retry",n.style.cssText=`
      margin-top: 8px;
      padding: 4px 12px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    `,n.onclick=()=>t(),e.appendChild(a),e.appendChild(o),e.appendChild(n),e}defaultErrorHandler(r,t){console.group(`🚨 ErrorBoundary: ${t.componentName}`),console.error("Error:",r),console.log("Error Info:",t),console.groupEnd()}cleanup(){this.retryTimeoutId&&(clearTimeout(this.retryTimeoutId),this.retryTimeoutId=null),this.originalErrorHandler&&(window.onerror=this.originalErrorHandler,this.originalErrorHandler=null)}getState(){return{...this.state}}triggerError(r){return this.handleError(r)}reset(){this.state.hasError=!1,this.state.error=null,this.state.errorInfo=null,this.state.retryCount=0,this.cleanup()}}export{i as ErrorBoundary};
//# sourceMappingURL=ErrorBoundary-B0safkMN.js.map
