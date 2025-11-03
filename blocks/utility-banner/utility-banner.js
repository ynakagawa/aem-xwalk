import { handleAccountRedirect, handleLoginRedirect, isUserLoggedIn } from '../../scripts/scripts.js';

export default async function decorate(block) {
  // Process rows and columns
  block.querySelectorAll(':scope > div').forEach((row) => {
    row.querySelectorAll(':scope > div').forEach((col, i) => {
      if (col.classList.contains('button-container')) {
        col.className = '';
      }
      // Remove button / button-container class added to elements.
      const btnChild = col.querySelectorAll('.button-container, .button');
      if (btnChild) {
        btnChild.forEach((btn) => btn.removeAttribute('class'));
      }
      col.className = `utility-banner-col-${i}`;
    });
  });

  const authLinksContainer = block.querySelector('.utility-banner-col-2');
  if (!authLinksContainer) return;

  const [signInLink, myAccountLink] = authLinksContainer.querySelectorAll('a') || [];
  if (!signInLink || !myAccountLink) return;

  // Remove <br> tags between links
  authLinksContainer.querySelectorAll('br').forEach((br) => br.remove());

  const isLoggedIn = isUserLoggedIn();

  // Toggle visibility based on login state
  signInLink.classList.toggle('hidden', isLoggedIn);
  myAccountLink.classList.toggle('hidden', !isLoggedIn);

  // If not logged in, attach sign-in redirect handler
  if (!isLoggedIn) {
    const { cart } = await import('../../scripts/commerce/cart.js');
    const cartId = cart.getCartId();
    const redirecturl = await handleLoginRedirect(signInLink, cartId);
    signInLink.href = redirecturl;
  }

  // If logged in, attach account redirect handler
  if (isLoggedIn) {
    const redirecturl = await handleAccountRedirect(myAccountLink);
    myAccountLink.href = redirecturl;
  }
}
