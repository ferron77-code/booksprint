<?php
/* Worldwide Distributors — project enquiry handler.
   Plain PHP so it runs on shared hosting with nothing to install.
   Set $TO to the address that should receive enquiries before go-live. */

$TO      = 'info@elighting.org';
$SUBJECT = 'Website enquiry';
$BACK    = 'contact.html';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . $BACK, true, 303);
    exit;
}

/* Honeypot: real people never fill this in. */
if (!empty($_POST['website'])) {
    header('Location: ' . $BACK . '?sent=1', true, 303);
    exit;
}

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

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    header('Location: ' . $BACK . '?error=1', true, 303);
    exit;
}

$body = "New enquiry from the website\n\n"
      . "Name:      $name\n"
      . "Company:   $company\n"
      . "Email:     $email\n"
      . "Phone:     $phone\n"
      . "Type:      $kind\n"
      . "Location:  $location\n\n"
      . "Message:\n$message\n";

/* From: must be a domain this server is allowed to send as, or the mail
   is dropped. The visitor's address goes in Reply-To instead. */
$host    = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9.\-]/i', '', $_SERVER['HTTP_HOST']) : 'localhost';
$headers = "From: Website <no-reply@$host>\r\n"
         . 'Reply-To: ' . $email . "\r\n"
         . "Content-Type: text/plain; charset=UTF-8\r\n";

@mail($TO, $SUBJECT . ' — ' . $name, $body, $headers);

header('Location: ' . $BACK . '?sent=1', true, 303);
exit;
