const nodemailer = require("nodemailer");

const env = require("../config/env");
const createHttpError = require("./createHttpError");

let transporter = null;

const isMailConfigured = () =>
  Boolean(
    env.mail.host &&
      env.mail.port &&
      env.mail.user &&
      env.mail.pass &&
      env.mail.fromEmail
  );

const getMailer = () => {
  if (!isMailConfigured()) {
    throw createHttpError(
      503,
      "Email verification is not configured yet on the server."
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: {
        user: env.mail.user,
        pass: env.mail.pass,
      },
    });
  }

  return transporter;
};

const buildFromHeader = () =>
  env.mail.fromName
    ? `"${env.mail.fromName}" <${env.mail.fromEmail}>`
    : env.mail.fromEmail;

const sendMail = async ({ to, subject, text, html }) => {
  const mailer = getMailer();

  return mailer.sendMail({
    from: buildFromHeader(),
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  isMailConfigured,
  sendMail,
};
