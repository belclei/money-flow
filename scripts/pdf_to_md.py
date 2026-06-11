#!/usr/bin/env python3
"""
Convert a PDF file to markdown text.

Usage: pdf_to_md.py <pdf_path> [password]

Exit codes:
  0 - success, markdown on stdout
  2 - password required or incorrect password
  1 - other error
"""
import sys
import json


def convert_with_markitdown(pdf_path: str) -> str:
    from markitdown import MarkItDown
    md = MarkItDown()
    result = md.convert(pdf_path)
    return result.text_content


def convert_with_pdfplumber(pdf_path: str, password: str) -> str:
    import pdfplumber
    pages = []
    with pdfplumber.open(pdf_path, password=password) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ""
            if text.strip():
                pages.append(f"## Page {i}\n\n{text}")
    return "\n\n".join(pages)


def is_password_error(err: Exception) -> bool:
    msg = str(err).lower()
    keywords = ("password", "encrypted", "incorrect", "decrypt", "cipher")
    return any(k in msg for k in keywords)


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: pdf_to_md.py <path> [password]"}),
              file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    password = sys.argv[2] if len(sys.argv) > 2 else None

    if password:
        try:
            text = convert_with_pdfplumber(pdf_path, password)
            sys.stdout.write(text)
            sys.exit(0)
        except Exception as e:
            if is_password_error(e):
                print(json.dumps({"error": "password_required"}), file=sys.stderr)
                sys.exit(2)
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)
    else:
        try:
            text = convert_with_markitdown(pdf_path)
            sys.stdout.write(text)
            sys.exit(0)
        except Exception as e:
            if is_password_error(e):
                print(json.dumps({"error": "password_required"}), file=sys.stderr)
                sys.exit(2)
            print(json.dumps({"error": str(e)}), file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
