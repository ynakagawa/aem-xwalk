import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  const blockquote = document.createElement('blockquote');
  const [quoteRow, authorRow] = [...block.children];

  // Handle quote content
  if (quoteRow) {
    const quoteDiv = document.createElement('div');
    quoteDiv.className = 'quote-text';
    moveInstrumentation(quoteRow, quoteDiv);
    while (quoteRow.firstElementChild) {
      quoteDiv.append(quoteRow.firstElementChild);
    }
    blockquote.append(quoteDiv);
  }

  // Handle author
  if (authorRow) {
    const authorDiv = document.createElement('div');
    authorDiv.className = 'quote-author';
    moveInstrumentation(authorRow, authorDiv);
    while (authorRow.firstElementChild) {
      authorDiv.append(authorRow.firstElementChild);
    }
    blockquote.append(authorDiv);
  }

  block.textContent = '';
  block.append(blockquote);
}

