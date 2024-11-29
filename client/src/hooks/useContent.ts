import { useQuery } from "@tanstack/react-query";

export interface BaseSection {
  title: string;
  content: string;
}

export interface Milestone {
  year: number;
  achievement: string;
}

export interface StoriaSection extends BaseSection {
  items: string[];
  milestones: Milestone[];
}

export interface ValoriSection extends BaseSection {
  items: string[];
}

export interface MissionVisionSection extends BaseSection {
  points: string[];
}

export interface AboutContent {
  storia: StoriaSection;
  valori: ValoriSection;
  mission: MissionVisionSection;
  vision: MissionVisionSection;
}

export interface AboutResponse {
  data: AboutContent;
  meta: {
    requestId: string;
    timestamp: string;
    version: string;
    cache: string;
  };
}

export function useAboutContent() {
  return useQuery<AboutResponse, Error, AboutContent>({
    queryKey: ["content", "about"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 15000),
    select: (response) => response.data,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
    queryFn: async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended to 15s timeout

      try {
        const retryFetch = async (retries = 3, delay = 1000) => {
          for (let i = 0; i < retries; i++) {
            try {
              const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              console.log(`[Content API] Attempt ${i + 1}/${retries}, RequestID: ${requestId}`);
              
              const response = await fetch('/api/content/about', {
                signal: controller.signal,
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache',
                  'X-Request-ID': requestId,
                  'X-Retry-Count': i.toString()
                }
              });

              if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.warn(`[Content API] Server responded with ${response.status}:`, errorData);
                throw new Error(errorData.message || `Server responded with status ${response.status}`);
              }

              console.log(`[Content API] Request successful, RequestID: ${requestId}`);
              return response;
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                console.error('[Content API] Request timed out');
                throw new Error('La richiesta ha impiegato troppo tempo. Riprova più tardi.');
              }

              console.warn(`[Content API] Attempt ${i + 1} failed:`, error);
              if (i === retries - 1) throw error;
              
              const nextDelay = delay * Math.pow(2, i);
              console.log(`[Content API] Retrying in ${nextDelay}ms...`);
              await new Promise(resolve => setTimeout(resolve, nextDelay));
            }
          }
          throw new Error('Maximum retries reached');
        };

        const response = await retryFetch();
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error fetching about content:', {
            timestamp: new Date().toISOString(),
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            endpoint: '/api/content/about',
            headers: Object.fromEntries(response.headers.entries())
          });

          // Specific error handling based on status code
          switch (response.status) {
            case 404:
              throw new Error('Il contenuto richiesto non è stato trovato');
            case 500:
              throw new Error('Errore interno del server. Riprova più tardi.');
            case 503:
              throw new Error('Servizio temporaneamente non disponibile');
            default:
              throw new Error(
                errorData.message || 
                `Errore del server (${response.status}): ${response.statusText}`
              );
          }
        }
        
        const responseData = await response.json() as AboutResponse;
        if (!responseData || !responseData.data || typeof responseData.data !== 'object') {
          throw new Error('Formato dati non valido');
        }

        // Type guards for section validation
        const isStoriaSection = (s: any): s is StoriaSection =>
          Array.isArray(s.items) && Array.isArray(s.milestones);
        
        const isValoriSection = (s: any): s is ValoriSection =>
          Array.isArray(s.items);
        
        const isMissionVisionSection = (s: any): s is MissionVisionSection =>
          Array.isArray(s.points);

        // Validate each section
        const validateSection = (section: keyof AboutContent, sectionData: any) => {
          if (!sectionData || 
              typeof sectionData !== 'object' ||
              typeof sectionData.title !== 'string' ||
              typeof sectionData.content !== 'string') {
            throw new Error(`Dati mancanti o non validi nella sezione ${section}`);
          }

          // Validate arrays based on section type
          if (section === 'storia' && !isStoriaSection(sectionData)) {
            throw new Error(`Array 'items' o 'milestones' mancante nella sezione storia`);
          } else if (section === 'valori' && !isValoriSection(sectionData)) {
            throw new Error(`Array 'items' mancante nella sezione ${section}`);
          } else if (['mission', 'vision'].includes(section) && !isMissionVisionSection(sectionData)) {
            throw new Error(`Array 'points' mancante nella sezione ${section}`);
          }
        };

        // Validate all sections
        (['storia', 'valori', 'mission', 'vision'] as const).forEach(section => 
          validateSection(section, responseData.data[section])
        );

        return responseData;
      } catch (error) {
        console.error('Errore durante il recupero dei contenuti:', {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? {
            message: error.message,
            name: error.name,
            stack: error.stack
          } : error
        });
        throw error instanceof Error 
          ? error 
          : new Error('Si è verificato un errore durante il caricamento dei contenuti');
      }
    }
  });
}
