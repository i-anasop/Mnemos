// Faithful mirror of extractProfileFacts() in lib/agents/memory-extractor.ts
const NOT_A_NAME = /^(an?|the|just|really|very|so|here|back|not|done|good|fine|ok(ay)?|sure|interested|into|learning|working|studying|deep|currently|trying)\b/i;
function cleanList(raw) {
  return raw.replace(/[.!?]+$/, '').split(/\s*,\s*|\s+and\s+|\s*\/\s*|\s*&\s*|\s*\+\s*/i).map(s => s.trim().replace(/[,;:]+$/, '').replace(/^(a|an|the)\s+/i, '').trim()).filter(s => s.length > 0 && s.length < 40).slice(0, 12);
}
function titleCaseName(s) { return s.trim().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, ''); }
function extract(text) {
  text = text.trim(); const facts = {};
  const nameMatch = text.match(/\b(?:my name(?:'s| is)|name(?:'s| is)|call me|i(?:'m| am) called)\s+([^.,;:!?\n]{1,60})/i);
  if (nameMatch) { const c = titleCaseName(nameMatch[1]); if (c && !NOT_A_NAME.test(c)) facts.name = c; }
  else { const iam = text.match(/\b[Ii](?:'m| am)\s+([A-Z][a-z'’-]+(?:\s+[A-Z][a-z'’-]+){0,3})\b/); if (iam && !NOT_A_NAME.test(iam[1])) facts.name = titleCaseName(iam[1]); }
  const stackMatch = text.match(/\b(?:tech\s*stack(?:\s+is|\s*[:=])?|i (?:use|work with|code in|build with|develop (?:in|with))|stack(?:\s+is|\s*[:=]))\s+(.+?)(?:[.!?](?:\s|$)|\n|$)/i);
  if (stackMatch) { const l = cleanList(stackMatch[1]); if (l.length) facts.tech_stack = l; }
  const roleMatch = text.match(/\bi(?:'m| am)\s+(?:an?\s+)?([a-z][\w\s-]{2,40}?(?:student|developer|engineer|designer|researcher|founder|builder|analyst|scientist))\b/i) || text.match(/\bi\s+(?:study|work as|major in)\s+([^.,;:!?\n]{2,40})/i);
  if (roleMatch) facts.role = roleMatch[1].trim().replace(/^(a|an)\s+/i, '');
  const focusMatch = text.match(/\b(?:currently (?:learning|studying|focused on|into)|focused on|working on|getting into)\s+([^.,;:!?\n]{2,60})/i);
  if (focusMatch) { const f = focusMatch[1].replace(/\b(stuff|things|currently|right now|some)\b/gi, '').trim(); if (f.length >= 2) facts.current_focus = f; }
  const interestMatch = text.match(/\b(?:deep(?:ly)? into|interested in|love|enjoy|passionate about)\s+([^.\n]{2,80})/i);
  if (interestMatch) { const cleaned = interestMatch[1].replace(/\b(stuff|things|currently|right now)\b/gi, '').trim(); const list = /\b(and|,|\/|&)\b/.test(cleaned) ? cleanList(cleaned) : cleaned.split(/\s+/).filter(Boolean).slice(0, 6); if (list.length) facts.interests = list; }
  return Object.keys(facts).length ? facts : null;
}
const tests = [
  "first this i wanna remember my name",
  "my name is oguwoywywow uwowyewye ibne bin osas",
  "hey I am Aura",
  "my name is Aura",
  "I am an AI student learning stuff currently",
  "I am deep into AI ML",
  "my tech stack is Python, Next.js, Tailwind, and Sui",
  "what's my name?",
  "who am i whats my name and tech stack?",
];
for (const t of tests) console.log(JSON.stringify(t), "=>", JSON.stringify(extract(t)));
