import fs from "fs";
import Handlebars from "handlebars";
import * as path from "path";

const templatesDir = path.join(__dirname, "./../templates");

/**
 * Renders a JSON template string by replacing {{placeholders}} with values from data.
 * @param templateString - JSON template as string (with Handlebars placeholders)
 * @param data - Key/value pairs to replace placeholders
 * @returns Parsed JSON object with placeholders replaced
 */
export function renderJsonTemplateFromString<T>(
  templateString: string,
  data: Record<string, any>,
): T {
  // Step 1: Compile the string with Handlebars
  const template = Handlebars.compile(templateString);

  // Step 2: Apply data
  const renderedString = template(data);

  // Step 3: Parse back into JSON
  return JSON.parse(renderedString) as T;
}

/**
 * Renders a JSON template by replacing {{placeholders}} with values from data.
 */
export function renderJsonTemplate<T extends object>(
  templateJson: T,
  data: Record<string, any>,
): T {
  // Step 1: Convert JSON to string
  const jsonString = JSON.stringify(templateJson);
  return renderJsonTemplateFromString<T>(jsonString, data);
}

export function loadTemplate(
  templateName: string,
): Handlebars.TemplateDelegate {
  const filePath = path.join(templatesDir, `${templateName}.hbs`);
  const source = fs.readFileSync(filePath, "utf-8");
  return Handlebars.compile(source);
}
