import { useState, useEffect } from 'react';
import axios from 'axios';

function AdminPage() {
  const [riwayat, setRiwayat] = useState([]);
  const [namaBaru, setNamaBaru] = useState("");
  const [fileBaru, setFileBaru] = useState(null);
  const [loadingDaftar, setLoadingDaftar] = useState(false);

  const fetchRiwayat = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:8000/riwayat/");
      setRiwayat(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchRiwayat(); }, []);

  const handleDaftarWajah = async () => {
    if (!namaBaru || !fileBaru) { alert("Isi nama dan pilih foto!"); return; }
    
    const formData = new FormData();
    formData.append("nama", namaBaru);
    formData.append("file", fileBaru);

    setLoadingDaftar(true);
    try {
      await axios.post("http://127.0.0.1:8000/tambah-wajah/", formData);
      alert(`Sukses! Wajah ${namaBaru} sudah didaftarkan.`);
      setNamaBaru(""); setFileBaru(null);
    } catch (err) { alert("Gagal mendaftar."); }
    finally { setLoadingDaftar(false); }
  };

  return (
    <div className="admin-grid">
      {/* FORM DAFTAR */}
      <div className="admin-card">
        <h3 style={{marginTop:0, borderBottom:'2px solid #eee', paddingBottom:'10px'}}>👤 Daftarkan Siswa Baru</h3>
        
        <div className="input-group">
          <label>Nama Lengkap</label>
          <input 
            type="text" 
            className="input-field" 
            placeholder="Contoh: Budi Santoso"
            value={namaBaru}
            onChange={(e) => setNamaBaru(e.target.value)}
          />
        </div>

        <div className="input-group">
          <label>Foto Wajah (1 Orang)</label>
          <input 
            type="file" 
            accept="image/*"
            className="input-field"
            onChange={(e) => setFileBaru(e.target.files[0])}
          />
        </div>

        <button onClick={handleDaftarWajah} className="btn-primary" disabled={loadingDaftar}>
          {loadingDaftar ? "⏳ Mendaftarkan..." : "💾 Simpan ke Database"}
        </button>
      </div>

      {/* TABEL RIWAYAT */}
      <div className="admin-card">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
          <h3 style={{marginTop:0}}>🕒 Log Kehadiran Realtime</h3>
          <button onClick={fetchRiwayat} style={{padding:'5px 10px', cursor:'pointer', border:'1px solid #ddd', borderRadius:'5px', background:'white'}}>🔄 Refresh</button>
        </div>
        
        <div className="table-wrapper">
          <table>
            <thead>
              <tr style={{background:'#f1f5f9'}}>
                <th>Bukti Foto</th>
                <th>Waktu</th>
                <th>Nama</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.length === 0 ? (
                <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>Belum ada data</td></tr>
              ) : (
                riwayat.map((log) => (
                  <tr key={log.id}>
                    {/* KOLOM FOTO BARU */}
                    <td>
                      {log.foto_url ? (
                        <a href={log.foto_url} target="_blank" rel="noreferrer">
                          <img 
                            src={log.foto_url} 
                            alt="Bukti" 
                            style={{width:'50px', height:'50px', objectFit:'cover', borderRadius:'8px', border:'1px solid #ddd'}}
                          />
                        </a>
                      ) : (
                        <span style={{color:'#ccc', fontSize:'0.8rem'}}>No Foto</span>
                      )}
                    </td>
                    <td>
                      {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </td>
                    <td><strong>{log.nama}</strong></td>
                    <td><span className="tag-hadir">{log.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;