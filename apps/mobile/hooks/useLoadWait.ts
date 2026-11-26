import { useEffect, useState } from 'react';
import { ESPERA_MAXIMA_MS, type EstadoEspera } from '../services/load-wait';

/**
 * Mientras `esperando` es true, dice si todavía se está consultando o si ya pasó el límite sin
 * respuesta. Un solo temporizador por espera (no un tick por segundo): no re-renderiza nada hasta
 * que cambia el estado. Al dejar de esperar, o al cambiar `clave` (reintento, otra planta), la
 * cuenta vuelve a empezar.
 */
export function useLoadWait(esperando: boolean, clave = '', limiteMs = ESPERA_MAXIMA_MS): EstadoEspera {
  const [estado, setEstado] = useState<EstadoEspera>('consultando');

  useEffect(() => {
    setEstado('consultando');
    if (!esperando) return;
    // Que el temporizador salte ya es la prueba de que pasó el límite: volver a comparar con
    // Date.now() fallaba si saltaba 1 ms antes, y el aviso no llegaba nunca.
    const id = setTimeout(() => setEstado('sin_respuesta'), limiteMs);
    return () => clearTimeout(id);
  }, [esperando, clave, limiteMs]);

  return esperando ? estado : 'consultando';
}
