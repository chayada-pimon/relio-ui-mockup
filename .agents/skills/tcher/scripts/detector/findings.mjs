import { getAntipattern } from './registry/antipatterns.mjs';

function getAP(id) {
  return getAntipattern(id);
}

function finding(id, filePath, snippet, line = 0) {
  const ap = getAP(id);
  const f = { antipattern: id, name: ap.name, description: ap.description, severity: ap.severity || 'warning', category: ap.category, file: filePath, line, snippet };
  if (ap.law) f.law = ap.law; // Laws of UX principle the rule operationalizes
  return f;
}

export { getAP, finding };
