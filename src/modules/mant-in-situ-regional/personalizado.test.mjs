import fs from 'node:fs'
import assert from 'node:assert/strict'
import {test} from 'node:test'
import ts from 'typescript'
const source = fs.readFileSync(new URL('./personalizado.ts', import.meta.url), 'utf8')
const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {esRolServicioTecnico, resumirPersonalizado, calcularTransportePersonalizado, calcularEstadiaPersonalizada, diasSugeridosPersonalizado, calcularOtrosPersonalizado, calcularMargenPersonalizado} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
test('solo el rol Servicio Técnico puede usar Personalizado', () => {
  for(const rol of ['Servicio Técnico','SERVICIO TECNICO',' servicio  técnico ']) assert.equal(esRolServicioTecnico(rol),true)
  for(const rol of ['Admin','Ventas','Aplicaciones','Líderes','Servicio Técnico externo',null,undefined,'']) assert.equal(esRolServicioTecnico(rol),false)
})
test('subtotal usa los valores manuales y las cantidades de cada equipo', () => {
  const items=[{referencia:'HI 5522',precio:'550000',cantidad:'2'},{referencia:'HI 5221',precio:'320000.50',cantidad:'1'}]
  assert.equal(resumirPersonalizado(items).total,1420000.5)
  assert.equal(resumirPersonalizado(items).valido,true)
  assert.equal(resumirPersonalizado([{...items[0],precio:'400000'}]).total,800000)
})
test('no presenta subtotal para cantidades o precios incompletos o inválidos', () => {
  assert.equal(resumirPersonalizado([]).valido,false)
  for(const precio of ['', '-1','0','Infinity','abc']) assert.equal(resumirPersonalizado([{precio,cantidad:'1'}]).valido,false)
  for(const cantidad of ['', '0','-1','1.5','Infinity']) assert.equal(resumirPersonalizado([{precio:'550000',cantidad}]).valido,false)
})

const tarifas = {costo_km:473,rendimiento_km_galon:35,precio_galon:15900}
const viajeCompleto = {viaje:'aereo',tiqueteIda:'250000',tiqueteRegreso:'300000',carroHanna:'si',kilometros:'70',peajes:'20000',gastosTerrestres:'0'}
test('aéreo suma ambos tiquetes y un único trayecto completo en carro HANNA', () => {
  const r=calcularTransportePersonalizado(viajeCompleto,tarifas)
  assert.equal(r.listo,true)
  assert.equal(r.tiquetes,550000)
  assert.equal(r.devaluacion,33110)
  assert.equal(r.gasolina,31800)
  assert.equal(r.peajes,20000)
  assert.equal(r.total,634910)
})
test('aéreo sin carro HANNA solo cobra tiquetes e ignora valores del vehículo', () => {
  const r=calcularTransportePersonalizado({...viajeCompleto,carroHanna:'no'},tarifas)
  assert.equal(r.total,550000)
  assert.equal(r.devaluacion+r.gasolina+r.peajes,0)
})
test('terrestre ignora tiquetes guardados y permite peajes explícitamente en cero', () => {
  const r=calcularTransportePersonalizado({...viajeCompleto,viaje:'terrestre',peajes:'0'},tarifas)
  assert.equal(r.tiquetes,0)
  assert.equal(r.peajes,0)
  assert.equal(r.total,129820)
  assert.equal(calcularTransportePersonalizado({...viajeCompleto,viaje:'terrestre',carroHanna:'no'},tarifas).total,149820)
})
test('no muestra total con respuestas, tiquetes, km, peajes o tarifas inválidas', () => {
  for(const cambio of [{viaje:''},{carroHanna:''},{tiqueteIda:''},{tiqueteRegreso:'-1'},{kilometros:''},{kilometros:'-10'},{peajes:''},{peajes:'-1'},{tiqueteIda:'Infinity'}]) {
    const r=calcularTransportePersonalizado({...viajeCompleto,...cambio},tarifas)
    assert.equal(r.listo,false)
    assert.equal(r.total,null)
  }
  assert.equal(calcularTransportePersonalizado(viajeCompleto,{...tarifas,rendimiento_km_galon:0}).listo,false)
})

test('dos noches y tres días suman hospedaje y alimentación con tarifas predeterminadas', () => {
  const r=calcularEstadiaPersonalizada({hospedaje:'si',noches:'2',valorNoche:'300000',dias:'3'})
  assert.equal(r.hospedaje,600000)
  assert.equal(r.alimentacion,180000)
  assert.equal(r.total,780000)
  assert.equal(r.listo,true)
  assert.equal(diasSugeridosPersonalizado('si','2'),3)
  assert.equal(diasSugeridosPersonalizado('no','2'),1)
})
test('la tarifa de hospedaje y los días manuales cambian el total', () => {
  const r=calcularEstadiaPersonalizada({hospedaje:'si',noches:'2',valorNoche:'200000',dias:'4'})
  assert.equal(r.total,640000)
})
test('sin hospedaje se ignoran noches anteriores y se mantiene alimentación por día', () => {
  const r=calcularEstadiaPersonalizada({hospedaje:'no',noches:'2',valorNoche:'300000',dias:'1'})
  assert.equal(r.hospedaje,0)
  assert.equal(r.alimentacion,60000)
  assert.equal(r.total,60000)
})
test('no calcula estadía con respuestas incompletas, noches fraccionadas o valores inválidos', () => {
  const e={hospedaje:'si',noches:'2',valorNoche:'300000',dias:'3'}
  for(const cambio of [{hospedaje:''},{noches:''},{noches:'0'},{noches:'1.5'},{valorNoche:'-1'},{valorNoche:''},{dias:''},{dias:'0'},{dias:'1.5'},{dias:'Infinity'}]) {
    const r=calcularEstadiaPersonalizada({...e,...cambio})
    assert.equal(r.listo,false)
    assert.equal(r.total,null)
  }
})

test('sin carro HANNA suma desplazamiento terrestre y conserva hotel y alimentación', () => {
  const transporte=calcularTransportePersonalizado({...viajeCompleto,carroHanna:'no',gastosTerrestres:'85000'},tarifas)
  const estadia=calcularEstadiaPersonalizada({hospedaje:'si',noches:'2',valorNoche:'300000',dias:'3'})
  assert.equal(transporte.listo,true)
  assert.equal(transporte.total,635000)
  assert.equal(transporte.gastosTerrestres,85000)
  assert.equal(transporte.total+estadia.total,1415000)
  assert.equal(calcularTransportePersonalizado({...viajeCompleto,viaje:'terrestre',carroHanna:'no',gastosTerrestres:'85000'},tarifas).total,149820)
})
test('desplazamiento terrestre exige un importe explícito y no se cobra con carro HANNA', () => {
  for(const valor of ['', '-1', 'Infinity', 'abc']) {
    const r=calcularTransportePersonalizado({...viajeCompleto,carroHanna:'no',gastosTerrestres:valor},tarifas)
    assert.equal(r.listo,false)
    assert.equal(r.total,null)
  }
  assert.equal(calcularTransportePersonalizado({...viajeCompleto,gastosTerrestres:'85000'},tarifas).gastosTerrestres,0)
})

test('terrestre fuerza carro HANNA y duplica kilómetros, pero cobra el total manual de peajes una sola vez', () => {
  for(const carroHanna of ['', 'si', 'no']) {
    const r=calcularTransportePersonalizado({...viajeCompleto,viaje:'terrestre',carroHanna,gastosTerrestres:'85000'},tarifas)
    assert.equal(r.listo,true)
    assert.equal(r.factorRecorrido,2)
    assert.equal(r.km,140)
    assert.equal(r.devaluacion,66220)
    assert.equal(r.gasolina,63600)
    assert.equal(r.peajes,20000)
    assert.equal(r.tiquetes,0)
    assert.equal(r.gastosTerrestres,0)
    assert.equal(r.total,149820)
  }
})
test('cambiar de terrestre a aéreo mantiene los costos de destino sin duplicarlos', () => {
  const r=calcularTransportePersonalizado(viajeCompleto,tarifas)
  assert.equal(r.factorRecorrido,1)
  assert.equal(r.km,70)
  assert.equal(r.peajes,20000)
  assert.equal(r.total,634910)
})

test('peajes manuales se cobran una vez tanto en aéreo como en terrestre', () => {
  for (const viaje of ['aereo','terrestre']) {
    const r=calcularTransportePersonalizado({...viajeCompleto,viaje,peajes:'35700'},tarifas)
    assert.equal(r.peajes,35700)
    assert.equal(r.total,r.tiquetes+r.devaluacion+r.gasolina+35700)
    assert.equal(r.km,viaje==='terrestre'?140:70)
  }
})

test('otros cobra horas hombre fijas de 300000 por día, una sola vez por servicio', () => {
  assert.equal(calcularOtrosPersonalizado('5'),1500000)
  assert.equal(calcularOtrosPersonalizado('1'),300000)
  assert.equal(calcularOtrosPersonalizado('2'),600000)
  const base=resumirPersonalizado([{precio:'550000',cantidad:'2'}]).total
  assert.equal(base+calcularOtrosPersonalizado('5'),2600000)
})
test('horas hombre no presenta un importe válido para días incompletos o fraccionados', () => {
  for(const dias of ['', '0', '-1', '1.5', 'Infinity', 'abc']) assert.equal(calcularOtrosPersonalizado(dias),null)
})

test('margen de error fijo del 5 % se aplica al subtotal completo', () => {
  assert.deepEqual(calcularMargenPersonalizado(3480000),{subtotal:3480000,margen:174000,total:3654000})
  assert.deepEqual(calcularMargenPersonalizado(101),{subtotal:101,margen:5,total:106})
  for(const valor of [null,0,-1,Infinity,NaN])assert.equal(calcularMargenPersonalizado(valor).total,null)
})
