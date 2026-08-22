<?php
/* Worldwide Distributors — project enquiry handler.
   Plain PHP so it runs on shared hosting with nothing to install.
   Set $TO to the address that should receive enquiries before go-live.

   Attachments are validated by their actual contents, never by the name the
   browser sent, and are mailed straight through rather than written to disk:
   nothing this script accepts ever lands in a directory the web server could
   be persuaded to execute. */

$TO      = 'info@elighting.org';
$SUBJECT = 'Website enquiry';
$BACK    = 'contact.html';

/* Attachment limits. Keep TOTAL under the receiving mailbox's own limit —
   most reject a message over 25 MB, and base64 inflates by a third. */
$MAX_FILES = 8;
$MAX_ONE   = 10 * 1024 * 1024;
$MAX_TOTAL = 20 * 1024 * 1024;

/* Detected type => the extension the attachment is allowed to carry. The
   name the browser supplied has no say in this. */
$ALLOWED = array(
    'image/jpeg'      => 'jpg',
    'image/png'       => 'png',
    'image/gif'       => 'gif',
    'image/webp'      => 'webp',
    'image/heic'      => 'heic',
    'image/heif'      => 'heif',
    'application/pdf' => 'pdf',
);

function back($q) {
    global $BACK;
    header('Location: ' . $BACK . $q, true, 303);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') back('');

/* A POST larger than post_max_size arrives with $_POST and $_FILES both
   empty and no error flag anywhere — PHP discards it before this script
   runs. Without this check that looks identical to a blank form. */
if (empty($_POST) && empty($_FILES)
    && isset($_SERVER['CONTENT_LENGTH']) && (int) $_SERVER['CONTENT_LENGTH'] > 0) {
    back('?error=big');
}

/* Honeypot: real people never fill this in. */
if (!empty($_POST['website'])) back('?sent=1');

function field($k, $max = 2000) {
    $v = isset($_POST[$k]) ? (string) $_POST[$k] : '';
    $v = str_replace(array("\r", "\n"), ' ', $v);
    return trim(mb_substr($v, 0, $max));
}

$name     = field('name', 120);
$company  = field('company', 160);
$email    = field('email', 200);
$phone    = field('phone', 60);
$kind     = field('kind', 80);
$location = field('location', 200);
$message  = trim(mb_substr(isset($_POST['message']) ? (string) $_POST['message'] : '', 0, 4000));

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) back('?error=1');

/* ── attachments ──────────────────────────────────────────────────────── */
$attach = array();
$total  = 0;

if (!empty($_FILES['files']) && is_array($_FILES['files']['name'])) {
    $n = count($_FILES['files']['name']);
    $sent = 0;
    for ($i = 0; $i < $n; $i++) {
        if ($_FILES['files']['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        $sent++;
    }
    if ($sent > $MAX_FILES) back('?error=count');

    /* finfo is what makes the type check meaningful. If the host has neither
       it nor mime_content_type, refuse the attachments rather than trust the
       browser's Content-Type, which the sender controls. */
    $fi = class_exists('finfo') ? new finfo(FILEINFO_MIME_TYPE) : null;
    if ($fi === null && !function_exists('mime_content_type') && $sent > 0) back('?error=type');

    for ($i = 0; $i < $n; $i++) {
        $err = $_FILES['files']['error'][$i];
        if ($err === UPLOAD_ERR_NO_FILE) continue;
        if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) back('?error=size');
        if ($err !== UPLOAD_ERR_OK) back('?error=upload');

        $tmp = $_FILES['files']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) back('?error=upload');

        $size = (int) $_FILES['files']['size'][$i];
        if ($size <= 0 || $size > $MAX_ONE) back('?error=size');
        $total += $size;
        if ($total > $MAX_TOTAL) back('?error=size');

        $mime = $fi ? $fi->file($tmp) : mime_content_type($tmp);
        if (!isset($ALLOWED[$mime])) back('?error=type');

        /* Rebuild the filename from scratch: keep a readable stem from what
           the sender called it, then put our own extension on it. A name
           like "roof.php" or one carrying a CRLF cannot survive this. */
        $stem = pathinfo((string) $_FILES['files']['name'][$i], PATHINFO_FILENAME);
        $stem = preg_replace('/[^A-Za-z0-9 ._-]/', '', $stem);
        $stem = trim(preg_replace('/\s+/', ' ', $stem));
        if ($stem === '') $stem = 'attachment-' . ($i + 1);
        $stem = mb_substr($stem, 0, 60);

        $data = file_get_contents($tmp);
        if ($data === false) back('?error=upload');

        $attach[] = array(
            'name' => $stem . '.' . $ALLOWED[$mime],
            'mime' => $mime,
            'data' => $data,
        );
    }
}

/* ── the message ──────────────────────────────────────────────────────── */
$body = "New enquiry from the website\n\n"
      . "Name:      $name\n"
      . "Company:   $company\n"
      . "Email:     $email\n"
      . "Phone:     $phone\n"
      . "Type:      $kind\n"
      . "Location:  $location\n\n"
      . "Message:\n$message\n";

if ($attach) {
    $body .= "\nAttached (" . count($attach) . "):\n";
    foreach ($attach as $a) {
        $body .= '  ' . $a['name'] . '  ' . round(strlen($a['data']) / 1024) . " KB\n";
    }
}

/* From: must be a domain this server is allowed to send as, or the mail
   is dropped. The visitor's address goes in Reply-To instead. */
$host    = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST']) : 'localhost';
$headers = "From: Website <no-reply@$host>\r\n"
         . 'Reply-To: ' . $email . "\r\n"
         . "MIME-Version: 1.0\r\n";

if (!$attach) {
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $payload  = $body;
} else {
    $b = '=_' . bin2hex(function_exists('random_bytes') ? random_bytes(16) : pack('N4', mt_rand(), mt_rand(), mt_rand(), mt_rand()));
    $headers .= "Content-Type: multipart/mixed; boundary=\"$b\"\r\n";
    $payload  = "This message has attachments and needs a MIME-capable reader.\r\n\r\n"
              . "--$b\r\nContent-Type: text/plain; charset=UTF-8\r\n"
              . "Content-Transfer-Encoding: 8bit\r\n\r\n" . $body . "\r\n";
    foreach ($attach as $a) {
        $payload .= "--$b\r\n"
                  . 'Content-Type: ' . $a['mime'] . "; name=\"" . $a['name'] . "\"\r\n"
                  . "Content-Transfer-Encoding: base64\r\n"
                  . 'Content-Disposition: attachment; filename="' . $a['name'] . "\"\r\n\r\n"
                  . chunk_split(base64_encode($a['data'])) . "\r\n";
    }
    $payload .= "--$b--\r\n";
}

if (!@mail($TO, $SUBJECT . ' — ' . $name, $payload, $headers)) back('?error=mail');

back('?sent=1');
