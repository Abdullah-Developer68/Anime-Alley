### Improvements:

Note: The website is working fine all the cold start issues have been resolved as well. Still make improvements in these areas.

### User logging back in on Refresh: 
    Status : Resolved
> 1. There is an issue that cookies are being deleted in the dev env but not i production.This was because in dev caching is not as intense but in prod it is so because in logout the response was always the same the browser cached the logout request and so server was not able to delete the cookies and the user was logging back in on refresh.


2. When the payment is succeeds is takes a lot of time to show the updated cart, so even after the payment is made the products are still shown in the cart until the database operations update the database and the user refreshes the page again so make is so that after the payment is done freeze the Navigation for a couple of seconds to give time to the operations to compelete and then automatically redirect users to their history when it is fetched.

3. Cold Start is still happening on the first payment occasionlly. Find a way to avoid it, or shift the deployed to a VPS based hosting service.