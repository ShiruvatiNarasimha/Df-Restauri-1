import { Facebook, Linkedin, Instagram } from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/constants";
import { SectionSeparator } from "@/components/ui/section-separator";

export function Team() {
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
          {TEAM_MEMBERS.map((member) => (
            <div key={member.name} className="bg-white rounded-lg overflow-hidden shadow-lg">
              <div className="relative w-full h-64">
                <div 
                  className="absolute inset-0 bg-gray-100 animate-pulse" 
                  style={{ display: 'none' }}
                  id={`loading-${member.name.toLowerCase().replace(/\s+/g, '-')}`}
                />
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-64 object-cover"
                  loading="lazy"
                  onLoad={(e) => {
                    const target = e.target as HTMLImageElement;
                    const loadingEl = document.getElementById(`loading-${member.name.toLowerCase().replace(/\s+/g, '-')}`);
                    if (loadingEl) loadingEl.style.display = 'none';
                    target.style.opacity = '1';
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    target.src = '/images/fallback/team-member-fallback.jpg';
                    console.error('Image failed to load:', member.avatar);
                  }}
                  style={{ opacity: 0, transition: 'opacity 0.3s ease-in-out' }}
                />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600 mb-4">{member.role}</p>
                <div className="flex justify-center gap-4">
                  {member.social.facebook && (
                    <a href={member.social.facebook} className="text-gray-400 hover:text-primary">
                      <Facebook size={20} />
                    </a>
                  )}
                  {member.social.linkedin && (
                    <a href={member.social.linkedin} className="text-gray-400 hover:text-primary">
                      <Linkedin size={20} />
                    </a>
                  )}
                  {member.social.instagram && (
                    <a href={member.social.instagram} className="text-gray-400 hover:text-primary">
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
