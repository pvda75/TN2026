@echo off
:: Thiet lap bang ma UTF-8 de hien thi tieng Viet khong dung va dam bao ma bat khong bi loi paring
chcp 65001 >nul
:: Di chuyen den thu muc chua file bat de chay dung cac tap tin can thiet
cd /d "%~dp0"

title KIEM TRA HE THONG - MAY CHU CHAM THI TRAC NGHIEM
color 0E
cls

echo =====================================================================
echo    MAY CHU TRAC NGHIEM - HE THONG CHUAN HOA & LUU TRU ANH CUC BO
echo =====================================================================
echo.
echo [+] Dang kiem tra moi truong may tinh cua ban...
echo.

:: Checking node.js in path via node -v
node -v >nul 2>&1
if errorlevel 1 goto NoNode

:: Node.js found! Change color to green and start the application setup
color 0A
cls
echo =====================================================================
echo    MAY CHU TRAC NGHIEM - HE THONG CHUAN HOA & LUU TRU ANH CUC BO
echo =====================================================================
echo.
echo [+] Da xac nhan Node.js co san tren may tinh.
echo [+] Dang chuan bi khoi dong he thong, vui long cho...
echo.

:: Check node_modules folder
if exist node_modules goto CheckDist
echo [+] Dang tai va cai dat cac thu vien bo tro [Chi can chay lan dau]...
echo [*] Luu y: Vui long giu ket noi Internet on dinh trong giay lat.
call npm install
if errorlevel 1 goto InstallError

:CheckDist
:: Check dist/server.cjs specifically to verify compilation exists
if exist dist\server.cjs goto UpdateServer
echo [+] Dang khoi tao ban du lieu build toi uu...
call npm run build
if errorlevel 1 goto BuildError
goto StartServer

:UpdateServer
echo [+] Dang tai lap va cap nhat cau hinh may chu...
call npm run build:server
if errorlevel 1 goto BuildError
goto StartServer

:StartServer
echo.
echo =====================================================================
echo [+] Dang kiem tra va giai phong cong 3000 (neu bi chiem dung)...
echo =====================================================================
:: Giai phong cong 3000 bang PowerShell (Giai phat hien dai, khong can phan tich ky tu de tranh loi up-pipe lam CMD dong cua)
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }" >nul 2>&1
:: Cho 2 giay de he dieu hanh hoan toan giai phong port
ping -n 3 127.0.0.1 >nul
echo [+] Cong 3000 da san sang de khoi dong ung dung.
echo.

echo =====================================================================
echo  [*] MAY CHU DANG HOAT DONG!
echo  [*] Dia chi de ban truy cap tren may nay: http://localhost:3000
echo  [*] Dia chi backup IP cuc bo:          http://127.0.0.1:3000
echo =====================================================================
echo.

:: Tu dong mo trinh duyet mac dinh cua he thong sau 3 giay khi may chu da khoi tao hoan tat
echo [+] Dang chuan bi khoi chay tu dong trinh duyet de truy cap ung dung...
start "" cmd /c "ping 127.0.0.1 -n 4 >nul & start http://localhost:3000"

:: Configure Production environment variable so the compiled production server runs flawlessly
set NODE_ENV=production

:: Chay may chu Node truc tiep (Khoi chay file da build dist\server.cjs)
echo [+] Dang tien hanh khoi chay may chu cham thi... (De dung may chu, nhap Ctrl+C tren cua so nay)
node dist\server.cjs
if errorlevel 1 goto ServerError

echo.
echo [+] May chu da dung hoat dong.
goto EndOfScript

:ServerError
echo.
echo =====================================================================
echo  [LOI] QUY TRINH KHOI CHAY MAY CHU GAP SU CO!
echo =====================================================================
echo * Vui long xac minh Node.js da duoc cai dat (Kiem tra bang cach go: node -v)
echo * Dam bao ban copy toan bo thu muc ung dung nay ra o dia Local (vi du Desktop/o C/o D) truoc khi chay.
echo * Thu xoa thu muc node_modules va chay lai file nay de no tu dong tai lai.
echo.
goto EndOfScript

:NoNode
color 0C
cls
echo =====================================================================
echo  [LOI NGHIEM TRONG] MAY TINH CUA BAN CHUA CAI DAT NODE.JS!
echo =====================================================================
echo.
echo Truoc khi su dung luu tru anh offline phia server cuc bo (Local Storage),
echo may tinh cua ban bat buoc phai co moi truong chay Node.js.
echo.
echo HUONG DAN KHAC PHUC CAN THIET (CHI CAN LAM 1 LAN DUY NHAT):
echo ---------------------------------------------------------------------
echo  Buoc 1: Mo trinh duyet va truy cap vao trang chu Node.js tai:
echo           https://nodejs.org/
echo.
echo  Buoc 2: Nhan tai ve phien ban ghi chu "LTS" (An toan va khuyen dung).
echo.
echo  Buoc 3: Mo tep tin vua tai ve (dang .msi) de cai dat tren Windows.
echo         (Bam "Next" lien tiep cho den khi thay nut "Finish").
echo.
echo  Buoc 4: Sau khi hoan tat cai dat, hay chay lai file .bat nay!
echo ---------------------------------------------------------------------
echo.
echo [*] Nhan phim bat ky de tu dong mo link tai Node.js thong qua trinh duyet...
pause
start https://nodejs.org/
goto EndOfScript

:InstallError
color 0C
echo.
echo [LOI] Qua trinh nap va cai dat thu vien gap su co (npm install gap loi).
echo Vui long kiem tra lai ket noi Internet tren may va chay lai file .bat nay.
echo.
goto EndOfScript

:BuildError
color 0C
echo.
echo [LOI] Qua trinh dong goi ung dung co loi xay ra (npm run build gap loi).
echo.
goto EndOfScript

:EndOfScript
echo.
echo =====================================================================
echo  [*] CUA SO NAY DUOC TIEP TUC GIU LAI DE BAN THEO DOI LOGS CHAY!
echo  [*] Neu muon ket thuc hoan toan hoat dong cua may chu, hay dong cua so nay.
echo =====================================================================
echo.
pause
:: Lenh duoi day se lam cho cua so CMD khong bao gio bi tu dong close, bat ke may chu xay ra loi gi!
cmd /k



