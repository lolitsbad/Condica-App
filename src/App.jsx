import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Login from './pages/Login';
import BookingPage from './pages/BookingPage';
import CabinetLayout from './pages/cabinet/CabinetLayout';
import Dashboard from './pages/cabinet/Dashboard';
import Appointments from './pages/cabinet/Appointments';
import Patients from './pages/cabinet/Patients';
import Billing from './pages/cabinet/Billing';
import Schedule from './pages/cabinet/Schedule';
import Assistant from './pages/cabinet/Assistant';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/programare/:slug" element={<BookingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cabinet" element={<CabinetLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="programari" element={<Appointments />} />
            <Route path="pacienti" element={<Patients />} />
            <Route path="facturare" element={<Billing />} />
            <Route path="program" element={<Schedule />} />
            <Route path="asistent" element={<Assistant />} />
          </Route>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
