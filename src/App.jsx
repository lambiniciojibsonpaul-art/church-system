import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChurchLandingPage from './components/ChurchLandingPage';
import AboutUsPage from './components/AboutUsPage';
import ServicesPage from './components/ServicesPage';
import EventsPage from './components/EventsPage'; // <--- 1. Import it

function App() {
  return (
    <Router>
      <div className="App text-left">
        <Routes>
          <Route path="/" element={<ChurchLandingPage />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/events" element={<EventsPage />} /> {/* <--- 2. Add route */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;