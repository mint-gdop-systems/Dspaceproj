import io

from pypdf import PdfReader, PdfWriter


def rotate_pdf_page(file_file, page_number, angle=90):
    """
    Rotates a specific page of the PDF.
    page_number is 1-indexed.
    Returns: BytesIO of the new PDF.
    """
    reader = PdfReader(file_file)
    writer = PdfWriter()

    for i, page in enumerate(reader.pages):
        if i + 1 == page_number:
            # Rotate clockwise
            page.rotate(angle)
        writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output


def split_pdf_at(file_file, page_numbers):
    """
    Splits PDF into multiple parts based on page_numbers.
    page_numbers: int or list of ints (1-indexed). Indicates split AFTER this page.
    e.g. 2 -> 1-2, 3-End
    e.g. [2, 5] -> 1-2, 3-5, 6-End
    Returns: List of BytesIO objects
    """
    # Ensure file pointer is at the beginning
    if hasattr(file_file, "seek"):
        file_file.seek(0)

    reader = PdfReader(file_file)
    total_pages = len(reader.pages)

    if isinstance(page_numbers, int):
        page_numbers = [page_numbers]

    # Filter and sort unique split points
    # Split point P means "Split after page P"
    # Valid P is 1 <= P < Total Pages
    splits = sorted(list(set([p for p in page_numbers if 0 < p < total_pages])))

    if not splits:
        # No valid splits, return original copy
        out = io.BytesIO()
        writer = PdfWriter()
        for page in reader.pages:
            writer.add_page(page)
        writer.write(out)
        out.seek(0)

        # Verify PDF content is valid before returning
        pdf_bytes = out.getvalue()
        if not pdf_bytes.startswith(b"%PDF"):
            raise Exception("Invalid PDF generated - does not start with PDF header")

        # Create fresh BytesIO with validated content
        result = io.BytesIO(pdf_bytes)
        result.seek(0)

        # Validate PDF structure
        try:
            PdfReader(result)
            result.seek(0)
        except Exception as e:
            raise Exception(f"Failed to create valid PDF: {str(e)}")
        return [result]

    parts = []

    # Ranges:
    # Start: 0
    # Split 1: 2 (Points 0, 1 -> Pages 1, 2)
    # Range 1: 0 to 2

    current_start = 0
    for split_point in splits:
        # split_point is 1-based index (e.g. 2).
        # In 0-based list, we want up to index 2 (exclusive) -> reader.pages[0], reader.pages[1]

        writer = PdfWriter()
        for i in range(current_start, split_point):
            writer.add_page(reader.pages[i])

        out = io.BytesIO()
        writer.write(out)
        out.seek(0)

        # Verify PDF content is valid before adding
        pdf_bytes = out.getvalue()
        if not pdf_bytes.startswith(b"%PDF"):
            raise Exception(
                f"Invalid PDF generated at split point {split_point} - does not start with PDF header"
            )

        # Create fresh BytesIO with validated content
        result = io.BytesIO(pdf_bytes)
        result.seek(0)

        # Validate PDF structure before adding
        try:
            PdfReader(result)
            result.seek(0)
        except Exception as e:
            raise Exception(
                f"Failed to create valid PDF part at split point {split_point}: {str(e)}"
            )

        parts.append(result)
        current_start = split_point

    # Last part: from last split to end
    if current_start < total_pages:
        writer = PdfWriter()
        for i in range(current_start, total_pages):
            writer.add_page(reader.pages[i])

        out = io.BytesIO()
        writer.write(out)
        out.seek(0)

        # Verify PDF content is valid before adding
        pdf_bytes = out.getvalue()
        if not pdf_bytes.startswith(b"%PDF"):
            raise Exception(
                "Invalid PDF generated for final part - does not start with PDF header"
            )

        # Create fresh BytesIO with validated content
        result = io.BytesIO(pdf_bytes)
        result.seek(0)

        # Validate PDF structure before adding
        try:
            PdfReader(result)
            result.seek(0)
        except Exception as e:
            raise Exception(f"Failed to create valid PDF for final part: {str(e)}")

        parts.append(result)

    return parts


def merge_pdfs(file_list):
    """
    Merges a list of file-like objects using PdfWriter.
    Returns: BytesIO of merged PDF.
    """
    writer = PdfWriter()
    print(f"DEBUG: Merging {len(file_list)} files")

    for i, f in enumerate(file_list):
        try:
            f.seek(0)
            print(f"DEBUG: Appending file {i}")
            reader = PdfReader(f)
            # Iterate and add pages manually for max compatibility
            for page in reader.pages:
                writer.add_page(page)
        except Exception as e:
            print(f"DEBUG: Error appending file {i}: {e}")
            raise

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    print(f"DEBUG: Merged output size: {output.getbuffer().nbytes}")
    return output


def rename_pdf_title(file_file, new_title):
    """
    Updates the Title metadata of the PDF.
    Returns: BytesIO of the new PDF.
    """
    reader = PdfReader(file_file)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # metadata = reader.metadata
    # if metadata is None:
    #     metadata = {}
    # else:
    #     # Convert to mutable dict if it's not
    #     metadata = {k: v for k, v in metadata.items()}

    # writer.add_metadata(metadata)
    # writer.add_metadata({'/Title': new_title})

    # pypdf handled metadata differently in versions, but writer.add_metadata works.
    # It updates the existing metadata.

    # Helper to get existing metadata
    current_metadata = reader.metadata
    new_metadata = {}
    if current_metadata:
        for k, v in current_metadata.items():
            new_metadata[k] = v

    new_metadata["/Title"] = new_title
    writer.add_metadata(new_metadata)

    output = io.BytesIO()
    writer.write(output)
    output.seek(0)
    return output
