@echo off
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
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do (
    echo %%a| findstr /r "^[0-9][0-9]*$" >nul && (
        echo [-] Phat hien cong 3000 cua may chu cu dang chay (PID: %%a).
        echo [+] Dang tu dong giai phong cong 3000 de lam moi...
        taskkill /f /pid %%a >nul 2>&1
        ping -n 2 127.0.0.1 >nul
    )
)
echo [+] Cong 3000 da san sang de khoi dong ung dung.
echo.

echo =====================================================================
echo  [*] MAY CHU DANG HOAT DONG!
echo  [*] Dia chi de ban truy cap tren may nay: http://localhost:3000
echo  [*] Dia chi backup IP cuc bo:          http://127.0.0.1:3000
echo =====================================================================
echo.

:: Tu dong khoi chay trinh duyet trong cua so rieng sau khi server san sang (khoang 3-4 giay)
echo [+] Dang tu dong khoi chay trinh duyet de tai ung dung...
start "" cmd /c "ping 127.0.0.1 -n 5 >nul & (start chrome http://localhost:3000 2>nul || start msedge http://localhost:3000 2>nul || start http://localhost:3000)"

:: Configure Production environment variable so the compiled production server runs flawlessly
set NODE_ENV=production

:: Execute node server safely using call (This prevents premature CMD window closing on termination/crash)
echo [+] Dang khoi dong may chu va duy tri hoat dong...
call node dist\server.cjs
if errorlevel 1 (
    echo.
    echo [LOI CHAY MAY CHU] Quy trinh khoi chay hoac thuc hien may chu gap su co.
    echo * Vui long kiem tra xem phien ban Node.js da duoc cai dat dung cach chua.
    echo * Dam bao ban run file .bat nay tinh tu thu muc chua ung dung.
    echo.
) else (
    echo.
    echo [+] May chu da dung hoat dong.
    echo.
)
pause
exit

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
echo [*] Nhan nut BAT KY tren ban phim de tu dong mo link tai Node.js...
pause
start https://nodejs.org/
exit

:InstallError
color 0C
echo.
echo [LOI] Qua trinh nap va cai dat thu vien gap su co (npm install gap loi).
echo Vui long kiem tra lai ket noi Internet tren may va chay lai file .bat nay.
echo.
pause
exit

:BuildError
color 0C
echo.
echo [LOI] Qua trinh dong goi ung dung co loi xay ra (npm run build gap loi).
echo.
pause
exit



