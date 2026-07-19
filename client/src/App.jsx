import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Display from './pages/Display.jsx';
import Admin from './pages/Admin.jsx';
import AdminLayout from './pages/AdminLayout.jsx';
import AuthGate from './components/AuthGate.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Display />} />
        <Route path="/admin" element={<AuthGate><Admin /></AuthGate>} />
        <Route path="/admin/layout" element={<AuthGate><AdminLayout /></AuthGate>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
