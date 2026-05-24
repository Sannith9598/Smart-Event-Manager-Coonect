const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.APP_PASSWORD,
  },
});

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

  await transporter.sendMail({
    to: customerEmail,
    subject: `✅ Booking Confirmed - ${event?.name || 'Your Event'}`,
    text: textContent,
    html,
  });
};

const sendBookingRejection = async (customerEmail, customerName, booking, event, reason) => {
  const textContent = `Booking Update\n\nHello ${customerName},\n\nUnfortunately, your booking request could not be confirmed.\n\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}${reason ? `\nReason: ${reason}` : ''}\n\nYou can browse other events on our platform.\n\n— EventHub Team`;

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

  await transporter.sendMail({
    to: customerEmail,
    subject: `Booking Update - ${event?.name || 'Your Event'}`,
    text: textContent,
    html,
  });
};

const sendNewBookingToManager = async (managerEmail, managerName, booking, event, customer) => {
  const textContent = `New Booking Request!\n\nHello ${managerName},\n\nYou have a new booking request.\n\nCustomer: ${customer?.name || 'Customer'}\nEmail: ${customer?.email || 'N/A'}\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\nGuests: ${booking.guests || 1}\nTotal Price: ₹${booking.totalPrice?.toLocaleString() || 0}\n\nPlease log in to your dashboard to manage this booking.\n\n— EventHub Team`;

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

  await transporter.sendMail({
    to: managerEmail,
    subject: `📋 New Booking Request - ${event?.name || 'Event'}`,
    text: textContent,
    html,
  });
};

const sendBookingCompleted = async (customerEmail, customerName, booking, event) => {
  const textContent = `Event Completed!\n\nHello ${customerName},\n\nYour event has been marked as completed. We hope you had an amazing experience!\n\nEvent: ${event?.name || 'Event'}\nDate: ${new Date(booking.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nDon't forget to leave a review for your event manager!\nYou can download your invoice from your dashboard.\n\n— EventHub Team`;

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
        
        <p>📝 Don't forget to leave a review for your event manager! Your feedback helps other customers make better decisions.</p>
        <p>📄 You can download your invoice from your dashboard.</p>
        <p style="color: #6b7280; font-size: 12px;">— EventHub Team</p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    to: customerEmail,
    subject: `🎊 Event Completed - ${event?.name || 'Your Event'}`,
    text: textContent,
    html,
  });
};

module.exports = {
  transporter,
  sendBookingConfirmation,
  sendBookingRejection,
  sendNewBookingToManager,
  sendBookingCompleted,
};
