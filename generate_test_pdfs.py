"""
Generate test PDFs for legal/insurance document processing
"""
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from datetime import datetime
import os


def create_ilit_agreement():
    """Generate Irrevocable Life Insurance Trust Agreement"""
    filename = "outputs/Smith_Family_ILIT_Agreement.pdf"
    os.makedirs("outputs", exist_ok=True)

    doc = SimpleDocTemplate(filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    Story = []
    styles = getSampleStyleSheet()

    # Title style
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=30,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    # Header
    Story.append(Paragraph("IRREVOCABLE LIFE INSURANCE TRUST AGREEMENT", title_style))
    Story.append(Spacer(1, 0.2*inch))

    # Trust parties
    content = [
        ("THE SMITH FAMILY IRREVOCABLE LIFE INSURANCE TRUST", styles['Heading2']),
        ("", None),
        ("This Irrevocable Life Insurance Trust Agreement (the \"Trust\") is made this 15th day of March, 2024, "
         "by and between:", styles['BodyText']),
        ("", None),
        ("<b>GRANTOR:</b> John Michael Smith and Sarah Elizabeth Smith, residing at 1234 Oak Avenue, "
         "Los Angeles, CA 90210", styles['BodyText']),
        ("", None),
        ("<b>TRUSTEE:</b> First National Trust Company, a California corporation with principal offices at "
         "5678 Financial Plaza, Los Angeles, CA 90015", styles['BodyText']),
        ("", None),
        ("<b>ARTICLE I - TRUST PROPERTY</b>", styles['Heading3']),
        ("", None),
        ("The Grantor hereby transfers to the Trustee the sum of Ten Thousand Dollars ($10,000) and any "
         "life insurance policies on the life of the Grantor, including but not limited to MetLife Term Policy "
         "No. TL-2024-789456 with a death benefit of Two Million Dollars ($2,000,000).", styles['BodyText']),
        ("", None),
        ("<b>ARTICLE II - IRREVOCABILITY</b>", styles['Heading3']),
        ("", None),
        ("This Trust is IRREVOCABLE. The Grantor expressly acknowledges that they retain no right, title, "
         "or interest in the Trust property and may not alter, amend, revoke, or terminate this Trust or any "
         "of its provisions.", styles['BodyText']),
        ("", None),
        ("<b>ARTICLE III - BENEFICIARIES</b>", styles['Heading3']),
        ("", None),
        ("The primary beneficiaries of this Trust shall be:", styles['BodyText']),
        ("1. Emily Rose Smith (Daughter), born April 12, 2010", styles['BodyText']),
        ("2. Michael James Smith Jr. (Son), born September 8, 2012", styles['BodyText']),
        ("3. Olivia Grace Smith (Daughter), born January 22, 2015", styles['BodyText']),
        ("", None),
        ("Each beneficiary shall receive an equal share of the Trust assets upon distribution.", styles['BodyText']),
        ("", None),
        ("<b>ARTICLE IV - CRUMMEY WITHDRAWAL RIGHTS</b>", styles['Heading3']),
        ("", None),
        ("Each beneficiary shall have the right to withdraw from the Trust any contributions made during the "
         "calendar year, up to the annual gift tax exclusion amount ($18,000 per beneficiary for 2024). "
         "Such withdrawal rights shall lapse 30 days after written notice is provided to the beneficiary.", styles['BodyText']),
        ("", None),
        ("<b>ARTICLE V - TRUSTEE POWERS</b>", styles['Heading3']),
        ("", None),
        ("The Trustee shall have full power and authority to manage, invest, and distribute the Trust property, "
         "including the power to pay premiums on life insurance policies held in the Trust.", styles['BodyText']),
    ]

    for text, style in content:
        if text == "":
            Story.append(Spacer(1, 0.1*inch))
        else:
            Story.append(Paragraph(text, style))

    # Signature section
    Story.append(Spacer(1, 0.3*inch))
    sig_data = [
        ['GRANTOR:', '_' * 40, 'DATE:', '_' * 20],
        ['', 'John Michael Smith', '', ''],
        ['', '', '', ''],
        ['GRANTOR:', '_' * 40, 'DATE:', '_' * 20],
        ['', 'Sarah Elizabeth Smith', '', ''],
        ['', '', '', ''],
        ['TRUSTEE:', '_' * 40, 'DATE:', '_' * 20],
        ['', 'First National Trust Company', '', ''],
    ]

    sig_table = Table(sig_data, colWidths=[1*inch, 3*inch, 0.7*inch, 1.8*inch])
    Story.append(sig_table)

    doc.build(Story)
    print(f"✓ Created {filename}")


def create_term_policy():
    """Generate MetLife Term Life Insurance Policy"""
    filename = "outputs/MetLife_Term_Policy_2M.pdf"

    doc = SimpleDocTemplate(filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    Story = []
    styles = getSampleStyleSheet()

    # Header with MetLife branding
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#0066cc'),
        alignment=TA_RIGHT
    )

    Story.append(Paragraph("<b>MetLife Insurance Company</b><br/>200 Park Avenue, New York, NY 10166<br/>"
                          "Phone: 1-800-638-5433", header_style))
    Story.append(Spacer(1, 0.3*inch))

    # Title
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#0066cc'),
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    Story.append(Paragraph("TERM LIFE INSURANCE POLICY", title_style))
    Story.append(Spacer(1, 0.2*inch))

    # Policy info table
    policy_data = [
        ['Policy Number:', 'TL-2024-789456', 'Issue Date:', 'March 15, 2024'],
        ['Policy Owner:', 'Smith Family ILIT', 'Effective Date:', 'April 1, 2024'],
        ['Insured:', 'John Michael Smith', 'Expiration Date:', 'April 1, 2044'],
        ['Date of Birth:', 'June 15, 1978', 'Policy Term:', '20 Years'],
    ]

    policy_table = Table(policy_data, colWidths=[1.5*inch, 2*inch, 1.5*inch, 1.5*inch])
    policy_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e6f2ff')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#e6f2ff')),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))

    Story.append(policy_table)
    Story.append(Spacer(1, 0.3*inch))

    # Coverage details
    Story.append(Paragraph("<b>COVERAGE DETAILS</b>", styles['Heading2']))
    Story.append(Spacer(1, 0.1*inch))

    coverage_data = [
        ['Death Benefit:', '$2,000,000.00'],
        ['Annual Premium:', '$1,845.00'],
        ['Premium Mode:', 'Annual'],
        ['Premium Due Date:', 'April 1st each year'],
        ['Guaranteed Level Premium Period:', '20 Years'],
    ]

    coverage_table = Table(coverage_data, colWidths=[3*inch, 3.5*inch])
    coverage_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))

    Story.append(coverage_table)
    Story.append(Spacer(1, 0.3*inch))

    # Beneficiary information
    Story.append(Paragraph("<b>BENEFICIARY DESIGNATION</b>", styles['Heading2']))
    Story.append(Spacer(1, 0.1*inch))

    beneficiary_text = [
        ("<b>Primary Beneficiary:</b> The Smith Family Irrevocable Life Insurance Trust, established "
         "March 15, 2024", styles['BodyText']),
        ("", None),
        ("<b>Trustee:</b> First National Trust Company", styles['BodyText']),
        ("<b>Trust ID:</b> SMITH-ILIT-2024-001", styles['BodyText']),
        ("", None),
        ("<b>Contingent Beneficiary:</b> Estate of John Michael Smith", styles['BodyText']),
    ]

    for text, style in beneficiary_text:
        if text == "":
            Story.append(Spacer(1, 0.1*inch))
        else:
            Story.append(Paragraph(text, style))

    Story.append(Spacer(1, 0.3*inch))

    # Policy provisions
    Story.append(Paragraph("<b>KEY POLICY PROVISIONS</b>", styles['Heading2']))
    Story.append(Spacer(1, 0.1*inch))

    provisions = [
        "<b>Contestability Period:</b> This policy may be contested within two years from the issue date.",
        "<b>Suicide Clause:</b> If the insured dies by suicide within two years of the issue date, death benefit "
        "is limited to premiums paid.",
        "<b>Grace Period:</b> 31 days from premium due date to pay premium without lapse.",
        "<b>Conversion Right:</b> May be converted to permanent life insurance without evidence of insurability "
        "before age 70.",
        "<b>Assignment:</b> Policy owner may assign policy rights. Current assignment to Smith Family ILIT "
        "is irrevocable.",
    ]

    for prov in provisions:
        Story.append(Paragraph(prov, styles['BodyText']))
        Story.append(Spacer(1, 0.1*inch))

    Story.append(Spacer(1, 0.3*inch))

    # Signature
    Story.append(Paragraph("_" * 60, styles['Normal']))
    Story.append(Paragraph("<b>Authorized Officer, MetLife Insurance Company</b>", styles['Normal']))
    Story.append(Spacer(1, 0.1*inch))
    Story.append(Paragraph("Policy issued: March 15, 2024", styles['Normal']))

    doc.build(Story)
    print(f"✓ Created {filename}")


def create_crummey_notice():
    """Generate Crummey Withdrawal Notice"""
    filename = "outputs/Crummey_Notice_Smith_Children.pdf"

    doc = SimpleDocTemplate(filename, pagesize=letter,
                           rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    Story = []
    styles = getSampleStyleSheet()

    # Header
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        alignment=TA_RIGHT
    )

    Story.append(Paragraph("First National Trust Company<br/>5678 Financial Plaza<br/>"
                          "Los Angeles, CA 90015<br/>Phone: (213) 555-0100", header_style))
    Story.append(Spacer(1, 0.3*inch))

    Story.append(Paragraph("Date: April 2, 2024", styles['Normal']))
    Story.append(Spacer(1, 0.2*inch))

    # Title
    title_style = ParagraphStyle(
        'Title',
        parent=styles['Heading1'],
        fontSize=14,
        spaceAfter=20,
        alignment=TA_CENTER,
        fontName='Helvetica-Bold'
    )

    Story.append(Paragraph("NOTICE OF WITHDRAWAL RIGHTS", title_style))
    Story.append(Paragraph("(Crummey Notice)", styles['Heading3']))
    Story.append(Spacer(1, 0.2*inch))

    # Trust identification
    Story.append(Paragraph("<b>RE: The Smith Family Irrevocable Life Insurance Trust</b>", styles['Heading3']))
    Story.append(Spacer(1, 0.15*inch))

    # Notice content
    content = [
        ("Dear Trust Beneficiary:", styles['BodyText']),
        ("", None),
        ("This letter is to notify you that a contribution has been made to The Smith Family Irrevocable "
         "Life Insurance Trust (the \"Trust\") dated March 15, 2024. As a beneficiary of the Trust, you have "
         "certain withdrawal rights as described below.", styles['BodyText']),
        ("", None),
        ("<b>CONTRIBUTION DETAILS</b>", styles['Heading3']),
        ("", None),
        ("<b>Contribution Date:</b> April 1, 2024", styles['BodyText']),
        ("<b>Total Contribution Amount:</b> $5,535.00", styles['BodyText']),
        ("<b>Purpose:</b> Annual premium payment for MetLife Term Policy No. TL-2024-789456", styles['BodyText']),
        ("", None),
        ("<b>YOUR WITHDRAWAL RIGHTS</b>", styles['Heading3']),
        ("", None),
        ("Pursuant to Article IV of the Trust Agreement, you have the right to withdraw your pro-rata share "
         "of this contribution, up to the annual gift tax exclusion amount of $18,000.", styles['BodyText']),
        ("", None),
        ("<b>Your Pro-Rata Share:</b> $1,845.00 (One-third of total contribution)", styles['BodyText']),
        ("", None),
        ("<b>IMPORTANT DEADLINE</b>", styles['Heading3']),
        ("", None),
        ("You have <b>THIRTY (30) DAYS</b> from the date of this notice to exercise your withdrawal right. "
         "Your withdrawal right will expire at 5:00 PM Pacific Time on <b>May 2, 2024</b>.", styles['BodyText']),
        ("", None),
        ("If you do not exercise your withdrawal right within this 30-day period, your right to withdraw "
         "this contribution will lapse, and the funds will remain in the Trust for your future benefit according "
         "to the terms of the Trust Agreement.", styles['BodyText']),
        ("", None),
        ("<b>HOW TO EXERCISE YOUR WITHDRAWAL RIGHT</b>", styles['Heading3']),
        ("", None),
        ("To exercise your withdrawal right, you must submit a written request to the Trustee at the address "
         "shown above. The request must be received by the Trustee no later than May 2, 2024. You may deliver "
         "the request in person, by mail, by email to trustee@firstnationaltrust.com, or by fax to (213) 555-0101.", styles['BodyText']),
        ("", None),
        ("<b>BENEFICIARY INFORMATION</b>", styles['Heading3']),
        ("", None),
        ("This notice is being sent to the following beneficiaries:", styles['BodyText']),
        ("", None),
    ]

    for text, style in content:
        if text == "":
            Story.append(Spacer(1, 0.1*inch))
        else:
            Story.append(Paragraph(text, style))

    # Beneficiary table
    beneficiary_data = [
        ['Beneficiary Name', 'Date of Birth', 'Withdrawal Amount'],
        ['Emily Rose Smith', 'April 12, 2010', '$1,845.00'],
        ['Michael James Smith Jr.', 'September 8, 2012', '$1,845.00'],
        ['Olivia Grace Smith', 'January 22, 2015', '$1,845.00'],
    ]

    ben_table = Table(beneficiary_data, colWidths=[2.2*inch, 2*inch, 2.3*inch])
    ben_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a4a4a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))

    Story.append(ben_table)
    Story.append(Spacer(1, 0.3*inch))

    # Note for minors
    Story.append(Paragraph("<b>NOTE FOR MINOR BENEFICIARIES:</b>", styles['Heading3']))
    Story.append(Spacer(1, 0.1*inch))
    Story.append(Paragraph("For beneficiaries who have not reached the age of majority (18 in California), "
                          "withdrawal requests must be made by the beneficiary's legal guardian. This notice is "
                          "being sent to John Michael Smith and Sarah Elizabeth Smith as natural guardians of the "
                          "minor beneficiaries.", styles['BodyText']))

    Story.append(Spacer(1, 0.3*inch))

    # Contact information
    Story.append(Paragraph("If you have any questions regarding this notice or your withdrawal rights, please "
                          "contact our office at (213) 555-0100 or trustee@firstnationaltrust.com.", styles['BodyText']))

    Story.append(Spacer(1, 0.3*inch))
    Story.append(Paragraph("Sincerely,", styles['Normal']))
    Story.append(Spacer(1, 0.5*inch))
    Story.append(Paragraph("_" * 40, styles['Normal']))
    Story.append(Paragraph("<b>Jennifer Martinez</b><br/>Trust Officer<br/>First National Trust Company", styles['Normal']))

    Story.append(Spacer(1, 0.3*inch))
    Story.append(Paragraph("<i>cc: John Michael Smith and Sarah Elizabeth Smith (as Grantors and Guardians)</i>",
                          styles['Normal']))

    doc.build(Story)
    print(f"✓ Created {filename}")


if __name__ == "__main__":
    print("\nGenerating test PDFs...")
    print("-" * 50)

    create_ilit_agreement()
    create_term_policy()
    create_crummey_notice()

    print("-" * 50)
    print("✓ All PDFs generated successfully in outputs/ directory\n")
