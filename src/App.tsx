import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { Home } from './components/Home';
import { AdminDashboard } from './components/AdminDashboard';
import { MyTitles } from './components/MyTitles';
import { PublicVerification } from './components/PublicVerification';

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 relative">
          <Navigation />
          
          {/* Bolt.new logo positioned to move with page content */}
          <a
            href="https://bolt.new/"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-20 right-4 z-50"
            style={{ lineHeight: 0 }}
          >
            <img
              src="/black_circle_360x360.png"
              alt="Powered by Bolt.new"
              className="w-16 h-16 rounded-full shadow-lg hover:scale-105 transition-transform duration-200"
            />
          </a>
          
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/my-titles" element={<MyTitles />} />
            <Route path="/verify" element={<PublicVerification />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;