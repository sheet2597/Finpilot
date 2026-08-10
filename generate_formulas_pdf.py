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
        self.cell(0, 10, 'FinPilot - AI Tax Assistant: Formulas & Tax Rules', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def create_pdf():
    pdf = PDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Section 1: Income Tax Formulas
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, '1. Income Tax Formulas (FY 2025-26)', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "Taxable Income Calculation:\n"
        "  New Regime: Taxable Income = Gross Income - Standard Deduction (75,000)\n"
        "  Old Regime: Taxable Income = Gross Income - Standard Deduction (50,000) - Section Deductions (80C, 80D, 24B)\n\n"
        
        "New Regime Slabs:\n"
        "  0 - 4,00,000 : 0%\n"
        "  4,00,001 - 8,00,000 : 5%\n"
        "  8,00,001 - 12,00,000 : 10%\n"
        "  12,00,001 - 16,00,000 : 15%\n"
        "  16,00,001 - 20,00,000 : 20%\n"
        "  20,00,001 - 24,00,000 : 25%\n"
        "  Above 24,00,000 : 30%\n\n"
        
        "Old Regime Slabs:\n"
        "  0 - 2,50,000 : 0%\n"
        "  2,50,001 - 5,00,000 : 5%\n"
        "  5,00,001 - 10,00,000 : 20%\n"
        "  Above 10,00,000 : 30%\n\n"
        
        "Rebate under Section 87A:\n"
        "  New Regime: Full rebate if taxable income <= 12,00,000\n"
        "  Old Regime: Full rebate if taxable income <= 5,00,000\n\n"
        
        "Health and Education Cess:\n"
        "  Cess = 4% of (Tax After Rebate)\n"
        "  Total Tax = Tax After Rebate + Cess\n\n"
        
        "Old Regime Deduction Caps:\n"
        "  Section 80C: up to 1,50,000\n"
        "  Section 80D: up to 25,000\n"
        "  Section 24B (Home Loan Interest): up to 2,00,000\n"
    )
    
    pdf.ln(5)
    
    # Section 2: GST Formulas
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, '2. Goods and Services Tax (GST) Formulas', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "GST Rates: 0%, 5%, 12%, 18%, 28%\n\n"
        
        "Total GST Calculation:\n"
        "  Total GST = Taxable Value * Rate\n\n"
        
        "Intra-State Supply (Within State):\n"
        "  CGST (Central GST) = Total GST / 2\n"
        "  SGST (State GST) = Total GST / 2\n"
        "  IGST = 0\n\n"
        
        "Inter-State Supply (Across States):\n"
        "  IGST (Integrated GST) = Total GST\n"
        "  CGST = 0, SGST = 0\n\n"
        
        "Total Invoice Value:\n"
        "  Total Invoice Value = Taxable Value + Total GST\n"
    )
    
    pdf.ln(5)
    
    # Section 3: TDS Formulas
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 10, '3. Tax Deducted at Source (TDS) Formulas', 0, 1)
    
    pdf.set_font('Arial', '', 10)
    pdf.multi_cell(0, 6, 
        "TDS Calculation:\n"
        "  TDS Amount = Gross Payment Amount * Section Rate\n"
        "  Net Payable = Gross Payment Amount - TDS Amount\n\n"
        
        "Common TDS Sections and Rates:\n"
        "  Sec 194C (Contractors): 1% rate\n"
        "    - Single transaction threshold: 30,000\n"
        "    - Annual threshold: 1,00,000\n\n"
        
        "  Sec 194J (Professional/Technical Fees): 10% rate\n"
        "    - Annual threshold: 30,000\n\n"
        
        "  Sec 194I (Rent - Land/Building): 10% rate\n"
        "    - Annual threshold: 2,40,000\n\n"
        
        "  Sec 194I (Rent - Equipment): 2% rate\n"
        "    - Annual threshold: 2,40,000\n\n"
        
        "  Sec 194H (Commission or Brokerage): 5% rate\n"
        "    - Annual threshold: 20,000\n"
    )
    
    pdf.output('finpilot_formulas.pdf', 'F')

if __name__ == '__main__':
    create_pdf()
