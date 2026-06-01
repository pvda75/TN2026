@echo off
title MAY CHU CHAM BAI TRAC NGHIEM - LOCAL STORAGE SERVER
color 0A
echo =====================================================================
echo    MAY CHU TRAC NGHIEM - HE THONG CHUAN HOA & LUU TRU ANH CUC BO
echo =====================================================================
echo.

:: Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] May tinh cua ban chua cai dat Node.js!
    echo Node.js la bat buoc de dung va lam may chu luu tru anh cuc bo tren PC.
    echo.
    echo Vui long truy cap: https://nodejs.org/
    echo Tai ban "LTS" moi nhat ve va mo cai dat bang 1 cu click.
    echo Sau khi cai dat xong, vui long mo lai file nay.
    echo.
    pause
    exit
)

echo [+] Da xac nhan Node.js co san tren may tinh.
echo [+] Dang chuan bi khoi dong he thong, vui long cho...
echo.

:: Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo [+] Dang tai cac thu vien bo tro can thiet (Chi can chay lan dau)...
    call npm install --omit=dev
    if %errorlevel% neq 0 (
        echo [LOI] Khong the tai thu vien. Vui long kiem tra ket noi Internet.
        pause
        exit
    )
)

:: Run build if dist folder doesn't exist
if not exist dist (
    echo [+] Dang build ung dung de chay offline toi uu...
    call npm run build
)

echo.
echo =====================================================================
echo  [*] MAY CHU DANG HOAT DONG!
echo  [*] Dia chi truy cap tren may nay: http://localhost:3000
echo  [*] Dia chi de ket noi cac may khac trong mang LAN:
echo      (Vui long xem IP cua may nay trong Settings mang cuc bo cua ban)
echo =====================================================================
echo.

:: Automatically open browser after 3 seconds
timeout /t 3 /nobreak >nul
start http://localhost:3000

:: Run the production server
npm run start
pause
