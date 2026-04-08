import subprocess
import sys

subprocess.run([sys.executable, 'backend/worker/scraper.py'], check=True)
subprocess.run([sys.executable, 'backend/worker/inserter.py'], check=True)
