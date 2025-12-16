import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error);
  } else {
    console.log('Email transporter ready:', success);
  }
});

// Generate ticket PDF as buffer
export const generateTicketPDF = async (ticket) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 30,
      });

      const chunks = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      doc.on('error', reject);

      // Ticket Header
      doc
        .fillColor('#DAA520')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('EVENT TICKET', { align: 'center' })
        .fontSize(12)
        .fillColor('#000000')
        .text(new Date().toLocaleDateString(), { align: 'center' })
        .moveDown();

      // Divider
      doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke('#DAA520');
      doc.moveDown();

      // Event Info
      doc.fontSize(18).font('Helvetica-Bold').fillColor('#DAA520').text(ticket.eventTitle);
      doc.fontSize(12).fillColor('#000000').font('Helvetica');

      doc.moveDown(0.5);
      doc.text(`Date & Time: ${new Date(ticket.eventDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })} at ${ticket.eventTime}`, { width: 500 });

      doc.moveDown(0.2);
      doc.text(`Venue: ${ticket.location}`, { width: 500 });

      doc.moveDown(0.2);
      doc.fillColor('#DAA520').text(`Ticket Type: ${ticket.ticketTypeName}`);
      doc.moveDown();

      // Ticket ID and QR Section
      doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke('#DAA520');
      doc.moveDown();

      doc.fontSize(12).fillColor('#666666').text('TICKET ID', { align: 'center' });
      doc
        .fontSize(24)
        .fillColor('#000000')
        .font('Courier-Bold')
        .text(ticket.ticketId, { align: 'center' });
      doc.moveDown();

      // Buyer Info
      doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke('#ddd');
      doc.moveDown();

      doc.fontSize(12).font('Helvetica').fillColor('#000000');
      doc.text(`Ticket Holder: ${ticket.name}`);
      doc.moveDown(0.2);
      doc.text(`Email: ${ticket.email}`);
      doc.moveDown(0.2);
      doc.text(`WhatsApp: ${ticket.whatsapp}`);
      doc.moveDown(0.2);
      doc.fillColor('#DAA520').text(`Price Paid: ₦${ticket.ticketTypePrice.toLocaleString()}`);
      doc.moveDown();

      // Footer
      doc.moveTo(30, doc.y).lineTo(550, doc.y).stroke('#ddd');
      doc.moveDown();
      doc
        .fontSize(11)
        .fillColor('#666666')
        .text('Present this ticket at the venue. Screenshot or print this page.', {
          align: 'center',
          width: 500,
        });
      doc.moveDown(0.2);
      doc.text(`Valid for ${new Date(ticket.eventDate).toLocaleDateString()}`, {
        align: 'center',
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Send ticket email
export const sendTicketEmail = async (ticket) => {
  try {
    console.log('Starting email send for ticket:', ticket.ticketId, 'to:', ticket.email);
    
    // Generate PDF buffer
    const pdfBuffer = await generateTicketPDF(ticket);
    console.log('PDF generated, size:', pdfBuffer.length);

    // Email content
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_USER}>`,
      to: ticket.email,
      subject: `Your Ticket for ${ticket.eventTitle} - Ticket ID: ${ticket.ticketId}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #DAA520; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: black; font-size: 28px;">✓ Ticket Purchase Successful!</h1>
          </div>
          
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p style="font-size: 16px; color: #333; margin-bottom: 15px;">
              Hi <strong>${ticket.name}</strong>,
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 15px;">
              Your ticket for <strong>${ticket.eventTitle}</strong> has been successfully purchased and confirmed. 
              Your ticket is attached to this email as a PDF.
            </p>
            
            <div style="background-color: #fff; padding: 20px; border-left: 4px solid #DAA520; margin: 20px 0;">
              <p style="margin: 0 0 10px 0;"><strong>Event Details:</strong></p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Date & Time:</strong> ${new Date(ticket.eventDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })} at ${ticket.eventTime}
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Venue:</strong> ${ticket.location}
              </p>
              <p style="margin: 5px 0; color: #666;">
                <strong>Ticket Type:</strong> ${ticket.ticketTypeName}
              </p>
              <p style="margin: 5px 0; color: #DAA520; font-weight: bold;">
                <strong>Ticket ID:</strong> ${ticket.ticketId}
              </p>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin: 20px 0;">
              <strong>What's Next?</strong>
            </p>
            <ul style="color: #666; line-height: 1.8;">
              <li>Download or print the attached ticket PDF</li>
              <li>Present your ticket at the venue (either printed or on your phone)</li>
              <li>If you have any questions, feel free to reach out</li>
            </ul>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 15px;">
              Thank you for purchasing your ticket through AAU Nightlife. We look forward to seeing you at the event!
            </p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: `ticket-${ticket.ticketId}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    console.log('Sending email with options:', { to: mailOptions.to, from: mailOptions.from });

    // Send email
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('Error sending email:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};
