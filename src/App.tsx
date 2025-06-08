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
        <div className="min-h-screen bg-gray-50">
          <Navigation />
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