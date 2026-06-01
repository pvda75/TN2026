#!/bin/bash
cd "$(dirname "$0")"
clear
echo "====================================================================="
echo "   MAY CHU TRAC NGHIEM - HE THONG CHUAN HOA & LUU TRU ANH CUC BO     "
echo "====================================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null
then
    echo "[LOI] May tinh cua ban chua cai dat Node.js!"
    echo "Node.js la bat buoc de dung va lam may chu luu tru anh cuc bo tren Mac."
    echo ""
    echo "Vui long truy cap: https://nodejs.org/"
    echo "Tai ban 'LTS' moi nhat ve va cai dat."
    echo "Sau khi cai dat xong, vui long mo lai file nay."
    echo ""
    exit
fi

echo "[+] Da xac nhan Node.js co san tren may tinh."
echo "[+] Dang chuan bi khoi dong he thong, vui long cho..."
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "[+] Dang tai cac thu vien bo tro can thiet (Chi can chay lan dau)..."
    npm install --omit=dev
fi

# Run build if dist folder doesn't exist
if [ ! -d "dist" ]; then
    echo "[+] Dang build ung dung de chay offline tai cho..."
    npm run build
fi

echo ""
echo "====================================================================="
echo "  [*] MAY CHU DANG HOAT DONG!"
echo "  [*] Dia chi truy cap tren may nay: http://localhost:3000"
echo "====================================================================="
echo ""

sleep 2
open "http://localhost:3000"

npm run start
