import { Facebook, Twitter, Instagram } from "lucide-react";
import { useState, useEffect } from "react";
import type { TeamMember } from "@db/schema";
import { SectionSeparator } from "@/components/ui/section-separator";

interface SocialLink {
  platform: string;
  url: string;
}

import { ErrorBoundary } from '../ErrorBoundary';
import { useOnline } from '@/hooks/use-online';

export function Team() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<Record<number, boolean>>({});
  const [retryCount, setRetryCount] = useState(0);
  const isOnline = useOnline();

  const fetchTeamMembers = async () => {
    if (!isOnline) {
      setError("Non sei connesso a Internet");
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch("/api/team", {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch team members");
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from server");
      }

      setTeamMembers(data);
      setError(null);
      setRetryCount(0);
    } catch (err) {
      console.error("Team fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch team members");
      
      // Implement exponential backoff for retries
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchTeamMembers();
        }, delay);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [retryCount, isOnline]);

  const getSocialLink = (member: TeamMember, platform: string): string => {
    try {
      if (!member.socialLinks) return '#';
      
      const links = Array.isArray(member.socialLinks) 
        ? member.socialLinks
        : typeof member.socialLinks === 'string'
          ? JSON.parse(member.socialLinks)
          : [];

      if (!Array.isArray(links)) return '#';
      
      const link = links.find(link => 
        typeof link === 'object' && 
        link !== null && 
        'platform' in link && 
        'url' in link &&
        link.platform.toLowerCase() === platform.toLowerCase()
      );
      
      // Validate URL before returning
      if (link?.url) {
        try {
          new URL(link.url);
          return link.url;
        } catch {
          console.error('Invalid URL in social links:', link.url);
          return '#';
        }
      }
      return '#';
    } catch (error) {
      console.error('Error processing social links:', error);
      return '#';
    }
  };

  return (
    <section className="section-padding bg-gray-50">
      <div className="container section-spacing">
        <SectionSeparator className="mb-12" />
        <div className="text-center heading-spacing">
          <h2 className="text-3xl font-bold mb-4">Il Nostro Team</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Professionisti qualificati con anni di esperienza nel settore delle costruzioni e del restauro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {isLoading ? (
            <div className="col-span-3 text-center py-8">Caricamento...</div>
          ) : error ? (
            <div className="col-span-3 text-center py-8 text-red-500">Errore: {error}</div>
          ) : teamMembers.map((member) => (
            <div key={member.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
              <div className="relative w-full h-64">
                {imageLoading[member.id] && (
                  <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <img
                  src={member.image || '/images/fallback/profile-fallback.jpg'}
                  alt={member.name}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${
                    imageLoading[member.id] ? 'opacity-0' : 'opacity-100'
                  }`}
                  onLoad={() => setImageLoading(prev => ({ ...prev, [member.id]: false }))}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = '/images/fallback/profile-fallback.jpg';
                    setImageLoading(prev => ({ ...prev, [member.id]: false }));
                  }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600 mb-4">{member.role}</p>
                <p className="text-gray-500 mb-4 text-sm">{member.bio}</p>
                <div className="flex justify-center gap-4">
                  <a 
                    href={getSocialLink(member, 'facebook')} 
                    className="text-gray-400 hover:text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook size={20} />
                  </a>
                  <a 
                    href={getSocialLink(member, 'twitter')} 
                    className="text-gray-400 hover:text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter size={20} />
                  </a>
                  <a 
                    href={getSocialLink(member, 'instagram')} 
                    className="text-gray-400 hover:text-primary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram size={20} />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
