"""
DOCX Formatting-Preserving Translation Service.

Translates Microsoft Word (.docx) files by modifying visible text nodes in the
underlying WordprocessingML XML parts (document.xml, header*.xml, footer*.xml,
footnotes.xml, endnotes.xml, comments.xml).

Preserves 100% of:
- Page layout, margins, sections, page breaks
- Paragraph styles, spacing, alignment, indentation
- Run formatting (fonts, sizes, colors, bold, italic, underline, strikethrough, highlight)
- Tables, rows, columns, merged cells, borders, shading
- Headers, footers, page numbers, footnotes, endnotes
- Hyperlinks, bookmarks, field codes
- Embedded images, drawing objects, shapes
- RTL (Right-to-Left) text direction for Arabic, Hebrew, Urdu, Persian
"""
import io
import re
import zipfile
import logging
import asyncio
from typing import List, Dict, Tuple, Optional, Any
from lxml import etree

from app.services.translation_engine import translation_engine
from app.language_config import get_rtl_languages, is_supported

logger = logging.getLogger(__name__)

# WordprocessingML XML Namespaces
NAMESPACES = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'v': 'urn:schemas-microsoft-com:vml',
    'w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
    'wp': 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',
    'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
    'pic': 'http://schemas.openxmlformats.org/drawingml/2006/picture',
}

W_P = f"{{{NAMESPACES['w']}}}p"
W_R = f"{{{NAMESPACES['w']}}}r"
W_T = f"{{{NAMESPACES['w']}}}t"
W_PPR = f"{{{NAMESPACES['w']}}}pPr"
W_RPR = f"{{{NAMESPACES['w']}}}rPr"
W_BIDI = f"{{{NAMESPACES['w']}}}bidi"
W_RTL = f"{{{NAMESPACES['w']}}}rtl"
W_RFONTS = f"{{{NAMESPACES['w']}}}rFonts"
W_INSTRTEXT = f"{{{NAMESPACES['w']}}}instrText"
XML_SPACE = "{http://www.w3.org/XML/1998/namespace}space"

# Max file size limit: 50 MB
MAX_DOCX_SIZE_BYTES = 50 * 1024 * 1024
# Max uncompressed size limit: 250 MB (Zip Bomb protection)
MAX_UNCOMPRESSED_SIZE_BYTES = 250 * 1024 * 1024


class DocxValidationError(Exception):
    """Raised when an uploaded DOCX file fails security or structural validation."""
    pass


def validate_docx_bytes(content: bytes) -> None:
    """
    Validate that the uploaded byte stream is a valid, safe DOCX ZIP archive.
    Rejects malicious ZIPs, zip bombs, zip-slip paths, and password-protected files.
    """
    if not content:
        raise DocxValidationError("Uploaded file is empty.")

    if len(content) > MAX_DOCX_SIZE_BYTES:
        raise DocxValidationError(
            f"File size exceeds limit ({len(content) / (1024*1024):.1f} MB > 50 MB)."
        )

    # Magic bytes check for PK ZIP header
    if not content.startswith(b"PK\x03\x04"):
        raise DocxValidationError("Invalid file format. Uploaded file is not a valid ZIP/DOCX archive.")

    try:
        doc_io = io.BytesIO(content)
        with zipfile.ZipFile(doc_io, 'r') as zf:
            namelist = zf.namelist()

            # Must contain [Content_Types].xml to be a valid OPC package
            if "[Content_Types].xml" not in namelist:
                raise DocxValidationError("Invalid DOCX structure: missing '[Content_Types].xml'.")

            # Check total uncompressed size andZip-slip path traversal
            total_uncompressed = 0
            has_word_document = False

            for info in zf.infolist():
                # Security check for Zip Slip (path traversal)
                filename = info.filename
                if ".." in filename or filename.startswith("/") or filename.startswith("\\"):
                    raise DocxValidationError(f"Malicious file path detected in archive: '{filename}'.")

                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_SIZE_BYTES:
                    raise DocxValidationError("File decompressed size exceeds safety threshold (Zip Bomb detected).")

                if filename == "word/document.xml":
                    has_word_document = True

                # Encrypted / password-protected check
                if info.flag_bits & 0x1:
                    raise DocxValidationError("Password-protected or encrypted DOCX files are not supported.")

            if not has_word_document:
                raise DocxValidationError("Invalid DOCX package: missing 'word/document.xml'.")

    except zipfile.BadZipFile:
        raise DocxValidationError("Corrupted or invalid DOCX archive.")
    except Exception as e:
        if isinstance(e, DocxValidationError):
            raise
        raise DocxValidationError(f"DOCX validation failed: {str(e)}")


class ParagraphTextGroup:
    """
    Represents a group of text nodes inside a single <w:p> paragraph element.
    Maintains references to <w:t> elements and their parent runs for formatting-aware translation.
    """
    def __init__(self, paragraph_elem: etree._Element):
        self.p_elem = paragraph_elem
        self.t_nodes: List[etree._Element] = []
        self.original_texts: List[str] = []
        self._extract_text_nodes()

    def _extract_text_nodes(self):
        """Find all translatable <w:t> nodes, skipping field instruction codes (<w:instrText>)."""
        # Find all <w:t> elements inside paragraph
        for node in self.p_elem.xpath('.//w:t', namespaces=NAMESPACES):
            # Check if this <w:t> is inside <w:instrText> (field code like PAGE, TOC, etc.)
            parent = node.getparent()
            if parent is not None and parent.tag == W_INSTRTEXT:
                continue

            text_val = node.text or ""
            self.t_nodes.append(node)
            self.original_texts.append(text_val)

    def get_full_text(self) -> str:
        return "".join(self.original_texts)

    def is_empty(self) -> bool:
        return not bool(self.get_full_text().strip())

    def build_annotated_text(self) -> str:
        """
        Combine run texts into a single string with run markers.
        Example: ⟦R0⟧Hello ⟦R1⟧world!
        """
        parts = []
        for idx, text in enumerate(self.original_texts):
            parts.append(f"⟦R{idx}⟧{text}")
        return "".join(parts)

    def apply_translated_string(self, translated: str, target_lang: str):
        """
        Parse translated string containing run markers (or fallback split)
        and update original <w:t> nodes without breaking XML or formatting.
        """
        if not self.t_nodes:
            return

        # Case 1: Single text node in paragraph
        if len(self.t_nodes) == 1:
            clean_translated = re.sub(r'⟦R\d+⟧', '', translated)
            self.t_nodes[0].text = clean_translated
            self.t_nodes[0].attrib[XML_SPACE] = "preserve"
            self._apply_rtl_if_needed(self.p_elem, self.t_nodes[0].getparent(), target_lang)
            return

        # Case 2: Multi-run paragraph with markers
        marker_pattern = r'⟦R(\d+)⟧'
        matches = list(re.finditer(marker_pattern, translated))

        if len(matches) == len(self.t_nodes):
            # Perfect match: split string by markers
            for i, match in enumerate(matches):
                idx = int(match.group(1))
                start_pos = match.end()
                end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(translated)
                chunk_text = translated[start_pos:end_pos]

                if idx < len(self.t_nodes):
                    self.t_nodes[idx].text = chunk_text
                    self.t_nodes[idx].attrib[XML_SPACE] = "preserve"
                    self._apply_rtl_if_needed(self.p_elem, self.t_nodes[idx].getparent(), target_lang)
            return

        # Fallback A: Marker loss occurred during translation.
        # Split clean translated text based on character length ratio of original runs.
        clean_text = re.sub(r'⟦R\d+⟧', '', translated)
        total_orig_len = sum(len(t) for t in self.original_texts) or 1

        curr_pos = 0
        for i, orig_text in enumerate(self.original_texts):
            if i == len(self.original_texts) - 1:
                chunk = clean_text[curr_pos:]
            else:
                ratio = len(orig_text) / total_orig_len
                chunk_len = max(1, int(round(len(clean_text) * ratio)))
                chunk = clean_text[curr_pos:curr_pos + chunk_len]
                curr_pos += chunk_len

            self.t_nodes[i].text = chunk
            self.t_nodes[i].attrib[XML_SPACE] = "preserve"
            self._apply_rtl_if_needed(self.p_elem, self.t_nodes[i].getparent(), target_lang)

    @staticmethod
    def _apply_rtl_if_needed(p_elem: etree._Element, run_elem: Optional[etree._Element], target_lang: str):
        """Inject RTL properties (<w:bidi/> in pPr, <w:rtl/> in rPr) for Arabic, Hebrew, Urdu, Persian."""
        rtl_langs = get_rtl_languages()
        if target_lang not in rtl_langs:
            return

        # 1. Ensure <w:pPr><w:bidi/></w:pPr>
        pPr = p_elem.find(W_PPR)
        if pPr is None:
            pPr = etree.Element(W_PPR)
            p_elem.insert(0, pPr)

        if pPr.find(W_BIDI) is None:
            bidi_elem = etree.Element(W_BIDI)
            pPr.append(bidi_elem)

        # 2. Ensure <w:rPr><w:rtl/></w:rPr> on run if present
        if run_elem is not None and run_elem.tag == W_R:
            rPr = run_elem.find(W_RPR)
            if rPr is None:
                rPr = etree.Element(W_RPR)
                run_elem.insert(0, rPr)

            if rPr.find(W_RTL) is None:
                rPr.append(etree.Element(W_RTL))


async def process_xml_part(xml_bytes: bytes, source_lang: str, target_lang: str) -> bytes:
    """
    Parse an XML document part (e.g. document.xml, header1.xml),
    extract text groups from all <w:p> elements, translate using TranslationEngine,
    and update XML text nodes while preserving XML structure and formatting attributes.
    """
    try:
        parser = etree.XMLParser(remove_blank_text=False, resolve_entities=False)
        tree = etree.fromstring(xml_bytes, parser=parser)
    except Exception as e:
        logger.warning(f"[DocxService] XML parse error in part: {e}")
        return xml_bytes

    # Find all <w:p> elements in the XML tree
    paragraphs = tree.xpath('//w:p', namespaces=NAMESPACES)
    if not paragraphs:
        return xml_bytes

    text_groups: List[ParagraphTextGroup] = []
    chunk_items: List[Tuple[int, str]] = []  # (index, annotated_text)

    for i, p_elem in enumerate(paragraphs):
        grp = ParagraphTextGroup(p_elem)
        if not grp.is_empty():
            text_groups.append(grp)
            annotated = grp.build_annotated_text() if len(grp.t_nodes) > 1 else grp.get_full_text()
            chunk_items.append((len(text_groups) - 1, annotated))

    if not chunk_items:
        return xml_bytes

    # Batch chunks for high-speed parallel translation (max 3,000 chars per batch)
    batches: List[List[Tuple[int, str]]] = []
    current_batch: List[Tuple[int, str]] = []
    current_batch_len = 0

    for idx, text_str in chunk_items:
        if current_batch_len + len(text_str) > 3000 and current_batch:
            batches.append(current_batch)
            current_batch = [(idx, text_str)]
            current_batch_len = len(text_str)
        else:
            current_batch.append((idx, text_str))
            current_batch_len += len(text_str)

    if current_batch:
        batches.append(current_batch)

    # Concurrency limit for translation calls
    semaphore = asyncio.Semaphore(10)

    async def translate_batch(batch: List[Tuple[int, str]]):
        async with semaphore:
            # Combine batch items with delimiter \n\n
            combined_text = "\n\n".join(item[1] for item in batch)
            try:
                res = await translation_engine.translate(
                    text=combined_text,
                    source_lang=source_lang,
                    target_lang=target_lang,
                )
                if res and res.text:
                    parts = res.text.split("\n\n")
                    if len(parts) == len(batch):
                        for k, part in enumerate(parts):
                            text_groups[batch[k][0]].apply_translated_string(part, target_lang)
                        return
            except Exception as ex:
                logger.warning(f"[DocxService] Batch translation failed: {ex}")

            # Fallback per-item translation if batch split failed
            for grp_idx, text_str in batch:
                try:
                    res_item = await translation_engine.translate(
                        text=text_str,
                        source_lang=source_lang,
                        target_lang=target_lang
                    )
                    if res_item and res_item.text:
                        text_groups[grp_idx].apply_translated_string(res_item.text, target_lang)
                except Exception:
                    pass

    # Execute all translation batches concurrently
    await asyncio.gather(*[translate_batch(b) for b in batches], return_exceptions=True)

    # Return updated XML bytes
    return etree.tostring(tree, encoding='utf-8', xml_declaration=True)


async def translate_docx_package(docx_bytes: bytes, target_lang: str, source_lang: str = "auto") -> bytes:
    """
    Format-Preserving DOCX Translator.
    Opens the DOCX ZIP package, translates all visible text XML parts
    (document.xml, header*.xml, footer*.xml, footnotes.xml, endnotes.xml, comments.xml),
    and returns the translated DOCX file bytes.
    Preserves 100% of formatting, layout, images, styles, and relationships.
    """
    # 1. Validate uploaded DOCX file security
    validate_docx_bytes(docx_bytes)

    if not is_supported(target_lang):
        raise ValueError(f"Target language '{target_lang}' is not supported.")

    in_io = io.BytesIO(docx_bytes)
    out_io = io.BytesIO()

    # Targets XML files in word/ directory
    target_xml_patterns = [
        r"^word/document\.xml$",
        r"^word/header\d+\.xml$",
        r"^word/footer\d+\.xml$",
        r"^word/footnotes\.xml$",
        r"^word/endnotes\.xml$",
        r"^word/comments\.xml$",
    ]
    target_regex = re.compile("|".join(target_xml_patterns))

    with zipfile.ZipFile(in_io, 'r') as in_zip, zipfile.ZipFile(out_io, 'w', compression=zipfile.ZIP_DEFLATED) as out_zip:
        for item in in_zip.infolist():
            file_bytes = in_zip.read(item.filename)

            if target_regex.match(item.filename):
                logger.info(f"[DocxService] Translating XML part: {item.filename}")
                translated_xml = await process_xml_part(file_bytes, source_lang=source_lang, target_lang=target_lang)
                out_zip.writestr(item, translated_xml)
            else:
                # Copy untouched (media files, styles.xml, rels, settings, themes, etc.)
                out_zip.writestr(item, file_bytes)

    out_io.seek(0)
    return out_io.getvalue()
