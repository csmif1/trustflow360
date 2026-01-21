import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AttorneyDashboard from './pages/attorney/Dashboard';
import TrustDashboard from './pages/attorney/TrustDashboard';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AttorneyDashboard />} />
        <Route path="/trust/:trustId" element={<TrustDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;// Trigger rebuild
