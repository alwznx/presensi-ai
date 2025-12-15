import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';

const dataURLtoFile = (dataurl, filename) => {
  let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
      bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  while(n--){ u8arr[n] = bstr.charCodeAt(n); }
  return new File([u8arr], filename, {type:mime});
}

function AbsensiPage() {
  const [mode, setMode] = useState("upload");
  const [file, setFile] = useState(null);
  const [hasil, setHasil] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
    } catch (err) { alert("Gagal akses kamera."); }
  };

  const stopCamera = () => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  };

  useEffect(() => {
    if (mode === "kamera") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [mode]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const fileBaru = dataURLtoFile(canvas.toDataURL('image/jpeg'), "foto_webcam.jpg");
      setFile(fileBaru);
      setMode("upload"); setHasil(null);
    }
  }, [videoRef, canvasRef]);

  const handleUpload = async () => {
    if (!file) { alert("Pilih foto dulu!"); return; }
    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);
    try {
      const res = await axios.post("http://127.0.0.1:8000/deteksi-wajah/", formData);
      setHasil(res.data);
    } catch (err) { alert("Gagal koneksi Backend."); } 
    finally { setLoading(false); }
  };

  return (
    <div className="main-card">
      <h2 style={{color:'#64748b', marginBottom:'20px'}}>Silakan Absen</h2>
      
      <div className="tabs">
        <button onClick={() => setMode("upload")} className={`btn-tab ${mode==="upload"?"active":""}`}>📂 Upload Foto</button>
        <button onClick={() => setMode("kamera")} className={`btn-tab ${mode==="kamera"?"active":""}`}>📷 Buka Kamera</button>
      </div>

      {mode === "upload" ? (
        <div className="upload-section">
          {!file ? (
            <label className="upload-area">
              <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*" hidden />
              <span style={{fontSize: "3rem"}}>☁️</span>
              <p>Klik untuk ambil foto</p>
            </label>
          ) : (
            <div>
              <img src={URL.createObjectURL(file)} alt="Preview" className="preview-img" style={{maxHeight:"300px"}} />
              <div style={{marginTop:"20px"}}>
                <button onClick={handleUpload} className="btn-primary" disabled={loading}>
                  {loading ? "⏳ Memindai..." : "🚀 CEK KEHADIRAN"}
                </button>
                <br/>
                <button onClick={() => setFile(null)} className="btn-text">Ganti Foto</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="camera-section">
          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline className="video-feed" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
          </div>
          <button onClick={capture} className="btn-primary" style={{backgroundColor:"#f59e0b", color:"black"}}>📸 JEPRET</button>
        </div>
      )}

      {hasil && (
        <div className="result-section">
          <h2>✅ {hasil.jumlah_wajah} Wajah Terdeteksi</h2>
          {hasil.image_base64 && (
            <div className="result-image-container">
              <img src={`data:image/jpeg;base64,${hasil.image_base64}`} className="preview-img" style={{border:"3px solid #10b981"}} />
            </div>
          )}
          <div className="result-grid">
            {hasil.data_wajah.map((w, i) => (
              <div key={i} className={`face-card ${w.nama==="Unknown"?"unknown":"known"}`}>
                <h3>{w.nama}</h3>
                <div style={{fontSize:'0.9rem', color: w.nama==="Unknown" ? '#ef4444' : '#10b981', fontWeight:'bold'}}>
                  {w.nama==="Unknown"?"Tidak Dikenal":"Hadir"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AbsensiPage;