import os
import sys

# Add the backend directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend'))

from app.main import app
from mangum import Mangum

handler = Mangum(app)
