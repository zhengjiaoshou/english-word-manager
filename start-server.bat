@echo off
chcp 65001 >nul
title 英语单词管家 - 本地服务器

echo.
echo   📖 英语单词管家
echo   ================
echo.
echo   正在启动本地服务器...
echo.

cd /d "%~dp0"

REM 尝试 Python
where python >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   浏览器即将打开 http://127.0.0.1:8888
    echo   关闭此窗口可停止服务器
    echo.
    timeout /t 2 /nobreak >nul
    start "" http://127.0.0.1:8888
    python -m http.server 8888 --bind 127.0.0.1
    goto :end
)

REM 尝试 Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo   浏览器即将打开 http://127.0.0.1:8888
    echo   关闭此窗口可停止服务器
    echo.
    timeout /t 2 /nobreak >nul
    start "" http://127.0.0.1:8888
    node -e "const http=require('http'),fs=require('fs'),path=require('path');const M={'.html':'text/html;charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg','.md':'text/markdown'};http.createServer((q,r)=>{let f='.'+(q.url==='/'?'/index.html':q.url);fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end('404')}else{r.writeHead(200,{'Content-Type':M[path.extname(f)]||'text/plain','Access-Control-Allow-Origin':'*'});r.end(d)}})}).listen(8888,'127.0.0.1',()=>console.log('Server: http://127.0.0.1:8888'))"
    goto :end
)

echo   ❌ 未找到 Python 或 Node.js
echo   请安装 Python 3 后重试
echo.
pause

:end
