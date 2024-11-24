import { Facebook, Twitter, Instagram } from "lucide-react";
import { SectionSeparator } from "@/components/ui/section-separator";
import { useQuery } from "@tanstack/react-query";
import type { TeamMember } from "@/types/team";
import { useToast } from "@/hooks/use-toast";

export function Team() {
  const { data: members, isLoading, error } = useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const response = await fetch("/api/team-members");
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <section className="section-padding bg-gray-50">
        <div className="container section-spacing text-center">
          <p>Caricamento...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section-padding bg-gray-50">
        <div className="container section-spacing text-center">
          <p className="text-red-500">Errore nel caricamento dei membri del team</p>
        </div>
      </section>
    );
  }

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
          {members?.map((member) => (
            <div key={member.id} className="bg-white rounded-lg overflow-hidden shadow-lg">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600 mb-4">{member.role}</p>
                <div className="flex justify-center gap-4">
                  {member.facebookUrl && (
                    <a href={member.facebookUrl} className="text-gray-400 hover:text-primary">
                      <Facebook size={20} />
                    </a>
                  )}
                  {member.twitterUrl && (
                    <a href={member.twitterUrl} className="text-gray-400 hover:text-primary">
                      <Twitter size={20} />
                    </a>
                  )}
                  {member.instagramUrl && (
                    <a href={member.instagramUrl} className="text-gray-400 hover:text-primary">
                      <Instagram size={20} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
