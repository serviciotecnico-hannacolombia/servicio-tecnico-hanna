import { toast } from 'sonner';

export async function copyToClipboard(text: string, label = 'Contenido') {
  if (!text) { toast.error('Nada que copiar'); return; }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado al portapapeles`);
  } catch {
    toast.error('No se pudo copiar al portapapeles');
  }
}
