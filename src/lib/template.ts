export const DEFAULT_SUBJECT_TEMPLATE =
  "Interested in research opportunities in {{research_area}}";

export const DEFAULT_BODY_TEMPLATE = `Dear Professor {{professor_name}},

My name is {{student_name}}, and I am a {{degree_level}} student at {{student_school}} studying {{area_of_study}}. I came across your work on {{research_area}} at {{professor_school}} and wanted to reach out directly.

{{bio}}

I would welcome the opportunity to discuss any potential research openings in your lab. Thank you for your time and consideration.

Best regards,
{{student_name}}`;

export type MergeFields = {
  professor_name: string;
  professor_school: string;
  research_area: string;
  student_name: string;
  student_school: string;
  area_of_study: string;
  degree_level: string;
  bio: string;
};

export function renderTemplate(template: string, fields: MergeFields) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) => {
    return key in fields ? fields[key as keyof MergeFields] : match;
  });
}
