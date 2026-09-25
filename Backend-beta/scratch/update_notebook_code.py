from pathlib import Path
import subprocess

# Delegate directly to rebuild_notebooks.py for safe generation
script_path = Path(__file__).parent / "rebuild_notebooks.py"
subprocess.run(["python", str(script_path)], check=True)
