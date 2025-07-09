export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return new Response('Only POST allowed', { status: 405 });
    }

    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const domain = email.split('@')[1];

    const dnsApiUrl = `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`;

    const dnsRes = await fetch(dnsApiUrl, {
      headers: {
        Accept: 'application/dns-json',
      },
    });

    if (!dnsRes.ok) {
      return new Response(JSON.stringify({ error: 'DNS query failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await dnsRes.json();
    const answers = data.Answer || [];

    const mxRecords = answers
      .map((r) => r.data.split(' ').slice(1).join('')) // Remove priority value
      .map((r) => r.replace(/\.$/, '').toLowerCase());

    const isO365 = mxRecords.some((host) =>
      host.includes('mail.protection.outlook.com')
    );

    return new Response(
      JSON.stringify({
        domain,
        mxRecords,
        isO365,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
