# Starts the API (port 8000) and the web app (port 3000) together.
# First run:  python -m venv .venv; .\.venv\Scripts\pip install -r api\requirements.txt; npm --prefix web install

$api = Start-Process -PassThru -NoNewWindow -WorkingDirectory "$PSScriptRoot\api" `
  -FilePath "$PSScriptRoot\.venv\Scripts\python.exe" -ArgumentList "main.py"
try {
  npm --prefix "$PSScriptRoot\web" run dev
} finally {
  Stop-Process -Id $api.Id -ErrorAction SilentlyContinue
}
