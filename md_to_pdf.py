import sys
try:
    from fpdf import FPDF
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf"])
    from fpdf import FPDF

def clean_text(text):
    text = text.replace('—', '-').replace('–', '-').replace('↓', '->').replace('•', '*').replace('’', "'").replace('‘', "'")
    return text.encode('latin-1', 'replace').decode('latin-1')

class MarkdownPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_page()
        self.set_auto_page_break(auto=True, margin=15)
        self.set_left_margin(15)
        self.set_right_margin(15)

    def chapter_title(self, title, level=1):
        title = clean_text(title.strip('# \n'))
        if level == 1:
            self.set_font('Arial', 'B', 16)
            self.cell(0, 10, title, 0, 1, 'L')
            self.ln(2)
        elif level == 2:
            self.set_font('Arial', 'B', 14)
            self.cell(0, 8, title, 0, 1, 'L')
            self.ln(2)
        elif level == 3:
            self.set_font('Arial', 'B', 12)
            self.cell(0, 7, title, 0, 1, 'L')
            self.ln(1)
            
    def chapter_body(self, text):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 6, clean_text(text))
        self.ln(3)

    def code_block(self, text):
        self.set_font('Courier', '', 10)
        self.set_fill_color(240, 240, 240)
        self.multi_cell(0, 6, clean_text(text), fill=True)
        self.ln(3)
        
    def separator(self):
        self.ln(5)
        self.set_line_width(0.5)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(5)

def parse_and_generate(md_file_path, output_pdf_path):
    pdf = MarkdownPDF()
    
    with open(md_file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_code_block = False
    code_content = []
    normal_text = []

    def flush_text():
        if normal_text:
            text = "".join(normal_text)
            pdf.chapter_body(text.strip())
            normal_text.clear()

    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                in_code_block = False
                pdf.code_block("".join(code_content).strip())
                code_content = []
            else:
                flush_text()
                in_code_block = True
            continue
            
        if in_code_block:
            code_content.append(line)
            continue
            
        if line.strip() == '---':
            flush_text()
            pdf.separator()
            continue
            
        if line.startswith('#'):
            flush_text()
            level = len(line.split(' ')[0])
            pdf.chapter_title(line, level)
            continue
            
        if line.startswith('>'):
            normal_text.append(line.replace('>', '').strip() + "\n")
            continue
            
        if line.strip():
            normal_text.append(line)
        else:
            flush_text()
            
    flush_text()
    
    pdf.output(output_pdf_path, 'F')

if __name__ == '__main__':
    parse_and_generate('study_guide.md', 'finpilot_study_guide.pdf')
