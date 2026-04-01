import { Resend } from 'resend';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

const smtpTransport =
  process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD
    ? nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      })
    : null;

const sendWithSmtpFallback = async ({ to, subject, html, attachments = [] }) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.EMAIL_USER || 'tickets@aaunightlife.com';
  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      attachments,
    });

    if (error) {
      throw error;
    }
    return;
  } catch (resendError) {
    if (!smtpTransport) {
      throw resendError;
    }

    await smtpTransport.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'AAU Nightlife'} <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments: attachments.map((item) => ({
        filename: item.filename,
        content: item.content,
      })),
    });
  }
};

// Verify Resend connection on startup
console.log('[EMAIL] Verifying Resend configuration...');
if (!process.env.RESEND_API_KEY) {
  console.error('❌ [EMAIL] Resend API key not found in environment variables');
  console.error('   Config check:', {
    resendApiKey: !!process.env.RESEND_API_KEY,
    nodeEnv: process.env.NODE_ENV,
  });
} else {
  console.log('✅ [EMAIL] Resend initialized with API key');
}

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

// Send ticket email via Resend
export const sendTicketEmail = async (ticket) => {
  try {
    console.log(`[EMAIL] Starting ticket email for ID: ${ticket.ticketId}`);
    console.log(`[EMAIL] Recipient: ${ticket.email}`);
    
    // Generate PDF buffer
    console.log('[EMAIL] Generating PDF...');
    const pdfBuffer = await generateTicketPDF(ticket);
    console.log(`[EMAIL] PDF generated successfully (${pdfBuffer.length} bytes)`);

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'tickets@aaunightlife.com';

    console.log('[EMAIL] Preparing to send email via Resend...');
    console.log(`[EMAIL] From: ${fromEmail}`);
    console.log(`[EMAIL] To: ${ticket.email}`);

    // Send email with Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
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
        },
      ],
    });

    if (error) {
      throw error;
    }

    console.log(`✅ [EMAIL] Email sent successfully via Resend!`);
    console.log(`✅ [EMAIL] Email ID: ${data.id}`);
    return data;
  } catch (error) {
    console.error(`❌ [EMAIL] Failed to send email for ticket ${ticket.ticketId}`);
    console.error(`❌ [EMAIL] Recipient: ${ticket.email}`);
    console.error(`❌ [EMAIL] Error type: ${error.name}`);
    console.error(`❌ [EMAIL] Error message: ${error.message}`);
    
    if (error.message.includes('API key')) {
      console.error('❌ [EMAIL] Resend API key issue - check RESEND_API_KEY environment variable');
    }
    
    console.error(`❌ [EMAIL] Full error:`, error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, resetToken, name = 'there') => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password/${resetToken}`;

    const subject = 'Reset your AAU Nightlife password';
    const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #DAA520; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: black; font-size: 26px;">Password Reset</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hi ${name},</p>
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your AAU Nightlife account password. Use the button below to continue.
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #DAA520; color: #111; text-decoration: none; font-weight: bold; border-radius: 6px;">Reset Password</a>
            </div>
            <p style="color: #666; line-height: 1.6;">This link expires in 30 minutes. If you did not request this, you can ignore this email.</p>
          </div>
        </div>
      `;

    await sendWithSmtpFallback({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('[EMAIL] Password reset email failed:', error.message);
    throw error;
  }
};

export const sendEmailVerificationEmail = async (email, verificationToken, name = 'there') => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verifyLink = `${frontendUrl}/verify-email/${verificationToken}`;

    const subject = 'Verify your AAU Nightlife email';
    const html = `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #DAA520; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: black; font-size: 26px;">Verify Your Email</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p style="font-size: 16px; color: #333;">Hi ${name},</p>
            <p style="color: #666; line-height: 1.6;">
              Thanks for creating an AAU Nightlife account. Please verify your email address to activate your account.
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="${verifyLink}" style="display: inline-block; padding: 12px 24px; background-color: #DAA520; color: #111; text-decoration: none; font-weight: bold; border-radius: 6px;">Verify Email</a>
            </div>
            <p style="color: #666; line-height: 1.6;">This link expires in 24 hours. If you did not create this account, you can ignore this email.</p>
          </div>
        </div>
      `;

    await sendWithSmtpFallback({
      to: email,
      subject,
      html,
    });
  } catch (error) {
    console.error('[EMAIL] Verification email failed:', error.message);
    throw error;
  }
};

export const sendOrderTicketsEmail = async (order, tickets) => {
  try {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const maxAttachmentBytes = 20 * 1024 * 1024;
    let totalBytes = 0;
    const attachments = [];
    const ticketLinks = [];

    for (const ticket of tickets) {
      const pdfBuffer = await generateTicketPDF(ticket);
      const fileName = `ticket-${ticket.ticketId}.pdf`;
      ticketLinks.push(`${frontendUrl}/ticket/${ticket.ticketId}`);

      if (totalBytes + pdfBuffer.length <= maxAttachmentBytes && attachments.length < 10) {
        attachments.push({ filename: fileName, content: pdfBuffer });
        totalBytes += pdfBuffer.length;
      }
    }

    const hiddenLinks = ticketLinks.slice(attachments.length);

    const subject = `Your ${tickets.length} ticket(s) for ${tickets[0]?.eventTitle || 'AAU Nightlife Event'}`;
    const html = `
        <div style="font-family: Georgia, serif; max-width: 650px; margin: 0 auto;">
          <div style="background-color: #DAA520; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; color: black; font-size: 26px;">Tickets Confirmed</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #ddd; border-top: none;">
            <p style="margin-top: 0; color: #333;">Hi ${order.buyerName}, your order has been confirmed.</p>
            <p style="color: #666; line-height: 1.6; margin-bottom: 10px;">
              <strong>Quantity:</strong> ${order.quantity}<br />
              <strong>Ticket Type:</strong> ${order.ticketTypeName}<br />
              <strong>Total Paid:</strong> ₦${order.totalAmount.toLocaleString()}
            </p>
            <p style="color: #666; margin-bottom: 6px;"><strong>Ticket IDs</strong></p>
            <ul style="color: #666; line-height: 1.7;">
              ${tickets.map((ticket) => `<li>${ticket.ticketId}</li>`).join('')}
            </ul>
            <p style="color: #666; margin-bottom: 6px;"><strong>Ticket Links</strong></p>
            <ul style="color: #666; line-height: 1.7; word-break: break-all;">
              ${ticketLinks.map((link) => `<li><a href="${link}">${link}</a></li>`).join('')}
            </ul>
            ${hiddenLinks.length > 0 ? `<p style="color:#a0522d;">Some tickets are provided via links only to keep email size safe.</p>` : ''}
          </div>
        </div>
      `;

    await sendWithSmtpFallback({
      to: order.buyerEmail,
      subject,
      html,
      attachments,
    });
  } catch (error) {
    console.error('[EMAIL] Multi-ticket order email failed:', error.message);
    throw error;
  }
};
