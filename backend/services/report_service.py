"""
Pharmacogenomic Passport PDF generation. Uses existing computed data only.
Hospital-grade aesthetic: white background, blue headers, minimal layout.
"""
from io import BytesIO
from typing import Any, Dict

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


HEADER_BLUE = colors.HexColor("#2563EB")
LIGHT_GRAY = colors.HexColor("#F3F4F6")


def build_pdf(report_data: Dict[str, Any]) -> bytes:
    """
    Generate PDF from analysis result. report_data must contain:
    patient_id, drug, timestamp, risk_assessment, pharmacogenomic_profile,
    clinical_recommendation (with guideline_reference).
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=inch,
        leftMargin=inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "CustomHeader",
        parent=styles["Heading1"],
        fontSize=14,
        textColor=HEADER_BLUE,
        spaceAfter=6,
    )
    body_style = styles["Normal"]

    story = []

    # Title
    story.append(Paragraph("Pharmacogenomic Clinical Report", header_style))
    story.append(Spacer(1, 0.2 * inch))

    # Patient & metadata
    patient_id = report_data.get("patient_id", "—")
    drug = report_data.get("drug", "—")
    timestamp = report_data.get("timestamp", "—")
    story.append(Paragraph("<b>Patient ID</b>", header_style))
    story.append(Paragraph(patient_id, body_style))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("<b>Drug analyzed</b>", header_style))
    story.append(Paragraph(drug, body_style))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("<b>Report timestamp</b>", header_style))
    story.append(Paragraph(timestamp, body_style))
    story.append(Spacer(1, 0.25 * inch))

    # Risk & profile
    risk = report_data.get("risk_assessment") or {}
    profile = report_data.get("pharmacogenomic_profile") or {}
    rec = report_data.get("clinical_recommendation") or {}

    rows = [
        ["Gene", profile.get("gene", "—")],
        ["Diplotype", profile.get("diplotype", "—")],
        ["Phenotype", profile.get("phenotype", "—")],
        ["Risk label", risk.get("risk_label", "—")],
        ["Severity", risk.get("severity", "—")],
        ["Confidence score", str(risk.get("confidence_score", "—"))],
        ["Clinical recommendation", rec.get("dose_adjustment", "—")],
        ["CPIC reference", rec.get("guideline_reference", "CPIC")],
    ]
    t = Table(rows, colWidths=[2 * inch, 4 * inch])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), LIGHT_GRAY),
                ("TEXTCOLOR", (0, 0), (0, -1), HEADER_BLUE),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    story.append(Paragraph("<b>Summary</b>", header_style))
    story.append(Spacer(1, 0.1 * inch))
    story.append(t)
    story.append(Spacer(1, 0.2 * inch))

    story.append(Paragraph("<b>Alternative options</b>", header_style))
    story.append(Paragraph(rec.get("alternative_options", "—"), body_style))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
