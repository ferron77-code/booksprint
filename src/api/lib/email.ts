import { sendEmail } from "@runablehq/website-runtime/server";

interface DownloadEmailOptions {
  runableUrl: string;
  buyerEmail: string;
  buyerName: string;
  bookTitle: string;
  coverUrl?: string | null;
  pdfUrl: string;
  valueEnhancerUrl?: string | null;
  origin: string;
}

export async function sendDownloadEmail({
  runableUrl,
  buyerEmail,
  buyerName,
  bookTitle,
  pdfUrl,
  valueEnhancerUrl,
  origin,
}: DownloadEmailOptions) {
  const pdfFullUrl = `${origin}${pdfUrl}`;
  const veFullUrl = valueEnhancerUrl ? `${origin}${valueEnhancerUrl}` : null;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Download Is Ready</title>
</head>
<body style="margin:0;padding:0;background:#0e0e0e;font-family:'DM Sans',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    
    <!-- Header -->
    <div style="margin-bottom:32px;">
      <span style="background:#e85d26;color:#fff;font-weight:700;font-size:18px;padding:8px 16px;letter-spacing:2px;display:inline-block;">BOOKSPRINT</span>
      <p style="color:#a09890;font-size:12px;margin:4px 0 0 0;text-transform:uppercase;letter-spacing:1px;">by Into All The World Digital Products</p>
    </div>

    <!-- Main -->
    <div style="background:#161616;border:1px solid #2a2a2a;padding:32px;margin-bottom:24px;">
      <div style="width:48px;height:48px;background:#e85d26;display:flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="color:#fff;font-size:24px;">✓</span>
      </div>
      <h1 style="color:#f5f0eb;font-size:24px;font-weight:700;margin:0 0 8px 0;">Your purchase is ready!</h1>
      <p style="color:#a09890;margin:0 0 24px 0;">Hi ${buyerName}, thanks for your purchase. Here are your download links for <strong style="color:#f5f0eb;">${bookTitle}</strong>.</p>
      
      <!-- Download buttons -->
      <div style="margin-bottom:16px;">
        <a href="${pdfFullUrl}" 
           style="display:block;background:#e85d26;color:#fff;text-decoration:none;padding:14px 20px;font-weight:700;font-size:14px;margin-bottom:12px;">
          📄 Download Ebook (HTML/PDF)
        </a>
        ${veFullUrl ? `
        <a href="${veFullUrl}" 
           style="display:block;background:#1e1e1e;border:1px solid #2a2a2a;color:#f5f0eb;text-decoration:none;padding:14px 20px;font-weight:600;font-size:14px;margin-bottom:12px;">
          🎁 Download Bonus Pack
        </a>
        ` : ''}
      </div>
      
      <p style="color:#a09890;font-size:12px;margin:0;">
        These links are for your personal use. If you have any issues accessing your files, please reply to this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="border-top:1px solid #2a2a2a;padding-top:20px;">
      <p style="color:#a09890;font-size:12px;margin:0;">
        Into All The World Digital Products — AI-Powered Digital Publishing<br>
        <a href="${origin}/store" style="color:#e85d26;text-decoration:none;">Browse more books</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  await sendEmail({
    url: runableUrl,
    to: buyerEmail,
    subject: `Your download is ready: ${bookTitle}`,
    html,
  });
}
