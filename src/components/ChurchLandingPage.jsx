import FloatingFeatures from "./FloatingFeatures.jsx";
import UpcomingEvents from "./UpcomingEvents.jsx";
import PublicAnnouncements from "./PublicAnnouncements.jsx"; // ✨ Import the new component!
import church1 from "../assets/Images/church1.jpg";

function ChurchLandingPage() {
  const backgroundStyle = {
    backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url('${church1}')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed", // Essential for the scrolling 'float' effect
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col font-sans">
      {/* Hero Section */}
      <main
        style={backgroundStyle}
        className="relative h-screen flex flex-col items-center justify-center text-center px-4 text-white"
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-tight max-w-4xl z-10 mt-16">
          Welcome to <br /> San Pedro Bautista Church
        </h1>
      </main>

      <FloatingFeatures />

      <UpcomingEvents />

      {/* ✨ Drop the announcements right here */}
      <PublicAnnouncements />

      {/* Floating Chat Button */}
    </div>
  );
}

export default ChurchLandingPage;