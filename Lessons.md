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
        "path": "/api/cleanup/users",
        "schedule": "0 2 * * *"
      },
      {
        "path": "/api/cleanup/reservations",
        "schedule": "0 3 * * *"
      }
    ]
  }
  ```

2. Vercel Functions: 
    - Vercel deploys the controllers as edge functions and they are serverless as well.
    - Edge Funtions are serverless functions that are distributed across multiple mini-servers across the world.
    - Such a Network is called an Edge Network.

3. Why dbConnect in every controller? :
    - 
