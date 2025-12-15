from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import os
import shutil
from datetime import datetime
import uuid

from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

from supabase import create_client, Client

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ ERROR CRITICAL: Supabase URL/Key belum disetting!")
    supabase = None
else:
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("✅ Koneksi Supabase Berhasil (Secure Mode)!")
    except Exception as e:
        print(f"❌ Gagal koneksi Supabase: {e}")
        supabase = None

app = FastAPI(title="Sistem Absensi AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_WAJAH = {
    "encodings": [],
    "names": []
}

def muat_dataset_wajah():
    """Memuat semua foto di folder wajah_dikenal ke memori"""
    DATABASE_WAJAH["encodings"] = []
    DATABASE_WAJAH["names"] = []

    folder_path = "wajah_dikenal"
    if not os.path.exists(folder_path):
        os.makedirs(folder_path)
        print(f"INFO: Folder '{folder_path}' dibuat.")
        return

    print("--- 🔄 MEMUAT ULANG DATASET WAJAH ---")
    file_list = os.listdir(folder_path)
    
    for filename in file_list:
        if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
            nama_orang = os.path.splitext(filename)[0]
            path_gambar = os.path.join(folder_path, filename)

            try:
                img = face_recognition.load_image_file(path_gambar)
                encodings = face_recognition.face_encodings(img)
                if len(encodings) > 0:
                    DATABASE_WAJAH["encodings"].append(encodings[0])
                    DATABASE_WAJAH["names"].append(nama_orang)
                    print(f"✅ Menghafal: {nama_orang}")
                else:
                    print(f"⚠️ Wajah tidak jelas di file: {filename}")
            except Exception as e:
                print(f"❌ Error baca file {filename}: {e}")
    
    print(f"--- SELESAI: {len(DATABASE_WAJAH['names'])} wajah dihafal ---\n")

muat_dataset_wajah()

def simpan_log_ke_supabase(nama, vector_wajah, foto_url_bukti):
    if not supabase: return
    try:
        data_insert = {
            "nama": nama,
            "status": "Hadir",
            "lokasi_wajah": str(vector_wajah[:5]),
            "foto_url": foto_url_bukti
        }
        supabase.table("absensi_log").insert(data_insert).execute()
        print(f"💾 [Background] Data {nama} tersimpan ke DB.")
    except Exception as e:
        print(f"❌ [Background] Gagal simpan DB: {e}")


@app.get("/")
def read_root():
    return {"status": "Siap", "total_wajah": len(DATABASE_WAJAH["names"])}

@app.get("/riwayat/")
def get_riwayat():
    """Mengambil 20 data absensi terakhir dari Supabase"""
    if not supabase:
        return {"error": "Database tidak terkoneksi"}
    
    response = supabase.table("absensi_log").select("*").order("created_at", desc=True).limit(20).execute()
    return response.data

@app.post("/tambah-wajah/")
async def tambah_wajah_baru(nama: str = Form(...), file: UploadFile = File(...)):
    """Mendaftarkan wajah baru ke sistem"""
    try:
        file_location = f"wajah_dikenal/{nama}.jpg"
        
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
        
        muat_dataset_wajah()
        
        return {"status": "Sukses", "pesan": f"Wajah {nama} berhasil didaftarkan!"}
    
    except Exception as e:
        return {"status": "Gagal", "error": str(e)}

@app.post("/deteksi-wajah/")
async def deteksi_wajah_api(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File harus gambar")

    try:
        contents = await file.read()
        pil_image = Image.open(io.BytesIO(contents))
        pil_image.thumbnail((800, 800)) 
        
        gambar_np = np.array(pil_image, dtype=np.uint8)
        if len(gambar_np.shape) == 3 and gambar_np.shape[2] == 4:
            gambar_np = gambar_np[:, :, :3]

        foto_url_bukti = ""
        if supabase:
            try:
                filename_unik = f"{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.jpg"
                
                buf = io.BytesIO()
                pil_image.save(buf, format="JPEG")
                img_bytes = buf.getvalue()

                supabase.storage.from_("foto_absensi").upload(
                    path=filename_unik, 
                    file=img_bytes, 
                    file_options={"content-type": "image/jpeg"}
                )
                
                foto_url_bukti = supabase.storage.from_("foto_absensi").get_public_url(filename_unik)
                print(f"☁️ Foto terupload: {foto_url_bukti}")
            except Exception as e:
                print(f"⚠️ Gagal upload bukti foto: {e}")

        lokasi_wajah = face_recognition.face_locations(gambar_np, number_of_times_to_upsample=1)
        encoding_wajah_upload = face_recognition.face_encodings(gambar_np, lokasi_wajah)

        nama_terdeteksi = []

        for encoding_ku in encoding_wajah_upload:
            matches = face_recognition.compare_faces(DATABASE_WAJAH["encodings"], encoding_ku, tolerance=0.5)
            name = "Unknown"

            if True in matches:
                face_distances = face_recognition.face_distance(DATABASE_WAJAH["encodings"], encoding_ku)
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = DATABASE_WAJAH["names"][best_match_index]
            
            nama_terdeteksi.append(name)

            if name != "Unknown":
                background_tasks.add_task(simpan_log_ke_supabase, name, encoding_ku, foto_url_bukti)

        draw = ImageDraw.Draw(pil_image)
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            font = ImageFont.load_default()

        data_wajah_response = []
        for (top, right, bottom, left), nama in zip(lokasi_wajah, nama_terdeteksi):
            warna_kotak = "lime" if nama != "Unknown" else "red"
            draw.rectangle([(left, top), (right, bottom)], outline=warna_kotak, width=3)
            
            bbox = draw.textbbox((left, bottom), nama, font=font)
            w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
            draw.rectangle([(left, bottom), (left + w + 10, bottom + h + 10)], fill=warna_kotak)
            draw.text((left + 5, bottom + 5), nama, fill="black" if nama != "Unknown" else "white", font=font)

            data_wajah_response.append({
                "nama": nama,
                "lokasi": {"top": top, "right": right, "bottom": bottom, "left": left}
            })

        buffered = io.BytesIO()
        pil_image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

        return {
            "filename": file.filename,
            "jumlah_wajah": len(lokasi_wajah),
            "data_wajah": data_wajah_response,
            "image_base64": img_str
        }

    except Exception as e:
        print(f"Error: {e}")
        return {"error": str(e)}