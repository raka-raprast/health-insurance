import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Storefront from './pages/Storefront';
import './index.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-blue-600">HealthSafe</div>
          <div className="space-x-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600">Storefront</Link>
          </div>
        </nav>
        
        <main className="flex-grow p-6">
          <Routes>
            <Route path="/" element={<Storefront />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
