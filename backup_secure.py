import os
import subprocess
import datetime
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

# --- Project Configuration ---
DB_NAME = "refoundly_db" 
MYSQL_PATH = "C:/xampp/mysql/bin/mysqldump.exe" #
KEY = b'sixteen_byte_key' 

def create_protected_backup():
    date_str = datetime.datetime.now().strftime("%Y-%m-%d_%H-%M")
    backup_path = f"backup_{date_str}.sql"
    encrypted_path = f"{backup_path}.enc"

    try:
        print(f"[{datetime.datetime.now()}] Starting backup for {DB_NAME}...")
        
        dump_cmd = f'"{MYSQL_PATH}" -u root {DB_NAME} > {backup_path}'
        result = subprocess.run(dump_cmd, shell=True)

        if result.returncode != 0:
            print("❌ Error: MySQL dump failed. Ensure XAMPP/MySQL is active.")
            return

        with open(backup_path, 'rb') as f:
            data = f.read()

        iv = os.urandom(16) 
        cipher = Cipher(algorithms.AES(KEY), modes.CFB(iv), backend=default_backend())
        encryptor = cipher.encryptor()
        encrypted_data = iv + encryptor.update(data) + encryptor.finalize()

        with open(encrypted_path, 'wb') as f:
            f.write(encrypted_data)
        
        os.remove(backup_path) 
        print(f"✅ Protected backup created: {encrypted_path}")

    except Exception as e:
        print(f"⚠️ An unexpected error occurred: {e}")

if __name__ == "__main__":
    create_protected_backup()