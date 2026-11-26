import * as esb from 'esbuild';import fs from 'fs';import {createRequire} from 'module';
const require=createRequire(import.meta.url);fs.mkdirSync('dist',{recursive:true});
const named=(m)=>Object.keys(require(m.startsWith('.')?process.cwd()+'/'+m.slice(2):m)).filter(k=>/^[A-Za-z_$][\w$]*$/.test(k)&&k!=='default');
const cjsEntry=(m,pre='')=>`${pre}import * as X from '${m}'; const M=X.default||X; export default M; export const {${named(m).join(',')}} = M;`;
const ext=['react','react-dom','three','@react-three/fiber','@react-three/drei','@react-three/postprocessing','postprocessing','zustand','react/jsx-runtime'];
const jobs={
 'react':{stdin:cjsEntry('react')+'globalThis.__React=M;',external:[]},
 'react-dom':{stdin:cjsEntry('react-dom',"import './setreact.js';"),external:['react']},
 'react-dom-client':{stdin:cjsEntry('./node_modules/react-dom/client.js',"import './setreact.js';import './setdom.js';"),external:['react','react-dom']},
 'jsx-runtime':{stdin:cjsEntry('./node_modules/react/jsx-runtime.js',"import './setreact.js';"),external:['react']},
 'jsx-dev-runtime':{stdin:cjsEntry('./node_modules/react/jsx-dev-runtime.js',"import './setreact.js';"),external:['react']},
 'three':{entry:'three',external:[]},
 'svgloader':{entry:'three/examples/jsm/loaders/SVGLoader.js',external:['three']},
 'bgutils':{entry:'three/examples/jsm/utils/BufferGeometryUtils.js',external:['three']},
 'zustand':{entry:'zustand',external:['react']},
 'fiber':{entry:'@react-three/fiber',external:['react','react-dom','three']},
 'drei':{entry:'@react-three/drei',external:['react','react-dom','three','@react-three/fiber']},
 'postproc':{entry:'postprocessing',external:['three']},
 'rtpost':{entry:'@react-three/postprocessing',external:['react','three','@react-three/fiber','postprocessing']},
 'muxer':{entry:'mp4-muxer',external:[]},
};
const shim={name:'shim',setup(b){
 b.onResolve({filter:/^react(-dom)?$/},a=>a.importer.includes('node_modules')?{path:a.path,namespace:'shim'}:undefined);
 b.onLoad({filter:/.*/,namespace:'shim'},a=>({contents:a.path==='react'?'module.exports=globalThis.__React;':'module.exports=globalThis.__ReactDOM;',loader:'js'}));}};
for(const [n,j] of Object.entries(jobs)){
 await esb.build({...(j.stdin?{stdin:{contents:j.stdin,resolveDir:process.cwd(),loader:'js'}}:{entryPoints:[j.entry]}),bundle:true,plugins:n==='react'?[]:[shim],format:'esm',outfile:`dist/${n}.js`,external:j.external,platform:'browser',define:{'process.env.NODE_ENV':'"production"'},logLevel:'error',mainFields:['module','main'],conditions:['module','import','browser']});
 console.log('built',n);}
