import markdown
from xhtml2pdf import pisa

def convert():
    with open('study_guide.md', 'r', encoding='utf-8') as f:
        md_text = f.read()

    # Convert markdown to HTML with tables and fenced code block support
    html = markdown.markdown(md_text, extensions=['tables', 'fenced_code'])
    
    # CSS to make it look like a standard Markdown file (GitHub style)
    html_content = f"""
    <html>
    <head>
    <style>
        @page {{
            margin: 2cm;
        }}
        body {{ 
            font-family: Helvetica, Arial, sans-serif; 
            font-size: 11pt; 
            line-height: 1.5; 
            color: #24292e; 
        }}
        h1 {{ font-size: 20pt; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }}
        h2 {{ font-size: 16pt; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }}
        h3 {{ font-size: 14pt; margin-top: 24px; margin-bottom: 16px; font-weight: bold; }}
        code {{ 
            background-color: #f6f8fa; 
            padding: 0.2em 0.4em; 
            border-radius: 3px; 
            font-family: "Courier New", Courier, monospace; 
            font-size: 85%; 
        }}
        pre {{ 
            background-color: #f6f8fa; 
            padding: 16px; 
            border-radius: 3px; 
            line-height: 1.45;
        }}
        pre code {{ 
            background-color: transparent; 
            padding: 0; 
            font-size: 100%;
        }}
        blockquote {{ 
            border-left: 0.25em solid #dfe2e5; 
            color: #6a737d; 
            padding-left: 1em; 
            margin-left: 0; 
        }}
        table {{ 
            border-collapse: collapse; 
            width: 100%; 
            margin-top: 0;
            margin-bottom: 16px;
        }}
        th, td {{ 
            border: 1px solid #dfe2e5; 
            padding: 6px 13px; 
        }}
        th {{ 
            background-color: #f6f8fa; 
            font-weight: bold;
        }}
        hr {{
            height: 0.25em;
            padding: 0;
            margin: 24px 0;
            background-color: #e1e4e8;
            border: 0;
        }}
    </style>
    </head>
    <body>
    {html}
    </body>
    </html>
    """

    # Generate PDF
    with open('finpilot_study_guide_beautiful.pdf', 'w+b') as f:
        pisa_status = pisa.CreatePDF(html_content, dest=f)
        
if __name__ == '__main__':
    convert()
