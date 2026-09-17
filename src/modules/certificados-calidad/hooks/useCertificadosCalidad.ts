import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAllRows } from '../../../lib/supabase';
import type { CertificadoPlantilla, SolucionPatron, ArchivoCertificado, CertificadoGenerado } from '../types';

export function usePlantillas() {
  return useQuery({
    queryKey: ['certificados_calidad_plantillas'],
    queryFn: () => fetchAllRows<CertificadoPlantilla>('certificados_calidad_plantillas', q => q.order('codigo')),
  });
}

export function useSolucionesPatron() {
  return useQuery({
    queryKey: ['certificados_calidad_soluciones_patron'],
    queryFn: () => fetchAllRows<SolucionPatron>('certificados_calidad_soluciones_patron', q => q.order('categoria')),
  });
}

export function useArchivosCertificado() {
  return useQuery({
    queryKey: ['certificados_calidad_archivos'],
    queryFn: () => fetchAllRows<ArchivoCertificado>('certificados_calidad_archivos', q => q.order('created_at', { ascending: false })),
  });
}

export function useCertificadosGenerados() {
  return useQuery({
    queryKey: ['certificados_calidad_generados'],
    queryFn: () => fetchAllRows<CertificadoGenerado>('certificados_calidad_generados', q => q.order('created_at', { ascending: false })),
  });
}

export function useInvalidateCertificadosCalidad() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['certificados_calidad_plantillas'] });
    qc.invalidateQueries({ queryKey: ['certificados_calidad_soluciones_patron'] });
    qc.invalidateQueries({ queryKey: ['certificados_calidad_archivos'] });
    qc.invalidateQueries({ queryKey: ['certificados_calidad_generados'] });
  };
}
