import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { fadeInUp, staggerChildren } from "@/lib/animations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ServiceGallery } from "@/components/gallery/ServiceGallery";
import { Loader2 } from "lucide-react";
import { CaseHistory as CaseHistoryType } from "@/types/project";

export function CaseHistory() {
  const [caseHistories, setCaseHistories] = useState<CaseHistoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCaseHistories();
  }, []);

  const fetchCaseHistories = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/projects?type=case-history');
      
      if (!response.ok) {
        throw new Error('Failed to fetch case histories');
      }

      const data = await response.json();
      setCaseHistories(data);
    } catch (error) {
      console.error('Error fetching case histories:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch case histories');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 py-8">
        {error}
      </div>
    );
  }

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={staggerChildren}
      className="space-y-12"
    >
      {caseHistories.map((caseHistory) => (
        <motion.div
          key={caseHistory.id}
          variants={fadeInUp}
          className="bg-background rounded-lg shadow-sm"
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{caseHistory.title}</CardTitle>
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>{caseHistory.location}</span>
                <span>{caseHistory.year}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">{caseHistory.description}</p>
              
              {caseHistory.challenge && (
                <div>
                  <h3 className="font-semibold mb-2">La Sfida</h3>
                  <p className="text-muted-foreground">{caseHistory.challenge}</p>
                </div>
              )}

              {caseHistory.solution && (
                <div>
                  <h3 className="font-semibold mb-2">La Soluzione</h3>
                  <p className="text-muted-foreground">{caseHistory.solution}</p>
                </div>
              )}

              {caseHistory.results && caseHistory.results.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Risultati</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {caseHistory.results.map((result, index) => (
                      <li key={index}>{result}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <h3 className="font-semibold mb-4">Galleria del Progetto</h3>
                <ServiceGallery 
                  images={caseHistory.gallery || [caseHistory.image]}
                  category={caseHistory.category}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
}
