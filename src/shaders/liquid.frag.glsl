#version 300 es
precision highp float;
precision highp int;
uniform sampler2D uField;
uniform sampler2D uVelocity;
uniform sampler2D uPhase;
uniform sampler2D uPressure;
uniform sampler2D uRhs;
uniform ivec2 uSize;
uniform int uMode;
uniform int uResetBank;
uniform float uH, uDt, uGamma, uSigma, uDamping, uStirring, uScale, uTime, uDose;
uniform vec2 uViscosity;
uniform vec4 uCarriers;
out vec4 result;
const ivec2 X=ivec2(1,0), Y=ivec2(0,1);
ivec2 cell(ivec2 p) { return clamp(p,ivec2(0),uSize-1); }
bool inside(ivec2 p) { return all(greaterThanEqual(p,ivec2(0))) && all(lessThan(p,uSize)); }
vec4 field(ivec2 p) { return texelFetch(uField,cell(p),0); }
float phi(ivec2 p) { return texelFetch(uPhase,cell(p),0).r; }
vec2 vel(ivec2 p) {
  vec2 v=texelFetch(uVelocity,cell(p),0).rg;
  if(p.x<0 || p.x>=uSize.x-1) v.x=0.;
  if(p.y<0 || p.y>=uSize.y-1) v.y=0.;
  return v;
}
vec2 normal(ivec2 p) {
  p=cell(p);
  vec2 g=vec2(phi(p+X)-phi(p-X),phi(p+Y)-phi(p-Y));
  return g/max(length(g),1e-12);
}
float curvature(ivec2 p) { return -(normal(p+X).x-normal(p-X).x+normal(p+Y).y-normal(p-Y).y)/(2.*uH); }
float mu(ivec2 p) { return mix(uViscosity.y,uViscosity.x,phi(p)); }
float cornerMu(ivec2 p) { return .25*(mu(p)+mu(p+X)+mu(p+Y)+mu(p+X+Y)); }
float pressure(ivec2 p) { return texelFetch(uPressure,cell(p),0).r; }
vec2 interpVelocity(vec2 p) {
  // Manual interpolation: MAC x at (i+1,j+.5), y at (i+.5,j+1).
  vec2 outV=vec2(0);
  for(int c=0;c<2;c++) {
    vec2 q=p-(c==0?vec2(1.,.5):vec2(.5,1.));
    ivec2 i=ivec2(floor(q)); vec2 f=fract(q);
    outV[c]=mix(mix(vel(i)[c],vel(i+X)[c],f.x),mix(vel(i+Y)[c],vel(i+X+Y)[c],f.x),f.y);
  }
  return outV;
}
// Positive donor rates for each carrier; epsilon=h. This is also the pigment transfer operator.
vec2 rates(ivec2 l, ivec2 r, int axis, float carrier) {
  float pl=mix(phi(l),1.-phi(l),carrier), pr=mix(phi(r),1.-phi(r),carrier);
  float nl=normal(l)[axis]*(1.-2.*carrier), nr=normal(r)[axis]*(1.-2.*carrier);
  float v=vel(l)[axis];
  return vec2(uGamma+.5*(v+uGamma*nl*(1.-pl)),uGamma-.5*(v+uGamma*nr*(1.-pr)));
}
vec4 flux(ivec2 l, ivec2 r, int axis, bool pigment) {
  if(!inside(l)||!inside(r)) return vec4(0);
  vec4 f=vec4(0);
  for(int c=0;c<4;c++) {
    vec2 a=rates(l,r,axis,pigment?uCarriers[c]:0.);
    f[c]=a.x*field(l)[c]-a.y*field(r)[c];
  }
  return f;
}
void main() {
  ivec2 p=ivec2(gl_FragCoord.xy);
  vec2 uv=(vec2(p)+.5)/vec2(uSize);
  result=vec4(0);
  if(uMode==0) {
    vec2 pos=(vec2(p)+.5-.5*vec2(uSize))*uH;
    float a=.5*(1.+tanh((.22-length(pos))/(2.*uH)));
    result=vec4(a,0,0,0);
  } else if(uMode==1) {
    float a=phi(p);
    vec4 carrier=mix(vec4(a),vec4(1.-a),uCarriers);
    vec4 pattern=vec4(uv.x,1.-uv.x,uv.y,1.-uv.y);
    result=uDose*carrier*pattern;
  } else if(uMode==2) {
    vec2 v;
    for(int c=0;c<2;c++) {
      vec2 pos=vec2(p)+(c==0?vec2(1.,.5):vec2(.5,1.));
      v[c]=interpVelocity(pos-uDt*interpVelocity(pos)/uH)[c];
    }
    vec2 force=vec2(sin(6.283185*uv.y*uScale+uTime*.13),-sin(6.283185*uv.x*uScale-uTime*.11))*uStirring;
    vec2 cap=uSigma*vec2(.5*(curvature(p)+curvature(p+X))*(phi(p+X)-phi(p)),.5*(curvature(p)+curvature(p+Y))*(phi(p+Y)-phi(p)))/uH;
    v=(v+uDt*(force+cap))*exp(-uDamping*uDt);
    if(p.x==uSize.x-1) v.x=0.; if(p.y==uSize.y-1) v.y=0.;
    result=vec4(v,0,0);
  } else if(uMode==3) {
    // Backward Euler div[mu(grad u + grad u^T)], relaxed block Jacobi.
    vec2 v=vel(p), rhs=texelFetch(uRhs,p,0).rg;
    float cr=2.*mu(p+X), cl=2.*mu(p), ct=cornerMu(p), cb=cornerMu(p-Y);
    float shearT=(vel(p+X).y-vel(p).y), shearB=(vel(p+X-Y).y-vel(p-Y).y);
    if(p.y==uSize.y-1) ct=0.; if(p.y==0) cb=0.;
    float h2=uH*uH;
    float ux=(rhs.x+uDt/h2*(cr*vel(p+X).x+cl*vel(p-X).x+ct*(vel(p+Y).x+shearT)+cb*(vel(p-Y).x-shearB)))/(1.+uDt/h2*(cr+cl+ct+cb));
    ct=2.*mu(p+Y); cb=2.*mu(p); cr=cornerMu(p); cl=cornerMu(p-X);
    float shearR=vel(p+Y).x-vel(p).x, shearL=vel(p-X+Y).x-vel(p-X).x;
    if(p.x==uSize.x-1) cr=0.; if(p.x==0) cl=0.;
    float vy=(rhs.y+uDt/h2*(ct*vel(p+Y).y+cb*vel(p-Y).y+cr*(vel(p+X).y+shearR)+cl*(vel(p-X).y-shearL)))/(1.+uDt/h2*(ct+cb+cr+cl));
    vec2 next=mix(v,vec2(ux,vy),.5);
    if(p.x==uSize.x-1) next.x=0.; if(p.y==uSize.y-1) next.y=0.;
    result=vec4(next,0,0);
  } else if(uMode==4) {
    result.r=(vel(p).x-vel(p-X).x+vel(p).y-vel(p-Y).y)/uH;
  } else if(uMode==5) {
    float sum=0., count=0.;
    if(p.x>0) { sum+=pressure(p-X); count++; }
    if(p.y>0) { sum+=pressure(p-Y); count++; }
    if(p.x<uSize.x-1) { sum+=pressure(p+X); count++; }
    if(p.y<uSize.y-1) { sum+=pressure(p+Y); count++; }
    result.r=mix(pressure(p),(sum-texelFetch(uRhs,p,0).r*uH*uH)/count,.8);
  } else if(uMode==6) {
    vec2 v=vel(p)-vec2(pressure(p+X)-pressure(p),pressure(p+Y)-pressure(p))/uH;
    if(p.x==uSize.x-1) v.x=0.; if(p.y==uSize.y-1) v.y=0.;
    result=vec4(v,0,0);
  } else if(uMode==7 || uMode==8) {
    bool pigment=uMode==8;
    result=field(p)-uDt/uH*(flux(p,p+X,0,pigment)-flux(p-X,p,0,pigment)+flux(p,p+Y,1,pigment)-flux(p-Y,p,1,pigment));
  } else if(uMode==9) { result=field(p); }
  else if(uMode==12) { result=vec4(uv,uv); }
  else if(uMode==13) {
    vec2 q=vec2(p)-uDt*interpVelocity(vec2(p)+.5)/uH;
    ivec2 i=ivec2(floor(q)); vec2 f=fract(q);
    result=mix(mix(field(i),field(i+X),f.x),mix(field(i+Y),field(i+X+Y),f.x),f.y);
    if(uResetBank==0) result.xy=uv;
    if(uResetBank==1) result.zw=uv;
  }
}
