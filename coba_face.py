import face_recognition
import cv2
import numpy as np
from PIL import Image 

def deteksi_wajah_lokal():
    print("1. Sedang membaca gambar dengan PIL...")
    
    try:
        pil_image = Image.open("test.jpg")
        
        pil_image.thumbnail((800, 800)) 
        
        gambar_rgb = np.array(pil_image, dtype=np.uint8)
        
        print(f"   -> Info Gambar: {gambar_rgb.shape}, Tipe: {gambar_rgb.dtype}")

        if len(gambar_rgb.shape) == 3 and gambar_rgb.shape[2] == 4:
            print("   -> Terdeteksi 4 channel (RGBA), membuang channel transparan...")
            gambar_rgb = gambar_rgb[:, :, :3]

    except Exception as e:
        print(f"ERROR saat buka file: {e}")
        return

    print("2. Mendeteksi wajah (AI bekerja)...")
    try:
        lokasi_wajah = face_recognition.face_locations(gambar_rgb)
    except Exception as e:
        print(f"ERROR KERAS saat deteksi: {e}")
        print("Kemungkinan versi dlib tidak kompatibel dengan struktur array Windows.")
        return

    jumlah_wajah = len(lokasi_wajah)
    print("------------------------------------------------")
    print(f"HASIL: Ditemukan {jumlah_wajah} wajah.")

    if jumlah_wajah > 0:
        gambar_bgr = cv2.cvtColor(gambar_rgb, cv2.COLOR_RGB2BGR)

        for (top, right, bottom, left) in lokasi_wajah:
            cv2.rectangle(gambar_bgr, (left, top), (right, bottom), (0, 255, 0), 2)
            print(f" - Lokasi: {top}, {right}, {bottom}, {left}")

        cv2.imshow("Hasil Deteksi", gambar_bgr)
        print("Tekan sembarang tombol di keyboard untuk menutup jendela foto...")
        cv2.waitKey(0)
        cv2.destroyAllWindows()
    else:
        print("Wajah tidak terdeteksi.")

if __name__ == "__main__":
    deteksi_wajah_lokal()