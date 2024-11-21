import { Facebook, Twitter, Instagram } from "lucide-react";
import { TEAM_MEMBERS } from "@/lib/constants";

export function Team() {
  return (
    <section className="section-padding bg-gray-50">
      <div className="container section-spacing">
        <div className="text-center heading-spacing">
          <h2 className="text-3xl font-bold mb-4">Il Nostro Team</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Professionisti qualificati con anni di esperienza nel settore delle costruzioni e del restauro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TEAM_MEMBERS.map((member) => (
            <div key={member.name} className="bg-white rounded-lg overflow-hidden shadow-lg">
              <img
                src={member.avatar}
                alt={member.name}
                className="w-full h-64 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                <p className="text-gray-600 mb-4">{member.role}</p>
                <div className="flex justify-center gap-4">
                  <a href={member.social.facebook} className="text-gray-400 hover:text-primary">
                    <Facebook size={20} />
                  </a>
                  <a href={member.social.twitter} className="text-gray-400 hover:text-primary">
                    <Twitter size={20} />
                  </a>
                  <a href={member.social.instagram} className="text-gray-400 hover:text-primary">
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
