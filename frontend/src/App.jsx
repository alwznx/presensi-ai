import { useState } from 'react';
import './App.css'; 
// Import halaman yang sudah dipisah
import AbsensiPage from './components/AbsensiPage'; 
import AdminPage from './components/AdminPage';     

function App() {
  const [view, setView] = useState("absensi"); // Default: Halaman Absen

  // Fungsi Logika Ganti Halaman
  const handleGantiHalaman = (target) => {
    if (target === "admin") {
      // KEAMANAN: Tanya Password dulu!
      const password = prompt("🔒 Masukkan Password Admin:");
      if (password === "admin123") {
        setView("admin");
      } else {
        alert("Password Salah! Anda tidak berhak masuk sini.");
      }
    } else {
      setView("absensi"); // Kalau ke halaman absen, bebas masuk
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>📸 Smart Absensi AI</h1>
        <p>Sistem Manajemen Kehadiran Sekolah</p>
      </header>
      
      {/* MENU NAVIGASI UTAMA */}
      <nav className="nav-main">
        <button 
          className={`btn-nav ${view === "absensi" ? "active" : ""}`}
          onClick={() => handleGantiHalaman("absensi")}
        >
          📝 Mode Absensi (Murid)
        </button>

        <button 
          className={`btn-nav ${view === "admin" ? "active" : ""}`}
          onClick={() => handleGantiHalaman("admin")}
        >
          ⚙️ Admin Panel (Guru)
        </button>
      </nav>

      {/* RENDER HALAMAN SESUAI PILIHAN */}
      <div className="content-area">
        {view === "absensi" ? <AbsensiPage /> : <AdminPage />}
      </div>

    </div>
  );
}

export default App;