// Escapes HTML special chars to prevent XSS when injecting text into innerHTML
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Formats a number as Indian Rupee currency with 2 decimal places
const formatCurrency = (amount) => {
  return `₹${(parseFloat(amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Converts a date string to a readable Indian locale format (e.g. "15 June 2024")
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const GST_RATE = 0.05; // 5% GST

// Generates and downloads a PDF invoice with full price breakdown including GST
export async function generateInvoicePDF(booking, currentUser, role = 'customer') {
  const { jsPDF } = await import('jspdf');
  const html2canvasModule = await import('html2canvas');
  const html2canvas = html2canvasModule.default || html2canvasModule;

  const eventData = booking.event || booking.Event || {};
  const customerData = role === 'manager'
    ? (booking.customer || booking.User || {})
    : (currentUser || {});
  const basePrice = parseFloat(eventData.price) || 0;
  const guests = booking.guests || 1;
  const maxGuests = eventData.maxGuests || 0;
  const perExtraGuestPrice = parseFloat(eventData.perExtraGuestPrice) || 0;
  const selectedAddons = booking.selectedAddons || {};
  const addonPrices = eventData.addonPrices || {};
  const selectedCustomAddons = booking.selectedCustomAddons || [];
  const selectedServiceItems = booking.selectedServiceItems || {};
  const addonServices = eventData.addonServices || {};
  const specialRequestPrice = parseFloat(booking.specialRequestPrice) || 0;

  // Calculate extra guests cost
  let extraGuestsCost = 0;
  if (maxGuests > 0 && guests > maxGuests) {
    extraGuestsCost = (guests - maxGuests) * perExtraGuestPrice;
  }

  // Calculate standard add-ons total
  let addonsTotal = 0;
  let addonsHtml = '';
  if (selectedAddons && typeof selectedAddons === 'object') {
    for (const [key, value] of Object.entries(selectedAddons)) {
      if (value && addonPrices[key]) {
        const price = parseFloat(addonPrices[key]) || 0;
        addonsTotal += price;
        addonsHtml += `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">${escapeHtml(key.charAt(0).toUpperCase() + key.slice(1))} (Flat Rate)</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(price)}</td>
          </tr>
        `;
      }
    }
  }

  // Calculate custom add-ons total
  let customAddonsTotal = 0;
  let customAddonsHtml = '';
  if (selectedCustomAddons && selectedCustomAddons.length > 0) {
    for (const addon of selectedCustomAddons) {
      const price = parseFloat(addon.price) || 0;
      customAddonsTotal += price;
      customAddonsHtml += `
        <tr>
          <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">🎁 ${escapeHtml(addon.name)}</td>
          <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(price)}</td>
        </tr>
      `;
    }
  }

  // Calculate detailed service items - grouped by service name (totaled)
  let serviceItemsTotal = 0;
  let serviceItemsHtml = '';
  if (selectedServiceItems && typeof selectedServiceItems === 'object') {
    for (const [serviceName, categories] of Object.entries(selectedServiceItems)) {
      const serviceConfig = addonServices[serviceName];
      if (!serviceConfig) continue;

      let serviceTotal = 0;
      for (const [categoryName, items] of Object.entries(categories)) {
        const category = (serviceConfig.categories || []).find(c => c.name === categoryName);
        if (!category) continue;
        for (const selectedItem of items) {
          const matchingItem = (category.items || []).find(i => i.name === selectedItem.name);
          if (matchingItem) {
            const qty = parseInt(selectedItem.quantity) || 1;
            const rate = parseFloat(matchingItem.rate) || 0;
            // Catering items are per guest
            if (serviceName === "catering" && guests > 0) {
              serviceTotal += rate * qty * guests;
            } else {
              serviceTotal += rate * qty;
            }
          }
        }
      }

      if (serviceTotal > 0) {
        serviceItemsTotal += serviceTotal;
        const icon = serviceName === "catering" ? "🍽️" : serviceName === "decoration" ? "🎨" : serviceName === "photography" ? "📸" : serviceName === "music" ? "🎵" : serviceName === "transport" ? "🚗" : "🔧";
        const label = serviceName.charAt(0).toUpperCase() + serviceName.slice(1).replace(/-/g, " ");
        const note = serviceName === "catering" ? ` (for ${guests} guests)` : "";
        serviceItemsHtml += `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">${icon} ${escapeHtml(label)}${note}</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(serviceTotal)}</td>
          </tr>
        `;
      }
    }
  }

  // Calculate subtotal, GST, and grand total
  const discountAmount = parseFloat(booking.discountAmount) || 0;
  const subtotal = basePrice + extraGuestsCost + addonsTotal + customAddonsTotal + serviceItemsTotal + specialRequestPrice;
  const afterDiscount = subtotal - discountAmount;
  const gstAmount = afterDiscount * GST_RATE;
  const grandTotal = afterDiscount + gstAmount;

  const invoiceElement = document.createElement('div');
  invoiceElement.style.width = '800px';
  invoiceElement.style.padding = '40px';
  invoiceElement.style.backgroundColor = 'white';
  invoiceElement.style.fontFamily = 'Arial, sans-serif';
  invoiceElement.style.position = 'absolute';
  invoiceElement.style.left = '-9999px';

  invoiceElement.innerHTML = `
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #6366f1; margin-bottom: 5px; font-size: 28px;">EVENTHUB</h1>
      <p style="color: #6b7280; margin: 0; font-size: 14px;">TAX INVOICE</p>
      <hr style="border: 2px solid #6366f1; width: 80px; margin: 12px auto;">
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div>
        <h4 style="color: #374151; margin-bottom: 8px;">Invoice To:</h4>
        <p style="margin: 4px 0;"><strong>${escapeHtml(customerData.name || 'Customer')}</strong></p>
        <p style="margin: 4px 0; color: #6b7280;">${escapeHtml(customerData.email || 'N/A')}</p>
        <p style="margin: 4px 0; color: #6b7280;">${escapeHtml(customerData.mobile || 'N/A')}</p>
      </div>
      <div style="text-align: right;">
        <h4 style="color: #374151; margin-bottom: 8px;">Invoice Details:</h4>
        <p style="margin: 4px 0;"><strong>Invoice #:</strong> INV-${booking.id}</p>
        <p style="margin: 4px 0;"><strong>Date:</strong> ${formatDate(new Date())}</p>
        <p style="margin: 4px 0;"><strong>Booking ID:</strong> #${booking.id}</p>
        <p style="margin: 4px 0;"><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">${escapeHtml((booking.status || 'CONFIRMED').toUpperCase())}</span></p>
      </div>
    </div>
    
    <div style="margin-bottom: 25px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0;">
      <h4 style="color: #374151; margin-bottom: 12px;">Event Details</h4>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; width: 140px;"><strong>Event:</strong></td>
          <td style="padding: 6px 0;">${escapeHtml(eventData.name || 'Event')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>Category:</strong></td>
          <td style="padding: 6px 0;">${escapeHtml(eventData.category || 'Not specified')}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>Event Date:</strong></td>
          <td style="padding: 6px 0;">${formatDate(booking.eventDate)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>Guests:</strong></td>
          <td style="padding: 6px 0;">${guests}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0;"><strong>Booked On:</strong></td>
          <td style="padding: 6px 0;">${formatDate(booking.createdAt)}</td>
        </tr>
        ${booking.completedAt ? `
        <tr>
          <td style="padding: 6px 0;"><strong>Completed:</strong></td>
          <td style="padding: 6px 0;">${formatDate(booking.completedAt)}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="margin-bottom: 25px;">
      <h4 style="color: #374151; margin-bottom: 12px;">Price Breakdown</h4>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f3f4f6;">
            <th style="padding: 12px; text-align: left; font-size: 13px; color: #374151;">Description</th>
            <th style="padding: 12px; text-align: right; font-size: 13px; color: #374151;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">Base Package Price</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(basePrice)}</td>
          </tr>
          ${extraGuestsCost > 0 ? `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">Extra Guests (${guests - maxGuests} × ${formatCurrency(perExtraGuestPrice)})</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(extraGuestsCost)}</td>
          </tr>
          ` : ''}
          ${addonsHtml}
          ${serviceItemsHtml}
          ${customAddonsHtml}
          ${specialRequestPrice > 0 ? `
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">Special Request Charges</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(specialRequestPrice)}</td>
          </tr>
          ` : ''}
          <tr style="background: #f9fafb;">
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb;"><strong>Subtotal</strong></td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e5e7eb;"><strong>${formatCurrency(subtotal)}</strong></td>
          </tr>
          ${discountAmount > 0 ? `
          <tr style="background: #fef3c7;">
            <td style="padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #92400e;">🎉 Discount${booking.discountReason ? ' (' + escapeHtml(booking.discountReason) + ')' : ''}</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">-${formatCurrency(discountAmount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6;">GST (5%)</td>
            <td style="padding: 10px 12px; text-align: right; border-bottom: 1px solid #f3f4f6;">${formatCurrency(gstAmount)}</td>
          </tr>
          <tr style="background: linear-gradient(135deg, #ecfdf5, #d1fae5);">
            <td style="padding: 14px 12px; font-size: 16px;"><strong>Grand Total (incl. GST)</strong></td>
            <td style="padding: 14px 12px; text-align: right; font-size: 16px; color: #059669;"><strong>${formatCurrency(grandTotal)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    ${booking.specialRequests ? `
    <div style="margin-bottom: 25px; background: #fffbeb; padding: 14px; border-radius: 8px; border-left: 4px solid #f59e0b;">
      <h4 style="color: #92400e; margin-bottom: 6px; font-size: 14px;">Special Requests</h4>
      <p style="margin: 0; color: #78350f; font-size: 13px;">${escapeHtml(booking.specialRequests)}</p>
    </div>
    ` : ''}
    
    <div style="margin-top: 40px; text-align: center; border-top: 2px solid #e5e7eb; padding-top: 20px;">
      <p style="color: #6b7280; font-size: 12px; margin: 4px 0;">Thank you for choosing EventHub!</p>
      <p style="color: #6b7280; font-size: 12px; margin: 4px 0;">For queries, contact: sannithsanni2005@gmail.com | +91 7892119598</p>
      <p style="color: #9ca3af; font-size: 11px; margin-top: 8px;">This is a computer-generated invoice and does not require a signature.</p>
    </div>
  `;

  document.body.appendChild(invoiceElement);

  try {
    await new Promise(resolve => setTimeout(resolve, 100));

    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * pageWidth) / canvas.width;

    let finalWidth = pageWidth;
    let finalHeight = imgHeight;
    if (finalHeight > pageHeight) {
      const scale = pageHeight / finalHeight;
      finalHeight = pageHeight;
      finalWidth = pageWidth * scale;
    }

    const xOffset = (pageWidth - finalWidth) / 2;
    pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);

    pdf.save(`Invoice_EventHub_${booking.id}.pdf`);
    return true;
  } finally {
    document.body.removeChild(invoiceElement);
  }
}

export default generateInvoicePDF;
