import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { escapeHtml } from './helpers';

export function renderMarkdown(text) {
  if (!text) return '';
  try {
    return DOMPurify.sanitize(marked.parse(text, { breaks: true }));
  } catch (e) {
    return escapeHtml(text);
  }
}
