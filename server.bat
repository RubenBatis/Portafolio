@echo off
call .\.venv\Scripts\activate
set FLASK_APP=backend.py
flask run --host=0.0.0.0 --port=12486
pause