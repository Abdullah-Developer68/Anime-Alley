### Improvements:

Note: The website is working fine all the cold start issues have been resolved as well. Still make improvements in these areas.

### User logging back in on Refresh: 
    Status : Resolved
> 1. There is an issue that cookies are being deleted in the dev env but not i production.This was because in dev caching is not as intense but in prod it is so because in logout the response was always the same the browser cached the logout request and so server was not able to delete the cookies and the user was logging back in on refresh.

    Status : Resolved
2. When the payment is succeeds is takes a lot of time to show the updated cart, so even after the payment is made the products are still shown in the cart until the database operations update the database and the user refreshes the page again so make is so that after the payment is done freeze the Navigation for a couple of seconds to give time to the operations to compelete and then automatically redirect users to their history when it is fetched.
 Status : Resolved
3. Cold Start is still happening on the first payment occasionlly. Find a way to avoid it, or shift the deployed to a VPS based hosting service.
> This was solved because first i was calling dbConnect in processPayment function and this was called in handleStripeWebHook function. The issue was that when the handleStripeWebhook function hit it faced cold start so its startup time was slow and after that when the process payment funtion was called it was also delayed due to cold start as this time builds up the timeout limit for stripe or sometimes mongodb timeout would occur reached and because of that payment was being charged but the orders was not being created. I solved this by calling dbConnect in the handleStripe function which allowed for a quick connection to the database and because of that the speed for connection to database was improved in cold starts and because of this the process payment function was able to complete quickly as it did not had to handle the connection with the database in its cold state and because of this the payment is being accepted on every try now

4. create verify token as a middleware and call it before the required request and in the controllers there is dependency on email of the user which is being assumed to be a secrete but it can be exploited.