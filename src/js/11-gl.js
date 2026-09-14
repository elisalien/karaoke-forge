/* ============================================================== WebGL 2 === */
/* L'ordre fait foi : l'index est la valeur de uShape dans le shader. */
const PAR_SHAPES = ['spark', 'dust', 'pixel', 'bubble', 'shard', 'star', 'streak', 'petal', 'note', 'confetti', 'heart'];
const GL = {
  gl: null, ok: false, W: 0, H: 0,
  quad: null, pBG: null, pTex: null, pPar: null, pBright: null, pBlur: null, pFinal: null,
  fbScene: null, fbA: null, fbB: null, texScene: null, texA: null, texB: null, texText: null,
  vaoQuad: null, vaoPar: null, bufPar: null, parCap: 0,

  init() {
    const gl = glc.getContext('webgl2', {
      alpha: true, premultipliedAlpha: false, antialias: false,
      preserveDrawingBuffer: true, desynchronized: false, powerPreference: 'high-performance'
    });
    if (!gl) { this.ok = false; return false; }
    this.gl = gl; this.ok = true;
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.disable(gl.DEPTH_TEST);

    const VS_QUAD = `#version 300 es
      in vec2 aP; out vec2 vUv;
      void main(){ vUv = aP*0.5+0.5; gl_Position = vec4(aP,0.,1.); }`;

    this.pBG = prog(gl, VS_QUAD, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform vec3 uC1,uC2,uGrid; uniform float uAng,uTime,uGA,uGS,uGSp,uHz;
      uniform int uMode,uGridOn;
      void main(){
        vec2 uv = vec2(vUv.x, 1.0-vUv.y);
        vec3 col;
        if(uMode==0) col=uC1;
        else { vec2 d=vec2(cos(uAng),sin(uAng));
               float t=clamp(dot(uv-0.5,d)+0.5,0.,1.); col=mix(uC1,uC2,t); }
        if(uGridOn==1){
          float hz=uHz;
          if(uv.y>hz){
            float d=(uv.y-hz)/max(1e-4,1.0-hz);
            float z=1.0/(d*d*1.6+0.035);
            vec2 g=vec2((uv.x-0.5)*z*uGS*0.35, z*uGS*0.22 - uTime*uGSp*uGS*0.25);
            vec2 f=abs(fract(g)-0.5);
            vec2 w=fwidth(g)*1.1;
            float l=1.0-smoothstep(0.0,1.0,min(f.x/max(w.x,1e-5),f.y/max(w.y,1e-5)));
            l*=smoothstep(0.0,0.10,d);
            col+=uGrid*l*uGA;
          } else {
            float gl2=smoothstep(hz,hz-0.30,uv.y);
            col+=uGrid*gl2*uGA*0.16;
          }
        }
        o=vec4(col, uMode==2?0.0:1.0);
      }`);

    this.pTex = prog(gl, VS_QUAD, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT;
      void main(){ o = texture(uT, vec2(vUv.x,1.0-vUv.y)); }`);

    this.pPar = prog(gl, `#version 300 es
      in vec2 aCorner; in vec2 aPos; in float aSize; in float aRot; in float aAsp; in vec4 aCol;
      uniform vec2 uRes; out vec2 vUv; out vec4 vCol;
      void main(){
        vec2 c = aCorner * vec2(aSize*aAsp, aSize);
        float s=sin(aRot), k=cos(aRot);
        vec2 r = vec2(c.x*k - c.y*s, c.x*s + c.y*k);
        vec2 p = (aPos + r)/uRes;
        gl_Position = vec4(p.x*2.0-1.0, 1.0-p.y*2.0, 0., 1.);
        vUv = aCorner+0.5; vCol = aCol;
      }`, `#version 300 es
      precision highp float; in vec2 vUv; in vec4 vCol; out vec4 o; uniform int uShape;
      void main(){
        vec2 p = vUv*2.0-1.0; float d = length(p); float a=0.0;
        if(uShape==0){ a = pow(max(0.,1.0-d),2.5) + pow(max(0.,1.0-d),18.0)*1.4; }
        else if(uShape==1){ a = exp(-d*d*3.2)*0.9; }
        else if(uShape==2){ a = (max(abs(p.x),abs(p.y))<0.82)?1.0:0.0; }
        else if(uShape==3){ float r=abs(d-0.72); a=smoothstep(0.30,0.0,r)*0.9;
                            a+=pow(max(0.,1.0-length(p-vec2(-0.28,-0.28))*2.6),3.0)*0.8; }
        else if(uShape==4){ a = (abs(p.x)+abs(p.y)<0.9)?1.0:0.0; a*=1.0-d*0.45; }
        else if(uShape==5){ float st=pow(max(0.,1.0-abs(p.x)),9.0)+pow(max(0.,1.0-abs(p.y)),9.0);
                            a = pow(max(0.,1.0-d),3.0)*0.7 + st*0.55; }
        else if(uShape==6){ a = pow(max(0.,1.0-abs(p.y)),2.5) * pow(max(0.,1.0-abs(p.x)),0.7); }
        else if(uShape==7){ /* pétale */
          vec2 q = vec2(p.x*1.7, p.y + 0.18*p.x*p.x);
          a = smoothstep(0.98, 0.78, length(q));
          a *= 1.0 - smoothstep(0.26, 0.0, length(p - vec2(0.0, -0.92)));
          a *= 0.75 + 0.25*(1.0 - abs(p.x)); }
        else if(uShape==8){ /* note de musique */
          float head = smoothstep(0.34, 0.26, length(vec2((p.x+0.22)*1.05, (p.y-0.52)*1.45)));
          float stem = step(abs(p.x-0.08), 0.055) * step(-0.85, p.y) * step(p.y, 0.5);
          float flag = smoothstep(0.09, 0.0, abs(p.y+0.62-0.55*(p.x-0.08))) * step(0.08, p.x) * step(p.x, 0.6);
          a = max(head, max(stem, flag)); }
        else if(uShape==9){ /* confetti */
          a = step(abs(p.x), 0.85) * step(abs(p.y), 0.42) * (0.7 + 0.3*sign(p.x*p.y)); }
        else if(uShape==10){ /* cœur */
          vec2 q = vec2(p.x*1.3, -p.y*1.3 + 0.15);
          float v = pow(dot(q,q) - 1.0, 3.0) - q.x*q.x*q.y*q.y*q.y;
          a = smoothstep(0.03, -0.03, v); }
        a = clamp(a,0.,1.5);
        o = vec4(vCol.rgb*vCol.a*a, vCol.a*a);
      }`);

    this.pBright = prog(gl, VS_QUAD, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT; uniform float uThr;
      void main(){ vec4 c=texture(uT,vUv); float l=dot(c.rgb,vec3(.299,.587,.114));
        float k=max(0.0,l-uThr)/max(1e-4,1.0-uThr); o=vec4(c.rgb*k,1.0); }`);

    this.pBlur = prog(gl, VS_QUAD, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uT; uniform vec2 uDir;
      void main(){
        vec3 s = texture(uT,vUv).rgb*0.2270270270;
        s += (texture(uT,vUv+uDir*1.3846153846).rgb+texture(uT,vUv-uDir*1.3846153846).rgb)*0.3162162162;
        s += (texture(uT,vUv+uDir*3.2307692308).rgb+texture(uT,vUv-uDir*3.2307692308).rgb)*0.0702702703;
        o=vec4(s,1.0); }`);

    this.pFinal = prog(gl, VS_QUAD, `#version 300 es
      precision highp float; in vec2 vUv; out vec4 o;
      uniform sampler2D uScene, uBloom;
      uniform vec2 uRes; uniform float uChroma,uWarp,uScan,uScanN,uRoll,uGrain,uVign,uCon,uSat,uBloomI,uTime,uGlitch,uGlitchR;
      uniform int uAlphaBg;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv=vUv;
        vec2 c = uv-0.5; float r2=dot(c,c);
        // glitch : horizontal band displacement
        if(uGlitch>0.001){
          float band = floor(uv.y*28.0);
          float g = hash(vec2(band, floor(uTime*uGlitchR)));
          if(g>1.0-uGlitch*0.55) uv.x += (hash(vec2(band+7.0,floor(uTime*uGlitchR)))-0.5)*uGlitch*0.12;
        }
        vec2 off = (uChroma/uRes) * mix(vec2(1.0), c*4.0, uWarp);
        vec4 sc;
        sc.r = texture(uScene, uv+off).r;
        sc.g = texture(uScene, uv).g;
        sc.b = texture(uScene, uv-off).b;
        sc.a = max(texture(uScene,uv).a, max(texture(uScene,uv+off).a, texture(uScene,uv-off).a));
        vec3 bl = texture(uBloom, uv).rgb * uBloomI;
        vec3 col = sc.rgb + bl;
        float ba = clamp(dot(bl,vec3(.35)),0.0,1.0);
        // scanlines
        float sl = 0.5+0.5*sin((uv.y+uTime*uRoll)*uScanN*3.14159265);
        col *= 1.0 - uScan*sl;
        // grain
        col += (hash(uv*uRes+fract(uTime)*97.0)-0.5)*uGrain;
        // vignette
        col *= 1.0 - uVign*smoothstep(0.15,0.75,r2);
        // grade
        float l = dot(col, vec3(.299,.587,.114));
        col = mix(vec3(l), col, uSat);
        col = (col-0.5)*uCon+0.5;
        col = max(col, vec3(0.0));
        float a = (uAlphaBg==1) ? clamp(max(sc.a, ba)*(1.0-uVign*smoothstep(0.15,0.9,r2)*0.4),0.0,1.0) : 1.0;
        o = vec4(col, a);
      }`);

    // full-screen quad
    this.vaoQuad = gl.createVertexArray(); gl.bindVertexArray(this.vaoQuad);
    const qb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    this.texText = tex(gl);
    return true;
  },

  allocParticles(cap) {
    const gl = this.gl; if (!gl) return;
    if (this.vaoPar) gl.deleteVertexArray(this.vaoPar);
    if (this.bufPar) gl.deleteBuffer(this.bufPar);
    this.vaoPar = gl.createVertexArray(); gl.bindVertexArray(this.vaoPar);
    const cb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, cb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-.5, -.5, .5, -.5, -.5, .5, .5, .5]), gl.STATIC_DRAW);
    const lc = gl.getAttribLocation(this.pPar, 'aCorner');
    gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 2, gl.FLOAT, false, 0, 0);
    this.bufPar = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPar);
    gl.bufferData(gl.ARRAY_BUFFER, cap * 9 * 4, gl.DYNAMIC_DRAW);
    const S9 = 9 * 4;
    const at = [['aPos', 2, 0], ['aSize', 1, 8], ['aRot', 1, 12], ['aAsp', 1, 16], ['aCol', 4, 20]];
    for (const [nm, sz, off] of at) {
      const l = gl.getAttribLocation(this.pPar, nm);
      if (l < 0) continue;
      gl.enableVertexAttribArray(l);
      gl.vertexAttribPointer(l, sz, gl.FLOAT, false, S9, off);
      gl.vertexAttribDivisor(l, 1);
    }
    gl.bindVertexArray(null);
    this.parCap = cap;
  },

  resize(w, h) {
    const gl = this.gl; if (!gl) return;
    this.W = w; this.H = h;
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    for (const k of ['fbScene', 'fbA', 'fbB']) if (this[k]) gl.deleteFramebuffer(this[k]);
    for (const k of ['texScene', 'texA', 'texB']) if (this[k]) gl.deleteTexture(this[k]);
    const mk2 = (W, H) => {
      const t = tex(gl);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return [t, f];
    };
    [this.texScene, this.fbScene] = mk2(w, h);
    [this.texA, this.fbA] = mk2(bw, bh);
    [this.texB, this.fbB] = mk2(bw, bh);
  },

  draw(time, nInst) {
    const gl = this.gl; if (!gl) return;
    const W = this.W, H = this.H;
    const alphaBg = P.bgMode === 'alpha';

    /* ---- pass 1 : background + text + particles → fbScene ---- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbScene);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bindVertexArray(this.vaoQuad);
    gl.disable(gl.BLEND);
    if (!alphaBg) {
      gl.useProgram(this.pBG);
      const c1 = hex2rgb(P.bgC1), c2 = hex2rgb(P.bgC2), gc = hex2rgb(P.gridColor);
      u3(gl, this.pBG, 'uC1', c1); u3(gl, this.pBG, 'uC2', c2); u3(gl, this.pBG, 'uGrid', gc);
      u1(gl, this.pBG, 'uAng', P.bgAngle * Math.PI / 180); u1(gl, this.pBG, 'uTime', time);
      u1(gl, this.pBG, 'uGA', P.gridAlpha); u1(gl, this.pBG, 'uGS', P.gridSize);
      u1(gl, this.pBG, 'uGSp', P.gridSpeed); u1(gl, this.pBG, 'uHz', P.gridHorizon);
      ui(gl, this.pBG, 'uMode', P.bgMode === 'solid' ? 0 : 1);
      ui(gl, this.pBG, 'uGridOn', P.gridOn ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    // text layer
    gl.useProgram(this.pTex);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texText);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, txc);
    ui(gl, this.pTex, 'uT', 0);
    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    // particles
    if (nInst > 0) {
      gl.useProgram(this.pPar);
      gl.bindVertexArray(this.vaoPar);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.bufPar);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, Particles.inst, 0, nInst * 9);
      u2(gl, this.pPar, 'uRes', [W, H]);
      ui(gl, this.pPar, 'uShape', PAR_SHAPES.indexOf(P.parType));
      if (P.parBlend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, nInst);
      gl.bindVertexArray(this.vaoQuad);
    }
    gl.disable(gl.BLEND);

    /* ---- bloom ---- */
    const bw = Math.max(1, W >> 2), bh = Math.max(1, H >> 2);
    const bloomI = P.bloomOn ? P.bloomInt * (1 + P.beatBloom * _pulse) : 0;
    if (bloomI > 0) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA); gl.viewport(0, 0, bw, bh);
      gl.useProgram(this.pBright); bindTex(gl, this.pBright, 'uT', this.texScene, 0);
      u1(gl, this.pBright, 'uThr', P.bloomThr); gl.drawArrays(gl.TRIANGLES, 0, 3);
      for (let i = 0; i < 2; i++) {
        const rad = P.bloomRad * (1 + i);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbB);
        gl.useProgram(this.pBlur); bindTex(gl, this.pBlur, 'uT', this.texA, 0);
        u2(gl, this.pBlur, 'uDir', [rad / bw, 0]); gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA);
        bindTex(gl, this.pBlur, 'uT', this.texB, 0);
        u2(gl, this.pBlur, 'uDir', [0, rad / bh]); gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbA); gl.viewport(0, 0, bw, bh);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    }

    /* ---- final ---- */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.pFinal);
    bindTex(gl, this.pFinal, 'uScene', this.texScene, 0);
    bindTex(gl, this.pFinal, 'uBloom', this.texA, 1);
    u2(gl, this.pFinal, 'uRes', [W, H]);
    u1(gl, this.pFinal, 'uChroma', P.chroma); u1(gl, this.pFinal, 'uWarp', P.chromaWarp);
    u1(gl, this.pFinal, 'uScan', P.scanAmt); u1(gl, this.pFinal, 'uScanN', P.scanCount);
    u1(gl, this.pFinal, 'uRoll', P.scanRoll); u1(gl, this.pFinal, 'uGrain', P.grain);
    u1(gl, this.pFinal, 'uVign', P.vign); u1(gl, this.pFinal, 'uCon', P.contrast);
    u1(gl, this.pFinal, 'uSat', P.sat); u1(gl, this.pFinal, 'uBloomI', bloomI);
    u1(gl, this.pFinal, 'uTime', time); u1(gl, this.pFinal, 'uGlitch', P.glitchAmt);
    u1(gl, this.pFinal, 'uGlitchR', P.glitchRate);
    ui(gl, this.pFinal, 'uAlphaBg', alphaBg ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
  }
};

/* --- small GL helpers --- */
function sh(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
  return s;
}
function prog(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, sh(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, sh(gl, gl.FRAGMENT_SHADER, fs));
  gl.bindAttribLocation(p, 0, 'aP');
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  return p;
}
function tex(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const _ul = new Map();
function loc(gl, p, n) { const k = n + '@' + (p.__id || (p.__id = Math.random())); let l = _ul.get(k); if (l === undefined) { l = gl.getUniformLocation(p, n); _ul.set(k, l); } return l; }
const u1 = (gl, p, n, v) => gl.uniform1f(loc(gl, p, n), v);
const u2 = (gl, p, n, v) => gl.uniform2f(loc(gl, p, n), v[0], v[1]);
const u3 = (gl, p, n, v) => gl.uniform3f(loc(gl, p, n), v[0], v[1], v[2]);
const ui = (gl, p, n, v) => gl.uniform1i(loc(gl, p, n), v);
function bindTex(gl, p, n, t, unit) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc(gl, p, n), unit); }

