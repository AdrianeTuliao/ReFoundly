import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

ENCRYPTED_PATH = "refoundly_backup.sql.enc"
DECRYPTED_PATH = "restored_database.sql"
KEY = b'sixteen_byte_key' 

def decrypt_protected_backup():
    if not os.path.exists(ENCRYPTED_PATH):
        print("Error: Encrypted backup file not found!")
        return

    print("Starting decryption...")
    with open(ENCRYPTED_PATH, 'rb') as f:
        iv = f.read(16)
        encrypted_data = f.read()

    cipher = Cipher(algorithms.AES(KEY), modes.CFB(iv), backend=default_backend())
    decryptor = cipher.decryptor()
    decrypted_data = decryptor.update(encrypted_data) + decryptor.finalize()

    with open(DECRYPTED_PATH, 'wb') as f:
        f.write(decrypted_data)
    
    print(f"Decryption successful! File saved as: {DECRYPTED_PATH}")

decrypt_protected_backup()