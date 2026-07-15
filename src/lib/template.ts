export const DEFAULT_SUBJECT_TEMPLATE =
  "High school student interested in your research on {{research_area}}";

export const DEFAULT_BODY_TEMPLATE = `Dear Professor {{professor_name}},

My name is {{student_name}}, and I am a {{degree_level}} student at {{student_school}} with a strong interest in {{area_of_study}}. I came across your work on {{research_area}} at {{professor_school}} and wanted to reach out directly.

{{bio}}

I understand you likely can't take on a high schooler as a full research assistant, but I'd be grateful for any way to get involved or learn more, even in a small capacity — shadowing, a short project, or just advice on how to pursue this area further. Thank you for your time and consideration.

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
