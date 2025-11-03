import { getConfigValue } from '../../scripts/configs.js';
import decorate from './utility-banner.js';
import { getAPIEndpoint } from '../../scripts/commerce/api-edge-client.js';

/* eslint-env jest */

// Mock the getConfigValue function
jest.mock('../../scripts/configs.js', () => ({
  getConfigValue: jest.fn(),
}));

// Mock the getAPIEndpoint function from api-edge-client.js
jest.mock('../../scripts/commerce/api-edge-client.js', () => ({
  getAPIEndpoint: jest.fn().mockResolvedValue('https://api.example.com/v1'),
}));

// Mock the getAPIEndpoint function from api-edge-client.js
jest.mock('../../scripts/commerce/cart.js', () => ({
  cart: {
    getCartId: jest.fn().mockReturnValue('mock-cart-id'),
  },
}));

jest.mock('../../scripts/scripts.js', () => ({
  isUserLoggedIn: jest.fn(),
  handleLoginRedirect: jest.fn().mockReturnValue('https://example.com/signin'),
  handleAccountRedirect: jest.fn(),
}));

// Mock window.location.href to prevent jsdom navigation errors
const originalLocation = window.location;
delete window.location;
let hrefValue = '';
window.location = {
  ...originalLocation,
  get href() {
    return hrefValue;
  },
  set href(value) {
    hrefValue = value;
  },
};

describe('decorate function', () => {
  let block;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup default mock return values
    getConfigValue.mockImplementation((key) => {
      if (key === 'edge-api-domain') return Promise.resolve('https://api.example.com');
      if (key === 'edge-api-path') return Promise.resolve('/v1');
      return Promise.resolve(null);
    });

    // Mock isUserLoggedIn to return false by default (not logged in)
    // eslint-disable-next-line global-require
    const { isUserLoggedIn, handleLoginRedirect, handleAccountRedirect } = require('../../scripts/scripts.js');
    isUserLoggedIn.mockReturnValue(false);

    // Set mock implementations for handleLoginRedirect and handleAccountRedirect
    handleLoginRedirect.mockImplementation(async (signInLink, cartId) => {
      try {
        const apiEndpoint = await getAPIEndpoint();
        const redirectUrl = `${apiEndpoint}/commerce/auth/initiate?return_url=${encodeURIComponent(window.location.pathname)}&cart_id=${encodeURIComponent(cartId)}`;
        return redirectUrl;
      } catch (err) {
        console.error('Error initiating authentication:', err);
        return signInLink.href;
      }
    });
    handleAccountRedirect.mockImplementation(async (myAccountLink) => {
      try {
        const apiEndpoint = await getAPIEndpoint();
        const redirectUrl = `${apiEndpoint}/commerce/account`;
        return redirectUrl;
      } catch (err) {
        console.error('Error initiating authentication:', err);
        return myAccountLink.href;
      }
    });

    // Setup document with proper structure for utility banner
    document.body.innerHTML = `
      <div class="block">
        <div class="row">
          <div class="button-container">
            <div class="button">Button</div>
          </div>
          <div class="col">Column</div>
          <div>
            <p>
              <a href="/signin">Sign In</a>
              <br>
              <a href="/account">My Account</a>
            </p>
          </div>
        </div>
      </div>
    `;
    block = document.querySelector('.block');

    // Reset document.cookie for each test
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  test('should handle empty block correctly', async () => {
    document.body.innerHTML = '<div class="block"></div>';
    block = document.querySelector('.block');
    await decorate(block);
    expect(block.querySelectorAll(':scope > div').length).toBe(0);
  });

  test('should process rows and columns correctly', async () => {
    await decorate(block);

    const rows = block.querySelectorAll(':scope > div');
    rows.forEach((row) => {
      const cols = row.querySelectorAll(':scope > div');
      cols.forEach((col, i) => {
        expect(col.className).toBe(`utility-banner-col-${i}`);
        expect(col.querySelector('.button-container')).toBeNull();
        expect(col.querySelector('.button')).toBeNull();
      });
    });
  });

  test('should handle block with no auth links container', async () => {
    document.body.innerHTML = `
      <div class="block">
        <div class="row">
          <div class="col">Column</div>
        </div>
      </div>
    `;
    block = document.querySelector('.block');
    await decorate(block);
    // Test should complete without errors
    expect(block.querySelectorAll('.utility-banner-col-0').length).toBe(1);
  });

  test('should handle block with incomplete auth links', async () => {
    document.body.innerHTML = `
      <div class="block">
        <div class="row">
          <div class="col">Column</div>
          <div class="col">Column</div>
          <div>
            <p>
              <a href="/signin">Sign In</a>
            </p>
          </div>
        </div>
      </div>
    `;
    block = document.querySelector('.block');
    await decorate(block);
    // Test should complete without errors
    expect(block.querySelectorAll('.utility-banner-col-2').length).toBe(1);
  });

  test('should remove <br> tags between links', async () => {
    await decorate(block);
    const authLinksContainer = block.querySelector('.utility-banner-col-2 p');
    expect(authLinksContainer.querySelectorAll('br').length).toBe(0);
  });

  test('should show sign-in link and hide my-account link when not logged in', async () => {
    document.cookie = 'is_logged_in_cookie=false';
    await decorate(block);

    const links = block.querySelectorAll('.utility-banner-col-2 p a');
    const signInLink = links[0]; // First link is sign-in
    const myAccountLink = links[1]; // Second link is my-account

    expect(signInLink.classList.contains('hidden')).toBe(false);
    expect(myAccountLink.classList.contains('hidden')).toBe(true);
  });

  test('should hide sign-in link and show my-account link when logged in', async () => {
    document.cookie = 'is_logged_in_cookie=true';
    // eslint-disable-next-line global-require
    const { isUserLoggedIn } = require('../../scripts/scripts.js');
    isUserLoggedIn.mockReturnValue(true);
    await decorate(block);

    const links = block.querySelectorAll('.utility-banner-col-2 p a');
    const signInLink = links[0]; // First link is sign-in
    const myAccountLink = links[1]; // Second link is my-account

    expect(signInLink.classList.contains('hidden')).toBe(true);
    expect(myAccountLink.classList.contains('hidden')).toBe(false);
  });

  test('should update sign-in link href when not logged in', async () => {
    // Reset hrefValue before test
    hrefValue = '';
    window.location.pathname = '/current-page';

    await decorate(block);

    const signInLink = block.querySelector('.utility-banner-col-2 p a');

    // Check that the href was updated with the redirect URL
    expect(signInLink.href).toContain('https://api.example.com/v1/commerce/auth/initiate');
    expect(signInLink.href).toContain('return_url=');
    expect(signInLink.href).toContain('cart_id=mock-cart-id');
  });

  test('should handle error in sign-in redirect', async () => {
    // Reset hrefValue before test
    hrefValue = '';
    window.location.pathname = '/current-page';

    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Make getAPIEndpoint throw an error
    getAPIEndpoint.mockRejectedValueOnce(new Error('API error'));

    await decorate(block);

    const signInLink = block.querySelector('.utility-banner-col-2 p a');

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error initiating authentication:', expect.any(Error));
    // Check that the href was set to the fallback sign-in link href
    expect(signInLink.href).toBe('http://localhost/signin');

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });

  test('should update my-account link href when logged in', async () => {
    // Set logged in cookie
    document.cookie = 'is_logged_in_cookie=true';
    // eslint-disable-next-line global-require
    const { isUserLoggedIn } = require('../../scripts/scripts.js');
    isUserLoggedIn.mockReturnValue(true);

    // Reset hrefValue before test
    hrefValue = '';
    window.location.pathname = '/current-page';

    await decorate(block);

    const links = block.querySelectorAll('.utility-banner-col-2 p a');
    const myAccountLink = links[1]; // Second link is my-account

    // Check that the href was updated with the account redirect URL
    expect(myAccountLink.href).toBe('https://api.example.com/v1/commerce/account');
  });

  test('should handle error in account redirect', async () => {
    // Set logged in cookie
    document.cookie = 'is_logged_in_cookie=true';
    // eslint-disable-next-line global-require
    const { isUserLoggedIn } = require('../../scripts/scripts.js');
    isUserLoggedIn.mockReturnValue(true);

    // Reset hrefValue before test
    hrefValue = '';
    window.location.pathname = '/current-page';

    // Mock console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Make getAPIEndpoint throw an error
    getAPIEndpoint.mockRejectedValueOnce(new Error('API error'));

    await decorate(block);

    const links = block.querySelectorAll('.utility-banner-col-2 p a');
    const myAccountLink = links[1]; // Second link is my-account

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error initiating authentication:', expect.any(Error));
    // Check that the href was set to the fallback account link href
    expect(myAccountLink.href).toBe('http://localhost/account');

    // Restore console.error
    consoleErrorSpy.mockRestore();
  });
});
