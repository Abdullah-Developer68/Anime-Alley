1. Vercel Conifg

```js
{
    "version": 2,
    "builds": [
      {
        "src": "app.js",
        // This is the Vercel's Node.js builder that automatically creates serverless functions.
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/app.js"
      }
    ],
     "crons": [
    {
      "path": "/api/hello",
      "schedule": "0 5 * * *"
    }
  ]
  }
  ```