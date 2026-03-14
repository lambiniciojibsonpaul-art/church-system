import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ChurchLandingPage from './components/ChurchLandingPage';
import AboutUsPage from './components/AboutUsPage';

function App() {
  return (
    <Router>
      <div className="App text-left"> {/* Ensures default text alignment */}
        <Routes>
          {/* When the URL is '/', show the Landing Page */}
          <Route path="/" element={<ChurchLandingPage />} />
          
          {/* When the URL is '/about', show the About Us Page */}
          <Route path="/about" element={<AboutUsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;