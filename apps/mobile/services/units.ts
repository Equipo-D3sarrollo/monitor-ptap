/**
 * Unidades tal como se LEEN en pantalla.
 *
 * La unidad llega del mapping (`opc_mapping.json`) a través del API, escrita como «l/s». Con Poppins
 * la ele minúscula se confunde con una i mayúscula («I/s»), así que al PINTARLA se usa la L
 * mayúscula del SI. El dato no se toca: el editor del mapping y el reporte técnico siguen mostrando
 * el valor original.
 */
export function formatUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  // Solo la ele de «litro» al inicio de una unidad compuesta: l/s → L/s, l/min → L/min.
  // «ml/…», «m³/h» o «lux» no cambian.
  return unit.trim().replace(/^l(?=\/)/, 'L');
}

/** Caudal en litros por segundo con un decimal, para los textos de autonomía. */
export function formatLps(lps: number): string {
  return `${lps.toFixed(1)} ${formatUnit('l/s')}`;
}
