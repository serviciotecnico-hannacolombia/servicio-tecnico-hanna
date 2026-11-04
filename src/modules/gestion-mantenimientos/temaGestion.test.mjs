import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
import postcss from 'postcss'
import {createElement} from 'react'
import {renderToStaticMarkup} from 'react-dom/server'

const cache = new Map()
function modulo(nombre) {
  if (cache.has(nombre)) return cache.get(nombre)
  const source = fs.readFileSync(new URL(nombre, import.meta.url), 'utf8').replace(/^import '\.\/.*\.css'\s*$/gm, '')
  let js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext, jsx:ts.JsxEmit.ReactJSX, target:ts.ScriptTarget.ES2022}}).outputText
  js = js.replace(/from ['"]([^'"]+)['"]/g, (_,path) => `from ${JSON.stringify(path.startsWith('.') ? modulo(path + (path.endsWith('temaGestion') ? '.ts' : '.tsx')) : import.meta.resolve(path))}`)
  const url = 'data:text/javascript;base64,' + Buffer.from(js).toString('base64')
  cache.set(nombre, url)
  return url
}
const tema = await import(modulo('./temaGestion.ts'))
const css = postcss.parse(fs.readFileSync(new URL('./aparienciaGestion.css',import.meta.url),'utf8'))

test('modo y paleta persisten sin modificar preferencias globales', () => {
  const datos = new Map([['theme','global-no-modificar']])
  const storage = {getItem:k=>datos.get(k)??null, setItem:(k,v)=>datos.set(k,v)}
  assert.deepEqual(tema.leerTemaGestion(storage),{modo:'claro',paleta:'hanna'})
  for(const modo of ['claro','oscuro'])for(const paleta of Object.keys(tema.PALETAS_GESTION)) {
    assert.equal(tema.guardarTemaGestion(storage,{modo,paleta}),true)
    assert.deepEqual(tema.leerTemaGestion(storage),{modo,paleta})
  }
  assert.equal(datos.get('theme'),'global-no-modificar')
  assert.deepEqual([...datos.keys()].sort(),['theme',tema.CLAVE_TEMA_GESTION].sort())
  const bloqueado={getItem(){throw Error('denegado')},setItem(){throw Error('denegado')}}
  assert.deepEqual(tema.leerTemaGestion(bloqueado),{modo:'claro',paleta:'hanna'})
  assert.equal(tema.guardarTemaGestion(bloqueado,{modo:'oscuro',paleta:'rosa'}),false)
})

test('migra preferencias antiguas y rechaza colores o modos desconocidos', () => {
  assert.deepEqual(tema.interpretarTemaGestion('oscuro'),{modo:'oscuro',paleta:'hanna'})
  for(const valor of ['sistema','claro','invalido','{',null,'null']) assert.deepEqual(tema.interpretarTemaGestion(valor),{modo:'claro',paleta:'hanna'})
  assert.deepEqual(tema.interpretarTemaGestion('{"modo":"oscuro","paleta":"__proto__"}'),{modo:'oscuro',paleta:'hanna'})
  assert.deepEqual(tema.interpretarTemaGestion('{"modo":"sistema","paleta":"cian"}'),{modo:'claro',paleta:'cian'})
})

test('todos los selectores nuevos están encapsulados; nunca modifican root, body ni menús globales', () => {
  let count=0
  const estilos=[css,postcss.parse(fs.readFileSync(new URL('./analiticaGestion.css',import.meta.url),'utf8')),postcss.parse(fs.readFileSync(new URL('./paletasGestion.css',import.meta.url),'utf8'))]
  for(const estilo of estilos) estilo.walkRules(rule=>{
    for(const selector of rule.selectors) assert.ok(selector.startsWith('.gm-workspace'),selector)
    count++
  })
  assert.ok(count>80)
  const source=fs.readFileSync(new URL('./AparienciaGestion.tsx',import.meta.url),'utf8')
  assert.doesNotMatch(source,/document\.(body|documentElement)/)
})

function luminancia(hex) {
  const full=hex.length===4?'#'+[...hex.slice(1)].map(c=>c+c).join(''):hex
  const rgb=[1,3,5].map(i=>parseInt(full.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4)
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722
}
function contraste(a,b) {const l=[luminancia(a),luminancia(b)].sort((a,b)=>b-a);return (l[0]+.05)/(l[1]+.05)}
test('todas las combinaciones de modo y paleta mantienen contraste AA',()=>{
  const paletas=postcss.parse(fs.readFileSync(new URL('./paletasGestion.css',import.meta.url),'utf8'))
  for(const modo of ['claro','oscuro'])for(const paleta of Object.keys(tema.PALETAS_GESTION)) {
    const tokens={}
    const cargar=(hoja,selector)=>hoja.walkRules(selector,rule=>rule.walkDecls(/^--/,d=>tokens[d.prop]=d.value))
    cargar(css,'.gm-workspace')
    if(modo==='oscuro') cargar(css,'.gm-workspace[data-gm-theme="oscuro"]')
    cargar(paletas,`.gm-workspace[data-gm-theme="${modo}"]`)
    cargar(paletas,`.gm-workspace[data-gm-palette="${paleta}"]`)
    if(modo==='oscuro')cargar(paletas,`.gm-workspace[data-gm-theme="oscuro"][data-gm-palette="${paleta}"]`)
    for(const surface of ['--bg','--surface','--surface2','--accent-bg'])for(const fg of ['--text','--muted','--gm-link']) {
      assert.ok(contraste(tokens[fg],tokens[surface])>=4.5,`${modo}/${paleta}: ${fg}/${surface}: ${contraste(tokens[fg],tokens[surface])}`)
    }
    assert.ok(contraste('#ffffff',tokens['--accent'])>=4.5,`${modo}/${paleta}: botón primario`)
    assert.ok(contraste('#ffffff',tokens['--red'])>=4.5,`${modo}/${paleta}: botón peligro`)
  }
})

test('desplegable renderiza sólo Claro y Oscuro y conserva la paleta seleccionada',async()=>{
  const {AparienciaGestion}=await import(modulo('./AparienciaGestion.tsx'))
  const {Card,Header}=await import(modulo('./uiGestion.tsx'))
  const original=globalThis.window
  try {
    for(const modo of ['claro','oscuro'])for(const paleta of Object.keys(tema.PALETAS_GESTION)) {
      globalThis.window={localStorage:{getItem:()=>JSON.stringify({modo,paleta})}}
      const html=renderToStaticMarkup(createElement(AparienciaGestion,{},selector=>createElement('div',{},selector,createElement(Header,{title:'Historial in situ'}),createElement(Card,{},'Sin registros'))))
      assert.match(html,new RegExp(`data-gm-theme="${modo}"`))
      assert.match(html,new RegExp(`data-gm-palette="${paleta}"`))
      assert.equal((html.match(/<select/g)||[]).length,2)
      assert.match(html,/Personalizar apariencia de Gestión/)
      assert.doesNotMatch(html,/Sistema|value="sistema"/)
      assert.match(html,/Sin registros/)
    }
  } finally { if(original===undefined)delete globalThis.window;else globalThis.window=original }
})
