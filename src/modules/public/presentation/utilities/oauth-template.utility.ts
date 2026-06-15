import fs from "fs";
import Handlebars from "handlebars";
import * as path from "path";

const templatesDir = path.join(__dirname, "../templates");

/**
 * Load and compile the OAuth callback template
 * @returns Compiled Handlebars template
 */
function loadOAuthTemplate(): Handlebars.TemplateDelegate {
  const filePath = path.join(templatesDir, "oauth-callback.hbs");

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`);
  }

  const source = fs.readFileSync(filePath, "utf-8");
  return Handlebars.compile(source);
}

/**
 * Render OAuth callback page (success or error)
 */
export function renderOAuthCallback(data: {
  isSuccess: boolean;
  title?: string;
  message?: string;
  description?: string;
  email?: string;
  reason?: string;
  retryUrl?: string;
}): string {
  const template = loadOAuthTemplate();

  if (data.isSuccess) {
    return template({
      isSuccess: true,
      title: data.title || "Authorization Successful!",
      message: data.message,
      description:
        data.description ||
        "Your Google account has been successfully connected. You can now use authorized features in the application.",
      email: data.email,
    });
  } else {
    return template({
      isSuccess: false,
      title: data.title || "Authorization Failed",
      message: data.message || "An error occurred during authorization.",
      description:
        data.description ||
        "We encountered an error while trying to connect your Google account. Please try again.",
      reason: data.reason,
      retryUrl: data.retryUrl,
    });
  }
}
