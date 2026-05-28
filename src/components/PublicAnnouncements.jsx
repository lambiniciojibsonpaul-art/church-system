import { useEffect, useState } from "react";
import { restSelect } from "../supabaseRest"; // ✨ FIX: Changed from "../../" to "../"

const CATEGORY_STYLES = {
  General:  { pill: "bg-blue-50 text-blue-700 border-blue-100",   dot: "bg-blue-400" },
  Urgent:   { pill: "bg-red-50 text-red-700 border-red-100",      dot: "bg-red-500" },
  Event:    { pill: "bg-green-50 text-green-700 border-green-100",dot: "bg-green-500" },
  Reminder: { pill: "bg-amber-50 text-amber-700 border-amber-100",dot: "bg-amber-400" },
  Holiday:  { pill: "bg-pink-50 text-pink-700 border-pink-100",   dot: "bg-pink-400" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function PublicAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await restSelect("announcements", {
          select: "id, title, body, category, is_pinned, created_at, target_roles",
          rawFilter: { status: "eq.Published" },
          order: "is_pinned.desc,created_at.desc",
          limit: 5 // Only show the 5 most recent on the home page
        });

        if (!error && data && !cancelled) {
          // Filter to only show announcements meant for parishioners (or all)
          const publicAnnouncements = data.filter((ann) => {
            if (!ann.target_roles || ann.target_roles.length === 0) return true;
            const roles = ann.target_roles.map(r => String(r).toLowerCase());
            return roles.includes("parishioner");
          });
          setAnnouncements(publicAnnouncements);
        }
      } catch (e) {
        console.warn("Error fetching public announcements:", e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return null; // Or return a skeleton loader if you prefer
  if (announcements.length === 0) return null; // Don't show the section if there's no news!

  return (
    <div className="bg-[#F6F5ED] py-16 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 border-b border-[#B59E74]/20 pb-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-serif text-[#B59E74] uppercase tracking-wide">
              Parish Announcements
            </h2>
            <p className="text-gray-500 font-serif italic mt-1">
              Latest news and notices from San Pedro Bautista Church.
            </p>
          </div>
        </div>

        {/* Announcement Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {announcements.map((ann) => {
            const cs = CATEGORY_STYLES[ann.category] || CATEGORY_STYLES.General;
            return (
              <div 
                key={ann.id} 
                className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all hover:shadow-md hover:-translate-y-1 ${
                  ann.is_pinned ? "border-[#B59E74] ring-2 ring-[#B59E74]/10" : "border-gray-100"
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    {ann.is_pinned && (
                      <span className="text-[10px] font-bold uppercase tracking-widest bg-[#B59E74]/10 text-[#B59E74] px-2 py-0.5 rounded-full border border-[#B59E74]/20">
                        📌 Pinned
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cs.pill}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${cs.dot}`}></span>
                      {ann.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">
                    {timeAgo(ann.created_at)}
                  </span>
                </div>

                <h3 className="text-lg font-serif font-semibold text-gray-900 leading-snug mb-3">
                  {ann.title}
                </h3>
                
                <p className="text-sm text-gray-600 font-serif leading-relaxed line-clamp-4">
                  {ann.body}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}