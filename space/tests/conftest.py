import sys
from pathlib import Path

# Let tests import app.py and scoring.py from the Space folder.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
