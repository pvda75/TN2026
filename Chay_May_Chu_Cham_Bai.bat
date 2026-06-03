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
:: Check dist folder
if exist dist goto StartServer
echo [+] Dang khoi tao ban du lieu build toi uu...
call npm run build
if errorlevel 1 goto BuildError

:StartServer
echo.
echo =====================================================================
echo [+] Dang kiem tra va giai phong cong 3000 (neu bi chiem dung)...
echo =====================================================================
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do (
    echo [-] Phat hien cong 3000 cua may chu cu dang chay (PID: %%a).
    echo [+] Dang tu dong giai phong cong 3000 de lam moi...
    taskkill /f /pid %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)
echo [+] Cong 3000 da san sang de khoi dong ung dung.
echo.

echo =====================================================================
echo  [*] MAY CHU DANG HOAT DONG!
echo  [*] Dia chi de ban truy cap tren may nay: http://localhost:3000
echo  [*] Dia chi backup IP cuc bo:          http://127.0.0.1:3000
echo =====================================================================
echo.

:: Auto open main page in Google Chrome or Microsoft Edge (Fallback to default if not found)
timeout /t 1 /nobreak >nul
echo [+] Dang kiem tra va khoi chay tren trinh duyet phu hop (Google Chrome / Microsoft Edge)...
set "BROWSER_PATH="
set "BROWSER_NAME="

:: Kiem tra Google Chrome truoc
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
) else if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
) else if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_PATH=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
)

:: Neu khong tim thay Chrome, kiem tra Microsoft Edge
if not defined BROWSER_PATH (
    if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
        set "BROWSER_PATH=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
        set "BROWSER_NAME=Microsoft Edge"
    ) else if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
        set "BROWSER_PATH=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
        set "BROWSER_NAME=Microsoft Edge"
    ) else if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" (
        set "BROWSER_PATH=%LocalAppData%\Microsoft\Edge\Application\msedge.exe"
        set "BROWSER_NAME=Microsoft Edge"
    )
)

if defined BROWSER_PATH (
    echo [+] Da phat hien %BROWSER_NAME% tai: %BROWSER_PATH%
    echo [+] Dang tu dong mo ung dung bang %BROWSER_NAME%...
    start "" "%BROWSER_PATH%" "http://localhost:3000"
) else (
    echo [-] Khong tim thay Google Chrome hoac Microsoft Edge tai cac thu muc mac dinh.
    echo [+] Su dung trinh duyet mac dinh cua he thong Windows de khoi chay...
    start http://localhost:3000
)

:: Execute node server
call npm run start
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
