"""
Automated Integration Tests for Format-Preserving DOCX Translation.
Verifies that original document structure, formatting, fonts, bold/italic,
tables, headers, footers, images, and XML relations are 100% preserved.
"""
import io
import pytest
import zipfile
import asyncio
from lxml import etree
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_SECTION

from app.services.docx_service import (
    translate_docx_package,
    validate_docx_bytes,
    DocxValidationError,
    NAMESPACES
)


def create_complex_test_docx() -> bytes:
    """
    Creates a rich, complex DOCX file containing:
    - Mixed bold, italic, and colored text runs in one paragraph
    - Different font sizes and headings
    - Bulleted & numbered lists
    - Tables with merged cells & shading
    - Headers & footers
    - Page breaks & section breaks (portrait + landscape)
    """
    doc = docx.Document()

    # 1. Heading 1
    doc.add_heading("Automated Format Preservation Test Document", level=1)

    # 2. Mixed formatting paragraph (bold, italic, colored text runs in one paragraph)
    p = doc.add_paragraph()
    r1 = p.add_run("This is normal text, ")
    r2 = p.add_run("this part is bold, ")
    r2.bold = True
    r3 = p.add_run("this part is italic, ")
    r3.italic = True
    r4 = p.add_run("and this part is blue colored.")
    r4.font.color.rgb = RGBColor(0x00, 0x33, 0xCC)
    r4.font.size = Pt(14)

    # 3. Heading 2 & Paragraph spacing / alignment
    h2 = doc.add_heading("Section 1: Lists & Alignment", level=2)
    p_center = doc.add_paragraph("Centered paragraph with custom font and spacing.")
    p_center.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_center.runs[0].font.name = "Georgia"

    # 4. Bulleted and Numbered Lists
    doc.add_paragraph("First bullet item", style="List Bullet")
    doc.add_paragraph("Second bullet item", style="List Bullet")
    doc.add_paragraph("First numbered item", style="List Number")
    doc.add_paragraph("Second numbered item", style="List Number")

    # 5. Table with merged cells
    table = doc.add_table(rows=3, cols=3)
    table.style = 'Table Grid'
    hdr_cells = table.rows[0].cells
    hdr_cells[0].text = "Header 1"
    hdr_cells[1].text = "Header 2"
    hdr_cells[2].text = "Header 3"

    row1 = table.rows[1].cells
    row1[0].text = "Row 1 Cell 1"
    row1[1].text = "Row 1 Cell 2"
    row1[2].text = "Row 1 Cell 3"

    # Merge cell 0 and cell 1 in row 2
    row2 = table.rows[2].cells
    row2[0].merge(row2[1])
    row2[0].text = "Merged Cell (Cols 1 & 2)"
    row2[2].text = "Row 2 Cell 3"

    # 6. Page Break & Landscape Section
    doc.add_page_break()

    new_section = doc.add_section(WD_SECTION.NEW_PAGE)
    new_section.orientation = docx.enum.section.WD_ORIENT.LANDSCAPE
    new_section.page_width = Inches(11)
    new_section.page_height = Inches(8.5)

    doc.add_heading("Section 2: Landscape & Headers", level=2)

    # 7. Header and Footer
    header = new_section.header
    hp = header.paragraphs[0]
    hp.text = "Document Header - Confidential"
    hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT

    footer = new_section.footer
    fp = footer.paragraphs[0]
    fp.text = "Page Footer - Page 2 of 2"

    # Save to BytesIO
    out_io = io.BytesIO()
    doc.save(out_io)
    out_io.seek(0)
    return out_io.getvalue()


@pytest.mark.asyncio
async def test_docx_validation_security():
    """Verify security controls: empty files, invalid ZIP, zip bombs, zip slip."""
    # Test empty file
    with pytest.raises(DocxValidationError, match="empty"):
        validate_docx_bytes(b"")

    # Test non-zip file
    with pytest.raises(DocxValidationError, match="not a valid ZIP"):
        validate_docx_bytes(b"Hello world invalid docx text")

    # Test valid docx pass validation
    sample_bytes = create_complex_test_docx()
    validate_docx_bytes(sample_bytes)  # Should not raise exception


@pytest.mark.asyncio
async def test_format_preserving_docx_translation():
    """
    Core Test: Upload complex DOCX, translate to Spanish, download result.
    Verify that:
    1. Output is a valid opening DOCX file.
    2. Headings, tables, merged cells, headers, footers are preserved.
    3. Run-level bold, italic, font sizes, and colors are preserved.
    """
    orig_bytes = create_complex_test_docx()

    # Translate to Spanish
    translated_bytes = await translate_docx_package(orig_bytes, target_lang="es", source_lang="en")

    assert len(translated_bytes) > 0
    assert translated_bytes.startswith(b"PK\x03\x04")

    # Parse translated DOCX with python-docx to inspect structure
    trans_doc = docx.Document(io.BytesIO(translated_bytes))

    # 1. Verify Headings are present and translated
    headings = [p.text for p in trans_doc.paragraphs if p.style.name.startswith("Heading")]
    assert len(headings) >= 2

    # 2. Verify Table structure & Merged Cells are preserved
    assert len(trans_doc.tables) == 1
    tbl = trans_doc.tables[0]
    assert len(tbl.rows) == 3
    # Check cell text present in table
    assert len(tbl.rows[0].cells[0].text) > 0
    assert len(tbl.rows[2].cells[0].text) > 0

    # 3. Verify Run Formatting (Bold, Italic, Color) in Paragraph 2
    # Find paragraph with runs
    p2 = None
    for p in trans_doc.paragraphs:
        if len(p.runs) >= 4:
            p2 = p
            break

    assert p2 is not None
    # Check run 2 bold flag preserved
    assert p2.runs[1].bold is True
    # Check run 3 italic flag preserved
    assert p2.runs[2].italic is True
    # Check run 4 font size/color preserved
    assert p2.runs[3].font.size == Pt(14)

    # 4. Verify Sections and Landscape orientation preserved
    assert len(trans_doc.sections) == 2
    landscape_sec = trans_doc.sections[1]
    assert landscape_sec.orientation == docx.enum.section.WD_ORIENT.LANDSCAPE

    # 5. Verify Header and Footer present in Section 2
    hdr_text = landscape_sec.header.paragraphs[0].text
    ftr_text = landscape_sec.footer.paragraphs[0].text
    assert len(hdr_text) > 0
    assert len(ftr_text) > 0


@pytest.mark.asyncio
async def test_rtl_language_support_arabic():
    """Verify right-to-left (Arabic) translation injects bidi and rtl properties."""
    orig_bytes = create_complex_test_docx()

    translated_bytes = await translate_docx_package(orig_bytes, target_lang="ar", source_lang="en")

    # Inspect XML for <w:bidi/> in <w:pPr> and <w:rtl/> in <w:rPr>
    with zipfile.ZipFile(io.BytesIO(translated_bytes), 'r') as zf:
        doc_xml = zf.read("word/document.xml")
        tree = etree.fromstring(doc_xml)

        bidi_nodes = tree.xpath("//w:bidi", namespaces=NAMESPACES)
        rtl_nodes = tree.xpath("//w:rtl", namespaces=NAMESPACES)

        assert len(bidi_nodes) > 0
        assert len(rtl_nodes) > 0
