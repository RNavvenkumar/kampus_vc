import { URL } from 'url';

/**
 * Validates external URLs to protect against Server-Side Request Forgery (SSRF).
 * Rejects private, loopback, link-local, cloud metadata, and non-HTTPS endpoints.
 */
export function validatePublicHttpsUrl(urlString: string): { valid: boolean; error?: string } {
  if (!urlString || typeof urlString !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Must be HTTPS protocol
  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only secure HTTPS URLs are permitted' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block localhost / loopback
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  ) {
    return { valid: false, error: 'Localhost and private domains are not allowed' };
  }

  // Block cloud metadata & link-local IP targets (e.g. AWS/GCP 169.254.169.254)
  if (hostname === '169.254.169.254' || hostname.startsWith('169.254.')) {
    return { valid: false, error: 'Cloud metadata endpoints are strictly forbidden' };
  }

  // Block private IPv4 ranges:
  // 10.0.0.0 - 10.255.255.255 (10.0.0.0/8)
  // 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
  // 192.168.0.0 - 192.168.255.255 (192.168.0.0/16)
  // 127.0.0.0 - 127.255.255.255 (127.0.0.0/8)
  // 0.0.0.0/8
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const octet1 = parseInt(match[1], 10);
    const octet2 = parseInt(match[2], 10);

    if (octet1 === 10) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    if (octet1 === 192 && octet2 === 168) {
      return { valid: false, error: 'Private IP addresses are not allowed' };
    }
    if (octet1 === 127 || octet1 === 0) {
      return { valid: false, error: 'Loopback and zero-network addresses are not allowed' };
    }
    if (octet1 >= 224) {
      return { valid: false, error: 'Multicast and reserved addresses are not allowed' };
    }
  }

  // Reject credentials in URL
  if (parsed.username || parsed.password) {
    return { valid: false, error: 'Embedded user credentials in URLs are not permitted' };
  }

  return { valid: true };
}
