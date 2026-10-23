// The browser import map is mirrored only for CPU geometry checks.
export async function resolve(specifier,context,next){
 if(specifier==='three')return {url:new URL('./dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true};
 return next(specifier,context);
}
