// Brevo (formerly Sendinblue) - HTTP API email sender
// Works on Render free tier (uses HTTPS, not SMTP)

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "mailserviceforproject@gmail.com";
const FROM_NAME = process.env.FROM_NAME || "EventHub";

const sendEmail = async ({ to, subject, html, text }) => {
  // Brevo requires textContent to be a non-empty string
  const textContent = text || subject || "EventHub Notification";
  
  const body = {
    sender: { name: FROM_NAME, email: FROM_EMAIL },
    to: [{ email: to }],
    subject,
    textContent,
  };

  // Only add htmlContent if html is provided
  if (html) {
    body.htmlContent = html;
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Brevo email error: ${err.message || JSON.stringify(err)}`);
  }

  return response.json();
};

const sendBookingConfirmation = async (customerEmail, customerName, booking, event, manager) => {
  const textContent = `Booking Confirmed!\n\nHello ${customerName},\n\nYour booking has been confirmed.\n\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\nGuests: ${booking.guests || 1}\nTotal Price: ₹${booking.totalPrice?.toLocaleString() || 0}\nManager: ${manager?.name || 'Event Manager'}\n\n— EventHub Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Booking Confirmed! 🎉</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Great news! Your booking has been confirmed by the event manager.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Event:</td><td style="padding: 8px 0;"><strong>${event?.name || 'Event'}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Date:</td><td style="padding: 8px 0;">${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Guests:</td><td style="padding: 8px 0;">${booking.guests || 1}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Total Price:</td><td style="padding: 8px 0; color: #6366f1; font-weight: bold;">₹${booking.totalPrice?.toLocaleString() || 0}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Manager:</td><td style="padding: 8px 0;">${manager?.name || 'Event Manager'}</td></tr>
          </table>
        </div>
        <p style="color: #6b7280;">You can view your booking details in your dashboard.</p>
        <p style="color: #6b7280; font-size: 12px;">— EventHub Team</p>
      </div>
    </div>
  `;

  await sendEmail({ to: customerEmail, subject: `✅ Booking Confirmed - ${event?.name || 'Your Event'}`, html, text: textContent });
};

const sendBookingRejection = async (customerEmail, customerName, booking, event, reason) => {
  const textContent = `Booking Update\n\nHello ${customerName},\n\nUnfortunately, your booking request could not be confirmed.\n\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${reason ? `\nReason: ${reason}` : ''}\n\n— EventHub Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: #ef4444; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Booking Update</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Unfortunately, your booking request could not be confirmed.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Booking Details</h3>
          <p><strong>Event:</strong> ${event?.name || 'Event'}</p>
          <p><strong>Date:</strong> ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>You can browse other events and planners on our platform.</p>
        <p style="color: #6b7280; font-size: 12px;">— EventHub Team</p>
      </div>
    </div>
  `;

  await sendEmail({ to: customerEmail, subject: `Booking Update - ${event?.name || 'Your Event'}`, html, text: textContent });
};

const sendNewBookingToManager = async (managerEmail, managerName, booking, event, customer) => {
  const textContent = `New Booking Request!\n\nHello ${managerName},\n\nYou have a new booking request.\n\nCustomer: ${customer?.name || 'Customer'}\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\nGuests: ${booking.guests || 1}\nTotal Price: ₹${booking.totalPrice?.toLocaleString() || 0}\n\n— EventHub Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">New Booking Request! 📋</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello <strong>${managerName}</strong>,</p>
        <p>You have a new booking request from a customer.</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Booking Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280;">Customer:</td><td style="padding: 8px 0;"><strong>${customer?.name || 'Customer'}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Email:</td><td style="padding: 8px 0;">${customer?.email || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Mobile:</td><td style="padding: 8px 0;">${customer?.mobile || 'N/A'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Event:</td><td style="padding: 8px 0;">${event?.name || 'Event'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Date:</td><td style="padding: 8px 0;">${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Guests:</td><td style="padding: 8px 0;">${booking.guests || 1}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Total Price:</td><td style="padding: 8px 0; color: #6366f1; font-weight: bold;">₹${booking.totalPrice?.toLocaleString() || 0}</td></tr>
          </table>
          ${booking.specialRequests ? `<p style="margin-top: 15px;"><strong>Special Requests:</strong> ${booking.specialRequests}</p>` : ''}
        </div>
        <p>Please log in to your dashboard to confirm or manage this booking.</p>
        <p style="color: #6b7280; font-size: 12px;">— EventHub Team</p>
      </div>
    </div>
  `;

  await sendEmail({ to: managerEmail, subject: `📋 New Booking Request - ${event?.name || 'Event'}`, html, text: textContent });
};

const sendBookingCompleted = async (customerEmail, customerName, booking, event) => {
  const textContent = `Event Completed!\n\nHello ${customerName},\n\nYour event has been marked as completed.\n\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\n— EventHub Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0;">Event Completed! 🎊</h1>
      </div>
      <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
        <p>Hello <strong>${customerName}</strong>,</p>
        <p>Your event has been marked as completed. We hope you had an amazing experience!</p>
        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Event:</strong> ${event?.name || 'Event'}</p>
          <p><strong>Date:</strong> ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <p>📝 Don't forget to leave a review for your event manager!</p>
        <p>📄 You can download your invoice from your dashboard.</p>
        <p style="color: #6b7280; font-size: 12px;">— EventHub Team</p>
      </div>
    </div>
  `;

  await sendEmail({ to: customerEmail, subject: `🎊 Event Completed - ${event?.name || 'Your Event'}`, html, text: textContent });
};

module.exports = {
  sendEmail,
  sendBookingConfirmation,
  sendBookingRejection,
  sendNewBookingToManager,
  sendBookingCompleted,
};
