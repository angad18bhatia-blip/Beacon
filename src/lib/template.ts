export const DEFAULT_SUBJECT_TEMPLATE =
  "{{degree_level}} interested in your research on {{research_area}}";

export const DEFAULT_BODY_TEMPLATE = `Dear Professor {{professor_name}},

My name is {{student_name}}, and I am a {{degree_level}} at {{student_school}} with a strong interest in {{area_of_study}}. I came across your work on {{research_area}} at {{professor_school}} and wanted to reach out directly.

{{bio}}

{{capability_note}} Thank you for your time and consideration.

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
  capability_note: string;
};

// The one line in the default template that has to change tone depending
// on who's asking — a high schooler and a college student are realistically
// asking for different things, so pretending otherwise reads oddly either
// way. Matched against the degree-level option labels in the onboarding/
// settings forms ("9th Grader" ... "College Senior") — anything ending in
// "Grader" is treated as high school, everything else as college+.
export function getCapabilityNote(degreeLevel: string): string {
  const isHighSchool = /grader$/i.test(degreeLevel.trim());
  if (isHighSchool) {
    return "I understand you likely can't take on a high schooler as a full research assistant, but I'd be grateful for any way to get involved or learn more, even in a small capacity — shadowing, a short project, or just advice on how to pursue this area further.";
  }
  return "I'd love to learn more about any research assistant positions, volunteer research opportunities, or ongoing projects in your lab that I could contribute to, even in a limited capacity alongside coursework.";
}

export function renderTemplate(template: string, fields: MergeFields) {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) => {
    return key in fields ? fields[key as keyof MergeFields] : match;
  });
}
