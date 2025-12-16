import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

// Create transporter with explicit SMTP configuration for reliability
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use TLS instead of SSL
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  connectionTimeout: 10000, // 10 seconds
  socketTimeout: 10000, // 10 seconds
  pool: {
    maxConnections: 1, // Render ephemeral, keep minimal
    maxMessages: Infinity,
    rateDelta: 1000,
    rateLimit: 5,
  },
});

// Verify transporter connection on startup
console.log('[EMAIL] Verifying Gmail SMTP connection...');
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ [EMAIL] Connection failed - SMTP verification error:');
    console.error('   Error message:', error.message);
    console.error('   Error code:', error.code);
    console.error('   Config check:', {
      service: 'smtp.gmail.com',
      port: 587,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
      nodeEnv: process.env.NODE_ENV,
    });
  } else {
    console.log('✅ [EMAIL] Gmail SMTP connection verified successfully');
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
    console.log(`[EMAIL] Starting ticket email for ID: ${ticket.ticketId}`);
    console.log(`[EMAIL] Recipient: ${ticket.email}`);
    
    // Generate PDF buffer
    console.log('[EMAIL] Generating PDF...');
    const pdfBuffer = await generateTicketPDF(ticket);
    console.log(`[EMAIL] PDF generated successfully (${pdfBuffer.length} bytes)`);

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

    console.log('[EMAIL] Preparing to send email...');
    console.log(`[EMAIL] From: ${mailOptions.from}`);
    console.log(`[EMAIL] To: ${mailOptions.to}`);
    console.log(`[EMAIL] Subject: ${mailOptions.subject}`);

    // Send email with timeout protection
    const sendPromise = transporter.sendMail(mailOptions);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Email send timeout after 30 seconds')), 30000)
    );

    const result = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [EMAIL] Email sent successfully!`);
    console.log(`✅ [EMAIL] Message ID: ${result.messageId}`);
    return result;
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send email for ticket ${ticket.ticketId}`);
    console.error(`❌ [EMAIL] Recipient: ${ticket.email}`);
    console.error(`❌ [EMAIL] Error type: ${error.code || error.name}`);
    console.error(`❌ [EMAIL] Error message: ${error.message}`);
    
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      console.error('❌ [EMAIL] Connection issue detected - Gmail SMTP unreachable from Render');
      console.error('❌ [EMAIL] This may be a firewall/network issue on the hosting provider');
    }
    
    console.error(`❌ [EMAIL] Full error:`, error);
    throw error;
  }
};
