#version 300 es
precision highp float;
uniform sampler2D uPhase, uPigment, uDetail, uVelocity;
uniform vec3 uPhaseA, uPhaseB, uPigments[4], uSubstrate;
uniform float uPath, uAbsorption, uRelief, uGloss, uRoughness;
uniform bool uDiagnostic;
uniform float uDetailAmount, uTime;
in vec2 vUv;
out vec4 result;
vec4 sampleField(sampler2D field, vec2 uv) {
  ivec2 size=textureSize(field,0); vec2 p=uv*vec2(size)-.5;
  ivec2 i=ivec2(floor(p)); vec2 f=fract(p);
  return mix(mix(texelFetch(field,clamp(i,ivec2(0),size-1),0),texelFetch(field,clamp(i+ivec2(1,0),ivec2(0),size-1),0),f.x),mix(texelFetch(field,clamp(i+ivec2(0,1),ivec2(0),size-1),0),texelFetch(field,clamp(i+ivec2(1,1),ivec2(0),size-1),0),f.x),f.y);
}
float heightAt(vec2 uv) {
  float p=sampleField(uPhase,uv).r;
  float band=4.*p*(1.-p)*uRelief*.015;
  if(uDetailAmount<=0.) return band;
  vec4 q=sampleField(uDetail,uv);
  float weight=pow(sin(3.14159265*mod(uTime,8.)/8.),2.);
  vec2 frequency=vec2(32.,27.);
  float sampling=max(length(fwidth(q.xy)*frequency),length(fwidth(q.zw)*frequency));
  float fine=mix(sin(dot(q.zw,frequency)*6.283185),sin(dot(q.xy,frequency)*6.283185),weight);
  vec2 d=1./vec2(textureSize(uVelocity,0));
  vec2 dx=(sampleField(uVelocity,uv+vec2(d.x,0)).rg-sampleField(uVelocity,uv-vec2(d.x,0)).rg)/(2.*d.x);
  vec2 dy=(sampleField(uVelocity,uv+vec2(0,d.y)).rg-sampleField(uVelocity,uv-vec2(0,d.y)).rg)/(2.*d.y);
  float strain=clamp(length(vec3(dx.x,dy.y,.5*(dx.y+dy.x))),0.,1.);
  return band + uDetailAmount*.001*fine*strain*(1.-smoothstep(.2,.5,sampling));
}
vec3 encode(vec3 c) { return mix(12.92*c,1.055*pow(max(c,vec3(0)),vec3(1./2.4))-.055,step(vec3(.0031308),c)); }
void main() {
  float phi=sampleField(uPhase,vUv).r;
  vec4 pigment=sampleField(uPigment,vUv);
  if(uDiagnostic) {
    if(phi<-.00001 || phi>1.00001 || any(lessThan(pigment,vec4(-.00001)))) result=vec4(1,0,1,1);
    else result=vec4(mix(vec3(.05,.25,.8),vec3(.95,.5,.05),phi),1);
    return;
  }
  vec3 tau=phi*uPhaseA+(1.-phi)*uPhaseB;
  for(int i=0;i<4;i++) tau+=pigment[i]*uPigments[i];
  vec3 transmission=exp(-uPath*uAbsorption*max(tau,vec3(0)));
  if(uGloss<=0. && uRelief<=0. && uDetailAmount<=0.) { result=vec4(encode(clamp(uSubstrate*transmission,0.,1.)),1.); return; }
  vec2 d=1./vec2(textureSize(uPhase,0));
  vec2 slope=vec2(heightAt(vUv+vec2(d.x,0))-heightAt(vUv-vec2(d.x,0)),heightAt(vUv+vec2(0,d.y))-heightAt(vUv-vec2(0,d.y)))/(2.*d);
  vec3 n=normalize(vec3(-slope,1));
  vec3 halfVector=normalize(normalize(vec3(-.4,.5,1.))+vec3(0,0,1));
  float fresnel=.04+.96*pow(1.-max(n.z,0.),5.);
  float reflection=uGloss*fresnel*pow(max(dot(n,halfVector),0.),mix(128.,8.,uRoughness));
  float lighting=mix(1.,.8+.2*max(dot(n,normalize(vec3(-.4,.5,1.))),0.),clamp(uRelief+uDetailAmount,0.,1.));
  vec3 color=uSubstrate*transmission*(1.-uGloss*.04)*lighting+vec3(reflection);
  result=vec4(encode(clamp(color,0.,1.)),1.);
}
