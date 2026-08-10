import sys
try:
    from fpdf import FPDF
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf"])
    from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 15)
        self.cell(0, 10, 'FinPilot - Developer Onboarding & Learning Guide', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def create_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Intro
    pdf.set_font('Arial', '', 11)
    pdf.multi_cell(0, 6, 
        "Welcome to the FinPilot (AI Tax Assistant) project! "
        "This document will guide you step-by-step on how to learn this project, "
        "understand its architecture, and the exact order in which you should explore the files."
    )
    pdf.ln(5)
    
    # Phase 1
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Phase 1: Project Overview & Architecture', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "The project is divided into two main parts:\n"
        "1. Backend: A Python Django REST Framework application providing APIs.\n"
        "2. Frontend: A React application built with Vite and TailwindCSS.\n\n"
        "Start by looking at the root folders: 'backend/' and 'frontend/'.\n"
        "Check 'backend/requirements.txt' to see the Python dependencies, and 'frontend/package.json' for the JS dependencies."
    )
    pdf.ln(5)
    
    # Phase 2
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Phase 2: Deep Dive into the Backend (Django)', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "The backend is modularized into different 'apps'. Here is the order to explore them:\n\n"
        "1. backend/config/ (or core app):\n"
        "   - Look at 'settings.py' to understand database configurations (PostgreSQL, MongoDB) and installed apps.\n"
        "   - Look at 'urls.py' to see the main API routing.\n\n"
        
        "2. backend/apps/accounts/ & companies/:\n"
        "   - Check 'models.py' to understand how Users and Companies are structured. Everything ties back to a Company.\n\n"
        
        "3. backend/apps/transactions/ & documents/:\n"
        "   - This is where the core data is handled. Understand how income, expenses, and uploaded invoices are stored.\n\n"
        
        "4. backend/apps/tax/ (Crucial Business Logic):\n"
        "   - Start with 'rules.py', 'gst_rules.py', and 'tds_rules.py'. These contain pure python logic for tax formulas.\n"
        "   - Then look at 'services.py' to see how these formulas are applied to the database records.\n\n"
        
        "5. backend/apps/ml/ & analytics/:\n"
        "   - Explore 'services.py' here to see how AI features (like document parsing or categorizing transactions) and dashboard analytics are implemented.\n\n"
        
        "File exploration pattern for any Django app:\n"
        "-> First look at 'models.py' (Database schema)\n"
        "-> Then 'serializers.py' (Data formatting)\n"
        "-> Then 'views.py' & 'urls.py' (API Endpoints)\n"
        "-> Finally 'services.py' or 'utils.py' (Business Logic)"
    )
    pdf.ln(5)
    
    # Phase 3
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Phase 3: Deep Dive into the Frontend (React)', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "The frontend consumes the APIs you just explored. Here is how to navigate it:\n\n"
        "1. Configuration:\n"
        "   - Check 'vite.config.js' and 'tailwind.config.js' for build and styling setups.\n\n"
        
        "2. Entry Points:\n"
        "   - Look at 'src/main.jsx' and 'src/App.jsx'. See how the app is wrapped in providers (Auth, Theme) and how the Router is set up.\n\n"
        
        "3. src/api/ or src/services/:\n"
        "   - Check how API calls are made (usually via Axios or Fetch). See how it connects to the Django backend URLs.\n\n"
        
        "4. src/pages/ or src/views/:\n"
        "   - Explore the main screens (e.g., Dashboard, TaxEstimator, Transactions list).\n"
        "   - See how they fetch data from the API and pass it down.\n\n"
        
        "5. src/components/:\n"
        "   - Explore reusable UI components (Buttons, Tables, Modals, Charts). These are mostly styled using TailwindCSS.\n\n"
        
        "6. src/context/ or src/store/:\n"
        "   - Understand how global state like User Authentication or current selected Company is managed across the app."
    )
    
    pdf.ln(5)
    
    # Final tips
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, 'Summary: How to trace a feature', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "To truly understand the flow, try tracing a single feature (e.g., 'Estimating Tax'):\n"
        "1. Find the React component in 'frontend/src/pages' where the user clicks 'Estimate'.\n"
        "2. Trace the API call in 'frontend/src/api' to see what URL is hit.\n"
        "3. Find that URL in 'backend/apps/tax/urls.py'.\n"
        "4. Look at the mapped function in 'backend/apps/tax/views.py'.\n"
        "5. Follow the logic down to 'services.py' and 'rules.py' to see the exact math.\n"
        "6. Follow the response back up to the frontend UI."
    )
    
    pdf.output('finpilot_learning_guide.pdf', 'F')

if __name__ == '__main__':
    create_pdf()
