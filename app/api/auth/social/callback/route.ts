import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Google OAuth returns the id_token in the URL hash (#id_token=...) when response_type=id_token.
  // Since hash parameters are only available on the client (browser), we return a simple HTML page 
  // that extracts the hash parameters via JavaScript and redirects them to the mobile app's deep link.
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redirecting to ITU Mobile...</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #040C1E;
          color: #FFFFFF;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
          padding: 20px;
        }
        .spinner {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.1);
          border-top: 5px solid #EA6E33;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 24px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 { margin-bottom: 8px; font-weight: 600; }
        p { color: #879CCD; font-size: 14px; margin-top: 0; }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <h2>Authenticating...</h2>
      <p>Please wait while we redirect you back to the app.</p>
      
      <script>
        // Extract parameters from URL hash or query
        const params = new URLSearchParams(window.location.search);
        let idToken = params.get('id_token') || params.get('idToken');
        
        if (!idToken && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          idToken = hashParams.get('id_token') || hashParams.get('idToken');
        }
        
        if (idToken) {
          // Redirect to the mobile app's deep link scheme registered in app.json
          window.location.href = "itumobile://auth?id_token=" + encodeURIComponent(idToken);
        } else {
          document.body.innerHTML = "<h2>Authentication Failed</h2><p>Could not find token details. Please close this window and try again.</p>";
        }
      </script>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
